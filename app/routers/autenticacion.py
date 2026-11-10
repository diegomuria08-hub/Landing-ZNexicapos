import os
import secrets
import hashlib
import logging
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, security

router = APIRouter(prefix="/api/autenticacion", tags=["Autenticación"])

logger = logging.getLogger("autenticacion")

# Almacén de sesiones temporales 2FA para el Panel Administrativo (expiran en 5 min)
# Estructura: { temp_token: { "admin_id": int, "code_hash": str, "expires_at": datetime } }
ADMIN_2FA_STORE = {}


def _send_2fa_whatsapp(phone: str, code: str):
    """
    Hook de integración con el servicio / Chatbot de WhatsApp.
    Emite el código de 6 dígitos de un solo uso hacia el canal seguro del Administrador.
    """
    clean_phone = (phone or "").replace("+", "").replace(" ", "").replace("-", "")
    logger.info("🔐 [2FA SECURITY BOT] Código de un solo uso para admin (%s): %s (Expira en 5 min)", clean_phone, code)
    print(f"\n=======================================================\n🔐 [2FA SECURITY BOT] CÓDIGO GENERADO: {code}\nDestinatario: {clean_phone} (Válido por 5 minutos)\n=======================================================\n")

ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)


def get_initial_admins():
    """Obtener lista de administradores desde variables de entorno."""
    if ENV_PATH.exists():
        load_dotenv(dotenv_path=ENV_PATH, override=True)
    admins = [
        (os.getenv("ADMIN_USERNAME", "").strip(), os.getenv("ADMIN_PASSWORD", ""), "Administrador Principal"),
        (os.getenv("ADMIN2_USERNAME", "").strip(), os.getenv("ADMIN2_PASSWORD", ""), "Segundo Administrador"),
        (os.getenv("ADMIN3_USERNAME", "").strip(), os.getenv("ADMIN3_PASSWORD", ""), "Tercer Administrador"),
    ]
    return admins


def ensure_admin_exists(db: Session):
    """Asegurar que los administradores del .env existan en la BD con contraseñas hasheadas en Bcrypt."""
    for admin_user, admin_pass, full_name in get_initial_admins():
        if not admin_user or not admin_pass:
            continue
        admin = db.query(models.Usuario).filter(
            func.lower(models.Usuario.telefono) == admin_user.lower()
        ).first()
        admin_hash = security.get_password_hash(admin_pass)
        if not admin:
            admin = models.Usuario(
                nombre_completo=full_name,
                telefono=admin_user,
                password_hash=admin_hash,
                rol="admin",
                esta_bloqueado=False
            )
            db.add(admin)
            db.commit()
        else:
            # Sincronizar contraseña si en entorno cambió o si tenía texto plano previo
            if not security.verify_password(admin_pass, admin.password_hash) or not admin.password_hash.startswith(("$2b$", "$2a$", "$2y$")):
                admin.password_hash = admin_hash
                db.commit()


