# Research & Technology Decisions: Tenant Provisioning API & Platform Modernization

**Feature**: `001-tenant-provisioning-api`
**Date**: 2026-10-15
**Status**: Completed

## 1. Cliente HTTP para la API de Aprovisionamiento

- **Decisión**: Utilizar `httpx` (asíncrono/síncrono) o `requests` con timeout explícito y basic auth nativo.
- **Razón**: `httpx` ofrece soporte asíncrono nativo para FastAPI sin bloquear el event loop, timeouts estrictos por defecto y manejo limpio de excepciones HTTP y SSL.
- **Alternativas consideradas**:
  - `requests`: Popular y síncrono, pero en endpoints asíncronos de FastAPI puede bloquear el hilo del event loop salvo que se envuelva en `asyncio.to_thread`.
  - `urllib.request`: Nativo pero sin pooling ni ergonomía para autenticación Basic y JSON automático.

## 2. Driver de Base de Datos y Compatibilidad con Supabase (PostgreSQL)

- **Decisión**: Incorporar `psycopg2-binary` (o `asyncpg`) en `requirements.txt` y configurar `create_engine` en `app/database.py` para admitir URLs dialectales tanto de PostgreSQL (`postgresql://` o `postgresql+psycopg2://`) como MySQL/SQLite en desarrollo.
- **Razón**: Supabase utiliza PostgreSQL en la nube sobre SSL obligatorio (`sslmode=require`). `psycopg2-binary` es el dialecto más probado y estable con SQLAlchemy en entornos de producción como Render.
- **Configuración de Engine para Supabase**:
  - `pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`, `pool_recycle=1800`.
  - Transformación automática de URIs tipo `postgres://` (usado por Render/Supabase) a `postgresql+psycopg2://`.

## 3. Catálogo de Planes y Paridad de Negocio

- **Decisión**: Estandarizar los códigos y precios de planes en todos los puntos del sistema:
  - `FREE`: $0 USD / 30 días.
  - `BASIC`: $8 USD / mes.
  - `PRO`: $10 USD / mes.
- **Razón**: Cumple estrictamente con la indicación del documento de integración de la API externa de miniPOS ("todos deben tener precios diferentes 0 para FREE, 8 para BASIC y 10 para PRO").
- **Flujo de Aprovisionamiento**:
  - `FREE`: Se aprovisiona inmediatamente al registrarse el usuario en la landing page.
  - `BASIC` / `PRO`: Se registra el pago con estado "pendiente" y se despacha el aprovisionamiento automático a la API externa en cuanto el administrador aprueba el pago (o inmediatamente si se implementa pasarela automatizada).

## 4. Validación de Contraseña y Seguridad de Datos

- **Decisión**: Implementar validación regex tanto en frontend (JavaScript) como en backend (Pydantic / DTO):
  - Mínimo 8 caracteres, al menos 1 letra y al menos 1 dígito (`^(?=.*[A-Za-z])(?=.*\d).{8,64}$`).
- **Razón**: La API de aprovisionamiento externa rechaza con HTTP 400 cualquier solicitud cuya contraseña no satisfaga esta política. Validar en cliente y servidor evita latencia inútil y protege la experiencia del usuario.

## 5. Portabilidad en Render y Dominios Personalizados

- **Decisión**:
  - Servir en `0.0.0.0` y leer el puerto dinámicamente de `os.getenv("PORT", "8000")`.
  - Configurar `render.yaml` con build command (`pip install -r requirements.txt`) y start command (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
  - La cabecera `Origin` enviada a la API externa de aprovisionamiento se deriva de `APP_BASE_URL` (con fallback dinámico a `https://billing.minipos.com` o al host del request).
