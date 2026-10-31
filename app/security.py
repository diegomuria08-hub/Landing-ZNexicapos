import os
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "super_secret_owasp_jwt_key_minipos_9090_architect_2026")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))  # 30 días


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/autenticacion/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verificar contraseña del usuario.
    Soporta comparación directa en texto original (sin encriptar/hashear para evitar doble encriptamiento
    al aprovisionar en la BD del producto) y mantiene compatibilidad con hashes bcrypt previos.
    """
    if plain_password is None or hashed_password is None:
        return False
    # 1. Comparación exacta en texto original (sin encriptar)
    if plain_password == hashed_password:
        return True
    # 2. Fallback de compatibilidad si el registro antiguo aún tenía hash bcrypt ($2b$, $2a$, $2y$)
    if hashed_password.startswith(("$2b$", "$2a$", "$2y$")):
        try:
            pwd_bytes = plain_password.encode("utf-8")[:72]
            hash_bytes = hashed_password.encode("utf-8")
            return bcrypt.checkpw(pwd_bytes, hash_bytes)
        except Exception:
            return False
    return False


def get_password_hash(password: str) -> str:
    """
    Retorna la contraseña tal cual la definió el usuario (sin encriptar ni hashear),
    para que viaje íntegra y original a la base de datos del producto (donde sí se encripta).
    """
    return password


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crear token JWT con expiración configurable."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[models.Usuario]:
    """Obtener usuario actual desde token JWT. Retorna None si no hay token válido."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        telefono: str = payload.get("sub")
        if telefono is None:
            return None
    except JWTError:
        return None

    usuario = db.query(models.Usuario).filter(models.Usuario.telefono == telefono).first()
    return usuario


def require_current_user(user: Optional[models.Usuario] = Depends(get_current_user)) -> models.Usuario:
    """Requiere un usuario autenticado. Lanza 401 si no hay sesión válida."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión expirada o credenciales inválidas. Por favor inicie sesión."
        )
    return user


def require_admin(user: Optional[models.Usuario] = Depends(get_current_user)) -> models.Usuario:
    """Requiere un usuario con rol de administrador. Lanza 403 si no es admin."""
    if not user or user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requieren privilegios de Administrador."
        )
    return user
