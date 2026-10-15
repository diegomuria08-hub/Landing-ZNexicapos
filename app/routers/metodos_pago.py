from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, security

router = APIRouter(prefix="/api/metodos-pago", tags=["Métodos de Pago"])


# ────────────────────────────────────────────────────
# ENDPOINT PÚBLICO — Solo métodos activos para la landing
# ────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.MetodoPagoOut])
def listar_metodos_pago_publicos(db: Session = Depends(get_db)):
    """Retorna únicamente los métodos de pago activos configurados dinámicamente en la base de datos."""
    return db.query(models.MetodoPago).filter(
        models.MetodoPago.esta_activo == True
    ).order_by(models.MetodoPago.id.asc()).all()


# ────────────────────────────────────────────────────
# ENDPOINTS ADMIN — CRUD completo de métodos de pago
# ────────────────────────────────────────────────────

@router.get("/admin", response_model=List[schemas.MetodoPagoOut])
def listar_todos_metodos_admin(
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Listar TODOS los métodos de pago (activos e inactivos) — Solo admin."""
    return db.query(models.MetodoPago).order_by(models.MetodoPago.id.asc()).all()


@router.post("/admin", response_model=schemas.MetodoPagoOut)
def crear_metodo_pago(
    method_in: schemas.MetodoPagoCrear,
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Crear un nuevo método de pago en la base de datos."""
    metodo = models.MetodoPago(
        tipo_metodo=method_in.tipo_metodo,
        titulo=method_in.titulo,
        nombre_banco=method_in.nombre_banco or "",
        telefono=method_in.telefono or "",
        cedula=method_in.cedula or "",
        binance_id=method_in.binance_id or "",
        titular_cuenta=method_in.titular_cuenta or "",
        esta_activo=True
    )
    db.add(metodo)
    db.commit()
    db.refresh(metodo)
    return metodo


@router.put("/admin/{method_id}", response_model=schemas.MetodoPagoOut)
def actualizar_metodo_pago(
    method_id: int,
    method_in: schemas.MetodoPagoActualizar,
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Actualizar un método de pago existente por ID."""
    metodo = db.query(models.MetodoPago).filter(models.MetodoPago.id == method_id).first()
    if not metodo:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado.")

    metodo.tipo_metodo = method_in.tipo_metodo
    metodo.titulo = method_in.titulo
    metodo.nombre_banco = method_in.nombre_banco or ""
    metodo.telefono = method_in.telefono or ""
    metodo.cedula = method_in.cedula or ""
    metodo.binance_id = method_in.binance_id or ""
    metodo.titular_cuenta = method_in.titular_cuenta or ""
    metodo.esta_activo = method_in.esta_activo
    metodo.actualizado_en = datetime.utcnow()

    db.commit()
    db.refresh(metodo)
    return metodo


@router.delete("/admin/{method_id}")
def eliminar_metodo_pago(
    method_id: int,
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Eliminar un método de pago permanentemente de la base de datos."""
    metodo = db.query(models.MetodoPago).filter(models.MetodoPago.id == method_id).first()
    if not metodo:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado.")

    db.delete(metodo)
    db.commit()
    return {"message": f"Método de pago #{method_id} eliminado exitosamente."}
