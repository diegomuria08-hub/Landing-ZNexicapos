"""
=====================================================================================
 API EXTERNA DE APROVISIONAMIENTO Y GESTIÓN SaaS — ZNexica POS (miniPOS)
=====================================================================================
 Este archivo es el ÚNICO punto del proyecto que habla con la API del producto.

 Endpoints consumidos (server-to-server, HTTP Basic Auth):
   1) POST  {BASE}/api/provisioning/tenant       -> crea empresa + admin ACTIVE + plan
   2) PATCH {BASE}/api/provisioning/user-status  -> ACTIVE / INACTIVE (por email, userId o companyId)

 Variables de entorno (.env local / Environment de Render) — SIN valores por defecto:
   PROVISIONING_API_USER       usuario Basic Auth                     (obligatoria)
   PROVISIONING_API_PASSWORD   contraseña Basic Auth                  (obligatoria)
   ZNEXICA_API_BASE_URL        raíz de la API, ej. https://mini-pos-api.vercel.app (opcional)
   PROVISIONING_API_URL        (legado) si existe, se deriva la raíz desde ella
   APP_BASE_URL                se envía como cabecera Origin

 Reglas aplicadas:
   - Credenciales solo desde entorno; si faltan, no se envía nada (ZNexicaApiAuthError).
   - Timeouts estrictos y reintentos con backoff exponencial solo ante fallas transitorias.
   - Logs de auditoría sin credenciales ni contraseñas.
 Documentación + peticiones para Postman: README.md en esta misma carpeta.
=====================================================================================
"""
import base64
import logging
import os
import time
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger("znexica_api")

DEFAULT_BASE_URL = "https://mini-pos-api.vercel.app"
TIMEOUT_SECONDS = 15.0
MAX_ATTEMPTS = 3
BACKOFF_BASE_SECONDS = 0.6
TRANSIENT_STATUS = {429, 502, 503, 504}
VALID_STATUSES = {"ACTIVE", "INACTIVE"}
VALID_PLANS = {"FREE", "BASIC", "PRO"}


# ───────────────────────────── Errores tipados ─────────────────────────────

