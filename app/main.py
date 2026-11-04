import os
import asyncio
from contextlib import asynccontextmanager
from datetime import timedelta
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

from fastapi import FastAPI, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db, SessionLocal
from app import models
from app.routers import autenticacion, metodos_pago, suscripciones, administracion, minipos_api
from app.services.time_service import get_realtime_caracas_now

# Crear/verificar tablas en la base de datos automáticamente
Base.metadata.create_all(bind=engine)
print("[OK] Tablas verificadas en la base de datos activa.")


def enforce_expired_services_in_db():
    """
    Revisa automáticamente todos los clientes en la base de datos y suspende el servicio
    de inmediato a aquellos cuya fecha de vencimiento (fecha_fin) ya se cumplió,
    actualizando usuarios, acceso_minipos_api, la API externa y cerrando sesiones_dispositivo.
    """
    db = SessionLocal()
    try:
        now_caracas = get_realtime_caracas_now()
        clientes = db.query(models.Usuario).filter(models.Usuario.rol == "cliente").all()
        updated = False

        for c in clientes:
            latest_sub = db.query(models.Suscripcion).filter(
                models.Suscripcion.usuario_id == c.id
            ).order_by(models.Suscripcion.id.desc()).first()

            if not latest_sub:
                fecha_inicio = c.creado_en or now_caracas
                fecha_fin = fecha_inicio + timedelta(days=30)
                latest_sub = models.Suscripcion(
                    usuario_id=c.id,
                    codigo_plan="PRO",
                    nombre_plan="Plan Profesional ($20/mes)",
                    monto_usd=20.0,
                    metodo_pago="Registro Web",
                    referencia_ultimos4="REGISTRO",
                    estado="aprobado",
                    tiene_web=True,
                    acepto_disclaimer_web=True,
                    fecha_inicio=fecha_inicio,
                    fecha_fin=fecha_fin,
                    creado_en=fecha_inicio,
                    tenant_provisioning_status="pendiente"
                )
                db.add(latest_sub)
                db.flush()
                updated = True

            # Auto-reparación de aprovisionamiento si la suscripción aún no tiene tenant_company_id o falló antes
            if (not latest_sub.tenant_company_id or latest_sub.tenant_provisioning_status != "exitoso") and c.password_hash and not c.password_hash.startswith("$2"):
                try:
                    from app.services.provisioning import provision_tenant_sync
                    remote_resp = provision_tenant_sync(
                        company_name=c.nombre_empresa or f"Negocio de {c.nombre_completo}",
                        admin_name=c.nombre_completo,
                        admin_email=c.email or f"{c.telefono}@minipos-user.com",
                        admin_password=c.password_hash,
                        plan_code=latest_sub.codigo_plan or "PRO"
                    )
                    data_body = remote_resp.get("data", {})
                    latest_sub.tenant_company_id = data_body.get("company", {}).get("id")
                    latest_sub.tenant_admin_id = data_body.get("admin", {}).get("id")
                    latest_sub.tenant_plan_id = data_body.get("plan", {}).get("id")
                    latest_sub.tenant_provisioning_status = "exitoso"
                    latest_sub.tenant_error_detail = None
                    latest_sub.tenant_provisioned_at = now_caracas
                    updated = True
                except Exception as sync_err:
                    print(f"[WARN AUTO-SYNC] Cliente {c.email}: {sync_err}")

            if latest_sub.estado != "aprobado":
                continue

            fecha_inicio = latest_sub.fecha_inicio or c.creado_en or now_caracas
            fecha_fin = latest_sub.fecha_fin if latest_sub.fecha_fin else (fecha_inicio + timedelta(days=30))
            if not latest_sub.fecha_fin:
                latest_sub.fecha_fin = fecha_fin
                updated = True

            delta = (fecha_fin.date() - now_caracas.date()).days
            esta_vencido = delta <= 0

            if esta_vencido:
                msg_corte = (
                    "Tu suscripción mensual ha vencido (fecha de corte superada). "
                    "Por favor renueva tu plan para continuar operando en ZNexica POS."
                )
                if not c.esta_bloqueado:
                    c.esta_bloqueado = True
                    c.motivo_bloqueo = msg_corte
                    db.query(models.SesionDispositivo).filter(
                        models.SesionDispositivo.usuario_id == c.id
                    ).update({"esta_activo": False})
                    try:
                        from app.services.provisioning import sync_app_access
                        sync_app_access(db, c, active=False, reason="Vencimiento de ciclo mensual")
                    except Exception as _sync_err:
                        print(f"[WARN] Error notificando suspensión en App a {c.email}: {_sync_err}")
                    updated = True

                access_rec = db.query(models.AccesoMiniposApi).filter(
                    models.AccesoMiniposApi.telefono == c.telefono
                ).first()
                if not access_rec:
                    access_rec = models.AccesoMiniposApi(
                        telefono=c.telefono,
                        acceso_concedido=False,
                        esta_bloqueado=True,
                        estado="vencido",
                        plan_activo="ninguno",
                        mensaje_bloqueo=c.motivo_bloqueo or msg_corte,
                        fecha_expiracion=fecha_fin,
                        ultima_sincronizacion=now_caracas
                    )
                    db.add(access_rec)
                    updated = True
                elif access_rec.acceso_concedido or not access_rec.esta_bloqueado or access_rec.estado != "vencido":
                    access_rec.acceso_concedido = False
                    access_rec.esta_bloqueado = True
                    access_rec.estado = "vencido"
                    access_rec.plan_activo = "ninguno"
                    access_rec.mensaje_bloqueo = c.motivo_bloqueo or msg_corte
                    access_rec.fecha_expiracion = fecha_fin
                    access_rec.ultima_sincronizacion = now_caracas
                    updated = True

        if updated:
            db.commit()
    except Exception as e:
        print(f"[WARN] Revisión automática de vencimientos: {e}")
        db.rollback()
    finally:
        db.close()


