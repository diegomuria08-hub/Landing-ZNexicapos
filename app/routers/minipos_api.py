from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/minipos", tags=["API Consumo App miniPOS"])


@router.get("/access-check/{phone}", response_model=schemas.AccesoMiniposOut)
def check_access(phone: str, db: Session = Depends(get_db)):
    """Verificar acceso de un teléfono a la app miniPOS."""
    phone_query = phone.strip()
    usuario = db.query(models.Usuario).filter(
        func.lower(models.Usuario.telefono) == phone_query.lower()
    ).first()

    record = db.query(models.AccesoMiniposApi).filter(
        func.lower(models.AccesoMiniposApi.telefono) == phone_query.lower()
    ).first()

    # Si el usuario está registrado
    if usuario:
        if usuario.esta_bloqueado:
            # Usuario explícitamente bloqueado
            msg = usuario.motivo_bloqueo or "Tu cuenta se encuentra bloqueada por falta de pago. Por favor regulariza tu suscripción en miniPOS."
            if record:
                record.acceso_concedido = False
                record.esta_bloqueado = True
                record.estado = "bloqueado"
                record.mensaje_bloqueo = msg
                record.ultima_sincronizacion = datetime.utcnow()
                db.commit()
                db.refresh(record)
                return record
            else:
                new_rec = models.AccesoMiniposApi(
                    telefono=usuario.telefono,
                    acceso_concedido=False,
                    esta_bloqueado=True,
                    estado="bloqueado",
                    plan_activo="ninguno",
                    mensaje_bloqueo=msg,
                    ultima_sincronizacion=datetime.utcnow()
                )
                db.add(new_rec)
                db.commit()
                db.refresh(new_rec)
                return new_rec

        # Verificar suscripción activa aprobada
        active_sub = db.query(models.Suscripcion).filter(
            models.Suscripcion.usuario_id == usuario.id,
            models.Suscripcion.estado == "aprobado"
        ).order_by(models.Suscripcion.id.desc()).first()

        if active_sub:
            # Cuenta solvente con acceso activo
            if record:
                record.acceso_concedido = True
                record.esta_bloqueado = False
                record.estado = "activo"
                record.plan_activo = active_sub.codigo_plan
                record.mensaje_bloqueo = ""
                record.ultima_sincronizacion = datetime.utcnow()
                db.commit()
                db.refresh(record)
                return record
            else:
                new_rec = models.AccesoMiniposApi(
                    telefono=usuario.telefono,
                    acceso_concedido=True,
                    esta_bloqueado=False,
                    estado="activo",
                    plan_activo=active_sub.codigo_plan,
                    mensaje_bloqueo="",
                    ultima_sincronizacion=datetime.utcnow()
                )
                db.add(new_rec)
                db.commit()
                db.refresh(new_rec)
                return new_rec
        else:
            # Registrado pero sin pago aprobado -> Bloqueado
            msg = "Tu cuenta se encuentra bloqueada por falta de pago o verificación pendiente. Ingresa a miniPOS para activar tu plan."
            if record:
                record.acceso_concedido = False
                record.esta_bloqueado = True
                record.estado = "bloqueado"
                record.mensaje_bloqueo = msg
                record.ultima_sincronizacion = datetime.utcnow()
                db.commit()
                db.refresh(record)
                return record
            else:
                new_rec = models.AccesoMiniposApi(
                    telefono=usuario.telefono,
                    acceso_concedido=False,
                    esta_bloqueado=True,
                    estado="bloqueado",
                    plan_activo="ninguno",
                    mensaje_bloqueo=msg,
                    ultima_sincronizacion=datetime.utcnow()
                )
                db.add(new_rec)
                db.commit()
                db.refresh(new_rec)
                return new_rec

    # Si no existe el usuario en el sistema
    return models.AccesoMiniposApi(
        telefono=phone_query,
        acceso_concedido=False,
        esta_bloqueado=True,
        estado="bloqueado",
        plan_activo="ninguno",
        mensaje_bloqueo="Número no registrado en el sistema miniPOS. Por favor regístrate y adquiere un plan.",
        fecha_expiracion=None,
        ultima_sincronizacion=datetime.utcnow()
    )
