"""
Capa de negocio que conecta la Landing con la App ZNexica POS.

El consumo HTTP real de la API vive en:  app/integrations/znexica_api/client.py
Aquí solo se decide CUÁNDO crear la cuenta y CUÁNDO activar/desactivar el acceso.
"""
import logging
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.orm import Session

from app import models
from app.integrations.znexica_api import (
    ZNexicaApiError,
    ZNexicaApiConflictError,
    ZNexicaApiValidationError,
    provision_tenant,
    set_user_status,
)

logger = logging.getLogger("provisioning_service")

# Alias para compatibilidad con los routers existentes
ProvisioningError = ZNexicaApiError
ProvisioningConflictError = ZNexicaApiConflictError
ProvisioningValidationError = ZNexicaApiValidationError


def provision_tenant_sync(
    company_name: str,
    admin_name: str,
    admin_email: str,
    admin_password: str,
    plan_code: str,
) -> Dict[str, Any]:
    """Crea empresa + admin + plan en la App (API ZNexica, endpoint 1)."""
    return provision_tenant(company_name, admin_name, admin_email, admin_password, plan_code)


def _latest_sub_metadata(db: Session, usuario: models.Usuario) -> Tuple[Optional[str], Optional[str]]:
    sub = (
        db.query(models.Suscripcion)
        .filter(models.Suscripcion.usuario_id == usuario.id)
        .order_by(models.Suscripcion.id.desc())
        .first()
    )
    if sub:
        return sub.tenant_company_id, sub.tenant_admin_id
    return None, None


def sync_app_access(db: Session, usuario: models.Usuario, active: bool, reason: str) -> Tuple[bool, str]:
    """
    Refleja en la App el estado del cliente (API ZNexica, endpoint 2).
    - Envía email, adminId y companyId para asegurar actualización atómica en la App.
    - Nunca lanza excepción: devuelve (ok, mensaje) para que el panel muestre el resultado.
    """
    if not usuario or usuario.rol != "cliente":
        return False, "No aplica (no es cliente)."

    status = "ACTIVE" if active else "INACTIVE"
    company_id, admin_id = _latest_sub_metadata(db, usuario)
    email = (usuario.email or "").strip().lower() or None

    if not company_id and not email and not admin_id:
        return False, "El cliente no tiene empresa ni correo vinculados en la App."

    try:
        resp = set_user_status(status, email=email, user_id=admin_id, company_id=company_id, reason=reason)
        return True, f"App ZNexica POS: acceso {'ACTIVADO' if active else 'DESACTIVADO'}."
    except ZNexicaApiError as exc:
        logger.error("Sync acceso App fallo para %s -> %s: %s", usuario.id, status, exc.message)
        return False, f"⚠️ No se pudo sincronizar con la App ({exc.status_code}): {exc.message}"
    except ValueError as exc:
        return False, str(exc)


def apply_provisioning_result(sub: models.Suscripcion, remote_resp: Dict[str, Any], when) -> None:
    """Guarda en la suscripción los IDs devueltos por la App (trazabilidad)."""
    data_body = remote_resp.get("data", {}) or {}
    sub.tenant_company_id = (data_body.get("company") or {}).get("id")
    sub.tenant_admin_id = (data_body.get("admin") or {}).get("id")
    sub.tenant_plan_id = (data_body.get("plan") or {}).get("id")
    sub.tenant_provisioning_status = "exitoso"
    sub.tenant_error_detail = None
    sub.tenant_provisioned_at = when
