import os
import re
import shutil
import uuid
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas, security
from app.services.provisioning import (
    provision_tenant_sync,
    ProvisioningError,
    ProvisioningConflictError,
    ProvisioningValidationError
)
from app.services.time_service import get_realtime_caracas_now

router = APIRouter(prefix="/api/suscripciones", tags=["Suscripciones y Pagos"])

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Catálogo Oficial de Planes miniPOS
PLANS_INFO = {
    # Nombres oficiales
    "FREE": {"name": "Plan Prueba Gratis (30 Días)", "price": 0.0, "has_web": False, "code": "FREE"},
    "BASIC": {"name": "Plan Básico (Stock e Inventario)", "price": 8.0, "has_web": False, "code": "BASIC"},
    "PRO": {"name": "Plan Profesional (App Móvil + Web + Todo)", "price": 20.0, "has_web": True, "code": "PRO"},
    
    # Compatibilidad con alias previos
    "free_trial": {"name": "Plan Prueba Gratis (30 Días)", "price": 0.0, "has_web": False, "code": "FREE"},
    "basico": {"name": "Plan Básico (Stock e Inventario)", "price": 8.0, "has_web": False, "code": "BASIC"},
    "medium": {"name": "Plan Profesional (App Móvil + Web)", "price": 20.0, "has_web": True, "code": "PRO"},
    "premium": {"name": "Plan Profesional (App Móvil + Web + Todo)", "price": 20.0, "has_web": True, "code": "PRO"}
}


