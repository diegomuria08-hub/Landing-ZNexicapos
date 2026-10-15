from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Usuario(Base):
    """Tabla de usuarios del sistema (administradores y clientes)."""
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String(150), nullable=False)
    nombre_empresa = Column(String(150), default="")
    email = Column(String(150), unique=True, index=True, nullable=True)
    telefono = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(20), default="cliente")  # 'cliente' o 'admin'
    esta_bloqueado = Column(Boolean, default=False)
    motivo_bloqueo = Column(String(255), default="")
    creado_en = Column(DateTime, default=datetime.utcnow)

    suscripciones = relationship("Suscripcion", back_populates="usuario")
    sesiones = relationship("SesionDispositivo", back_populates="usuario")


class MetodoPago(Base):
    """Métodos de pago dinámicos gestionados por el admin — cero hardcoding."""
    __tablename__ = "metodos_pago"

    id = Column(Integer, primary_key=True, index=True)
    tipo_metodo = Column(String(50), default="pago_movil")
    titulo = Column(String(100), nullable=False)
    nombre_banco = Column(String(100), default="")
    telefono = Column(String(50), default="")
    cedula = Column(String(50), default="")
    binance_id = Column(String(100), default="")
    titular_cuenta = Column(String(100), default="")
    esta_activo = Column(Boolean, default=True)
    creado_en = Column(DateTime, default=datetime.utcnow)
    actualizado_en = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Suscripcion(Base):
    """Registro de pagos/suscripciones de clientes y vinculación con la API externa de tenants."""
    __tablename__ = "suscripciones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    codigo_plan = Column(String(50), nullable=False)  # 'FREE', 'BASIC', 'PRO'
    nombre_plan = Column(String(100), nullable=False)
    monto_usd = Column(Float, default=0.0)
    metodo_pago = Column(String(150), nullable=False)
    referencia_ultimos4 = Column(Text, nullable=False)
    ruta_comprobante = Column(String(255), nullable=True)
    estado = Column(String(20), default="pendiente")  # pendiente, aprobado, rechazado
    tiene_web = Column(Boolean, default=False)
    acepto_disclaimer_web = Column(Boolean, default=True)
    
    # Identificadores y estado de aprovisionamiento en la API externa miniPOS
    tenant_company_id = Column(String(100), nullable=True)
    tenant_admin_id = Column(String(100), nullable=True)
    tenant_plan_id = Column(String(100), nullable=True)
    tenant_provisioning_status = Column(String(50), default="pendiente")  # pendiente, exitoso, fallido
    tenant_error_detail = Column(Text, nullable=True)
    tenant_provisioned_at = Column(DateTime, nullable=True)

    fecha_inicio = Column(DateTime, default=datetime.utcnow)
    fecha_fin = Column(DateTime, nullable=True)
    creado_en = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario", back_populates="suscripciones")


class AccesoMiniposApi(Base):
    """Control de acceso para la app móvil miniPOS."""
    __tablename__ = "acceso_minipos_api"

    id = Column(Integer, primary_key=True, index=True)
    telefono = Column(String(50), unique=True, index=True, nullable=False)
    acceso_concedido = Column(Boolean, default=False)
    esta_bloqueado = Column(Boolean, default=False)
    estado = Column(String(50), default="activo")
    plan_activo = Column(String(50), default="ninguno")
    mensaje_bloqueo = Column(String(255), default="")
    fecha_expiracion = Column(DateTime, nullable=True)
    ultima_sincronizacion = Column(DateTime, default=datetime.utcnow)


class SesionDispositivo(Base):
    """Sesiones activas de dispositivos de clientes."""
    __tablename__ = "sesiones_dispositivo"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    token_dispositivo = Column(String(255), unique=True, index=True, nullable=False)
    direccion_ip = Column(String(50), default="")
    agente_usuario = Column(String(255), default="")
    esta_activo = Column(Boolean, default=True)
    creado_en = Column(DateTime, default=datetime.utcnow)
    ultimo_activo = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario", back_populates="sesiones")


class ClienteBajaAudit(Base):
    """Auditoría de bajas/eliminaciones de clientes para trazabilidad del motivo de baja."""
    __tablename__ = "clientes_bajas_audit"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id_original = Column(Integer, nullable=False)
    nombre_completo = Column(String(150), nullable=False)
    telefono = Column(String(50), nullable=False)
    nombre_empresa = Column(String(150), default="")
    email = Column(String(150), nullable=True)
    ultimo_plan = Column(String(50), default="")
    motivo_eliminacion = Column(Text, nullable=False)
    eliminado_por_admin = Column(String(100), default="Admin")
    fecha_eliminacion = Column(DateTime, default=datetime.utcnow)

