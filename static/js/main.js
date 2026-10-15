/* ==========================================================================
   MINIPOS LANDING PAGE - FRONTEND JAVASCRIPT LOGIC
   Features: Mobile Menu, Dynamic Tabs, FAQ Accordion, Scroll-Spy,
             Reveal Animations, Checkout Modal & Payments
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initDynamicTabs();
  initFaqAccordion();
  initScrollSpy();
  initRevealAnimations();
  initNavbarScroll();
  loadAvailablePaymentMethods();
});

/* ==========================================================================
   1. MOBILE HAMBURGER MENU
   ========================================================================== */
function initMobileMenu() {
  const btn = document.getElementById('hamburgerBtn');
  const menu = document.getElementById('navMenu');

  if (btn && menu) {
    btn.addEventListener('click', () => {
      menu.classList.toggle('active');
      btn.classList.toggle('active');
    });

    document.querySelectorAll('.nav-link, .nav-cta-btn').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('active');
        btn.classList.remove('active');
      });
    });
  }
}

/* ==========================================================================
   2. DYNAMIC TABS — Real App Screenshots & Features Showcase
   ========================================================================== */
const TAB_ORDER = [
  'tab-login',
  'tab-pos',
  'tab-productos',
  'tab-alertas',
  'tab-clientes',
  'tab-entradas',
  'tab-salidas',
  'tab-proveedores',
  'tab-reportes'
];

let currentTabIndex = 0;

const TAB_DATA = {
  'tab-login': {
    title: '📱 Acceso Seguro Móvil & Multi-Inquilino',
    tag: 'Seguridad & Acceso',
    desc: 'Ingreso optimizado y blindado desde cualquier teléfono inteligente, tablet o navegador. Permite alternar entre modo claro y modo oscuro para cuidar tu vista durante largas jornadas, con sesiones encriptadas y autenticación segura.',
    img: '/static/images/app_mobile_initial.jpg',
    bullets: [
      'Acceso rápido desde tu celular o tablet',
      'Modo Oscuro / Modo Claro integrado',
      'Arquitectura multi-inquilino blindada',
      'Sesiones seguras con cifrado robusto'
    ]
  },
  'tab-pos': {
    title: '🛒 Punto de Venta (POS) & Cobro Multi-Moneda',
    tag: 'Facturación Rápida',
    desc: 'Agiliza tus ventas al máximo. Navega por categorías visuales (Limpieza, Bebidas, Víveres, Cárnicos), escanea códigos de barras con la cámara o busca por SKU. Registra ventas al instante en Dólares, Euros o Bolívares con tasa de cambio en vivo.',
    img: '/static/images/app_pos_catalogo.jpg',
    bullets: [
      'Buscador instantáneo y lector de código de barras',
      'Referente cambiario USD, EUR y Bs en tiempo real',
      'Tickets en espera y carrito inteligente',
      'Cobro rápido en efectivo, pago móvil o divisas'
    ]
  },
  'tab-productos': {
    title: '🏷️ Catálogo Completo de Productos & SKU',
    tag: 'Gestión de Productos',
    desc: 'Organiza todo el inventario de tu negocio con código SKU, unidad de medida (Unidad, Litros, Kilos), categoría, precios de costo y PVP en divisas. Modifica o crea artículos en segundos sin interrumpir las ventas.',
    img: '/static/images/app_catalogo_productos.jpg',
    bullets: [
      'Control de precios y márgenes de ganancia',
      'Clasificación por categorías y unidades de entrada',
      'Edición rápida de datos y códigos de barra',
      'Buscador predictivo por nombre o código'
    ]
  },
  'tab-alertas': {
    title: '⚠️ Alertas Inteligentes de Stock Crítico',
    tag: 'Control de Inventario',
    desc: 'Detecta a primera vista qué productos se están agotando. El sistema marca automáticamente en rojo intenso las existencias en cero o bajo stock para evitar quiebres y permitirte realizar pedidos oportunos a tus distribuidores.',
    img: '/static/images/app_stock_alertas.jpg',
    bullets: [
      'Avisos visuales inmediatos de stock en cero',
      'Prevención de pérdidas por falta de mercancía',
      'Monitoreo de existencias en tiempo real',
      'Filtro rápido de productos por reponer'
    ]
  },
  'tab-clientes': {
    title: '👥 Cartera de Clientes & Cuentas por Cobrar',
    tag: 'Fidelización y Créditos',
    desc: 'Mantén una base de datos organizada de tus clientes habituales: cédula, teléfono para WhatsApp, correo y estado de actividad. Gestiona ventas a crédito con total control y realiza seguimiento a los cobros pendientes.',
    img: '/static/images/app_clientes.jpg',
    bullets: [
      'Directorio completo con datos de contacto',
      'Control estricto de cuentas por cobrar',
      'Historial individual de consumos del cliente',
      'Búsqueda por nombre, documento o teléfono'
    ]
  },
  'tab-entradas': {
    title: '📥 Historial de Entradas & Lotes de Mercancía',
    tag: 'Recepción y Costos',
    desc: 'Lleva el registro exacto de cada lote de mercancía que entra a tu negocio. Asocia número de factura o documento del proveedor, costo unitario, cantidad adquirida y cálculo automático del PVP con IVA.',
    img: '/static/images/app_inventario_entradas.jpg',
    bullets: [
      'Trazabilidad de lotes y fechas de recepción',
      'Asociación directa al proveedor y factura',
      'Cálculo automático de costos y precio de venta',
      'Auditoría precisa para arqueo contable'
    ]
  },
  'tab-salidas': {
    title: '📤 Control de Salidas, Mermas & Ajustes',
    tag: 'Auditoría y Mermas',
    desc: 'Evita pérdidas invisibles en tu establecimiento. Registra retiros de mercancía por mermas, productos vencidos, consumo interno, donaciones o ajustes de inventario, sincronizado en tiempo real con las ventas del POS.',
    img: '/static/images/app_inventario_salidas.jpg',
    bullets: [
      'Registro tipificado: merma, vencimiento, ajuste',
      'Historial auditado de ventas y deducciones',
      'Control de stock físico contra sistema',
      'Transparencia absoluta en los movimientos'
    ]
  },
  'tab-proveedores': {
    title: '🚚 Directorio y Gestión de Proveedores',
    tag: 'Cadena de Suministro',
    desc: 'Centraliza el directorio comercial de tus distribuidores: datos fiscales, razón social, contactos y condiciones de crédito. Mantén siempre a mano los contactos para reponer inventario rápidamente y negociar mejores acuerdos.',
    img: '/static/images/app_proveedores.jpg',
    bullets: [
      'Ficha comercial completa del proveedor',
      'Condiciones de pago y crédito asignado',
      'Directorio de contacto telefónico y despacho',
      'Vinculación a entradas y compras registradas'
    ]
  },
  'tab-reportes': {
    title: '📊 Reportes Gerenciales & Cierres de Caja',
    tag: 'Analítica Financiera',
    desc: 'Toma decisiones con información financiera precisa y clara: cierres de caja diarios con desglose por cada método de pago, ventas por rangos de fechas, movimientos de stock y valoración económica total de tu inventario.',
    img: '/static/images/app_reportes_gerenciales.jpg',
    bullets: [
      'Cierres de caja diarios y arqueo transparente',
      'Ventas por rango (semanal, mensual o anual)',
      'Valoración total del stock a costo y venta',
      'Márgenes de ganancia calculados al instante'
    ]
  }
};

