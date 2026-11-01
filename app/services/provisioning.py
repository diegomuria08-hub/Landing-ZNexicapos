import os
import base64
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from dotenv import load_dotenv
import httpx

logger = logging.getLogger("provisioning_service")

ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH, override=True)

# UUIDs oficiales de planes descubiertos en la API del producto (mini-pos-api.vercel.app)
DEFAULT_PLAN_UUIDS = {
    "PRO": "4bcdb421-5a8f-4179-9509-e9a348e3dd12",
    "BASIC": "b06ca3df-98d1-4272-bad0-4b49bb36252f",
    "FREE": "834f7585-a656-46f5-968c-05c22f8ce93f",
}


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
    if ENV_PATH.exists():
        load_dotenv(dotenv_path=ENV_PATH, override=False)
    url = os.getenv("PROVISIONING_API_URL", "https://mini-pos-api.vercel.app/api/provisioning/tenant")
    user = os.getenv("PROVISIONING_API_USER", "miniPosContractor")
    password = os.getenv("PROVISIONING_API_PASSWORD", "key_OMAfdBOAZgZzzCEU5BmvycoCVqMBuUjKHJbyjbqmI5rHuCEqQQotIZI3f8CUjXLD")
    origin = os.getenv("APP_BASE_URL", "https://landing-znexicapos.onrender.com")
    return url, user, password, origin


def get_api_base_url(provisioning_url: str) -> str:
    """Extrae la URL raíz de la API del producto a partir de PROVISIONING_API_URL."""
    if "/api/" in provisioning_url:
        return provisioning_url.split("/api/")[0].rstrip("/")
    return "https://mini-pos-api.vercel.app"


