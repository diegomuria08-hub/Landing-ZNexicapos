import re
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas
from app.services.time_service import get_realtime_caracas_now

router = APIRouter(prefix="/api/v1/minipos", tags=["API Consumo App miniPOS"])


@router.get("/access-check/{phone}", response_model=schemas.AccesoMiniposOut)
def check_access(phone: str, db: Session = Depends(get_db)):
    """
    Verificar acceso de un cliente (por teléfono o correo) a la app miniPOS.
    Ejecuta corte automático del servicio si la fecha de vencimiento (ciclo de 30 días) ya se cumplió.
    """
    phone_query = phone.strip()
    now_caracas = get_realtime_caracas_now()

    usuario = db.query(models.Usuario).filter(
        (func.lower(models.Usuario.telefono) == phone_query.lower()) |
        (func.lower(models.Usuario.email) == phone_query.lower())
    ).first()

    # Fallback de búsqueda por últimos 10 dígitos numéricos si enviaron formato internacional (+58412... vs 0412...)
    if not usuario:
        digits_only = re.sub(r"\D", "", phone_query)
        if len(digits_only) >= 10:
            last10 = digits_only[-10:]
            usuario = db.query(models.Usuario).filter(
                models.Usuario.telefono.like(f"%{last10}")
            ).first()

    target_phone = usuario.telefono if usuario else phone_query
    record = db.query(models.AccesoMiniposApi).filter(
        func.lower(models.AccesoMiniposApi.telefono) == target_phone.lower()
    ).first()

    # Si el usuario está registrado
    if usuario:
        # 1. Buscar suscripción aprobada más reciente para validar fecha de corte / vencimiento
        active_sub = db.query(models.Suscripcion).filter(
            models.Suscripcion.usuario_id == usuario.id,
            models.Suscripcion.estado == "aprobado"
        ).order_by(models.Suscripcion.id.desc()).first()

        fecha_fin = None
        esta_vencido = False
        if active_sub:
            fecha_inicio = active_sub.fecha_inicio or usuario.creado_en or now_caracas
            fecha_fin = active_sub.fecha_fin if active_sub.fecha_fin else (fecha_inicio + timedelta(days=30))
            if not active_sub.fecha_fin:
                active_sub.fecha_fin = fecha_fin
            delta = (fecha_fin.date() - now_caracas.date()).days
            esta_vencido = delta <= 0

            # CORTE AUTOMÁTICO INMEDIATO SI YA SE PASÓ DE LA FECHA DE VENCIMIENTO
            if esta_vencido and not usuario.esta_bloqueado:
                usuario.esta_bloqueado = True
                usuario.motivo_bloqueo = "Tu suscripción mensual ha vencido (fecha de corte superada). Por favor renueva tu plan para continuar operando en miniPOS."
                db.query(models.SesionDispositivo).filter(
                    models.SesionDispositivo.usuario_id == usuario.id
                ).update({"esta_activo": False})

        # 2. Si el usuario está bloqueado (manualmente por admin o automáticamente por vencimiento de fecha)
        if usuario.esta_bloqueado or esta_vencido:
            estado_corte = "vencido" if esta_vencido else "suspendido"
            msg = (
                usuario.motivo_bloqueo
                or "Tu servicio miniPOS se encuentra suspendido o vencido por falta de pago. Por favor regulariza tu suscripción."
            )
            if not usuario.esta_bloqueado:
                usuario.esta_bloqueado = True
                usuario.motivo_bloqueo = msg

            if record:
                record.acceso_concedido = False
                record.esta_bloqueado = True
                record.estado = estado_corte
                record.plan_activo = "ninguno"
                record.mensaje_bloqueo = msg
                if fecha_fin:
                    record.fecha_expiracion = fecha_fin
                record.ultima_sincronizacion = now_caracas
                db.commit()
                db.refresh(record)
                return record
            else:
                new_rec = models.AccesoMiniposApi(
                    telefono=usuario.telefono,
                    acceso_concedido=False,
                    esta_bloqueado=True,
                    estado=estado_corte,
                    plan_activo="ninguno",
                    mensaje_bloqueo=msg,
                    fecha_expiracion=fecha_fin,
                    ultima_sincronizacion=now_caracas
                )
                db.add(new_rec)
                db.commit()
                db.refresh(new_rec)
                return new_rec

        # 3. Si tiene suscripción aprobada y vigente (no vencida y no bloqueada)
        if active_sub and not esta_vencido:
            if record:
                record.acceso_concedido = True
                record.esta_bloqueado = False
                record.estado = "activo"
                record.plan_activo = active_sub.codigo_plan
                record.mensaje_bloqueo = ""
                record.fecha_expiracion = fecha_fin
                record.ultima_sincronizacion = now_caracas
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
                    fecha_expiracion=fecha_fin,
                    ultima_sincronizacion=now_caracas
                )
                db.add(new_rec)
                db.commit()
                db.refresh(new_rec)
                return new_rec
        else:
            # Registrado pero sin pago aprobado -> Bloqueado / Pendiente
            msg = "Tu cuenta se encuentra bloqueada por falta de pago o verificación pendiente. Ingresa a miniPOS para activar tu plan."
            if record:
                record.acceso_concedido = False
                record.esta_bloqueado = True
                record.estado = "bloqueado"
                record.plan_activo = "ninguno"
                record.mensaje_bloqueo = msg
                record.ultima_sincronizacion = now_caracas
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
                    ultima_sincronizacion=now_caracas
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
        ultima_sincronizacion=now_caracas
    )
