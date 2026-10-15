# Feature Specification: Corrección y Actualización Dinámica del Checkout en Cambio de Plan

**Feature Branch**: `003-fix-plan-upgrade-checkout`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "se supone que si yo cambio de plan con la misma cuenta debe de actualizarse ese plan entonoces aparece como que vo a comprar un plan de pago y no APARECEN NI LOS DATOS DEL METODO DE PAGO QUE ESCOJA Y NO APARECE COMO QUE ESTOY COMPRANDO UN PLAN DE PAGO, APARECE ES COMO UN PALN FREE... vas a crear un plan de accion para arreglar eso lo guardas por ahi y lo ejecutaremos despues"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cambio o Mejora de Plan a un Plan de Pago (Priority: P1)

Como cliente registrado con una cuenta existente (por ejemplo, con prueba gratuita o plan previo), quiero seleccionar cualquier plan de pago (Plan Básico $8 o Plan Profesional $10) y ver de forma inmediata el precio real del plan seleccionado, los métodos de pago disponibles, los datos bancarios exactos y los campos obligatorios para registrar mi comprobante de pago, sin que la ventana muestre textos o estados de plan gratuito.

**Why this priority**: Es la ruta crítica de monetización del negocio. Si un cliente que ya tiene cuenta decide pagar por un plan y la interfaz le muestra información errónea de activación gratuita sin datos bancarios ni campos para el comprobante, el cliente no puede pagar y el negocio pierde la venta.

**Independent Test**: Puede probarse iniciando sesión con una cuenta de prueba gratuita existente, seleccionando el "Plan Básico ($8/mes)" en la página y verificando que el modal muestre "$8/mes", el selector de método de pago, los datos bancarios para transferir y los campos para cargar el comprobante de pago.

**Acceptance Scenarios**:

1. **Given** un cliente que tiene una sesión activa con su número de teléfono, **When** hace clic en "Seleccionar Plan Básico" ($8) o "Seleccionar Plan Profesional" ($10), **Then** el modal de compra muestra el título exacto del plan, el monto en dólares ($8 o $10) con estado "Pendiente de Pago", los métodos de pago activos y los datos bancarios para realizar el pago.
2. **Given** el modal de compra abierto para un plan de pago, **When** el cliente selecciona cualquier método de pago en la lista (por ejemplo, Pago Móvil, Binance o Zinli), **Then** la pantalla muestra inmediatamente las instrucciones y datos oficiales de esa cuenta (banco, titular, teléfono/ID) junto con los campos para ingresar el número de referencia y adjuntar el comprobante.
3. **Given** un cliente que completa la transferencia de un plan de pago, **When** presiona el botón de confirmación, **Then** el sistema registra la solicitud con el plan de pago elegido y abre WhatsApp con el detalle del pago y comprobante dirigido al administrador.

---

### User Story 2 - Transición Fluida entre Planes Gratuitos y Planes de Pago (Priority: P2)

Como usuario que navega en la plataforma, quiero poder abrir la prueba gratuita, cerrarla o cambiarme a un plan de pago (y viceversa) cuantas veces desee, y que la ventana de compra siempre restaure su estructura visual limpia y precisa según la naturaleza del plan actual sin elementos residuales ni pantallas congeladas.

**Why this priority**: Evita que estados temporales de una selección anterior corrompan la experiencia de usuario cuando el cliente evalúa distintas opciones antes de decidirse por una compra.

**Independent Test**: Puede probarse abriendo primero el modal de "Plan Prueba Gratis" (que muestra la activación gratuita sin datos bancarios), cerrándolo, y posteriormente abriendo el "Plan Profesional" para constatar que todos los componentes de pago se reconstruyen perfectamente sin rastro del mensaje gratuito previo.

**Acceptance Scenarios**:

1. **Given** que un usuario abrió previamente el modal de "Plan Prueba Gratis" donde no se requieren datos bancarios, **When** cierra esa ventana y selecciona un plan de pago comercial ($8 o $10), **Then** la interfaz elimina por completo el aviso de activación gratuita y presenta el formulario de pago comercial completo.
2. **Given** un usuario que revisa un plan de pago, **When** decide volver al plan gratuito, **Then** la interfaz oculta los campos bancarios y muestra el mensaje amigable de activación inmediata sin comprobante.

---

### User Story 3 - Actualización de Suscripción y Licencia sin Duplicidad de Cuenta (Priority: P3)

Como cliente que pasa de un plan gratuito a un plan de pago, quiero que el sistema reconozca mi misma cuenta telefónica y actualice mi licencia comercial una vez verificado el pago por el administrador, conservando mi historial y credenciales de acceso a la aplicación móvil.

**Why this priority**: Garantiza la coherencia operativa de las licencias del cliente y la trazabilidad en el panel de control administrativo sin crear usuarios repetidos.

