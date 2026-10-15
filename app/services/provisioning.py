import os
import base64
import logging
from typing import Dict, Any, Optional, Tuple
import httpx

logger = logging.getLogger("provisioning_service")


class ProvisioningError(Exception):
    """Excepción base para errores de la API externa de aprovisionamiento."""
    def __init__(self, message: str, status_code: int = 500, details: Any = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


class ProvisioningConflictError(ProvisioningError):
    """Error cuando el usuario o correo ya existe en el sistema remoto (HTTP 409)."""
    pass


class ProvisioningValidationError(ProvisioningError):
    """Error de validación de campos o política de contraseñas (HTTP 400)."""
    pass


def get_provisioning_credentials() -> Tuple[str, str, str, str]:
    """Obtener y validar las variables de entorno para la API externa."""
    url = os.getenv("PROVISIONING_API_URL", "https://mini-pos-api.vercel.app/api/provisioning/tenant")
    user = os.getenv("PROVISIONING_API_USER", "")
    password = os.getenv("PROVISIONING_API_PASSWORD", "")
    origin = os.getenv("APP_BASE_URL", "https://landing-znexicapos.onrender.com")
    return url, user, password, origin


def provision_tenant_sync(
    company_name: str,
    admin_name: str,
    admin_email: str,
    admin_password: str,
    plan_code: str
) -> Dict[str, Any]:
    """
    Despacha la llamada síncrona a la API externa de aprovisionamiento de tenants.
    Retorna el diccionario con la respuesta completa ('success', 'message', 'data').
    """
    url, user, password, origin = get_provisioning_credentials()
    
    # Normalizar planCode: FREE, BASIC, PRO
    plan_code_clean = plan_code.upper().strip()
    if plan_code_clean not in ("FREE", "BASIC", "PRO"):
        if "FREE" in plan_code_clean or "TRIAL" in plan_code_clean:
            plan_code_clean = "FREE"
        elif "PRO" in plan_code_clean or "PREMIUM" in plan_code_clean or "MEDIUM" in plan_code_clean:
            plan_code_clean = "PRO"
        else:
            plan_code_clean = "BASIC"

    payload = {
        "companyName": company_name.strip(),
        "adminName": admin_name.strip(),
        "adminEmail": admin_email.strip().lower(),
        "adminPassword": admin_password,
        "planCode": plan_code_clean
    }

    # Autenticación HTTP Basic
    auth_str = f"{user}:{password}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {auth_b64}",
        "Origin": origin
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(url, json=payload, headers=headers)
            status = response.status_code

            try:
                data = response.json()
            except Exception:
                data = {"raw_text": response.text}

            if status == 201 or (200 <= status < 300 and data.get("success")):
                return data

            if status == 409:
                err_msg = data.get("message") or "Ya existe un usuario registrado con este correo en miniPOS."
                raise ProvisioningConflictError(err_msg, status_code=409, details=data)

            if status == 400:
                err_msg = data.get("message") or "Datos inválidos en la solicitud de aprovisionamiento."
                if isinstance(err_msg, list):
                    err_msg = " ".join(err_msg)
                raise ProvisioningValidationError(err_msg, status_code=400, details=data)

            if status == 401:
                raise ProvisioningError("Credenciales de aprovisionamiento no válidas en el servidor.", status_code=401, details=data)

            if status == 403:
                raise ProvisioningError("Acceso no autorizado desde el origen o IP actual.", status_code=403, details=data)

            raise ProvisioningError(
                f"Error en servicio de aprovisionamiento (HTTP {status}): {data.get('message', 'Error desconocido')}",
                status_code=status,
                details=data
            )

    except (ProvisioningError, ProvisioningConflictError, ProvisioningValidationError):
        raise
    except httpx.RequestError as exc:
        logger.error(f"Error de conexión con API de aprovisionamiento: {exc}")
        raise ProvisioningError(
            f"No se pudo conectar con el servicio central de aprovisionamiento: {str(exc)}",
            status_code=503
        )