function renderShowcase(targetKey) {
  const data = TAB_DATA[targetKey];
  if (!data) return;

  currentTabIndex = TAB_ORDER.indexOf(targetKey);
  if (currentTabIndex === -1) currentTabIndex = 0;

  // Actualizar estado activo en botones
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(b => {
    if (b.getAttribute('data-target') === targetKey) {
      b.classList.add('active');
      b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      b.classList.remove('active');
    }
  });

  const displayImg = document.getElementById('displayImg');
  const displayTitle = document.getElementById('displayTitle');
  const displayTag = document.getElementById('displayTag');
  const displayDesc = document.getElementById('displayDesc');
  const displayBullets = document.getElementById('displayBullets');
  const showcaseCounter = document.getElementById('showcaseCounter');

  if (showcaseCounter) {
    showcaseCounter.textContent = `📱 Captura ${currentTabIndex + 1} de ${TAB_ORDER.length}`;
  }

  // Animación fluida de imagen
  if (displayImg) {
    displayImg.classList.add('fade-out');
    displayImg.classList.remove('fade-in');

    setTimeout(() => {
      displayImg.src = data.img;
      displayImg.alt = data.title;
      displayImg.classList.remove('fade-out');
      displayImg.classList.add('fade-in');
    }, 180);
  }

  if (displayTag) displayTag.textContent = data.tag;
  if (displayTitle) displayTitle.textContent = data.title;
  if (displayDesc) displayDesc.textContent = data.desc;

  if (displayBullets && data.bullets) {
    displayBullets.innerHTML = data.bullets
      .map(b => `<div class="feature-bullet-item"><span class="feature-bullet-icon">✓</span> ${b}</div>`)
      .join('');
  }
}

