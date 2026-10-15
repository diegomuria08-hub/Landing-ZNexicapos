# Feature Specification: Tenant Provisioning API & Pricing Alignment

**Feature Branch**: `001-tenant-provisioning-api`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Integración de API de aprovisionamiento de tenants para planes FREE ($0), BASIC ($8) y PRO ($10), migración de base de datos a Supabase PostgreSQL y preparación para Render y dominios personalizados."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Aprobación y Aprovisionamiento Automático de Suscripción (Priority: P1)

Como cliente que adquiere o activa un plan de miniPOS, quiero que mi empresa, usuario administrador y plan queden aprovisionados de forma automática e inmediata en la plataforma central, para poder ingresar a la aplicación móvil con mis credenciales sin esperas manuales.

**Why this priority**: Es el núcleo de valor del sistema SaaS. Conecta la captación de clientes de la landing page con la activación operativa real del software miniPOS.

**Independent Test**: Se puede probar seleccionando el plan FREE ($0) o aprobando un pago de plan BASIC/PRO desde el backend; el sistema emite la petición HTTP autenticada a la API externa de aprovisionamiento y recibe la confirmación 201 Created con los IDs de Company, Admin y Plan.

**Acceptance Scenarios**:

1. **Given** un nuevo cliente que selecciona el plan "FREE" ($0) y completa el formulario con nombre de empresa, nombre, correo válido y contraseña de 8+ caracteres alfanumérica, **When** presiona "Activar Prueba Gratis", **Then** el sistema registra al usuario, envía la solicitud a la API de aprovisionamiento (`POST /api/provisioning/tenant`), recibe respuesta HTTP 201 Created, y concede acceso inmediato en miniPOS.
2. **Given** un cliente que registra un pago pendiente para el plan "BASIC" o "PRO" con comprobante, **When** el administrador revisa y aprueba el pago, **Then** el sistema despacha el aprovisionamiento a la API externa, vincula los IDs retornados (`company.id`, `admin.id`, `plan.id`) y notifica al cliente que su cuenta está activa.

---

### User Story 2 - Alineación de Catálogo de Planes y Formulario de Registro (Priority: P2)

Como visitante de la landing page, quiero ver con total claridad la oferta comercial de 3 planes (FREE $0, BASIC $8, PRO $10) y poder seleccionar cualquiera de ellos mediante un formulario ergonómico mobile-first que solicite los datos exactos requeridos para crear mi negocio.

**Why this priority**: Asegura coherencia comercial absoluta entre lo que el usuario ve y lo que el backend envía a la API externa.

**Independent Test**: Inspeccionar visualmente la sección de planes en dispositivos móviles y de escritorio, comprobar los precios $0, $8 y $10, y abrir el modal de checkout para verificar los campos (`companyName`, `adminName`, `adminEmail`, `adminPassword`, `phone`).

**Acceptance Scenarios**:

1. **Given** un usuario que visita la sección de precios, **When** revisa las tarjetas de suscripción, **Then** visualiza exactamente los planes: "Plan Prueba Gratis" ($0 / 30 días, código `FREE`), "Plan Básico" ($8 / mes, código `BASIC`) y "Plan Profesional" ($10 / mes, código `PRO`).
2. **Given** un usuario abriendo el modal de checkout, **When** visualiza el formulario, **Then** se le solicita: Nombre de la Empresa o Negocio, Nombre del Titular, Correo Electrónico, Teléfono (usuario móvil) y Contraseña segura.
3. **Given** un usuario que ingresa una contraseña que no cumple la política (menos de 8 caracteres o sin letras/números), **When** intenta enviar el formulario, **Then** el sistema resalta el campo con una indicación clara y ergonómica impidiendo el envío erróneo.

---

### User Story 3 - Resiliencia y Manejo de Errores en Aprovisionamiento (Priority: P3)

Como usuario o administrador, si ocurre un conflicto durante el registro (por ejemplo, el correo ya está registrado en miniPOS o hay un fallo temporal en la red), quiero recibir una respuesta informativa comprensible para solucionar la situación sin ver errores técnicos crudos.

**Why this priority**: Garantiza la confiabilidad del servicio y evita que los clientes queden en un estado indeterminado ante fallos de red o datos duplicados.

**Independent Test**: Enviar un registro con un correo electrónico previamente aprovisionado y verificar que el sistema maneje el error HTTP 409 Conflict devolviendo un mensaje amigable al usuario.

**Acceptance Scenarios**:

1. **Given** un usuario que intenta registrarse con un correo ya existente en la API externa, **When** la API externa responde con HTTP 409 Conflict, **Then** el sistema presenta un aviso amigable indicando que el correo ya posee una cuenta activa y sugiere iniciar sesión.
2. **Given** una interrupción de conectividad con la API externa al procesar una activación, **When** la petición falla por timeout, **Then** el sistema registra el estado como "pendiente de sincronización" y preserva la transacción para reintento seguro sin duplicar cobros ni perder datos.

