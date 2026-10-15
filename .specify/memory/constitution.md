<!--
SYNC IMPACT REPORT
==================
Version change: Initial draft -> v1.0.0 (Ratified)
Modified Principles:
  - PRINCIPLE_1: I. Aprovisionamiento Desatendido y Contrato de API de Tenants (Zero-Trust API Integration)
  - PRINCIPLE_2: II. Base de Datos Cloud Robusta (Supabase / PostgreSQL First)
  - PRINCIPLE_3: III. Independencia de Entorno y Despliegue Cloud (Render & Custom Domains)
  - PRINCIPLE_4: IV. Ciberseguridad Estricta y OWASP Top 10 (Zero-Leakage & Defense-in-Depth)
  - PRINCIPLE_5: V. Métodos de Pago y Datos Comerciales Dinámicos (Cero Hardcoding)
  - PRINCIPLE_6: VI. Diseño Mobile-First y Funcionalidad Total (Cero Placeholders)
Added Sections:
  - Reglas de Integración de API Externa de Aprovisionamiento (miniPOS Tenant API)
  - Estándares de Despliegue y Portabilidad (Render + Dominios Personalizados)
  - Gobernanza y Política de Enmiendas
Removed Sections: None
Follow-up Deferred Items:
  - Actualización de catálogo de planes a FREE ($0), BASIC ($8) y PRO ($10).
  - Implementación del servicio de aprovisionamiento contra la API de Vercel/miniPOS.
  - Migración y scripts de exportación/importación para Supabase (PostgreSQL).
  - Configuración de despliegue en Render (PORT, host, variables y dominios dinámicos).
-->

# miniPOS Landing & SaaS Constitution

## Core Principles

### I. Aprovisionamiento Desatendido y Contrato de API de Tenants (Zero-Trust API Integration)
Toda integración con la API Externa de Aprovisionamiento de Tenants (`/api/provisioning/tenant`) DEBE cumplir estrictamente el contrato técnico y de ciberseguridad:
- Autenticación HTTP Basic Auth gestionada exclusivamente a través de variables de entorno (`PROVISIONING_API_USER`, `PROVISIONING_API_PASSWORD`).
- Cabeceras obligatorias: `Authorization`, `Content-Type: application/json` y `Origin` validado.
- Carga útil estrictamente tipada con Pydantic/DTOs: `companyName`, `adminName`, `adminEmail`, `adminPassword`, `planCode` (`FREE`, `BASIC`, `PRO`).
- Contraseña de administrador sujeta a validación previa: mínimo 8 caracteres, al menos una letra y un número.
- Manejo determinista y estructurado de códigos HTTP: 201 (Aprovisionado), 400 (Datos Inválidos), 401 (Credenciales Inválidas), 403 (Origen/IP no autorizada), 409 (Conflicto / Correo ya registrado).

### II. Base de Datos Cloud Robusta (Supabase / PostgreSQL First)
El sistema opera sobre PostgreSQL alojado en Supabase con SQLAlchemy como capa ORM:
- Cero consultas concatenadas; todas las transacciones son parametrizadas o manejadas mediante el ORM para erradicar vulnerabilidades de inyección SQL (SQLi).
- Transaccionalidad ACID atómica: toda operación que involucre pago, usuario y sincronización de tenant debe ejecutarse dentro de un bloque transaccional con reversión automática (rollback) ante fallos.
- La configuración de conexión `DATABASE_URL` debe ser compatible con conexiones seguras SSL (`sslmode=require`) y connection pooling de PostgreSQL.
- Los datos existentes deben preservarse e integridad referencial garantizada durante la migración de dialecto MySQL a PostgreSQL.

### III. Independencia de Entorno y Despliegue Cloud (Render & Custom Domains)
La arquitectura debe ser agnóstica a la infraestructura de alojamiento y soportar despliegue en Render y dominios personalizados futuros:
- Prohibido hardcodear URLs absolutas (`localhost:8000`, `127.0.0.1`, o dominios provisionales de Render) en código fuente, templates Jinja2 o JavaScript.
- Toda URL base, callback, origen CORS y redirección debe derivarse de la configuración de entorno (`APP_BASE_URL`, `ALLOWED_HOSTS`, `CORS_ORIGINS`) o resolverse dinámicamente mediante el Host request header.
- El servidor debe escuchar en `0.0.0.0` y vincularse dinámicamente al puerto asignado por la variable de entorno `PORT` en entornos de producción como Render.
- Las transiciones a dominios personalizados futuros deben operar por configuración de variables de entorno sin requerir modificaciones en la lógica del código.

