import os
import base64
import hashlib
import unicodedata
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "super_secret_owasp_jwt_key_minipos_9090_architect_2026")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))  # 30 días


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/autenticacion/login", auto_error=False)


def _aes256_key() -> bytes:
    """Deriva una clave simétrica de 256 bits (32 bytes) a partir de SECRET_KEY."""
    return hashlib.sha256(SECRET_KEY.encode("utf-8")).digest()


def encrypt_provisioning_secret(plain_password: str) -> Optional[str]:
    """
    Cifra simétricamente con AES-256-GCM la credencial de aprovisionamiento
    para permitir reintentos seguros hacia la API del producto sin almacenar texto plano.
    """
    if not plain_password:
        return None
    aesgcm = AESGCM(_aes256_key())
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plain_password.encode("utf-8"), None)
    blob = base64.urlsafe_b64encode(nonce + ct).decode("ascii")
    return f"aes256:{blob}"


def decrypt_provisioning_secret(cipher_text: Optional[str]) -> Optional[str]:
    """Descifra en memoria RAM la credencial AES-256-GCM para aprovisionamiento remoto."""
    if not cipher_text or not cipher_text.startswith("aes256:"):
        return None
    try:
        raw = base64.urlsafe_b64decode(cipher_text[len("aes256:"):].encode("ascii"))
        if len(raw) <= 12:
            return None
        nonce, ct = raw[:12], raw[12:]
        aesgcm = AESGCM(_aes256_key())
        return aesgcm.decrypt(nonce, ct, None).decode("utf-8")
    except Exception:
        return None


def _normalize_password_bytes(password: str) -> bytes:
    """Normaliza en Unicode NFC y codifica a UTF-8 recortando al límite de 72 bytes de Bcrypt."""
    if not password:
        return b""
    # Normalización canónica para asegurar que 'ñ' y acentos pesen exactamente igual en Web y Móvil
    normalized = unicodedata.normalize('NFC', password)
    return normalized.encode('utf-8')[:72]


def get_password_hash(password: str) -> str:
    """Genera hash Bcrypt seguro con Sal (costo 12) de longitud fija y sin almacenar texto plano."""
    pwd_bytes = _normalize_password_bytes(password)
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica contraseñas con bcrypt.checkpw.
    Mantiene compatibilidad de migración en caliente si existía texto plano previo.
    """
    if not plain_password or not hashed_password:
        return False

    pwd_bytes = _normalize_password_bytes(plain_password)

    # 1. Validación segura con Hash Bcrypt ($2b$, $2a$, $2y$)
    if hashed_password.startswith(("$2b$", "$2a$", "$2y$")):
        try:
            return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
        except Exception:
            return False

    # 2. Fallback temporal de migración transparente (solo para cuentas previas en texto plano)
    return plain_password == hashed_password


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
    """Requiere un usuario con rol de administrador. Lanza 401 si no hay sesión válida o 403 si no es admin."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tu sesión de administrador ha expirado. Por favor inicia sesión nuevamente."
        )
    if user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requieren privilegios de Administrador."
        )
    return user