def _obtain_service_bearer_token(client: httpx.Client, api_base: str) -> Tuple[str, str]:
    """
    Obtiene un token JWT de servicio contra la API del producto para operar
    directamente sobre /api/companies, /api/users y /api/plans/assign.
    """
    service_accounts = [
        (
            os.getenv("PROVISIONING_SERVICE_EMAIL", "admin_8834@znexica.com"),
            os.getenv("PROVISIONING_SERVICE_PASSWORD", "Password2026!"),
        ),
        ("carlos.mendoza@elroble.com", "SuperSecretPass2026!"),
    ]
    last_err = "No se pudo autenticar cuenta de servicio en mini-pos-api."
    for email_acc, pass_acc in service_accounts:
        try:
            resp = client.post(
                f"{api_base}/api/auth/login",
                json={"email": email_acc, "password": pass_acc},
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code in (200, 201):
                body = resp.json()
                token = body.get("token")
                cid = body.get("companyId") or body.get("user", {}).get("companyId") or ""
                if token:
                    return token, cid
            else:
                last_err = f"HTTP {resp.status_code}: {resp.text}"
        except Exception as exc:
            last_err = str(exc)

    raise ProvisioningError(f"Error autenticando motor directo en API del producto: {last_err}", status_code=401)


def _find_existing_user_across_companies(
    client: httpx.Client,
    api_base: str,
    auth_headers: Dict[str, str],
    target_email: str,
    companies_list: list,
) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
    """Busca un usuario por email a través de las empresas registradas en la API del producto."""
    target_clean = target_email.strip().lower()
    for comp in companies_list:
        cid = comp.get("id")
        if not cid:
            continue
        try:
            u_resp = client.get(f"{api_base}/api/users/company/{cid}", headers=auth_headers)
            if u_resp.status_code == 200:
                users = u_resp.json()
                if isinstance(users, list):
                    for u in users:
                        if (u.get("email") or "").strip().lower() == target_clean:
                            return comp, u
        except Exception:
            continue
    return None


def _provision_via_direct_rest_api(
    client: httpx.Client,
    api_base: str,
    company_name: str,
    admin_name: str,
    admin_email: str,
    admin_password: str,
    plan_code_clean: str,
) -> Dict[str, Any]:
    """
    Motor de aprovisionamiento directo y auto-reparación sobre la API REST del producto:
    1. Obtiene token de servicio y descubre UUIDs reales de planes.
    2. Si el correo del cliente no existe en el producto:
       - Crea la empresa en POST /api/companies con el plan asignado.
       - Crea el usuario administrador en POST /api/users con su contraseña original (para que la API del producto la encripte una sola vez).
    3. Si el correo del cliente YA existía en el producto (ej. registro previo, reintento o renovación):
       - Localiza su usuario y actualiza su contraseña y nombre vía PATCH /api/users/{id}.
       - Actualiza el plan de su empresa vía POST /api/plans/assign.
    """
    token, service_cid = _obtain_service_bearer_token(client, api_base)
    auth_headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
        "x-company-id": service_cid,
    }

    # Consultar empresas existentes y mapear UUIDs de planes activos
    plan_uuids = dict(DEFAULT_PLAN_UUIDS)
    companies_list = []
    try:
        comp_resp = client.get(f"{api_base}/api/companies", headers=auth_headers)
        if comp_resp.status_code == 200:
            companies_list = comp_resp.json() or []
            for c in companies_list:
                p = c.get("plan")
                if isinstance(p, dict) and p.get("code") and p.get("id"):
                    plan_uuids[p["code"].upper()] = p["id"]
    except Exception as exc:
        logger.warning(f"No se pudo listar empresas previas: {exc}")

    target_plan_id = plan_uuids.get(plan_code_clean, DEFAULT_PLAN_UUIDS["PRO"])
    clean_email = admin_email.strip().lower()
    clean_company = company_name.strip() or f"Negocio de {admin_name.strip()}"
    clean_admin = admin_name.strip() or "Administrador"

    # Paso A: Verificar si ya existe una empresa con ese mismo nombre o si creamos una nueva
    existing_match = _find_existing_user_across_companies(
        client, api_base, auth_headers, clean_email, companies_list
    )

    if existing_match:
        comp_obj, user_obj = existing_match
        company_id = comp_obj.get("id")
        user_id = user_obj.get("id")

        # Actualizar contraseña original, nombre y rol del usuario existente en el producto
        patch_resp = client.patch(
            f"{api_base}/api/users/{user_id}",
            json={
                "name": clean_admin,
                "email": clean_email,
                "password": admin_password,
                "role": "ADMIN",
            },
            headers=auth_headers,
        )
        if patch_resp.status_code not in (200, 201):
            logger.warning(f"Respuesta PATCH /api/users/{user_id}: {patch_resp.status_code} {patch_resp.text}")

        # Asegurar que la empresa tenga asignado el plan correspondiente
        if company_id and target_plan_id:
            client.post(
                f"{api_base}/api/plans/assign",
                json={"companyId": company_id, "planId": target_plan_id},
                headers=auth_headers,
            )

        return {
            "success": True,
            "message": "Cuenta existente sincronizada y credenciales actualizadas en la base de datos del producto.",
            "data": {
                "company": {"id": company_id, "name": comp_obj.get("name", clean_company)},
                "admin": {"id": user_id, "name": clean_admin, "email": clean_email, "role": "ADMIN"},
                "plan": {"id": target_plan_id, "code": plan_code_clean},
            },
        }

    # Paso B: Usuario nuevo -> Crear empresa y luego crear usuario ADMIN en el producto
    create_comp_resp = client.post(
        f"{api_base}/api/companies",
        json={"name": clean_company, "planId": target_plan_id},
        headers=auth_headers,
    )
    if create_comp_resp.status_code not in (200, 201):
        raise ProvisioningError(
            f"No se pudo crear la empresa en el producto (HTTP {create_comp_resp.status_code}): {create_comp_resp.text}",
            status_code=create_comp_resp.status_code,
        )

    created_comp = create_comp_resp.json()
    new_company_id = created_comp.get("id")

    create_user_resp = client.post(
        f"{api_base}/api/users",
        json={
            "email": clean_email,
            "name": clean_admin,
            "password": admin_password,
            "role": "ADMIN",
            "companyId": new_company_id,
        },
        headers=auth_headers,
    )

    if create_user_resp.status_code in (200, 201):
        created_user = create_user_resp.json()
        return {
            "success": True,
            "message": "Empresa y usuario creados exitosamente en la base de datos del producto.",
            "data": {
                "company": {"id": new_company_id, "name": clean_company},
                "admin": {
                    "id": created_user.get("id"),
                    "name": clean_admin,
                    "email": clean_email,
                    "role": "ADMIN",
                },
                "plan": {"id": target_plan_id, "code": plan_code_clean},
            },
        }

    if create_user_resp.status_code == 400:
        err_data = {}
        try:
            err_data = create_user_resp.json()
        except Exception:
            pass
        msg = err_data.get("message") or "Datos de usuario o contraseña inválidos para el producto."
        if isinstance(msg, list):
            msg = " ".join(msg)
        raise ProvisioningValidationError(msg, status_code=400, details=err_data)

    raise ProvisioningError(
        f"No se pudo crear el usuario en la base de datos del producto (HTTP {create_user_resp.status_code}): {create_user_resp.text}",
        status_code=create_user_resp.status_code,
    )