function navigateShowcase(direction) {
  let newIndex = currentTabIndex + direction;
  if (newIndex < 0) newIndex = TAB_ORDER.length - 1;
  if (newIndex >= TAB_ORDER.length) newIndex = 0;
  renderShowcase(TAB_ORDER[newIndex]);
}

function initDynamicTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetKey = btn.getAttribute('data-target');
      renderShowcase(targetKey);
    });
  });
}

/* ==========================================================================
   3. FAQ ACCORDION
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all
      faqItems.forEach(other => {
        other.classList.remove('active');
        const otherBtn = other.querySelector('.faq-question');
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
      });

      // Toggle current
      if (!isActive) {
        item.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ==========================================================================
   4. SCROLL-SPY — Active Nav Link Highlight
   ========================================================================== */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  if (sections.length === 0 || navLinks.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, {
    rootMargin: '-30% 0px -60% 0px',
    threshold: 0
  });

  sections.forEach(section => observer.observe(section));
}

/* ==========================================================================
   5. REVEAL ANIMATIONS — Intersection Observer
   ========================================================================== */
function initRevealAnimations() {
  const revealElements = document.querySelectorAll('.reveal');

  if (revealElements.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

/* ==========================================================================
   6. NAVBAR SCROLL EFFECT — Add shadow on scroll
   ========================================================================== */
function initNavbarScroll() {
  const navbar = document.getElementById('mainNavbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
}

/* ==========================================================================
   7. CLIENT AUTHENTICATION & SESSION PERSISTENCE (Conditional on Plan Select)
   ========================================================================== */
let pendingPlan = null;
let currentPlanInfo = { code: '', name: '', price: 0 };
let availablePaymentMethods = [];

// Obtener sesión activa del cliente
function getClientSession() {
  const token = localStorage.getItem('minipos_client_token');
  const userStr = localStorage.getItem('minipos_client_user');
  if (token && userStr) {
    try {
      return { token, user: JSON.parse(userStr) };
    } catch (e) {
      return null;
    }
  }
  return null;
}

function saveClientSession(token, userData) {
  localStorage.setItem('minipos_client_token', token);
  localStorage.setItem('minipos_client_user', JSON.stringify(userData));
}

function clearClientSession() {
  localStorage.removeItem('minipos_client_token');
  localStorage.removeItem('minipos_client_user');
}

// Abrir / Cerrar Modal de Auth de Cliente
function openClientAuthModal() {
  const modal = document.getElementById('clientAuthModal');
  const errBox = document.getElementById('clientAuthError');
  if (errBox) {
    errBox.style.display = 'none';
    errBox.textContent = '';
  }

  // Limpiar campos para evitar que el gestor de contraseñas inyecte credenciales de admin
  const regPhone = document.getElementById('regPhone');
  const regPassword = document.getElementById('regPassword');
  const regFullName = document.getElementById('regFullName');
  const regCompanyName = document.getElementById('regCompanyName');
  const regEmail = document.getElementById('regEmail');
  if (regPhone) regPhone.value = '';
  if (regPassword) regPassword.value = '';
  if (regFullName) regFullName.value = '';
  if (regCompanyName) regCompanyName.value = '';
  if (regEmail) regEmail.value = '';

  if (modal) modal.classList.add('active');
}

function closeClientAuthModal() {
  const modal = document.getElementById('clientAuthModal');
  if (modal) modal.classList.remove('active');
}

// Alternar entre pestañas de Registro y Login
function switchClientAuthTab(tab) {
  const tabReg = document.getElementById('tabClientRegister');
  const tabLogin = document.getElementById('tabClientLogin');
  const formReg = document.getElementById('clientRegisterForm');
  const formLogin = document.getElementById('clientLoginForm');
  const errBox = document.getElementById('clientAuthError');

  if (errBox) {
    errBox.style.display = 'none';
    errBox.textContent = '';
  }

  if (tab === 'register') {
    if (tabReg) tabReg.classList.add('active');
    if (tabLogin) tabLogin.classList.remove('active');
    if (formReg) formReg.style.display = 'block';
    if (formLogin) formLogin.style.display = 'none';
  } else {
    if (tabReg) tabReg.classList.remove('active');
    if (tabLogin) tabLogin.classList.add('active');
    if (formReg) formReg.style.display = 'none';
    if (formLogin) formLogin.style.display = 'block';
  }
}

// Alternar visibilidad de contraseña (ojo)
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

// Procesar Registro del Cliente
async function handleClientRegisterSubmit(event) {
  event.preventDefault();
  const fullName = document.getElementById('regFullName').value.trim();
  const companyName = (document.getElementById('regCompanyName')?.value || '').trim();
  const email = (document.getElementById('regEmail')?.value || '').trim();
  const phone = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value;
  const errBox = document.getElementById('clientAuthError');

  if (!fullName || !companyName || !email || !phone || !password) {
    if (errBox) {
      errBox.textContent = 'Por favor completa todos los campos del formulario de registro.';
      errBox.style.display = 'block';
    }
    return;
  }

  // Política de contraseña exigida por la API de tenants (mínimo 8 caracteres, al menos una letra y un número)
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;
  if (!passwordRegex.test(password)) {
    if (errBox) {
      errBox.textContent = 'La contraseña debe tener mínimo 8 caracteres y contener al menos una letra y un número.';
      errBox.style.display = 'block';
    }
    return;
  }

  try {
    const res = await fetch('/api/autenticacion/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_completo: fullName,
        nombre_empresa: companyName,
        email: email,
        telefono: phone,
        password: password
      })
    });

    const data = await res.json();
    if (!res.ok) {
      if (errBox) {
        errBox.textContent = data.detail || 'Error al registrar la cuenta.';
        errBox.style.display = 'block';
      }
      return;
    }

    // Registro exitoso: guardar sesión completa
    saveClientSession(data.access_token, {
      full_name: fullName,
      company_name: companyName,
      email: email,
      phone: phone,
      temp_password: password
    });

    closeClientAuthModal();

    // Proceder al checkout si había un plan pendiente
    if (pendingPlan) {
      proceedToCheckout(pendingPlan.code, pendingPlan.name, pendingPlan.price);
    }
  } catch (err) {
    console.error(err);
    if (errBox) {
      errBox.textContent = 'Error de conexión con el servidor. Intenta de nuevo.';
      errBox.style.display = 'block';
    }
  }
}

