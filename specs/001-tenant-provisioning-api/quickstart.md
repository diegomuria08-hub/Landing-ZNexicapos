# Quickstart Validation Guide: Tenant Provisioning API & Modernization

**Feature**: `001-tenant-provisioning-api`
**Date**: 2026-10-15
**Status**: Ready

Esta guía permite validar de extremo a extremo que la integración de la API de aprovisionamiento, la alineación de precios y la preparación de infraestructura funcionan correctamente.

## 1. Prerrequisitos de Configuración (.env)

Asegúrate de que el archivo `.env` contenga las credenciales requeridas para la API externa y la base de datos:

```bash
# Conexión a Base de Datos (MySQL actual o Supabase PostgreSQL en migración)
DATABASE_URL="postgresql+psycopg2://user:password@host:5432/postgres?sslmode=require"

# API Externa de Aprovisionamiento (según documentación miniPOS)
PROVISIONING_API_URL="https://mini-pos-api.vercel.app/api/provisioning/tenant"
PROVISIONING_API_USER="miniPosContractor"
PROVISIONING_API_PASSWORD="key_OMAfdBOAZgZzzCEU5BmvycoCVqMBuUjKHJbyjbqmI5rHuCEqQQotIZI3f8CUjXLD"
PROVISIONING_ALLOWED_ORIGINS="https://billing.minipos.com,http://localhost:8000"

# Configuración de Servidor y Dominios
PORT="8000"
APP_BASE_URL="http://localhost:8000"
```

---

## 2. Escenario de Prueba 1: Activación Inmediata de Plan FREE ($0)

1. **Acción**:
   - Abrir la landing page en `http://localhost:8000/`.
   - Navegar a la sección de planes y presionar **"🎁 Activar Prueba Gratis"** en el plan **FREE**.
   - Completar el formulario con:
     - Nombre de la Empresa: `Mi Negocio Demo C.A.`
     - Nombre del Titular: `Juan Pérez`
     - Correo Electrónico: `juan.perez.test@demo.com`
     - Teléfono: `04141234567`
     - Contraseña: `Password2026!`
   - Presionar **"Crear Cuenta y Activar Plan"**.

2. **Resultado Esperado**:
   - La petición invoca el cliente backend de aprovisionamiento.
   - La API externa responde `201 Created`.
   - Se crea el usuario, la suscripción y el registro de acceso con `acceso_concedido = True` y `plan_activo = 'FREE'`.
   - La pantalla muestra el modal de confirmación con éxito invitando a abrir la app móvil miniPOS.

---

## 3. Escenario de Prueba 2: Suscripción a Plan BASIC ($8) o PRO ($10) con Aprobación Admin

1. **Acción**:
   - Seleccionar el **Plan Profesional ($10/mes)** en la landing.
   - En el checkout, seleccionar un método de pago activo (ej. Pago Móvil) y adjuntar número de referencia y comprobante.
   - Ingresar al panel `/admin` (mediante URL directa confidencial) y navegar a Suscripciones pendientes.
   - Presionar el botón **"Aprobar Pago"**.

2. **Resultado Esperado**:
   - La acción de aprobación dispara el aprovisionamiento desatendido en la API externa.
   - Se actualiza la suscripción a estado `'aprobado'` y se registran `tenant_company_id`, `tenant_admin_id` y `tenant_plan_id`.
   - El teléfono del cliente pasa a `acceso_concedido = True` con `plan_activo = 'PRO'`.

---

## 4. Escenario de Prueba 3: Detección de Contraseñas Inválidas o Conflictos 409

1. **Acción**:
   - Intentar registrarse con contraseña simple `123456` (sin letras y menos de 8 caracteres).
   - Resultado: La interfaz bloquea el envío y muestra un mensaje ergonómico indicando el formato requerido.
2. **Acción**:
   - Intentar registrarse con un correo ya existente en la base de datos de tenants.
   - Resultado: El backend captura el error HTTP 409 y la interfaz notifica amigablemente que el correo ya está registrado sin romper la aplicación.