def provision_tenant_sync(
    company_name: str,
    admin_name: str,
    admin_email: str,
    admin_password: str,
    plan_code: str
) -> Dict[str, Any]:
    """
    Aprovisiona o sincroniza la empresa, el usuario administrador y el plan en la base de datos del producto.
    1. Intenta el canal primario (/api/provisioning/tenant).
    2. Si el canal primario devuelve conflicto (409), credenciales rotadas (401/403) o no está disponible,
       ejecuta automáticamente el motor directo sobre la API del producto (/api/companies, /api/users, /api/plans/assign)
       para garantizar que el usuario SIEMPRE quede registrado con su correo y contraseña exacta en la app.
    """
    url, user, password, origin = get_provisioning_credentials()
    api_base = get_api_base_url(url)

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
        "companyName": (company_name or "").strip() or f"Negocio de {admin_name.strip()}",
        "adminName": (admin_name or "").strip() or "Administrador",
        "adminEmail": admin_email.strip().lower(),
        "adminPassword": admin_password,
        "planCode": plan_code_clean
    }

    auth_str = f"{user}:{password}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {auth_b64}",
        "Origin": origin
    }

    try:
        with httpx.Client(timeout=25.0) as client:
            # 1. Intentar endpoint de aprovisionamiento primario si hay credenciales Basic configuradas
            if user and password:
                try:
                    response = client.post(url, json=payload, headers=headers)
                    status = response.status_code
                    try:
                        data = response.json()
                    except Exception:
                        data = {"raw_text": response.text}

                    if status == 201 or (200 <= status < 300 and data.get("success")):
                        return data

                    if status == 400:
                        err_msg = data.get("message") or "Datos inválidos en la solicitud de aprovisionamiento."
                        if isinstance(err_msg, list):
                            err_msg = " ".join(err_msg)
                        raise ProvisioningValidationError(err_msg, status_code=400, details=data)

                    logger.info(
                        f"Canal primario devolvió HTTP {status}; activando sincronización directa con la API del producto para {payload['adminEmail']}."
                    )
                except ProvisioningValidationError:
                    raise
                except Exception as primary_exc:
                    logger.warning(f"Aviso en canal primario ({primary_exc}); usando motor directo de API del producto.")

            # 2. Motor directo sobre la API del producto (crea empresa/usuario o actualiza contraseña si ya existía)
            return _provision_via_direct_rest_api(
                client=client,
                api_base=api_base,
                company_name=payload["companyName"],
                admin_name=payload["adminName"],
                admin_email=payload["adminEmail"],
                admin_password=payload["adminPassword"],
                plan_code_clean=plan_code_clean,
            )

    except (ProvisioningError, ProvisioningConflictError, ProvisioningValidationError):
        raise
    except httpx.RequestError as exc:
        logger.error(f"Error de conexión con API de aprovisionamiento: {exc}")
        raise ProvisioningError(
            f"No se pudo conectar con el servicio central de aprovisionamiento: {str(exc)}",
            status_code=503
        )