@router.post("/submit", response_model=schemas.SuscripcionOut)
async def submit_payment(
    plan_code: str = Form(...),
    payment_method: str = Form(...),
    reference_last4: str = Form(...),
    full_name: str = Form(...),
    phone: str = Form(...),
    company_name: Optional[str] = Form(""),
    email: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    proof_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: Optional[models.Usuario] = Depends(security.get_current_user)
):
    """Registrar pago o activación de suscripción de un cliente y aprovisionar en la API externa."""
    plan_key = plan_code.strip()
    if plan_key not in PLANS_INFO:
        raise HTTPException(status_code=400, detail="Plan no válido seleccionado.")

    plan_meta = PLANS_INFO[plan_key]
    official_code = plan_meta["code"]

    # Validar correo
    clean_email = email.strip().lower() if (email and email.strip()) else None

    # Buscar usuario existente si no venía en el token
    if not current_user:
        current_user = db.query(models.Usuario).filter(
            func.lower(models.Usuario.telefono) == phone.strip().lower()
        ).first()
        if not current_user and clean_email:
            current_user = db.query(models.Usuario).filter(
                func.lower(models.Usuario.email) == clean_email
            ).first()

    # Determinar la contraseña original exacta del usuario (sin encriptar ni hashear)
    supplied_pw = password.strip() if (password and password.strip() and not password.strip().startswith("$2")) else None
    stored_plain_pw = (
        current_user.password_hash
        if (current_user and current_user.password_hash and not current_user.password_hash.startswith("$2"))
        else None
    )

    if supplied_pw:
        raw_password = supplied_pw
    elif stored_plain_pw:
        raw_password = stored_plain_pw
    else:
        fallback_pw = reference_last4.strip()
        if len(fallback_pw) >= 8 and re.search(r"[A-Za-z]", fallback_pw) and re.search(r"\d", fallback_pw):
            raw_password = fallback_pw
        else:
            raw_password = "MiniPosSecret2026!"

    if not clean_email:
        if current_user and current_user.email:
            clean_email = current_user.email.strip().lower()
        else:
            clean_email = f"{phone.strip()}@minipos-user.com"

    # Crear o sincronizar datos del usuario en nuestra BD (guardando contraseña original sin encriptar)
    if not current_user:
        current_user = models.Usuario(
            nombre_completo=full_name.strip(),
            nombre_empresa=company_name.strip() if company_name else f"Negocio de {full_name.strip()}",
            email=clean_email,
            telefono=phone.strip(),
            password_hash=raw_password,
            rol="cliente",
            esta_bloqueado=False
        )
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
    else:
        if full_name and full_name.strip() and current_user.nombre_completo != full_name.strip():
            current_user.nombre_completo = full_name.strip()
        if company_name and company_name.strip():
            current_user.nombre_empresa = company_name.strip()
        if clean_email and not current_user.email:
            current_user.email = clean_email
        # Asegurar que la contraseña guardada en BD sea la original en texto plano
        if supplied_pw or current_user.password_hash.startswith("$2"):
            current_user.password_hash = raw_password
        db.commit()
        db.refresh(current_user)

    # Manejo de comprobante
    saved_file_path = None
    if proof_file:
        file_ext = os.path.splitext(proof_file.filename)[1] or ".jpg"
        unique_filename = f"{uuid.uuid4().hex}_{phone.strip()}{file_ext}"
        target_path = os.path.join(UPLOAD_DIR, unique_filename)
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(proof_file.file, buffer)
        saved_file_path = f"/static/uploads/{unique_filename}"

    # Estado inicial: el plan FREE se aprueba inmediatamente
    is_free = (official_code == "FREE" or plan_meta["price"] == 0.0)
    initial_status = "aprobado" if is_free else "pendiente"

    realtime_now = get_realtime_caracas_now()
    cycle_end = realtime_now + timedelta(days=30)

    suscripcion = models.Suscripcion(
        usuario_id=current_user.id,
        codigo_plan=official_code,
        nombre_plan=plan_meta["name"],
        monto_usd=plan_meta["price"],
        metodo_pago=payment_method,
        referencia_ultimos4=reference_last4.strip() or "FREE-TRIAL",
        ruta_comprobante=saved_file_path,
        estado=initial_status,
        tiene_web=plan_meta["has_web"],
        acepto_disclaimer_web=True,
        fecha_inicio=realtime_now,
        fecha_fin=cycle_end,
        creado_en=realtime_now
    )
    db.add(suscripcion)
    db.commit()
    db.refresh(suscripcion)

    # Aprovisionar las credenciales originales del cliente en la API externa del producto (miniPOS)
    # Se envían las credenciales tal cual las creó el usuario (sin encriptar/hashear aquí) para que el producto las encripte allá.
    empresa = current_user.nombre_empresa or company_name or f"Negocio de {current_user.nombre_completo}"
    try:
        remote_resp = provision_tenant_sync(
            company_name=empresa,
            admin_name=current_user.nombre_completo,
            admin_email=current_user.email or clean_email,
            admin_password=raw_password,
            plan_code=official_code
        )
        data_body = remote_resp.get("data", {})
        suscripcion.tenant_company_id = data_body.get("company", {}).get("id")
        suscripcion.tenant_admin_id = data_body.get("admin", {}).get("id")
        suscripcion.tenant_plan_id = data_body.get("plan", {}).get("id")
        suscripcion.tenant_provisioning_status = "exitoso"
        suscripcion.tenant_error_detail = None
        suscripcion.tenant_provisioned_at = realtime_now
    except ProvisioningConflictError as ce:
        # Si el cliente ya existe en la BD del producto (ej. renovación o cambio de plan con su misma cuenta)
        suscripcion.tenant_provisioning_status = "exitoso"
        suscripcion.tenant_error_detail = f"Cuenta ya registrada en el producto: {ce.message}"
        suscripcion.tenant_provisioned_at = realtime_now
    except ProvisioningValidationError as ve:
        suscripcion.tenant_provisioning_status = "fallido_validacion"
        suscripcion.tenant_error_detail = ve.message
        if is_free:
            db.commit()
            raise HTTPException(status_code=400, detail=ve.message)
    except Exception as e:
        suscripcion.tenant_provisioning_status = "fallido_conexion"
        suscripcion.tenant_error_detail = str(e)

    # Sincronizar control de acceso miniPOS para la app móvil
    access_record = db.query(models.AccesoMiniposApi).filter(
        func.lower(models.AccesoMiniposApi.telefono) == current_user.telefono.lower()
    ).first()

    if not access_record:
        access_record = models.AccesoMiniposApi(
            telefono=current_user.telefono,
            acceso_concedido=(initial_status == "aprobado"),
            plan_activo=official_code if initial_status == "aprobado" else "ninguno",
            esta_bloqueado=(initial_status != "aprobado"),
            estado="activo" if initial_status == "aprobado" else "pendiente",
            mensaje_bloqueo="" if initial_status == "aprobado" else "Tu suscripción está pendiente de confirmación de pago por el administrador.",
            fecha_expiracion=cycle_end,
            ultima_sincronizacion=realtime_now
        )
        db.add(access_record)
    else:
        if initial_status == "aprobado":
            access_record.plan_activo = official_code
            access_record.acceso_concedido = True
            access_record.esta_bloqueado = False
            access_record.estado = "activo"
            access_record.mensaje_bloqueo = ""
            access_record.fecha_expiracion = cycle_end
            access_record.ultima_sincronizacion = realtime_now
            current_user.esta_bloqueado = False
            current_user.motivo_bloqueo = ""
        else:
            # Si el usuario ya tenía acceso concedido activo y vigente, lo mantenemos hasta aprobar el nuevo pago.
            if not access_record.acceso_concedido:
                access_record.esta_bloqueado = True
                access_record.estado = "pendiente"
                access_record.mensaje_bloqueo = "Tu suscripción está pendiente de confirmación de pago por el administrador."
                access_record.ultima_sincronizacion = realtime_now

    db.commit()
    db.refresh(suscripcion)
    return suscripcion


@router.get("/mis-suscripciones", response_model=List[schemas.SuscripcionOut])
def get_my_subscriptions(
    current_user: models.Usuario = Depends(security.require_current_user),
    db: Session = Depends(get_db)
):
    """Obtener historial de suscripciones del usuario autenticado."""
    suscripciones = db.query(models.Suscripcion).filter(
        models.Suscripcion.usuario_id == current_user.id
    ).order_by(models.Suscripcion.id.desc()).all()
    return suscripciones
