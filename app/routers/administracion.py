import os
import urllib.parse
from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, security
from app.services.time_service import get_realtime_caracas_now

router = APIRouter(prefix="/api/admin", tags=["Administración"])


# ────────────────────────────────────────────────────
# GESTIÓN DE SUSCRIPCIONES (Admin)
# ────────────────────────────────────────────────────

@router.get("/suscripciones", response_model=List[schemas.SuscripcionOut])
def get_all_subscriptions(
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Listar todas las suscripciones/pagos registrados."""
    subs = db.query(models.Suscripcion).order_by(models.Suscripcion.id.desc()).all()
    return subs


@router.put("/suscripciones/{sub_id}/estado", response_model=schemas.SuscripcionOut)
def update_subscription_status(
    sub_id: int,
    status_update: schemas.ActualizarEstadoSuscripcion,
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Aprobar, rechazar o poner pendiente una suscripción."""
    sub = db.query(models.Suscripcion).filter(models.Suscripcion.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada.")

    new_status = status_update.status.lower()
    if new_status not in ["aprobado", "rechazado", "pendiente"]:
        raise HTTPException(status_code=400, detail="Estado de pago no válido.")

    sub.estado = new_status

    # Actualizar estado de acceso del usuario
    usuario = db.query(models.Usuario).filter(models.Usuario.id == sub.usuario_id).first()
    if usuario:
        if new_status == "aprobado":
            usuario.esta_bloqueado = False
            usuario.motivo_bloqueo = ""
            
            # Disparar aprovisionamiento en la API externa si aún no está aprovisionado
            if sub.tenant_provisioning_status != "exitoso":
                from app.services.provisioning import provision_tenant_sync
                empresa = usuario.nombre_empresa or f"Negocio de {usuario.nombre_completo}"
                email_admin = usuario.email or f"{usuario.telefono}@minipos-user.com"
                admin_pass = "MiniPosPass2026!"
                try:
                    remote_resp = provision_tenant_sync(
                        company_name=empresa,
                        admin_name=usuario.nombre_completo,
                        admin_email=email_admin,
                        admin_password=admin_pass,
                        plan_code=sub.codigo_plan
                    )
                    data_body = remote_resp.get("data", {})
                    sub.tenant_company_id = data_body.get("company", {}).get("id")
                    sub.tenant_admin_id = data_body.get("admin", {}).get("id")
                    sub.tenant_plan_id = data_body.get("plan", {}).get("id")
                    sub.tenant_provisioning_status = "exitoso"
                    sub.tenant_provisioned_at = datetime.utcnow()
                except Exception as e:
                    sub.tenant_provisioning_status = "fallido"
                    sub.tenant_error_detail = str(e)
        elif new_status == "rechazado":
            usuario.esta_bloqueado = True
            usuario.motivo_bloqueo = "Pago rechazado por el administrador. Regulariza tu suscripción."

        # Sincronizar en AccesoMiniposApi
        access_rec = db.query(models.AccesoMiniposApi).filter(
            models.AccesoMiniposApi.telefono == usuario.telefono
        ).first()
        if not access_rec:
            access_rec = models.AccesoMiniposApi(
                telefono=usuario.telefono,
                acceso_concedido=(new_status == "aprobado"),
                esta_bloqueado=(new_status != "aprobado"),
                estado="activo" if new_status == "aprobado" else "bloqueado",
                plan_activo=sub.codigo_plan if new_status == "aprobado" else "ninguno",
                mensaje_bloqueo="" if new_status == "aprobado" else "Acceso restringido por pago no aprobado.",
                ultima_sincronizacion=datetime.utcnow()
            )
            db.add(access_rec)
        else:
            access_rec.acceso_concedido = (new_status == "aprobado")
            access_rec.esta_bloqueado = (new_status != "aprobado")
            access_rec.estado = "activo" if new_status == "aprobado" else "bloqueado"
            access_rec.plan_activo = sub.codigo_plan if new_status == "aprobado" else "ninguno"
            access_rec.mensaje_bloqueo = "" if new_status == "aprobado" else "Acceso restringido por pago no aprobado."
            access_rec.ultima_sincronizacion = datetime.utcnow()

    db.commit()
    db.refresh(sub)
    return sub


# ────────────────────────────────────────────────────
# BLOQUEO / DESBLOQUEO DE USUARIOS
# ────────────────────────────────────────────────────

@router.put("/usuarios/{user_id}/toggle-bloqueo")
def toggle_user_block(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Alternar bloqueo/desbloqueo de un usuario."""
    usuario = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    usuario.esta_bloqueado = not bool(usuario.esta_bloqueado)
    if usuario.esta_bloqueado:
        usuario.motivo_bloqueo = "Cuenta bloqueada administrativamente por falta de pago."
    else:
        usuario.motivo_bloqueo = ""

    # Sincronizar en AccesoMiniposApi
    access_rec = db.query(models.AccesoMiniposApi).filter(
        models.AccesoMiniposApi.telefono == usuario.telefono
    ).first()
    if access_rec:
        access_rec.esta_bloqueado = usuario.esta_bloqueado
        access_rec.acceso_concedido = not usuario.esta_bloqueado
        access_rec.estado = "bloqueado" if usuario.esta_bloqueado else "activo"
        access_rec.mensaje_bloqueo = usuario.motivo_bloqueo
        access_rec.ultima_sincronizacion = datetime.utcnow()

    db.commit()
    db.refresh(usuario)
    return {
        "message": f"Usuario {'bloqueado' if usuario.esta_bloqueado else 'desbloqueado'} con éxito.",
        "esta_bloqueado": usuario.esta_bloqueado,
        "user_id": usuario.id
    }


# ────────────────────────────────────────────────────
# DIRECTORIO DE CLIENTES Y GESTIÓN DE LICENCIAS
# ────────────────────────────────────────────────────

@router.get("/clientes")
def get_all_clients(
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Listado permanente de clientes con cálculo preciso de ciclo mensual, vencimiento y estados claros."""
    clientes = db.query(models.Usuario).filter(models.Usuario.rol == "cliente").order_by(models.Usuario.id.desc()).all()
    now_caracas = get_realtime_caracas_now()

    result = []
    for c in clientes:
        # Última suscripción del cliente
        latest_sub = db.query(models.Suscripcion).filter(
            models.Suscripcion.usuario_id == c.id
        ).order_by(models.Suscripcion.id.desc()).first()

        access_rec = db.query(models.AccesoMiniposApi).filter(
            models.AccesoMiniposApi.telefono == c.telefono
        ).first()

        plan_code = latest_sub.codigo_plan if latest_sub else "FREE"
        plan_name = latest_sub.nombre_plan if latest_sub else "Plan Prueba Gratis"
        sub_estado = latest_sub.estado if latest_sub else "aprobado"
        fecha_inicio = latest_sub.fecha_inicio if (latest_sub and latest_sub.fecha_inicio) else (c.creado_en or now_caracas)
        
        # Fecha de vencimiento / corte mensual: 30 días a partir de la fecha de inicio
        fecha_fin = latest_sub.fecha_fin if (latest_sub and latest_sub.fecha_fin) else (fecha_inicio + timedelta(days=30))
        
        # Calcular días restantes de licencia
        delta = (fecha_fin.date() - now_caracas.date()).days
        dias_restantes = max(0, delta)
        esta_vencido = delta <= 0

        # Determinación transparente del estado del cliente en el flujo de negocio:
        # 1. Pago pendiente de aprobación por el admin
        # 2. Bloqueado / Cortado manualmente
        # 3. Vencido por fecha de corte
        # 4. Próximo a vencer (<= 5 días)
        # 5. Activo al día
        if sub_estado == "pendiente":
            estado_servicio = "pendiente_aprobacion"
            badge_label = "Pendiente Aprobación"
            mensaje_servicio = "Pago registrado en espera de verificación del comprobante."
            servicio_activo = False
        elif c.esta_bloqueado:
            estado_servicio = "suspendido"
            badge_label = "Servicio Suspendido"
            mensaje_servicio = c.motivo_bloqueo or "Servicio suspendido por administración por falta de pago."
            servicio_activo = False
        elif esta_vencido:
            estado_servicio = "vencido"
            badge_label = "Vencido (Ciclo Cumplido)"
            mensaje_servicio = "Periodo mensual culminado. Requiere pago de renovación."
            servicio_activo = False
        elif dias_restantes <= 5:
            estado_servicio = "por_vencer"
            badge_label = f"Por Vencer ({dias_restantes} días)"
            mensaje_servicio = f"Próximo a fecha de corte. Restan {dias_restantes} días."
            servicio_activo = True
        else:
            estado_servicio = "activo"
            badge_label = "Activo en la App"
            mensaje_servicio = "Servicio al día y operativo."
            servicio_activo = True

        result.append({
            "id": c.id,
            "nombre_completo": c.nombre_completo,
            "nombre_empresa": c.nombre_empresa or f"Negocio de {c.nombre_completo}",
            "email": c.email or "",
            "telefono": c.telefono,
            "esta_bloqueado": bool(c.esta_bloqueado),
            "motivo_bloqueo": c.motivo_bloqueo or "",
            "plan_codigo": plan_code,
            "plan_nombre": plan_name,
            "sub_estado": sub_estado,
            "estado_servicio": estado_servicio,
            "badge_label": badge_label,
            "mensaje_servicio": mensaje_servicio,
            "fecha_inicio": fecha_inicio.strftime("%Y-%m-%d"),
            "fecha_fin": fecha_fin.strftime("%Y-%m-%d"),
            "dias_restantes": dias_restantes,
            "esta_vencido": esta_vencido,
            "servicio_activo": servicio_activo,
            "app_concedido": access_rec.acceso_concedido if access_rec else servicio_activo
        })

    return result


@router.post("/clientes/{user_id}/suspender-servicio")
def suspend_client_service(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Corta el servicio al cliente por falta de renovación o pago. La app móvil deniega el acceso."""
    usuario = db.query(models.Usuario).filter(models.Usuario.id == user_id, models.Usuario.rol == "cliente").first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    usuario.esta_bloqueado = True
    usuario.motivo_bloqueo = "Servicio suspendido por falta de renovación de plan o mensualidad."

    # Sincronizar en AccesoMiniposApi
    access_rec = db.query(models.AccesoMiniposApi).filter(
        models.AccesoMiniposApi.telefono == usuario.telefono
    ).first()
    if not access_rec:
        access_rec = models.AccesoMiniposApi(
            telefono=usuario.telefono,
            acceso_concedido=False,
            esta_bloqueado=True,
            estado="suspendido",
            plan_activo="ninguno",
            mensaje_bloqueo="Tu servicio miniPOS ha sido suspendido por falta de pago. Renueva tu plan para continuar facturando.",
            ultima_sincronizacion=get_realtime_caracas_now()
        )
        db.add(access_rec)
    else:
        access_rec.acceso_concedido = False
        access_rec.esta_bloqueado = True
        access_rec.estado = "suspendido"
        access_rec.mensaje_bloqueo = "Tu servicio miniPOS ha sido suspendido por falta de pago. Renueva tu plan para continuar facturando."
        access_rec.ultima_sincronizacion = get_realtime_caracas_now()

    # Cerrar sesiones activas en dispositivos para forzar petición de login
    db.query(models.SesionDispositivo).filter(
        models.SesionDispositivo.usuario_id == usuario.id
    ).update({"esta_activo": False})

    db.commit()
    db.refresh(usuario)

    return {
        "message": f"Servicio suspendido exitosamente para {usuario.nombre_completo}. La app móvil le exigirá inicio de sesión y denegará el acceso hasta que renueve su plan.",
        "cliente_id": usuario.id,
        "esta_bloqueado": True
    }


@router.post("/clientes/{user_id}/reactivar-servicio")
def reactivate_client_service(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Reactiva el servicio al cliente restaurando acceso completo a la app móvil e iniciando nuevo ciclo mensual de 30 días."""
    usuario = db.query(models.Usuario).filter(models.Usuario.id == user_id, models.Usuario.rol == "cliente").first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    usuario.esta_bloqueado = False
    usuario.motivo_bloqueo = ""

    now_caracas = get_realtime_caracas_now()

    # Si tenía suscripción, renovar ciclo mensual
    latest_sub = db.query(models.Suscripcion).filter(
        models.Suscripcion.usuario_id == usuario.id
    ).order_by(models.Suscripcion.id.desc()).first()

    if latest_sub:
        latest_sub.estado = "aprobado"
        latest_sub.fecha_inicio = now_caracas
        latest_sub.fecha_fin = now_caracas + timedelta(days=30)

    # Sincronizar en AccesoMiniposApi
    access_rec = db.query(models.AccesoMiniposApi).filter(
        models.AccesoMiniposApi.telefono == usuario.telefono
    ).first()
    if access_rec:
        access_rec.acceso_concedido = True
        access_rec.esta_bloqueado = False
        access_rec.estado = "activo"
        access_rec.mensaje_bloqueo = ""
        access_rec.fecha_expiracion = now_caracas + timedelta(days=30)
        access_rec.ultima_sincronizacion = now_caracas

    db.commit()
    db.refresh(usuario)

    return {
        "message": f"Servicio reactivado exitosamente para {usuario.nombre_completo}. Se renovó el ciclo por 30 días y el acceso a la app móvil ha sido restablecido.",
        "cliente_id": usuario.id,
        "esta_bloqueado": False
    }


@router.delete("/clientes/{user_id}")
def delete_client_permanently(
    user_id: int,
    payload: schemas.EliminarClienteIn,
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Eliminar un cliente definitivamente de la base de datos con registro de auditoría del motivo."""
    usuario = db.query(models.Usuario).filter(models.Usuario.id == user_id, models.Usuario.rol == "cliente").first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Cliente no encontrado o no tiene permisos para eliminar administradores.")

    motivo = payload.motivo.strip() if payload.motivo else "Baja solicitada / Ya no utiliza el sistema"

    # Obtener el último plan para el registro de auditoría
    latest_sub = db.query(models.Suscripcion).filter(
        models.Suscripcion.usuario_id == usuario.id
    ).order_by(models.Suscripcion.id.desc()).first()
    ultimo_plan = latest_sub.codigo_plan if latest_sub else "FREE"

    # 1. Registrar en la tabla de auditoría
    baja_audit = models.ClienteBajaAudit(
        cliente_id_original=usuario.id,
        nombre_completo=usuario.nombre_completo,
        telefono=usuario.telefono,
        nombre_empresa=usuario.nombre_empresa or "",
        email=usuario.email or "",
        ultimo_plan=ultimo_plan,
        motivo_eliminacion=motivo,
        eliminado_por_admin=admin_user.nombre_completo or "Administrador",
        fecha_eliminacion=get_realtime_caracas_now()
    )
    db.add(baja_audit)

    # 2. Eliminar comprobantes en disco
    subs = db.query(models.Suscripcion).filter(models.Suscripcion.usuario_id == usuario.id).all()
    for s in subs:
        if s.ruta_comprobante:
            fpath = s.ruta_comprobante.lstrip("/")
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except Exception:
                    pass

    # 3. Eliminar suscripciones
    db.query(models.Suscripcion).filter(models.Suscripcion.usuario_id == usuario.id).delete(synchronize_session=False)

    # 4. Eliminar sesiones de dispositivo
    db.query(models.SesionDispositivo).filter(models.SesionDispositivo.usuario_id == usuario.id).delete(synchronize_session=False)

    # 5. Eliminar registro de control de acceso miniPOS
    db.query(models.AccesoMiniposApi).filter(models.AccesoMiniposApi.telefono == usuario.telefono).delete(synchronize_session=False)

    # 6. Eliminar usuario
    db.delete(usuario)
    db.commit()

    return {
        "message": f"Cliente '{baja_audit.nombre_completo}' ({baja_audit.telefono}) ha sido eliminado permanentemente de la base de datos.",
        "cliente_id": user_id,
        "motivo": motivo
    }



# ────────────────────────────────────────────────────
# PURGA Y LIMPIEZA DE SUSCRIPCIONES
# ────────────────────────────────────────────────────

@router.delete("/suscripciones/purgar-todo")
def purge_all_subscriptions(
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Purgar TODOS los registros de pago/suscripción."""
    all_subs = db.query(models.Suscripcion).all()
    deleted_count = len(all_subs)

    # Limpieza física de archivos de comprobante en disco
    for s in all_subs:
        if s.ruta_comprobante:
            # Remover el "/" inicial para obtener ruta relativa al proyecto
            file_path = s.ruta_comprobante.lstrip("/")
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception:
                    pass

    db.query(models.Suscripcion).delete(synchronize_session=False)
    db.commit()
    return {
        "message": f"Se eliminaron exitosamente los {deleted_count} registros de pagos del historial.",
        "deleted_count": deleted_count
    }


@router.post("/suscripciones/limpiar-antiguos")
def cleanup_old_subscriptions(
    days: int = 7,
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Eliminar registros de pago rechazados o más antiguos de N días."""
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    old_subs = db.query(models.Suscripcion).filter(
        (models.Suscripcion.creado_en < cutoff_date) | (models.Suscripcion.estado == "rechazado")
    ).all()
    deleted_count = len(old_subs)

    for s in old_subs:
        if s.ruta_comprobante:
            file_path = s.ruta_comprobante.lstrip("/")
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception:
                    pass
        db.delete(s)

    db.commit()
    return {
        "message": f"Se eliminaron {deleted_count} registros de pago antiguos o rechazados.",
        "deleted_count": deleted_count
    }


@router.delete("/suscripciones/{sub_id}")
def delete_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Eliminar un registro de pago/suscripción específico."""
    sub = db.query(models.Suscripcion).filter(models.Suscripcion.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada.")

    if sub.ruta_comprobante:
        file_path = sub.ruta_comprobante.lstrip("/")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

    db.delete(sub)
    db.commit()
    return {"message": f"Suscripción #{sub_id} eliminada exitosamente."}


# ────────────────────────────────────────────────────
# NOTIFICACIÓN WHATSAPP
# ────────────────────────────────────────────────────

@router.get("/whatsapp-link/{sub_id}")
def generate_whatsapp_link(
    sub_id: int,
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Generar enlace de WhatsApp para notificar al cliente sobre su pago."""
    sub = db.query(models.Suscripcion).filter(models.Suscripcion.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada.")

    usuario = db.query(models.Usuario).filter(models.Usuario.id == sub.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    phone_clean = usuario.telefono.replace("-", "").replace(" ", "").replace("+", "")
    if phone_clean.startswith("0"):
        phone_clean = "58" + phone_clean[1:]

    msg = (
        f"👋 Hola {usuario.nombre_completo}, ¡excelentes noticias!\n\n"
        f"Tu pago para el *{sub.nombre_plan}* de *miniPOS* ha sido verificado con éxito. ✅\n\n"
        f"📱 Ya tienes *ACCESO COMPLETO* a la aplicación miniPOS en tu dispositivo móvil.\n"
        f"¡Gracias por confiar en nosotros para hacer crecer tu negocio!"
    )

    encoded_msg = urllib.parse.quote(msg)
    wa_url = f"https://api.whatsapp.com/send?phone={phone_clean}&text={encoded_msg}"

    return {"phone": usuario.telefono, "whatsapp_url": wa_url, "message": msg}


# ────────────────────────────────────────────────────
# PERFIL DEL ADMINISTRADOR (Actualización de Usuario y Clave)
# ────────────────────────────────────────────────────

@router.get("/perfil")
def get_admin_profile(
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Obtener datos del perfil del administrador autenticado."""
    return {
        "id": admin_user.id,
        "nombre_completo": admin_user.nombre_completo,
        "username": admin_user.telefono,
        "email": admin_user.email or "",
        "rol": admin_user.rol,
        "creado_en": admin_user.creado_en
    }


@router.put("/perfil")
def update_admin_profile(
    datos: schemas.ActualizarPerfilAdmin,
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Actualizar nombre, usuario o contraseña del administrador autenticado mediante UPDATE."""
    # 1. Verificar contraseña actual obligatoria
    if not security.verify_password(datos.password_actual, admin_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual ingresada es incorrecta."
        )

    # 2. Actualizar nombre completo si viene informado
    if datos.nombre_completo and datos.nombre_completo.strip():
        admin_user.nombre_completo = datos.nombre_completo.strip()

    # 3. Actualizar nombre de usuario si se modificó
    if datos.nuevo_username and datos.nuevo_username.strip() != admin_user.telefono:
        new_user = datos.nuevo_username.strip()
        exists = db.query(models.Usuario).filter(
            models.Usuario.telefono == new_user,
            models.Usuario.id != admin_user.id
        ).first()
        if exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El nombre de usuario ya está registrado por otra cuenta."
            )
        admin_user.telefono = new_user

    # 4. Actualizar contraseña si se especificó una nueva
    if datos.nueva_password and datos.nueva_password.strip():
        new_pwd = datos.nueva_password.strip()
        if len(new_pwd) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La nueva contraseña debe tener mínimo 6 caracteres."
            )
        admin_user.password_hash = security.get_password_hash(new_pwd)

    db.commit()
    db.refresh(admin_user)

    # Generar nuevo token con el usuario actualizado
    nuevo_token = security.create_access_token(data={"sub": admin_user.telefono, "role": admin_user.rol})

    return {
        "message": "Perfil de administrador actualizado exitosamente.",
        "user": {
            "id": admin_user.id,
            "nombre_completo": admin_user.nombre_completo,
            "username": admin_user.telefono,
            "rol": admin_user.rol
        },
        "token": nuevo_token
    }


# ────────────────────────────────────────────────────
# PURGA SEGURA DE DATOS DE PRUEBA
# ────────────────────────────────────────────────────

@router.post("/limpiar-datos-prueba")
def purge_test_data(
    db: Session = Depends(get_db),
    admin_user: models.Usuario = Depends(security.require_admin)
):
    """Eliminar todos los clientes y suscripciones de prueba, preservando los 3 administradores."""
    clientes = db.query(models.Usuario).filter(models.Usuario.rol != "admin").all()
    client_ids = [c.id for c in clientes]
    client_phones = [c.telefono for c in clientes]

    u_count = 0
    if client_ids:
        db.query(models.Suscripcion).filter(models.Suscripcion.usuario_id.in_(client_ids)).delete(synchronize_session=False)
        db.query(models.SesionDispositivo).filter(models.SesionDispositivo.usuario_id.in_(client_ids)).delete(synchronize_session=False)
        db.query(models.AccesoMiniposApi).filter(models.AccesoMiniposApi.telefono.in_(client_phones)).delete(synchronize_session=False)
        u_count = db.query(models.Usuario).filter(models.Usuario.rol != "admin").delete(synchronize_session=False)

    db.commit()

    admins_count = db.query(models.Usuario).filter(models.Usuario.rol == "admin").count()
    return {
        "message": f"Purga completada exitosamente. Se eliminaron {u_count} cuentas de prueba. Las {admins_count} cuentas de administradores y métodos de pago se preservan intactos.",
        "eliminados": u_count,
        "admins_activos": admins_count
    }