async def periodic_expiration_watcher():
    """Tarea en segundo plano que verifica y suspende servicios vencidos cada 10 minutos sin intervención manual."""
    while True:
        try:
            await asyncio.to_thread(enforce_expired_services_in_db)
        except Exception:
            pass
        await asyncio.sleep(600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(periodic_expiration_watcher())
    yield
    task.cancel()


app = FastAPI(
    title="ZNexica POS - Landing Page & Sistema de Suscripciones",
    description="Plataforma SaaS para venta de suscripciones del sistema ZNexica POS para pequeños negocios y comercios.",
    version="2.2.0",
    lifespan=lifespan
)

# Configuración dinámica de CORS
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Archivos estáticos y plantillas Jinja2
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Registrar Routers de la API
app.include_router(autenticacion.router)
app.include_router(metodos_pago.router)
app.include_router(suscripciones.router)
app.include_router(administracion.router)
app.include_router(minipos_api.router)


@app.get("/api/config/contacto")
def get_contact_config():
    """Retorna los datos de contacto y WhatsApp configurables desde .env"""
    phone = os.getenv("WHATSAPP_ADMIN_PHONE", "584243580005").strip()
    return {"whatsapp_admin_phone": phone}


@app.get("/")
def render_landing(request: Request, db: Session = Depends(get_db)):
    """Renderizar la landing page con los métodos de pago activos desde la base de datos."""
    try:
        payment_methods = db.query(models.MetodoPago).filter(
            models.MetodoPago.esta_activo == True
        ).order_by(models.MetodoPago.id.asc()).all()
    except Exception as e:
        print(f"[ERROR LANDING] Error al obtener métodos de pago: {e}")
        payment_methods = []

    admin_whatsapp = os.getenv("WHATSAPP_ADMIN_PHONE", "584243580005").strip()

    return templates.TemplateResponse(
        request,
        "index.html",
        context={
            "payment_methods": payment_methods,
            "admin_whatsapp_phone": admin_whatsapp
        },
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.get("/admin")
def render_admin(request: Request):
    """Renderizar el panel de administración confidencial."""
    return templates.TemplateResponse(
        request=request,
        name="admin.html",
        context={},
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