// Procesar Login del Cliente
async function handleClientLoginSubmit(event) {
  event.preventDefault();
  const phone = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errBox = document.getElementById('clientAuthError');

  if (!phone || !password) {
    if (errBox) {
      errBox.textContent = 'Por favor ingresa tu teléfono y contraseña.';
      errBox.style.display = 'block';
    }
    return;
  }

  try {
    const res = await fetch('/api/autenticacion/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono_o_usuario: phone, password: password })
    });

    const data = await res.json();
    if (!res.ok) {
      if (errBox) {
        errBox.textContent = data.detail || 'Credenciales inválidas.';
        errBox.style.display = 'block';
      }
      return;
    }

    // Login exitoso: guardar sesión
    saveClientSession(data.access_token, {
      full_name: phone, // O teléfono si no viene en token
      phone: phone
    });

    closeClientAuthModal();

    // Proceder al checkout si había un plan pendiente
    if (pendingPlan) {
      proceedToCheckout(pendingPlan.code, pendingPlan.name, pendingPlan.price);
    }
  } catch (err) {
    console.error(err);
    if (errBox) {
      errBox.textContent = 'Error de conexión con el servidor. Intenta de nuevo.';
      errBox.style.display = 'block';
    }
  }
}

// Cerrar sesión del cliente y re-autenticar
function logoutClientAndReauth() {
  clearClientSession();
  closeCheckoutModal();
  openClientAuthModal();
}

/* ==========================================================================
   8. CHECKOUT MODAL & MÉTODOS DE PAGO (Solo visible con sesión verificada)
   ========================================================================== */
async function loadAvailablePaymentMethods() {
  if (availablePaymentMethods && availablePaymentMethods.length > 0) {
    populatePaymentMethodsDropdown();
  }
  try {
    const res = await fetch('/api/metodos-pago/');
    if (res.ok) {
      availablePaymentMethods = await res.json();
      populatePaymentMethodsDropdown();
    }
  } catch (err) {
    console.error('Error al cargar métodos de pago:', err);
  }
}