### IV. Ciberseguridad Estricta y OWASP Top 10 (Zero-Leakage & Defense-in-Depth)
La protección del sistema es no-negociable y sigue principios de defensa en profundidad:
- **Ocultamiento Administrativo**: El panel de administración nunca debe estar visible ni enlazado en la interfaz pública (landing page, menús, footers). Solo se accede ingresando la ruta confidencial de forma manual.
- **Cero Exposición**: Prohibido mostrar nombres de usuario por defecto, contraseñas de ejemplo, sugerencias en placeholders o menciones técnicas (como "OWASP") en la interfaz de usuario.
- **Gestión de Secretos (.env)**: Todas las credenciales, llaves maestras, secretos JWT y contraseñas de API deben cargarse desde variables de entorno. Prohibido hardcodear claves en código fuente o repositorios.
- **Cifrado y Hashing**: Contraseñas resguardadas con algoritmos robustos (bcrypt/argon2/scrypt con salt aleatorio). Comparación de secretos en tiempo constante (`timingSafeEqual` / hashes SHA-256) para evitar ataques de temporización.
- **Sesiones Seguras**: Cookies protegidas con directivas `HttpOnly`, `Secure` y `SameSite=Strict`.

### V. Métodos de Pago y Datos Comerciales Dinámicos (Cero Hardcoding)
Todos los datos financieros, bancarios y planes de negocio son dinámicos:
- Queda terminantemente PROHIBIDO hardcodear números de cuenta, teléfonos de Pago Móvil, Binance Pay IDs, nombres de bancos o titulares en el código o plantillas.
- Los métodos de pago se gestionan única y exclusivamente a través de la base de datos desde el panel administrativo.
- La eliminación de un método de pago en base de datos debe reflejarse de inmediato en el checkout público del cliente.
- El catálogo oficial de planes se alinea a la API de aprovisionamiento: `FREE` ($0 USD / 30 días), `BASIC` ($8 USD / mes) y `PRO` ($10 USD / mes), configurables y sincronizados.

### VI. Diseño Mobile-First y Funcionalidad Total (Cero Placeholders)
La experiencia de usuario prioriza dispositivos móviles con operatividad al 100%:
- Diseño Mobile-First riguroso: componentes táctiles ergonómicos, tipografía adaptable y transiciones fluidas en pantallas pequeñas, expandiéndose armónicamente a escritorios.
- Cero elementos decorativos sin acción: todo botón, selector, modal, formulario o control en la UI debe tener lógica funcional, validaciones activas y respuesta visual inmediata al usuario.

## Reglas de Integración de API Externa de Aprovisionamiento

1. **Cliente HTTP Resiliente**: Las peticiones salientes hacia la API de aprovisionamiento deben implementar timeouts estrictos, reintentos con backoff exponencial para fallas transitorias de red y registro de auditoría de respuestas sin exponer credenciales en logs.
2. **Validación Previa al Envío**: Los datos del cliente (nombre de empresa, correo del administrador y contraseña con letras y números) deben validarse tanto en frontend como en backend antes de despachar la solicitud a la API externa.
3. **Mapeo de Respuestas**: Toda respuesta exitosa (201) debe almacenar los IDs devueltos (`data.company.id`, `data.admin.id`, `data.plan.id`) en la base de datos local para trazabilidad y reconciliación de la cuenta del cliente.

## Estándares de Despliegue y Portabilidad

1. **Contenedor y Runtime en Render**: Configuración compatible con Render Web Services utilizando Python 3.10+, FastAPI y Uvicorn workers.
2. **Archivos Estáticos y Subidas**: Soporte estructurado para servir assets estáticos y almacenar comprobantes de pago de forma persistente o en almacenamiento seguro en la nube.
3. **Manejo de Proxy Inverso**: Detección segura de headers `X-Forwarded-For` y `X-Forwarded-Proto` para asegurar que las conexiones HTTPS y redirecciones mantengan el protocolo seguro.

## Governance

1. **Supremacía Constitucional**: Esta Constitución rige sobre cualquier solicitud informal o código ad-hoc. Todo cambio en la arquitectura debe alinearse a estos principios.
2. **Proceso de Enmiendas**: Cualquier modificación de principios requiere:
   - Documentación explícita del motivo en el historial de enmiendas.
   - Incremento de versión semántica (MAJOR para cambios de principios, MINOR para ampliación de directrices, PATCH para aclaraciones).
3. **Cumplimiento en Desarrollo Guiado por Especificaciones (Spec Kit)**: Cada ciclo de desarrollo debe pasar por `/speckit-specify`, `/speckit-plan`, `/speckit-tasks` e `/speckit-implement`, verificando el cumplimiento de esta Constitución antes del despliegue.

**Version**: 1.0.0 | **Ratified**: 2026-10-15 | **Last Amended**: 2026-10-15
