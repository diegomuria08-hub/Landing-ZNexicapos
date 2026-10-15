import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

from fastapi import FastAPI, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db
from app import models
from app.routers import autenticacion, metodos_pago, suscripciones, administracion, minipos_api

# Crear/verificar tablas en la base de datos automáticamente
Base.metadata.create_all(bind=engine)
print("[OK] Tablas verificadas en la base de datos activa.")

app = FastAPI(
    title="miniPOS - Landing Page & Sistema de Suscripciones",
    description="Plataforma SaaS para venta de suscripciones del sistema miniPOS para pequeños negocios.",
    version="2.1.0"
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
        }
    )


@app.get("/admin")
def render_admin(request: Request):
    """Renderizar el panel de administración confidencial."""
    return templates.TemplateResponse(
        request=request,
        name="admin.html",
        context={}
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
