import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, security

router = APIRouter(prefix="/api/autenticacion", tags=["Autenticación"])

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
    """Asegurar que los administradores del .env existan en la BD."""
    for admin_user, admin_pass, full_name in get_initial_admins():
        if not admin_user or not admin_pass:
            continue
        admin = db.query(models.Usuario).filter(
            func.lower(models.Usuario.telefono) == admin_user.lower()
        ).first()
        if not admin:
            admin = models.Usuario(
                nombre_completo=full_name,
                telefono=admin_user,
                password_hash=admin_pass,
                rol="admin",
                esta_bloqueado=False
            )
            db.add(admin)
            db.commit()
        else:
            # Sincronizar contraseña si en entorno cambió o si tenía hash previo
            if admin.password_hash != admin_pass and not security.verify_password(admin_pass, admin.password_hash):
                admin.password_hash = admin_pass
                db.commit()


@router.post("/register", response_model=schemas.Token)
def register(user_in: schemas.RegistroUsuario, db: Session = Depends(get_db)):
    """
    Registro de nuevo cliente en la landing page.
    Guarda la contraseña tal cual la ingresó el usuario (sin encriptar ni hashear)
    para que viaje íntegra y original a la base de datos del producto.
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

    # Guardar contraseña original tal cual como la definió el usuario (sin encriptar ni hashear)
    raw_password = user_in.password
    usuario = models.Usuario(
        nombre_completo=user_in.nombre_completo.strip(),
        nombre_empresa=user_in.nombre_empresa.strip() if user_in.nombre_empresa else "",
        email=email_clean,
        telefono=phone_clean,
        password_hash=raw_password,
        rol="cliente",
        esta_bloqueado=False
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

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

    # Si la cuenta tenía un hash antiguo en BD, actualizarla automáticamente a la clave original plana
    if usuario.password_hash != login_in.password:
        usuario.password_hash = login_in.password
        db.commit()
        db.refresh(usuario)

    token = security.create_access_token(data={"sub": usuario.telefono, "role": usuario.rol})
    return {"access_token": token, "token_type": "bearer", "user": usuario}


@router.get("/me", response_model=schemas.UsuarioOut)
def get_me(current_user: models.Usuario = Depends(security.require_current_user)):
    """Obtener datos del usuario autenticado actual."""
    return current_user
