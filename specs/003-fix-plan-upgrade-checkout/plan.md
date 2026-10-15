# Implementation Plan: Corrección y Restauración Dinámica del Checkout al Cambiar de Plan

**Branch**: `003-fix-plan-upgrade-checkout` | **Date**: 2026-10-15 | **Spec**: [spec.md](file:///c:/Users/Diego%20Muria/OneDrive/Codigos_Antigravity/landign%20miniPOS/specs/003-fix-plan-upgrade-checkout/spec.md)

**Input**: Feature specification from `specs/003-fix-plan-upgrade-checkout/spec.md`

## Summary

Corregir la desincronización y pérdida de elementos DOM en el modal de checkout (`#checkoutModal`) que ocurre cuando un usuario abre un plan comercial (Básico o Profesional) habiendo tenido o seleccionado previamente una prueba gratuita o sesión existente. El problema técnico radica en que la lógica de activación gratuita sobrescribe el contenedor `paymentDetailsBox.innerHTML` destruyendo los nodos `#pmDisplayTitle` y `#pmDynamicDetails`, lo que provoca que al cambiar a un plan de pago el evento `onPaymentMethodSelectedChange` falle al no encontrar `#pmDynamicDetails`, dejando la caja verde de activación gratuita congelada en pantalla y sin mostrar ni datos bancarios ni campos para el comprobante.

## Technical Context

**Language/Version**: JavaScript ES6+ (Frontend Vanilla), Python 3.10+ (Backend FastAPI).
**Primary Dependencies**: Jinja2 Templates, FastAPI, SQLAlchemy, Vanilla CSS.
**Storage**: MySQL / PostgreSQL (Persistencia de suscripciones y usuario existente).
**Testing**: Manual E2E (flujo completo en navegador) y validación de endpoints con `fastapi.testclient`.
**Target Platform**: Navegadores Web Móviles y Escritorio (Mobile-First).
**Project Type**: Web Application SaaS / Landing & Checkout Modal.
**Performance Goals**: Renderizado de instrucciones y métodos de pago < 50ms al alternar selecciones.
**Constraints**: Cero hardcoding de cuentas bancarias (todo proviene de BD); preservar la sesión del usuario existente para actualización de plan.

## Constitution Check

- [x] **Principio IV - Ciberseguridad Estricta**: No se exponen credenciales ni claves en código o DOM.
- [x] **Principio V - Datos Comerciales Dinámicos**: Los métodos de pago se leen dinámicamente desde el backend.
- [x] **Principio VI - Diseño Mobile-First y Funcionalidad Total**: Cero elementos decorativos; cada botón y selector opera de forma real y responsiva.

## Causa Raíz Identificada

1. **Destrucción del DOM**:
   En `static/js/main.js` (función `proceedToCheckout`), cuando `isFree` es verdadero, el script ejecuta:
   `paymentDetailsBox.innerHTML = '<div ...>Activación Gratuita Inmediata</div>'`.
   Esto borra permanentemente del HTML interno los elementos `#pmDisplayTitle` y `#pmDynamicDetails`.
2. **Falla en Cascada**:
   Al hacer clic luego en un plan de pago (`BASIC` o `PRO`), `onPaymentMethodSelectedChange()` busca `document.getElementById('pmDynamicDetails')`. Al haber sido destruido, la función hace un `return` temprano silencioso.
3. **Efecto Visual Observado (Captura del Usuario)**:
   - La pantalla muestra el selector de métodos de pago (`Pago con wally/Zinli`).
   - El contenido inferior mantiene la tarjeta verde de "Activación Gratuita Inmediata" en lugar de las instrucciones de Zinli.
   - No se generan los campos de comprobante ni número de referencia.
4. **Actualización de Cuenta**:
   Cuando un usuario ya registrado en sesión cambia de plan, el backend y el modal deben reflejar claramente que se trata de una renovación o cambio de plan hacia una suscripción de pago.

---

## Plan de Acción Detallado (Pasos a Ejecutar)

### Fase 1: Arquitectura y Reestructuración del Modal de Checkout
- [ ] **Paso 1.1**: En `templates/index.html`, estructurar dos sub-contenedores dedicados e independientes dentro de `#paymentDetailsDisplay`:
  - Contenedor A: `#freePlanNoticeBox` (Aviso exclusivo de activación gratuita inmediata).
  - Contenedor B: `#paidPlanInstructionsBox` (Cabecera `#pmDisplayTitle`, contenedor `#pmDynamicDetails` y contenedor `#dynamicClientInputs`).
- [ ] **Paso 1.2**: Dejar de utilizar `innerHTML = ...` para reemplazar la estructura estructural del modal; utilizar alternancia de visibilidad (`style.display = 'block'` / `'none'`) o una función de reseteo (`resetCheckoutModalDOM()`) que garantice que los nodos necesarios siempre existan en el DOM.

### Fase 2: Lógica de Apertura y Cambio de Plan en JavaScript
- [ ] **Paso 2.1**: En `proceedToCheckout(planCode, planName, planPrice)` en `static/js/main.js`:
  - Si el plan es de pago (`planPrice > 0`):
    - Ocultar `#freePlanNoticeBox`.
    - Mostrar `#paidPlanInstructionsBox` y el grupo selector de métodos de pago (`#paymentMethodSelect`).
    - Actualizar `#modalPlanTitle` con el nombre del plan (ej. "Plan Básico ($8/mes)").
    - Actualizar `#modalPlanPrice` con `$8` y estado "Pendiente de Pago".
    - Disparar de inmediato la carga y renderizado de los datos bancarios del método seleccionado (`onPaymentMethodSelectedChange()`).
  - Si el plan es gratuito (`planPrice === 0` o `planCode === 'FREE'`):
    - Ocultar `#paidPlanInstructionsBox` y el grupo selector de métodos.
    - Mostrar `#freePlanNoticeBox`.
    - Actualizar `#modalPlanTitle` con "Plan Prueba Gratis".
    - Actualizar `#modalPlanPrice` con "Gratis" y estado "Activación Inmediata".
- [ ] **Paso 2.2**: Sincronizar el script inline de `templates/index.html` con `static/js/main.js` para evitar duplicidad de manejadores o versiones en conflicto (cache-buster `v=8.0`).

### Fase 3: Validación del Envío y Actualización de Cuenta Existente
- [ ] **Paso 3.1**: En `handlePaymentSubmit(event)`:
  - Validar rigurosamente que si el plan seleccionado tiene precio > 0, se extraigan obligatoriamente la referencia y el archivo de comprobante de los campos dinámicos activos.
  - Asegurar que el `selectedPlanCode` se envíe con el código oficial exacto (`BASIC`, `PRO`, `FREE`).
- [ ] **Paso 3.2**: En el backend (`app/routers/suscripciones.py`):
  - Confirmar que al recibir una suscripción con un teléfono ya existente en la base de datos, no se rechace la operación sino que se cree el nuevo registro de suscripción asociado a ese usuario.
  - Al ser aprobado en el panel de administración, la cuenta del usuario actualiza automáticamente su código de plan (`sub.codigo_plan`), extiende su vigencia por 30 días y reactiva el acceso completo en la app móvil.

### Fase 4: Pruebas y Verificación Visual
- [ ] **Paso 4.1**: Probar flujo desde el navegador:
  1. Con una cuenta ya creada, seleccionar "Plan Básico ($8/mes)".
  2. Verificar que se muestre "$8", "Pendiente de Pago" y el selector con los métodos de pago.
  3. Cambiar entre métodos (Pago Móvil, Binance, Zinli) y verificar que cada uno muestre sus datos bancarios y campos de comprobante.
  4. Cerrar el modal, seleccionar "Plan Prueba Gratis" y verificar que muestre la activación gratuita.
  5. Volver a abrir "Plan Básico" y confirmar que se restauren los datos de pago al 100%.
- [ ] **Paso 4.2**: Probar el envío y verificar que abra WhatsApp con el resumen exacto del plan de pago y los datos del comprobante hacia el número del administrador.