@router.post("/register", response_model=schemas.Token)
def register(user_in: schemas.RegistroUsuario, db: Session = Depends(get_db)):
    """
    Registro de nuevo cliente en la landing page.
    Genera hash Bcrypt con Sal para la base de datos local y despacha la contraseña en memoria
    hacia la API externa de la App para evitar Doble Encriptación en el dispositivo móvil.
    """
    ensure_admin_exists(db)

    phone_clean = user_in.telefono.strip()
    existing_user = db.query(models.Usuario).filter(
        func.lower(models.Usuario.telefono) == phone_clean.lower()
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este número de teléfono ya está registrado. Inicia sesión con tu contraseña."
        )

    email_clean = user_in.email.strip().lower() if user_in.email else None
    if email_clean:
        existing_email = db.query(models.Usuario).filter(func.lower(models.Usuario.email) == email_clean).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una cuenta registrada con este correo electrónico. Inicia sesión con tus credenciales."
            )

    # Contraseña original en memoria RAM para el aprovisionamiento
    raw_password = user_in.password
    # Hash seguro con Sal (costo 12) para la base de datos local
    secure_hash = security.get_password_hash(raw_password)

    empresa_clean = user_in.nombre_empresa.strip() if user_in.nombre_empresa else f"Negocio de {user_in.nombre_completo.strip()}"
    target_email = email_clean or f"{phone_clean}@minipos-user.com"

    usuario = models.Usuario(
        nombre_completo=user_in.nombre_completo.strip(),
        nombre_empresa=empresa_clean,
        email=target_email,
        telefono=phone_clean,
        password_hash=secure_hash,
        rol="cliente",
        esta_bloqueado=False
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    # Aprovisionar de inmediato en la API externa del producto (miniPOS) con el Plan Profesional ($20/mes)
    from datetime import timedelta
    from app.services.provisioning import provision_tenant_sync, ProvisioningConflictError
    from app.services.time_service import get_realtime_caracas_now

    now_caracas = get_realtime_caracas_now()
    cycle_end = now_caracas + timedelta(days=30)

    tenant_co_id = None
    tenant_adm_id = None
    tenant_pl_id = None
    prov_status = "pendiente"
    prov_error = None

    try:
        remote_resp = provision_tenant_sync(
            company_name=empresa_clean,
            admin_name=usuario.nombre_completo,
            admin_email=target_email,
            admin_password=raw_password,
            plan_code="PRO"
        )
        data_body = remote_resp.get("data", {})
        tenant_co_id = (data_body.get("company") or {}).get("id")
        tenant_adm_id = (data_body.get("admin") or {}).get("id")
        tenant_pl_id = (data_body.get("plan") or {}).get("id")
        prov_status = "exitoso"
    except ProvisioningConflictError as ce:
        prov_status = "exitoso"
        prov_error = f"Cuenta ya registrada en el producto: {ce.message}"
    except Exception as exc:
        prov_status = "fallido_conexion"
        prov_error = str(exc)

    # Registrar la suscripción inicial al único Plan Profesional ($20/mes)
    sub_inicial = models.Suscripcion(
        usuario_id=usuario.id,
        codigo_plan="PRO",
        nombre_plan="Plan Profesional ($20/mes)",
        monto_usd=20.0,
        metodo_pago="Registro Web",
        referencia_ultimos4="REGISTRO",
        estado="aprobado",
        tiene_web=True,
        acepto_disclaimer_web=True,
        fecha_inicio=now_caracas,
        fecha_fin=cycle_end,
        creado_en=now_caracas,
        tenant_company_id=tenant_co_id,
        tenant_admin_id=tenant_adm_id,
        tenant_plan_id=tenant_pl_id,
        tenant_provisioning_status=prov_status,
        tenant_error_detail=prov_error,
        tenant_provisioned_at=now_caracas if prov_status == "exitoso" else None
    )
    db.add(sub_inicial)

    # Sincronizar en AccesoMiniposApi
    access_record = db.query(models.AccesoMiniposApi).filter(
        func.lower(models.AccesoMiniposApi.telefono) == phone_clean
    ).first()
    if not access_record:
        access_record = models.AccesoMiniposApi(
            telefono=phone_clean,
            acceso_concedido=True,
            plan_activo="PRO",
            esta_bloqueado=False,
            estado="activo",
            mensaje_bloqueo="",
            fecha_expiracion=cycle_end,
            ultima_sincronizacion=now_caracas
        )
        db.add(access_record)
    else:
        access_record.plan_activo = "PRO"
        access_record.acceso_concedido = True
        access_record.esta_bloqueado = False
        access_record.estado = "activo"
        access_record.mensaje_bloqueo = ""
        access_record.fecha_expiracion = cycle_end
        access_record.ultima_sincronizacion = now_caracas

    db.commit()

    token = security.create_access_token(data={"sub": usuario.telefono, "role": usuario.rol})
    return {"access_token": token, "token_type": "bearer", "user": usuario}


@router.post("/login", response_model=schemas.Token)
def login(login_in: schemas.LoginUsuario, db: Session = Depends(get_db)):
    """Login para clientes (por teléfono o correo electrónico) y administradores."""
    ensure_admin_exists(db)

    username_clean = login_in.telefono_o_usuario.strip()
    usuario = db.query(models.Usuario).filter(
        (func.lower(models.Usuario.telefono) == username_clean.lower()) |
        (func.lower(models.Usuario.email) == username_clean.lower())
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos."
        )

    if not security.verify_password(login_in.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos."
        )

    # Auto-migrar a hash Bcrypt con Sal si la cuenta aún tenía la clave en texto plano
    if not usuario.password_hash.startswith(("$2b$", "$2a$", "$2y$")):
        usuario.password_hash = security.get_password_hash(login_in.password)
        db.commit()
        db.refresh(usuario)

    # 2FA de seguridad obligatorio para Administradores
    if usuario.rol == "admin":
        otp_code = str(secrets.randbelow(900000) + 100000)
        temp_token = secrets.token_urlsafe(32)
        code_hash = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()

        ADMIN_2FA_STORE[temp_token] = {
            "admin_id": usuario.id,
            "code_hash": code_hash,
            "expires_at": datetime.utcnow() + timedelta(minutes=5)
        }

        admin_phone = os.getenv("WHATSAPP_ADMIN_PHONE", "584243580005")
        _send_2fa_whatsapp(admin_phone, otp_code)

        return {
            "requires_2fa": True,
            "temp_token": temp_token,
            "message": "Código de seguridad de 6 dígitos generado. Revisa tu WhatsApp o la consola del servidor."
        }

    # Clientes: Entrega directa de token JWT
    token = security.create_access_token(data={"sub": usuario.telefono, "role": usuario.rol})
    return {"access_token": token, "token_type": "bearer", "user": usuario, "requires_2fa": False}


@router.post("/verify-2fa", response_model=schemas.Token)
def verify_admin_2fa(payload: schemas.Verify2FAIn, db: Session = Depends(get_db)):
    """Valida el código 2FA de 6 dígitos para administradores y expide el token definitivo."""
    temp_token = payload.temp_token
    session_data = ADMIN_2FA_STORE.get(temp_token)

    if not session_data or datetime.utcnow() > session_data["expires_at"]:
        ADMIN_2FA_STORE.pop(temp_token, None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El código de seguridad ha expirado o es inválido. Inicia sesión nuevamente."
        )

    clean_code = payload.code.strip()
    incoming_hash = hashlib.sha256(clean_code.encode("utf-8")).hexdigest()

    if not secrets.compare_digest(incoming_hash, session_data["code_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Código de verificación 2FA incorrecto."
        )

    admin_id = session_data["admin_id"]
    ADMIN_2FA_STORE.pop(temp_token, None)

    admin = db.query(models.Usuario).filter(models.Usuario.id == admin_id).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Administrador no encontrado."
        )

    final_token = security.create_access_token(data={"sub": admin.telefono, "role": admin.rol})
    return {
        "access_token": final_token,
        "token_type": "bearer",
        "user": admin,
        "requires_2fa": False
    }


@router.get("/me", response_model=schemas.UsuarioOut)
def get_me(current_user: models.Usuario = Depends(security.require_current_user)):
    """Obtener datos del usuario autenticado actual."""
    return current_user
