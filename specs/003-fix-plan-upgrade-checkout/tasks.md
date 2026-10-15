# Tasks: Corrección y Actualización Dinámica del Checkout en Cambio de Plan

**Branch**: `003-fix-plan-upgrade-checkout` | **Date**: 2026-10-15 | **Spec**: [spec.md](file:///c:/Users/Diego%20Muria/OneDrive/Codigos_Antigravity/landign%20miniPOS/specs/003-fix-plan-upgrade-checkout/spec.md) | **Plan**: [plan.md](file:///c:/Users/Diego%20Muria/OneDrive/Codigos_Antigravity/landign%20miniPOS/specs/003-fix-plan-upgrade-checkout/plan.md)

## Task List (Ejecutadas y Validadas)

- [x] **Task 1: Reestructuración de Contenedores en el Modal de Checkout**
  - **Archivo**: `templates/index.html`
  - **Objetivo**: Separar el aviso de activación gratuita (`#freePlanNoticeBox`) y las instrucciones de pago comercial (`#paidPlanInstructionsBox`) en contenedores independientes para erradicar la sobrescritura destructiva de nodos DOM.

- [x] **Task 2: Corrección de la Función `proceedToCheckout` y Reseteo del Modal**
  - **Archivos**: `static/js/main.js` y `templates/index.html`
  - **Objetivo**: Asegurar que al abrir un plan de pago comercial ($8 o $10), se muestren siempre los métodos de pago, el título "$8/mes" o "$10/mes", y se invoque inmediatamente `onPaymentMethodSelectedChange()` para cargar las cuentas bancarias e inputs de comprobante.

- [x] **Task 3: Sincronización de Selección de Método de Pago y Campos Dinámicos**
  - **Archivos**: `static/js/main.js` y `templates/index.html`
  - **Objetivo**: Garantizar que al cambiar de método de pago (Zinli, Binance, Pago Móvil), `#pmDynamicDetails` exista siempre en el DOM y renderice limpiamente los datos y el formulario de comprobante sin bloqueos silenciosos.

- [x] **Task 4: Validación de Envío y Flujo de Actualización en Backend**
  - **Archivos**: `static/js/main.js` y `app/routers/suscripciones.py`
  - **Objetivo**: Comprobar que el envío para clientes existentes registre la nueva suscripción comercial con el código de plan correcto, exija comprobante para planes de pago y abra WhatsApp con los datos correspondientes.

- [x] **Task 5: Verificación Manual y Validación End-to-End**
  - **Objetivo**: Probar en navegador la alternancia consecutiva entre Plan Gratis y Plan Básico, verificar la carga de datos bancarios de Wally/Zinli, y confirmar que no reaparezca el recuadro verde de plan gratuito al estar en un plan de pago.