---

### Edge Cases

- ¿Qué ocurre si el usuario ingresa caracteres especiales o espacios extras en el nombre de empresa o correo? El sistema aplica trim y sanitización de caracteres antes de enviar la carga útil a la API externa.
- ¿Qué ocurre si las credenciales de la API externa en `.env` son incorrectas o expiran (HTTP 401)? El sistema emite un log seguro de advertencia a nivel de servidor sin exponer secretos y notifica al administrador para regularizar la configuración.
- ¿Qué ocurre si un método de pago fue desactivado por el administrador mientras el usuario visualizaba la pantalla? La validación de backend verifica el estado activo del método al momento de confirmar el pago y rechaza la transacción de forma amigable si ya no está disponible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE exponer en la landing page y en los modelos internos el catálogo estandarizado de planes: `FREE` ($0 USD / 30 días), `BASIC` ($8 USD / mes) y `PRO` ($10 USD / mes).
- **FR-002**: El formulario de suscripción DEBE recopilar de forma obligatoria: Nombre de la Empresa (`companyName`, 2-100 caracteres), Nombre del Administrador (`adminName`, 2-100 caracteres), Correo Electrónico (`adminEmail`, formato email válido), Teléfono (`phone`) y Contraseña (`adminPassword`, 8-64 caracteres con al menos una letra y un dígito).
- **FR-003**: El cliente backend DEBE invocar la API externa (`POST /api/provisioning/tenant`) empleando HTTP Basic Authentication con las credenciales cargadas desde variables de entorno (`PROVISIONING_API_USER`, `PROVISIONING_API_PASSWORD`).
- **FR-004**: Toda petición a la API externa DEBE incluir las cabeceras `Content-Type: application/json`, `Authorization` y `Origin` configurada con el dominio autorizado.
- **FR-005**: Al recibir una respuesta HTTP 201 Created de la API externa, el sistema DEBE almacenar los identificadores generados (`data.company.id`, `data.admin.id`, `data.plan.id`) vinculados a la suscripción y activar inmediatamente el registro de acceso en miniPOS.
- **FR-006**: El sistema DEBE manejar de forma controlada los códigos de respuesta de la API externa: 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden) y 409 (Conflict).
- **FR-007**: Para el plan `FREE` ($0), la activación y el aprovisionamiento DEBEN ocurrir de forma inmediata y desatendida al completar el formulario.
- **FR-008**: Para los planes de pago (`BASIC` y `PRO`), el aprovisionamiento DEBE ejecutarse de forma coordinada cuando el pago sea validado y aprobado.
- **FR-009**: Todas las URLs base y orígenes autorizados DEBEN resolverse a partir de variables de entorno (`APP_BASE_URL`, `PROVISIONING_ALLOWED_ORIGINS`), garantizando compatibilidad con Render (`*.onrender.com`) y dominios personalizados futuros sin tocar código.

### Key Entities *(include if feature involves data)*

- **TenantProvisioningPayload**: Entidad de transferencia de datos con `companyName`, `adminName`, `adminEmail`, `adminPassword`, `planCode`.
- **TenantProvisioningResponse**: Datos de confirmación retornados por la API externa conteniendo los objetos `company` (id, name, createdAt), `admin` (id, name, email, role) y `plan` (id, code, name, assignedAt).
- **SuscripcionActualizada**: Extensión del modelo de suscripción local para registrar el `company_id_remoto`, `admin_id_remoto`, `plan_id_remoto` y el estado de sincronización con la API externa.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los registros exitosos del plan FREE quedan aprovisionados en la API externa en menos de 5 segundos.
- **SC-002**: El catálogo de precios refleja exactamente los montos $0 (FREE), $8 (BASIC) y $10 (PRO) en el 100% de los puntos de contacto de la UI.
- **SC-003**: 0% de fuga de credenciales o secretos en el código fuente, respuestas HTTP al cliente o registros públicos en consola.
- **SC-004**: Las solicitudes con contraseñas que no cumplen la política de seguridad son interceptadas antes de consumir cuota de red, reduciendo errores 400 a cero en usuarios legítimos.

## Assumptions

- Las credenciales de acceso a la API externa se proporcionarán vía `.env` (`PROVISIONING_API_USER`, `PROVISIONING_API_PASSWORD`, `PROVISIONING_API_URL`).
- La URL por defecto de la API externa de aprovisionamiento es `https://mini-pos-api.vercel.app/api/provisioning/tenant`.
- El esquema de base de datos actual admite la adición de columnas para los IDs de aprovisionamiento remoto sin romper compatibilidad.
- La migración de datos hacia Supabase (PostgreSQL) y el despliegue en Render se planificarán a partir de esta especificación técnica consolidada.
