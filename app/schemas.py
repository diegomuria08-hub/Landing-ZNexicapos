import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


# ─── Autenticación ───────────────────────────────────────────────

class RegistroUsuario(BaseModel):
    nombre_completo: str = Field(..., min_length=2, max_length=150)
    nombre_empresa: Optional[str] = Field("", max_length=150)
    email: Optional[str] = Field(None, max_length=150)
    telefono: str = Field(..., min_length=6, max_length=50)
    password: str = Field(..., min_length=8, max_length=64)

    @field_validator("password")
    def validate_password_strength(cls, v: str):
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("La contraseña debe tener al menos 8 caracteres y contener al menos una letra y un número.")
        return v


class LoginUsuario(BaseModel):
    telefono_o_usuario: str
    password: str


class UsuarioOut(BaseModel):
    id: int
    nombre_completo: str
    nombre_empresa: Optional[str] = ""
    email: Optional[str] = None
    telefono: str
    rol: str
    esta_bloqueado: Optional[bool] = False
    motivo_bloqueo: Optional[str] = ""
    creado_en: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UsuarioOut


class ActualizarPerfilAdmin(BaseModel):
    nombre_completo: Optional[str] = None
    nuevo_username: Optional[str] = None
    password_actual: str
    nueva_password: Optional[str] = None


# ─── Métodos de Pago ─────────────────────────────────────────────

class MetodoPagoOut(BaseModel):
    id: int
    tipo_metodo: str
    titulo: str
    nombre_banco: Optional[str] = ""
    telefono: Optional[str] = ""
    cedula: Optional[str] = ""
    binance_id: Optional[str] = ""
    titular_cuenta: Optional[str] = ""
    esta_activo: bool

    class Config:
        from_attributes = True


class MetodoPagoCrear(BaseModel):
    tipo_metodo: str = "pago_movil"
    titulo: str
    nombre_banco: Optional[str] = ""
    telefono: Optional[str] = ""
    cedula: Optional[str] = ""
    binance_id: Optional[str] = ""
    titular_cuenta: Optional[str] = ""


class MetodoPagoActualizar(BaseModel):
    tipo_metodo: str
    titulo: str
    nombre_banco: Optional[str] = ""
    telefono: Optional[str] = ""
    cedula: Optional[str] = ""
    binance_id: Optional[str] = ""
    titular_cuenta: Optional[str] = ""
    esta_activo: bool = True


# ─── Suscripciones / Pagos ───────────────────────────────────────

class SuscripcionOut(BaseModel):
    id: int
    usuario_id: int
    codigo_plan: str
    nombre_plan: str
    monto_usd: float
    metodo_pago: str
    referencia_ultimos4: str
    ruta_comprobante: Optional[str] = None
    estado: str
    
    tenant_company_id: Optional[str] = None
    tenant_admin_id: Optional[str] = None
    tenant_plan_id: Optional[str] = None
    tenant_provisioning_status: Optional[str] = "pendiente"
    tenant_error_detail: Optional[str] = None
    tenant_provisioned_at: Optional[datetime] = None

    creado_en: datetime
    usuario: Optional[UsuarioOut] = None

    class Config:
        from_attributes = True


class ActualizarEstadoSuscripcion(BaseModel):
    subscription_id: Optional[int] = None
    status: str  # 'aprobado' o 'rechazado'


# ─── API Acceso miniPOS ──────────────────────────────────────────

class AccesoMiniposOut(BaseModel):
    telefono: str
    acceso_concedido: bool
    esta_bloqueado: bool = False
    estado: str = "activo"
    plan_activo: str
    mensaje_bloqueo: Optional[str] = ""
    fecha_expiracion: Optional[datetime] = None
    ultima_sincronizacion: datetime

    class Config:
        from_attributes = True


class EliminarClienteIn(BaseModel):
    motivo: str



# ─── DTOs API Externa de Aprovisionamiento de Tenants ─────────────

class TenantProvisioningRequest(BaseModel):
    companyName: str = Field(..., min_length=2, max_length=100)
    adminName: str = Field(..., min_length=2, max_length=100)
    adminEmail: str = Field(..., max_length=100)
    adminPassword: str = Field(..., min_length=8, max_length=64)
    planCode: str = Field("BASIC", pattern="^(FREE|BASIC|PRO)$")
