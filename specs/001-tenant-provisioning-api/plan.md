# Implementation Plan: Tenant Provisioning API & Platform Modernization

**Branch**: `001-tenant-provisioning-api` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-tenant-provisioning-api/spec.md`

## Summary

Integración completa y desatendida de la API Externa de Aprovisionamiento de Tenants (`POST /api/provisioning/tenant`) en el sistema miniPOS Landing, sincronización del catálogo de planes comerciales con precios exactos (`FREE $0`, `BASIC $8`, `PRO $10`), soporte multi-dialecto para base de datos PostgreSQL (Supabase) con preservación de datos, y preparación de la arquitectura para despliegue en Render con compatibilidad para futuros dominios personalizados.

## Technical Context

**Language/Version**: Python 3.10+ (FastAPI + Pydantic v2 + Uvicorn)
**Primary Dependencies**: FastAPI, SQLAlchemy, Pydantic, httpx (o requests con HTTPBasicAuth), python-dotenv, passlib/bcrypt, psycopg2-binary
**Storage**: PostgreSQL en Supabase (compatible con MySQL/SQLite local durante la transición) con SQLAlchemy ORM
**Testing**: Pruebas de integración de endpoints (`tests/test_provisioning_api.py`), script de validación de conexión y quickstart de flujo de usuario
**Target Platform**: Linux Server (Render Web Service) / Windows local en desarrollo
**Project Type**: Web Application Full-Stack (Backend RESTful FastAPI + Frontend Jinja2/HTML5/Vanilla CSS/JS ES6)
**Performance Goals**: Tiempo de respuesta de checkout < 1.5s; tiempo de aprovisionamiento desatendido en API externa < 4s
**Constraints**: Cero hardcoding de credenciales, métodos de pago o URLs fijas de localhost/Render; cumplimiento estricto de OWASP Top 10; panel administrativo oculto; contraseñas seguras (mínimo 8 caracteres, alfanuméricas)
**Scale/Scope**: Catálogo de 3 planes, sincronización de tenants remotos, soporte multi-moneda y transacciones atómicas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principio I (Aprovisionamiento Desatendido)**: Cliente HTTP implementado con Basic Auth seguro desde `.env` y cabeceras obligatorias (`Authorization`, `Content-Type`, `Origin`).
- [x] **Principio II (Base de Datos Cloud Supabase/PostgreSQL)**: Conexión mediante SQLAlchemy con pooling `pool_pre_ping=True`, soporte SSL `sslmode=require` y parametrización total anti-SQLi.
- [x] **Principio III (Independencia de Entorno y Render)**: Vinculación a puerto `$PORT` dinámico, URLs base resueltas por configuración, cero localhost hardcodeado.
- [x] **Principio IV (Ciberseguridad OWASP)**: Cero credenciales expuestas en la UI, panel admin confidencial por URL directa, contraseñas validadas y hasheadas.
- [x] **Principio V (Métodos de Pago y Datos Dinámicos)**: Métodos de pago creados y eliminados directamente desde base de datos; planes alineados a FREE, BASIC y PRO.
- [x] **Principio VI (Mobile-First y Funcionalidad Total)**: Todos los botones, campos de formulario y modales son 100% operativos y optimizados para celulares.

## Project Structure

### Documentation (this feature)

```text
specs/001-tenant-provisioning-api/
├── plan.md              # Este plan de implementación técnico
├── research.md          # Decisiones tecnológicas y análisis de la API externa
├── data-model.md        # Diagrama de entidades y esquema de datos para Supabase/PostgreSQL
├── quickstart.md        # Guía de verificación de extremo a extremo
├── checklists/
│   └── requirements.md  # Validación de calidad de la especificación
└── contracts/
    ├── external-provisioning-api.json  # Contrato OpenAPI de la API externa
    └── checkout-submit-api.json        # Contrato del endpoint local de checkout
```

### Source Code Architecture

```text
app/
├── database.py              # Conexión SQLAlchemy con soporte PostgreSQL (Supabase) y MySQL
├── main.py                  # Inicialización de FastAPI, CORS dinámico y montaje estático
├── models.py                # Modelos ORM (Usuario, Suscripcion, MetodoPago, AccesoMiniposApi)
├── schemas.py               # Schemas Pydantic con validación de contraseña y tenant DTOs
├── security.py              # Hashing, JWT y protección OWASP
├── services/
│   └── provisioning.py      # Cliente HTTP para invocar la API externa de tenants
└── routers/
    ├── administracion.py    # Aprobación de pagos y disparo de aprovisionamiento
    ├── autenticacion.py     # Login y registro de usuarios
    ├── metodos_pago.py      # Gestión 100% dinámica de métodos de pago
    ├── minipos_api.py       # API de verificación de acceso para la app móvil
    └── suscripciones.py     # Registro de pagos, checkout y activación de plan FREE

static/
├── css/styles.css           # Estilos Mobile-First y componentes
└── js/main.js               # Lógica interactiva de checkout, validación de contraseña y modales

templates/
├── index.html               # Landing page con los 3 planes (FREE $0, BASIC $8, PRO $10) y checkout modal
└── admin.html               # Panel confidencial de gestión

render.yaml                  # Configuración de despliegue en Render (build & start commands)
requirements.txt             # Dependencias actualizadas (incluye psycopg2-binary, httpx, etc.)
```

**Structure Decision**: Aplicación web FastAPI monolítica modular con separación limpia de routers, servicios de integración externos, modelos SQLAlchemy preparados para PostgreSQL y frontend Vanilla Mobile-First.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Ninguna | N/A | El diseño se apega estrictamente a los principios constitucionales y a la arquitectura existente |