function populatePaymentMethodsDropdown() {
  const select = document.getElementById('paymentMethodSelect');
  const container = document.getElementById('pmDynamicDetails');
  const submitBtn = document.getElementById('submitPaymentBtn') || document.querySelector('#paymentForm button[type="submit"]');
  if (!select) return;

  const previousSelectedId = select.value ? parseInt(select.value) : null;
  select.innerHTML = '';
  if (availablePaymentMethods.length === 0) {
    select.innerHTML = '<option value="">No hay métodos de pago configurados</option>';
    select.disabled = true;
    if (container) {
      container.innerHTML = '<div style="color:#dc2626; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:1rem; font-size:0.85rem; font-weight:600; text-align:center;">⚠️ Actualmente no hay métodos de pago activos en el sistema. Por favor contáctanos por WhatsApp para asistirte con tu activación.</div>';
    }
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  select.disabled = false;
  if (submitBtn) submitBtn.disabled = false;

  let optionToSelect = null;
  availablePaymentMethods.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.titulo} ${m.nombre_banco ? ' (' + m.nombre_banco + ')' : ''}`;
    if (previousSelectedId && m.id === previousSelectedId) {
      opt.selected = true;
      optionToSelect = m.id;
    }
    select.appendChild(opt);
  });

  if (!optionToSelect && availablePaymentMethods.length > 0) {
    select.selectedIndex = 0;
  }

  onPaymentMethodSelectedChange();
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeJs(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function onPaymentMethodSelectedChange() {
  const select = document.getElementById('paymentMethodSelect');
  const container = document.getElementById('pmDynamicDetails');
  const titleHeading = document.getElementById('pmDisplayTitle');
  const dynamicInputsContainer = document.getElementById('dynamicClientInputs');

  if (!select || !container) return;

  const methodId = parseInt(select.value);
  const selected = availablePaymentMethods ? availablePaymentMethods.find(m => m.id === methodId) : null;

  if (!selected) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:1rem;">Selecciona un método de pago válido.</p>';
    if (dynamicInputsContainer) dynamicInputsContainer.innerHTML = '';
    if (titleHeading) titleHeading.style.display = 'block';
    return;
  }

  // Generar campos dinámicos para el usuario según el tipo de método
  if (dynamicInputsContainer) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayDate = `${yyyy}-${mm}-${dd}`;

    let clientInputsHtml = '';
    const t = selected.tipo_metodo;

    if (t === 'pago_movil') {
      clientInputsHtml = `
        <div class="form-group"><label>Referencia (Últimos 4 o 6 dígitos)</label><input type="text" id="dynRef" class="form-input dyn-input" placeholder="Ej. 123456" required></div>
        <div class="form-group"><label>Banco Origen</label><input type="text" id="dynBank" class="form-input dyn-input" placeholder="Ej. Banesco, Mercantil" required></div>
        <div class="form-group"><label>Fecha de Transacción (Hoy por defecto)</label><input type="date" id="dynDate" class="form-input dyn-input" value="${todayDate}" max="${todayDate}" required></div>
        <div class="form-group"><label>Monto Exacto Enviado (Bs)</label><input type="number" step="0.01" id="dynAmount" class="form-input dyn-input" required></div>
        <div class="form-group"><label>Adjuntar Foto / Captura del Comprobante (Requerido)</label><input type="file" id="proofFile" class="form-input dyn-input" accept="image/*" required></div>
      `;
    } else if (t === 'transferencia') {
      clientInputsHtml = `
        <div class="form-group"><label>Número de Referencia Completo</label><input type="text" id="dynRef" class="form-input dyn-input" placeholder="Ej. 0012345678" required></div>
        <div class="form-group"><label>Banco Origen</label><input type="text" id="dynBank" class="form-input dyn-input" placeholder="Ej. Banesco, Provincial" required></div>
        <div class="form-group"><label>Fecha de Transacción (Hoy por defecto)</label><input type="date" id="dynDate" class="form-input dyn-input" value="${todayDate}" max="${todayDate}" required></div>
        <div class="form-group"><label>Cédula/RIF del titular origen (Opcional)</label><input type="text" id="dynIdCard" class="form-input dyn-input"></div>
        <div class="form-group"><label>Comprobante (Requerido)</label><input type="file" id="proofFile" class="form-input dyn-input" accept="image/*" required></div>
      `;
    } else if (t === 'binance') {
      clientInputsHtml = `
        <div class="form-group"><label>Pay ID / Order ID</label><input type="text" id="dynRef" class="form-input dyn-input" required></div>
        <div class="form-group"><label>Nombre de Usuario Binance</label><input type="text" id="dynUser" class="form-input dyn-input" required></div>
        <div class="form-group"><label>Monto Enviado (USDT)</label><input type="number" step="0.01" id="dynAmount" class="form-input dyn-input" required></div>
        <div class="form-group"><label>Captura de Pantalla (Requerido)</label><input type="file" id="proofFile" class="form-input dyn-input" accept="image/*" required></div>
      `;
    } else if (t === 'zelle') {
      clientInputsHtml = `
        <div class="form-group"><label>Nombre Titular Cuenta Origen</label><input type="text" id="dynUser" class="form-input dyn-input" required></div>
        <div class="form-group"><label>Número de Confirmación</label><input type="text" id="dynRef" class="form-input dyn-input" required></div>
        <div class="form-group"><label>Fecha de Transacción (Hoy por defecto)</label><input type="date" id="dynDate" class="form-input dyn-input" value="${todayDate}" max="${todayDate}" required></div>
        <div class="form-group"><label>Captura de Pantalla (Requerido)</label><input type="file" id="proofFile" class="form-input dyn-input" accept="image/*" required></div>
      `;
    } else if (t === 'zinli' || t === 'paypal') {
      clientInputsHtml = `
        <div class="form-group"><label>Correo / Teléfono de Origen</label><input type="text" id="dynUser" class="form-input dyn-input" required></div>
        <div class="form-group"><label>Número de Referencia</label><input type="text" id="dynRef" class="form-input dyn-input" required></div>
        <div class="form-group"><label>Captura de Pantalla (Requerido)</label><input type="file" id="proofFile" class="form-input dyn-input" accept="image/*" required></div>
      `;
    } else if (t === 'efectivo') {
      clientInputsHtml = `
        <div class="form-group"><label>Persona que Entregará (Nombre y Apellido)</label><input type="text" id="dynUser" class="form-input dyn-input" required></div>
        <div class="form-group"><label>Denominación / Billetes (Ej. 2 de $20)</label><input type="text" id="dynDetails" class="form-input dyn-input" required></div>
        <div class="form-group"><label>Fecha Estimada de Entrega</label><input type="date" id="dynDate" class="form-input dyn-input" value="${todayDate}" required></div>
        <input type="file" id="proofFile" class="dyn-input" style="display:none;">
      `;
    } else {
      clientInputsHtml = `
        <div class="form-group"><label>Detalles del Pago</label><textarea id="dynDetails" class="form-input dyn-input" required></textarea></div>
        <div class="form-group"><label>Comprobante (Requerido)</label><input type="file" id="proofFile" class="form-input dyn-input" accept="image/*" required></div>
      `;
    }
    dynamicInputsContainer.innerHTML = clientInputsHtml;
  }

  // Ocultamos el heading original porque usaremos el nuevo header dentro del recuadro
  if (titleHeading) {
    titleHeading.style.display = 'none';
  }

  const createRow = (label, value) => {
    const val = value || '';
    const jsVal = escapeJs(val);
    return `
      <div class="pm-data-row">
        <span class="pm-data-label">${label}</span>
        <div class="pm-data-value-group">
          <span class="pm-data-value">${escapeHtml(val)}</span>
          <button type="button" class="btn-copy-nice" onclick="copyToClipboard('${jsVal}', this)" title="Copiar al portapapeles">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  };

  let rows = '';
  let telLabel = 'Teléfono';
  if (selected.tipo_metodo === 'zelle' || selected.tipo_metodo === 'zinli' || selected.tipo_metodo === 'paypal') {
    telLabel = 'Correo / ID';
  } else if (selected.tipo_metodo === 'transferencia') {
    telLabel = 'Número de Cuenta';
  }

  if (selected.telefono) rows += createRow(telLabel, selected.telefono);
  if (selected.cedula) rows += createRow('Cédula/RIF', selected.cedula);
  if (selected.nombre_banco) rows += createRow('Banco/Plataforma', selected.nombre_banco);
  if (selected.binance_id) rows += createRow('Billetera/ID', selected.binance_id);
  if (selected.titular_cuenta) rows += createRow('Titular', selected.titular_cuenta);

  if (!rows) {
    rows = createRow('Información', selected.titulo);
  }

  const html = `
    <div class="pm-inst-card">
      <div class="pm-inst-header">
        <h4>Instrucciones de ${escapeHtml(selected.titulo)}</h4>
        <span class="pm-icon">💸</span>
      </div>
      <div class="pm-inst-body">
        ${rows}
      </div>
      <div class="pm-inst-footer">
        Realice la transferencia exacta y registre el comprobante.
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function copyToClipboard(text, btnElement) {
  navigator.clipboard.writeText(text).then(() => {
    const originalHTML = btnElement.innerHTML;
    btnElement.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    btnElement.classList.add('copied');
    setTimeout(() => {
      btnElement.innerHTML = originalHTML;
      btnElement.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Error al copiar al portapapeles: ', err);
  });
}

// Punto de entrada al seleccionar cualquier plan en la página
function openCheckoutModal(planCode, planName, planPrice) {
  pendingPlan = { code: planCode, name: planName, price: planPrice };

  const session = getClientSession();
  if (!session) {
    // Si no ha iniciado sesión ni registrado, abrir modal de autenticación
    openClientAuthModal();
  } else {
    // Si ya inició sesión antes en este equipo, abrir directamente el checkout
    proceedToCheckout(planCode, planName, planPrice);
  }
}

function proceedToCheckout(planCode, planName, planPrice) {
  currentPlanInfo = { code: planCode, name: planName, price: planPrice };
  const session = getClientSession();

  const modal = document.getElementById('checkoutModal');
  const title = document.getElementById('modalPlanTitle');
  const priceDisplay = document.getElementById('modalPlanPrice');
  const statusBadge = document.getElementById('modalPlanStatusBadge') || document.querySelector('.checkout-plan-summary .status-badge');
  const hiddenCode = document.getElementById('selectedPlanCode');
  const userDisp = document.getElementById('checkoutUserDisplay');
  const phoneDisp = document.getElementById('checkoutPhoneDisplay');
  const warnPhoneDisp = document.getElementById('warnPhoneDisplay');
  const isFree = (planCode === 'FREE' || planPrice === 0);

  if (title) title.textContent = planName;
  if (priceDisplay) priceDisplay.textContent = isFree ? 'Gratis' : `$${planPrice}`;
  if (statusBadge) {
    statusBadge.textContent = isFree ? 'Activación Inmediata' : 'Pendiente de Pago';
    if (isFree) {
      statusBadge.classList.remove('status-pending');
      statusBadge.classList.add('status-active');
    } else {
      statusBadge.classList.remove('status-active');
      statusBadge.classList.add('status-pending');
    }
  }
  if (hiddenCode) hiddenCode.value = planCode;

  if (session && session.user) {
    const uName = session.user.full_name || 'Cliente';
    const uPhone = session.user.phone || '';
    if (userDisp) userDisp.textContent = uName;
    if (phoneDisp) phoneDisp.textContent = uPhone;
    if (warnPhoneDisp) warnPhoneDisp.textContent = uPhone;
  }

  // Contenedores dedicados independientes (sin sobrescritura destructiva de nodos)
  const freeBox = document.getElementById('freePlanNoticeBox');
  const paidBox = document.getElementById('paidPlanInstructionsBox');
  const dynamicInputs = document.getElementById('dynamicClientInputs');
  const submitBtn = document.getElementById('submitPaymentBtn') || document.querySelector('#paymentForm button[type="submit"]');

  if (isFree) {
    if (paidBox) paidBox.style.display = 'none';
    if (freeBox) freeBox.style.display = 'block';
    if (dynamicInputs) dynamicInputs.innerHTML = '';
    if (submitBtn) {
      submitBtn.innerHTML = '🚀 Activar Prueba Gratis en miniPOS Ahora';
      submitBtn.style.background = 'var(--green-primary, #10b981)';
    }
  } else {
    if (freeBox) freeBox.style.display = 'none';
    if (paidBox) paidBox.style.display = 'block';
    if (submitBtn) {
      submitBtn.innerHTML = '📲 Registrar Pago y Notificar por WhatsApp';
      submitBtn.style.background = '';
    }
    loadAvailablePaymentMethods();
  }

  if (modal) modal.classList.add('active');
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.remove('active');
}

/* ==========================================================================
   9. REGISTRO Y ENVÍO DE PAGO O ACTIVACIÓN FREE
   ========================================================================== */
async function handlePaymentSubmit(event) {
  event.preventDefault();

  const session = getClientSession();
  if (!session) {
    alert('Tu sesión ha expirado o no estás autenticado. Por favor identifícate.');
    closeCheckoutModal();
    openClientAuthModal();
    return;
  }

  const planCode = document.getElementById('selectedPlanCode').value;
  const isFree = (planCode === 'FREE' || currentPlanInfo.price === 0);

  let paymentMethodText = 'Plan Gratuito (Prueba 30 Días)';
  let referenceLast4 = 'FREE-TRIAL';
  let proofFile = null;

  if (!isFree) {
    const select = document.getElementById('paymentMethodSelect');
    const methodId = parseInt(select ? select.value : 0);
    const selectedMethodObj = (availablePaymentMethods || []).find(m => m.id === methodId);
    paymentMethodText = selectedMethodObj ? selectedMethodObj.titulo : 'Pago Móvil';

    // Recolección de campos dinámicos
    const dynInputs = document.querySelectorAll('.dyn-input');
    let referenceArray = [];

    dynInputs.forEach(input => {
      if (input.type === 'file') {
        if (input.files && input.files.length > 0) proofFile = input.files[0];
      } else if (input.value) {
        const labelEl = input.previousElementSibling;
        let labelText = labelEl ? labelEl.textContent.split('(')[0].trim() : input.id;
        referenceArray.push(`${labelText}: ${input.value.trim()}`);
      }
    });

    if (!proofFile) {
      const fileEl = document.getElementById('proofFile');
      if (fileEl && fileEl.files && fileEl.files.length > 0) {
        proofFile = fileEl.files[0];
      }
    }

    referenceLast4 = referenceArray.join(' | ');

    if (!referenceLast4 && referenceArray.length === 0 && selectedMethodObj && selectedMethodObj.tipo_metodo !== 'efectivo') {
      alert('Por favor completa todos los campos de pago requeridos.');
      return;
    }

    const requiresProof = ['pago_movil', 'transferencia', 'binance', 'zelle', 'zinli', 'paypal', 'otro'].includes(selectedMethodObj ? selectedMethodObj.tipo_metodo : '');
    
    if (!proofFile && requiresProof && selectedMethodObj && selectedMethodObj.tipo_metodo !== 'efectivo') {
      alert('Por favor adjunta la foto o captura del comprobante de pago.');
      return;
    }
  }

  const fullName = session.user.full_name || 'Cliente';
  const phone = session.user.phone || '';
  const companyName = session.user.company_name || '';
  const email = session.user.email || '';
  const password = session.user.temp_password || '';

  const formData = new FormData();
  formData.append('plan_code', planCode);
  formData.append('full_name', fullName);
  formData.append('company_name', companyName);
  formData.append('email', email);
  formData.append('phone', phone);
  formData.append('password', password);
  formData.append('payment_method', paymentMethodText);
  formData.append('reference_last4', referenceLast4);
  if (proofFile) {
    formData.append('proof_file', proofFile);
  }

  const submitBtn = document.getElementById('submitPaymentBtn') || document.querySelector('#paymentForm button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = isFree ? '⏳ Aprovisionando tu cuenta gratis...' : '⏳ Registrando pago...';
  }

  try {
    const res = await fetch('/api/suscripciones/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`
      },
      body: formData
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errDetail = data.detail || 'Ocurrió un error al procesar la solicitud.';
      alert(`⚠️ ${errDetail}`);
      return;
    }

    closeCheckoutModal();

    let cleanSellerPhone = (window.ADMIN_WHATSAPP_PHONE || "584243580005").toString().replace(/[^0-9]/g, '');
    if (cleanSellerPhone.startsWith('0')) cleanSellerPhone = '58' + cleanSellerPhone.substring(1);
    if (!cleanSellerPhone.startsWith('58')) cleanSellerPhone = '58' + cleanSellerPhone;

    if (isFree) {
      const waMsg = encodeURIComponent(
        `👋 ¡Hola equipo de miniPOS!\n\n` +
        `Acabo de registrarme y activar mi periodo de prueba gratis (30 días) en miniPOS.\n` +
        `👤 *Cliente:* ${fullName}\n` +
        `🏢 *Empresa:* ${companyName || 'Sin especificar'}\n` +
        `📱 *Teléfono / Usuario:* ${phone}\n` +
        `🚀 *Plan:* Plan Prueba Gratis (30 Días)\n\n` +
        `¡Por favor asístanme para comenzar a configurar mi punto de venta!`
      );
      const waUrl = `https://wa.me/${cleanSellerPhone}?text=${waMsg}`;

      alert(
        `🎉 ¡Felicitaciones ${fullName}!\n\n` +
        `Tu empresa "${companyName || 'miniPOS'}" y tu usuario han sido activados con éxito en el sistema.\n\n` +
        `Ya puedes abrir la aplicación móvil miniPOS e iniciar sesión con tu teléfono (${phone}) y tu contraseña.\n\n` +
        `Se abrirá WhatsApp para que te comuniques con el soporte técnico.`
      );
      window.open(waUrl, '_blank');
    } else {
      const waMsg = encodeURIComponent(
        `👋 ¡Hola equipo de miniPOS!\n\n` +
        `Acabo de registrar el pago de mi suscripción al *${data.nombre_plan || 'Plan miniPOS'}*.\n` +
        `👤 *Cliente:* ${fullName}\n` +
        `🏢 *Empresa:* ${companyName || 'Sin especificar'}\n` +
        `📱 *Teléfono / Usuario:* ${phone}\n` +
        `💳 *Método:* ${paymentMethodText}\n` +
        `🧾 *Detalles / Ref:* ${referenceLast4}\n\n` +
        `Por favor verifiquen mi pago para activar mi acceso a la app miniPOS.`
      );
      const waUrl = `https://wa.me/${cleanSellerPhone}?text=${waMsg}`;

      alert(`✅ ¡Registro y Pago enviado exitosamente!\n\nTu suscripción está registrada. Una vez aprobado el comprobante, tendrás acceso inmediato a la app miniPOS.\n\nSe abrirá WhatsApp para que notifiques el pago.`);
      window.open(waUrl, '_blank');
    }

  } catch (err) {
    console.error(err);
    alert('Error de conexión con el servidor al procesar la suscripción.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
}