**Independent Test**: Registrar una suscripción de pago con el número telefónico de una cuenta existente y verificar en el sistema administrativo que la suscripción queda asociada a su cuenta y lista para aprobación.

**Acceptance Scenarios**:

1. **Given** un cliente registrado previamente con prueba gratuita, **When** envía el comprobante de pago de un plan Básico o Profesional, **Then** el sistema asocia la nueva suscripción comercial a su cuenta existente.
2. **Given** una suscripción de pago enviada por un cliente existente, **When** el administrador aprueba el pago, **Then** el plan activo del cliente se actualiza automáticamente al plan pagado y se amplía su vigencia por el periodo mensual correspondiente.

---

### Edge Cases

- ¿Qué sucede si el cliente selecciona un método de pago sin datos configurados o recién desactivado? El sistema debe alertar al usuario y solicitarle seleccionar otro de los métodos activos disponibles.
- ¿Qué ocurre si el usuario intenta enviar un plan de pago sin adjuntar la captura del comprobante o sin indicar la referencia? El formulario debe impedir el envío, señalando claramente al usuario el campo requerido que falta.
- ¿Qué ocurre si el usuario tiene una sesión expirada al intentar cambiar de plan? El sistema debe solicitarle reautenticarse con su número telefónico y contraseña de forma transparente antes de completar la compra.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar el resumen comercial exacto (nombre del plan y precio en dólares) correspondiente al plan seleccionado por el usuario en cada apertura del checkout.
- **FR-002**: Al seleccionar un plan de pago comercial ($8 o $10), el sistema DEBE presentar obligatoriamente la lista de métodos de pago configurados en el sistema.
- **FR-003**: Al cambiar el método de pago dentro de un plan comercial, el sistema DEBE actualizar en tiempo real los datos bancarios oficiales del método seleccionado (banco, titular, teléfono, correo o billetera) permitiendo copiar los datos al portapapeles.
- **FR-004**: Para planes de pago comerciales, el sistema DEBE exigir la captura del comprobante de pago y los datos de referencia antes de permitir el envío.
- **FR-005**: Al seleccionar el plan gratuito ($0), el sistema DEBE ocultar los campos bancarios y de comprobante, mostrando únicamente la confirmación de activación de prueba sin requerir pago.
- **FR-006**: La alternancia entre la selección de un plan gratuito y un plan de pago DEBE restaurar de forma limpia y completa la estructura del formulario correspondiente, sin dejar contenedores vacíos ni mensajes del plan anterior.
- **FR-007**: El sistema DEBE permitir a clientes con cuentas existentes actualizar su suscripción a un plan de pago utilizando sus mismas credenciales telefónicas sin duplicar su registro de usuario.
- **FR-008**: Al confirmar cualquier plan, el sistema DEBE abrir el canal de mensajería oficial (WhatsApp) prellenando el mensaje con el plan seleccionado, datos del cliente y detalles del pago hacia el número del administrador configurado.

### Key Entities

- **Cliente**: Representa al usuario del sistema; contiene su nombre, teléfono (identificador único), empresa y estado de acceso a la aplicación móvil.
- **Plan Comercial**: Representa la oferta de servicio (Prueba Gratis de 30 días, Plan Básico de $8/mes, Plan Profesional de $10/mes), con su código, precio en USD y características.
- **Método de Pago**: Cuenta o canal financiero activo registrado por el administrador (Pago Móvil, Transferencia, Binance, Zinli, Zelle, Efectivo) con instrucciones para el cliente.
- **Suscripción / Transacción**: Registro del ciclo de servicio solicitado por el cliente, vinculado a su plan, método, referencia, comprobante y estado de aprobación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las aperturas del checkout para planes de pago comerciales ($8 y $10) muestran correctamente el selector de métodos de pago y las instrucciones bancarias oficiales sin mostrar avisos de activación gratuita.
- **SC-002**: La selección y cambio de método de pago en el checkout carga las instrucciones y campos correspondientes en menos de 1 segundo de forma inmediata y sin errores visuales.
- **SC-003**: Clientes con cuentas creadas previamente pueden completar la solicitud de mejora a un plan de pago en menos de 2 minutos sin bloqueos ni recargas manuales de página.
- **SC-004**: Cero transacciones comerciales de planes de pago se registran sin método de pago o sin comprobante adjunto.

## Assumptions

- El usuario dispone de un navegador web moderno con JavaScript habilitado y soporte para almacenamiento local de sesión.
- El catálogo de planes activos en la landing page está estandarizado en: Plan Prueba Gratis ($0), Plan Básico ($8) y Plan Profesional ($10).
- La pasarela de pago opera bajo el modelo de validación de comprobante manual con notificación directa al administrador por WhatsApp.
