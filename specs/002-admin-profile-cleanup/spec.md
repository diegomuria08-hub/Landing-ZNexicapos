# Feature Specification: Admin Profile Management & Test Data Cleanup

**Feature Branch**: `002-admin-profile-cleanup`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Limpieza segura de la base de datos eliminando datos de prueba y basura preservando las 3 cuentas de administradores; entrega de la ruta confidencial del panel de administración; creación de módulo de perfil en el frontend del admin para actualizar usuario y contraseña mediante UPDATE directo desde la página; y redacción de guía resumida en archivo aparte explicando el funcionamiento de la API externa de aprovisionamiento."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión del Perfil del Administrador desde la Web (Priority: P1)

Como administrador del sistema, quiero tener un módulo de perfil dentro del panel de control para actualizar mi nombre de usuario o contraseña directamente desde el navegador, sin necesidad de abrir el entorno de desarrollo ni ejecutar comandos de base de datos manualmente.

**Why this priority**: Empodera al administrador para gestionar sus credenciales de acceso de forma autónoma, segura y en tiempo real.

**Independent Test**: Iniciar sesión en `/admin`, ingresar a la pestaña "Mi Perfil", modificar el nombre de usuario o la contraseña, enviar el formulario, y verificar que los cambios se guarden con hash seguro y permitan iniciar sesión con las nuevas credenciales.

**Acceptance Scenarios**:

1. **Given** un administrador autenticado en el panel, **When** accede a la sección "Mi Perfil", **Then** visualiza sus datos actuales (nombre, nombre de usuario y rol).
2. **Given** un administrador que ingresa su contraseña actual y define una nueva contraseña, **When** presiona "Actualizar Perfil", **Then** el sistema valida la clave actual, aplica el hash bcrypt a la nueva clave, ejecuta el UPDATE en la base de datos y genera una sesión actualizada.
3. **Given** un intento de cambio con contraseña actual errónea, **When** envía la solicitud, **Then** el sistema rechaza la operación e informa que la contraseña actual no coincide.

---

### User Story 2 - Purga Segura de Datos de Prueba (Priority: P2)

Como administrador del sistema, quiero limpiar los registros de prueba y usuarios temporales acumulados durante el desarrollo, preservando de forma 100% intacta las 3 cuentas de administrador y los métodos de pago configurados.

**Why this priority**: Deja la base de datos impecable para producción antes de la migración a Supabase.

**Independent Test**: Ejecutar la acción de purga y verificar que las tablas `usuarios`, `suscripciones`, `acceso_minipos_api` y `sesiones_dispositivo` queden libres de clientes de prueba, mientras que las 3 cuentas de administración permanezcan intactas.

**Acceptance Scenarios**:

1. **Given** la existencia de clientes y suscripciones de prueba en la base de datos, **When** se ejecuta la purga segura, **Then** se eliminan únicamente los registros de rol cliente y sus datos asociados.
2. **Given** las 3 cuentas maestras de administración (`Diego_admin`, `Dannys_Admin`, `Admin3`), **When** finaliza la purga, **Then** las 3 cuentas y los métodos de pago continúan existiendo sin modificaciones.

---

### User Story 3 - Documentación Resumida de la API de Aprovisionamiento (Priority: P3)

Como dueño del producto o desarrollador, quiero disponer de un documento claro y resumido en la raíz del proyecto que explique qué hace la API de aprovisionamiento de tenants, para entender su funcionamiento sin necesidad de descifrar código técnico.

**Why this priority**: Facilita la comprensión operativa del negocio y la trazabilidad de cómo se activan las empresas en miniPOS.

**Independent Test**: Abrir el documento `GUIA_API_APROVISIONAMIENTO.md` y verificar que explique de forma comprensible el flujo del endpoint, credenciales, planes y códigos de respuesta.

**Acceptance Scenarios**:

1. **Given** el archivo `GUIA_API_APROVISIONAMIENTO.md`, **When** un lector lo consulta, **Then** comprende qué hace la API, qué datos envía la landing, qué devuelve el servidor central y cómo se vincula a la app móvil.

---

### Edge Cases

- ¿Qué ocurre si un administrador intenta cambiar su nombre de usuario por uno que ya pertenece a otro administrador? El sistema valida la unicidad y rechaza la solicitud con HTTP 409 Conflict.
- ¿Qué ocurre si la purga de datos intenta borrar usuarios que tienen comprobantes subidos en disco? El sistema remueve los archivos huérfanos de la carpeta de uploads para no consumir espacio en servidor.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE exponer el endpoint seguro `PUT /api/admin/perfil` accesible únicamente con token JWT de administrador.
- **FR-002**: El endpoint de perfil DEBE verificar la contraseña actual del administrador antes de autorizar cualquier cambio de usuario o clave.
- **FR-003**: Toda nueva contraseña de administrador DEBE hashearse con `bcrypt` previo a su almacenamiento en la base de datos.
- **FR-004**: El panel administrativo (`admin.html`) DEBE incorporar una nueva sección visual ergonómica "Mi Perfil" con formulario para Nombre, Usuario, Contraseña Actual y Nueva Contraseña.
- **FR-005**: La ruta de acceso confidencial al panel administrativo DEBE ser `/admin` y mantenerse oculta de enlaces públicos en la landing page.
- **FR-006**: La purga de datos DEBE eliminar exclusivamente cuentas con `rol != 'admin'`, sus suscripciones, accesos y sesiones, resguardando las cuentas de administrador y métodos de pago.
- **FR-007**: El proyecto DEBE incluir el archivo `GUIA_API_APROVISIONAMIENTO.md` con la explicación resumida y diagramada del funcionamiento de la API externa de tenants.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El administrador puede cambiar su usuario o contraseña desde el panel web en menos de 30 segundos sin tocar consola ni base de datos.
- **SC-002**: El 100% de las cuentas de administradores y métodos de pago permanecen intactos tras la purga de datos.
- **SC-003**: 0% de exposición de contraseñas en texto claro en logs o respuestas HTTP.
- **SC-004**: El documento explicativo de la API cubre los 3 planes (FREE, BASIC, PRO) y el flujo desatendido de forma concisa y comprensible.