class ZNexicaApiError(Exception):
    """Error genérico de la API del producto."""

    def __init__(self, message: str, status_code: int = 500, details: Any = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


class ZNexicaApiAuthError(ZNexicaApiError):
    """401/403: credenciales ausentes o inválidas, u origen/IP no autorizado."""


class ZNexicaApiValidationError(ZNexicaApiError):
    """400: datos inválidos (p. ej. política de contraseña)."""


class ZNexicaApiConflictError(ZNexicaApiError):
    """409: el correo ya existe en la base de datos del producto."""


class ZNexicaApiNotFoundError(ZNexicaApiError):
    """404: usuario o empresa no encontrados en el producto."""


# ───────────────────────────── Configuración ─────────────────────────────

def _base_url() -> str:
    explicit = os.getenv("ZNEXICA_API_BASE_URL", "").strip()
    if explicit:
        return explicit.rstrip("/")
    legacy = os.getenv("PROVISIONING_API_URL", "").strip()
    if "/api/" in legacy:
        return legacy.split("/api/")[0].rstrip("/")
    return DEFAULT_BASE_URL


def _auth_headers() -> Dict[str, str]:
    user = os.getenv("PROVISIONING_API_USER", "").strip()
    password = os.getenv("PROVISIONING_API_PASSWORD", "").strip()
    if not user or not password:
        raise ZNexicaApiAuthError(
            "Variables PROVISIONING_API_USER / PROVISIONING_API_PASSWORD no configuradas en el servidor.",
            status_code=401,
        )
    token = base64.b64encode(f"{user}:{password}".encode("utf-8")).decode("ascii")
    headers = {
        "Authorization": f"Basic {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    origin = os.getenv("APP_BASE_URL", "").strip()
    if origin:
        headers["Origin"] = origin
    return headers


def _error_message(data: Any, fallback: str) -> str:
    if isinstance(data, dict):
        msg = data.get("message") or data.get("error") or fallback
        return " ".join(msg) if isinstance(msg, list) else str(msg)
    return fallback


def _raise_for_status(status: int, data: Any) -> None:
    msg = _error_message(data, f"HTTP {status}")
    if status == 400:
        raise ZNexicaApiValidationError(msg, status, data)
    if status in (401, 403):
        raise ZNexicaApiAuthError(msg, status, data)
    if status == 404:
        raise ZNexicaApiNotFoundError(msg, status, data)
    if status == 409:
        raise ZNexicaApiConflictError(msg, status, data)
    raise ZNexicaApiError(msg, status, data)


def _request(method: str, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Petición HTTP con timeout, reintentos con backoff exponencial y auditoría sin secretos."""
    url = f"{_base_url()}{path}"
    headers = _auth_headers()
    last_exc: Optional[Exception] = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
                resp = client.request(method, url, json=payload, headers=headers)
            try:
                data = resp.json()
            except ValueError:
                data = {"raw": resp.text[:300]}

            logger.info("ZNexica API %s %s -> HTTP %s (intento %s)", method, path, resp.status_code, attempt)

            if 200 <= resp.status_code < 300:
                return data
            if resp.status_code in TRANSIENT_STATUS and attempt < MAX_ATTEMPTS:
                time.sleep(BACKOFF_BASE_SECONDS * (2 ** (attempt - 1)))
                continue
            _raise_for_status(resp.status_code, data)
        except httpx.RequestError as exc:
            last_exc = exc
            logger.warning("ZNexica API %s %s fallo de red (intento %s): %s", method, path, attempt, exc)
            if attempt < MAX_ATTEMPTS:
                time.sleep(BACKOFF_BASE_SECONDS * (2 ** (attempt - 1)))
                continue

    raise ZNexicaApiError(f"No se pudo conectar con la API del producto: {last_exc}", status_code=503)


# ───────────────────────────── Endpoints públicos ─────────────────────────────

# >>> API ZNexica — ENDPOINT 1: POST /api/provisioning/tenant (crear empresa + admin + plan) <<<
def provision_tenant(
    company_name: str,
    admin_name: str,
    admin_email: str,
    admin_password: str,
    plan_code: str = "PRO",
) -> Dict[str, Any]:
    """
    Crea atómicamente la empresa, su usuario ADMIN (status ACTIVE) y le asigna el plan.
    Devuelve el JSON completo: {"success", "message", "data": {"company", "admin", "plan"}}.
    Lanza ZNexicaApiConflictError (409) si el correo ya existe.
    """
    plan = (plan_code or "PRO").upper().strip()
    payload = {
        "companyName": (company_name or "").strip() or f"Negocio de {(admin_name or '').strip()}",
        "adminName": (admin_name or "").strip() or "Administrador",
        "adminEmail": (admin_email or "").strip().lower(),
        "adminPassword": admin_password,
        "planCode": plan if plan in VALID_PLANS else "PRO",
    }
    return _request("POST", "/api/provisioning/tenant", payload)


# >>> API ZNexica — ENDPOINT 2: PATCH /api/provisioning/user-status (ACTIVE / INACTIVE) <<<
def set_user_status(
    status: str,
    *,
    email: Optional[str] = None,
    user_id: Optional[str] = None,
    company_id: Optional[str] = None,
    reason: str = "",
) -> Dict[str, Any]:
    """
    Activa o desactiva acceso en la App.
    - Envía email, userId y companyId disponibles para garantizar que tanto el usuario
      como la empresa queden en el estado deseado.
    Un usuario INACTIVE recibe HTTP 401 al intentar iniciar sesión en la App.
    """
    status_clean = (status or "").upper().strip()
    if status_clean not in VALID_STATUSES:
        raise ValueError("status debe ser 'ACTIVE' o 'INACTIVE'.")

    payload: Dict[str, Any] = {"status": status_clean}
    if email:
        payload["email"] = email.strip().lower()
    if user_id:
        payload["userId"] = str(user_id)
    if company_id:
        payload["companyId"] = str(company_id)

    if not any([email, user_id, company_id]):
        raise ValueError("Debe indicarse company_id, user_id o email.")
    if reason:
        payload["reason"] = reason[:250]

    return _request("PATCH", "/api/provisioning/user-status", payload)

