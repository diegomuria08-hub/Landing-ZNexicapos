/* ==========================================================================
   ZNEXICA POS LANDING PAGE - FRONTEND JAVASCRIPT LOGIC
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
  'tab-dashboard',
  'tab-pos',
  'tab-onboarding',
  'tab-productos',
  'tab-entradas',
  'tab-salidas',
  'tab-proveedores',
  'tab-clientes',
  'tab-cuentas',
  'tab-usuarios'
];

let currentTabIndex = 0;
let showcaseDeviceMode = 'desktop'; // 'desktop' | 'mobile'
let isLightboxZoomed = false;

const TAB_DATA = {
  'tab-login': {
    title: '📱 Tu Negocio en tu Bolsillo: Entra desde Celular, Tablet o PC',
    tag: '1. Acceso Fácil y Privado',
    desc: 'Supervisa y maneja tu negocio desde donde estés. Con una sola cuenta entras desde tu teléfono celular, una tablet en el mostrador o la computadora de tu local. Toda la información de tus ventas, productos y dinero está protegida en tu propio espacio privado para que solo tú y tu equipo autorizado puedan verla.',
    img: '/static/images/app_screens/01_acceso_login.png',
    mobileImg: '/static/images/app_screens/mobile_01_login.png',
    bullets: [
      'Úsalo en tu celular, tablet o computadora sin instalar programas complicados',
      'Espacio 100% privado y exclusivo para los datos de tu comercio',
      '3 modos visuales cómodos para la vista: Oscuro, Claro y Vibrante',
      'Tus datos respaldados y protegidos en todo momento'
    ]
  },
  'tab-dashboard': {
    title: '⚡ Resumen del Día: Sabe Exactamente Cuánto Estás Ganando',
    tag: '2. Control Total de tu Dinero',
    desc: 'Olvídate de sacar cuentas en cuadernos o esperar al final de la noche para saber cómo estuvo el día. Apenas entras al sistema, ves cuánto dinero ha ingresado hoy, cuántas ventas llevas hechas, a qué tasa está el dólar o el euro y el estado de tu caja en tiempo real.',
    img: '/static/images/app_screens/02_panel_inicio.png',
    mobileImg: '/static/images/app_screens/mobile_02_dashboard.png',
    bullets: [
      'Mira al instante cuánto has vendido hoy en Dólares, Euros y Bolívares',
      'Tasa de cambio oficial actualizada para que nunca vendas a pérdida',
      'Botón directo para abrir tu caja y empezar a cobrar en segundos',
      'Control claro de cada turno de trabajo de tus empleados'
    ]
  },
  'tab-pos': {
    title: '🛒 Caja Rápida: Cobra en Segundos sin Usar Calculadora',
    tag: '3. Ventas Ágiles y Multi-Moneda',
    desc: 'Despacha a tus clientes rápido y sin colas en el mostrador. Toca los productos en pantalla o escanea el código de barras con la cámara de tu teléfono; el sistema calcula automáticamente el total en Dólares (USD), Euros (EUR) y Bolívares (Bs) al instante, incluso si se va el internet.',
    img: '/static/images/app_screens/04_punto_de_venta.png',
    mobileImg: '/static/images/app_screens/mobile_03_pos.png',
    bullets: [
      'Cálculo automático en USD, EUR y Bolívares sin errores de cuenta',
      'Busca por nombre o escanea códigos de barras desde el celular o lector',
      'Pausa una cuenta en espera mientras atiendes a otro cliente rápido',
      'Sigue cobrando aunque falle el internet (Modo Sin Conexión)'
    ]
  },
  'tab-onboarding': {
    title: '💡 Tan Fácil que Cualquier Empleado Aprende en 5 Minutos',
    tag: '4. Cero Complicaciones',
    desc: 'No necesitas saber de computación ni pasar días entrenando a un cajero nuevo. ZNexica POS incluye un asistente visual en pantalla que le indica paso a paso dónde tocar para agregar productos, cambiar cantidades y cerrar la venta desde el primer día.',
    img: '/static/images/app_screens/03_pos_guia_onboarding.png',
    mobileImg: '/static/images/app_screens/03_pos_guia_onboarding.png',
    bullets: [
      'Guía en pantalla que explica paso a paso cómo cobrar',
      'Botones grandes y claros pensados para pantallas táctiles y tablets',
      'Tus trabajadores aprenden a usarlo en minutos sin cometer errores',
      'Ideal para bodegones, abastos, tiendas de ropa, ferreterías y emprendimientos'
    ]
  },
  'tab-productos': {
    title: '🏷️ Tus Productos y Precios Siempre al Día y Ordenados',
    tag: '5. Catálogo e Inventario Inteligente',
    desc: 'Registra toda tu mercancía organizada por departamentos (bebidas, víveres, repuestos, calzado, etc.). Coloca cuánto te costó cada producto y cuánto le quieres ganar: el sistema protege tus precios en divisas y te avisa cuando un producto se está agotando.',
    img: '/static/images/app_screens/05_catalogo_productos.png',
    mobileImg: '/static/images/app_screens/05_catalogo_productos.png',
    bullets: [
      'Vende por unidad, por peso (kilos/gramos), litros o paquetes',
      'Calcula tu ganancia real comparando costo de compra vs. precio de venta',
      'Avisos automáticos cuando te queda poca mercancía en el estante',
      'Actualiza precios en segundos sin frenar la atención al público'
    ]
  },
  'tab-entradas': {
    title: '📥 Registra la Mercancía que Llega y Cuida tu Inversión',
    tag: '6. Recepción de Mercancía',
    desc: 'Cada vez que te despacha un proveedor, registra la mercancía que entra a tu negocio en un par de toques. Así sabes exactamente cuántas unidades llegaron, a qué costo las compraste, con qué factura ingresaron y tu stock se suma automáticamente.',
    img: '/static/images/app_screens/10_inventario_entradas.png',
    mobileImg: '/static/images/app_screens/10_inventario_entradas.png',
    bullets: [
      'Suma mercancía nueva a tu inventario de forma inmediata',
      'Guarda el precio de compra y el número de factura de cada proveedor',
      'Actualiza tus costos para no perder dinero cuando suba la mercancía',
      'Historial claro de todo lo que has comprado por fecha'
    ]
  },
  'tab-salidas': {
    title: '📤 Frena las Pérdidas Hormiga y Descuadres de Mercancía',
    tag: '7. Prevención de Pérdidas',
    desc: '¿Sientes que vendes pero no ves la ganancia porque faltan productos? Con este módulo registras cualquier producto que salga sin venderse (vencidos, dañados, consumo del local o ajustes), sabiendo quién lo autorizó, por qué salió y a qué hora.',
    img: '/static/images/app_screens/11_inventario_salidas.png',
    mobileImg: '/static/images/app_screens/11_inventario_salidas.png',
    bullets: [
      'Detecta y frena robos hormiga o mercancía extraviada en tu tienda',
      'Registra productos dañados, vencidos o de uso interno con justificación',
      'Sabe exactamente qué usuario hizo cada movimiento de inventario',
      'Tu conteo físico en estantes coincide siempre con lo que dice el sistema'
    ]
  },
  'tab-proveedores': {
    title: '🚚 Agenda de Proveedores para Reponer Stock a Tiempo',
    tag: '8. Compras y Distribuidores',
    desc: 'Ten todos los datos de tus distribuidores y vendedores en un solo lugar. Consulta rápido sus teléfonos, RIF, días de despacho y condiciones de pago para hacer tus pedidos a tiempo y negociar mejores precios para tu negocio.',
    img: '/static/images/app_screens/12_directorio_proveedores.png',
    mobileImg: '/static/images/app_screens/12_directorio_proveedores.png',
    bullets: [
      'Directorio organizado con teléfonos, RIF y contacto de cada distribuidor',
      'Control de plazos de pago y créditos que te dan tus proveedores',
      'Consulta rápida de qué productos le compras a cada proveedor',
      'Todo a la mano desde tu celular cuando vayas a surtir tu negocio'
    ]
  },
  'tab-clientes': {
    title: '👥 Cartera de Clientes con Contacto Directo a WhatsApp',
    tag: '9. Atención y Fidelización',
    desc: 'Conoce mejor a quienes compran en tu negocio. Guarda sus datos en segundos, mira el historial de todo lo que te han comprado y escríbele directo a su WhatsApp con un solo toque para enviarles promociones, avisos de mercancía nueva o recordatorios.',
    img: '/static/images/app_screens/07_cartera_clientes.png',
    mobileImg: '/static/images/app_screens/07_cartera_clientes.png',
    bullets: [
      'Botón directo para abrir chat de WhatsApp con tu cliente sin anotar números',
      'Búsqueda instantánea por nombre, cédula o número de teléfono',
      'Mira qué productos compra con más frecuencia cada cliente',
      'Fideliza a tu clientela y aumenta tus ventas recurrentes'
    ]
  },
  'tab-cuentas': {
    title: '💳 Control de Fiados, Créditos y Abonos sin Perder Plata',
    tag: '10. Cuentas por Cobrar',
    desc: 'Si vendes a crédito o por abonos, nunca más perderás dinero por papeles extraviados o cuentas olvidadas. El sistema lleva la cuenta exacta de cuánto te debe cada cliente, registra cada abono que te hacen y te muestra cuánto dinero tienes en la calle por cobrar.',
    img: '/static/images/app_screens/09_cuentas_por_cobrar.png',
    mobileImg: '/static/images/app_screens/09_cuentas_por_cobrar.png',
    bullets: [
      'Sabe al centavo quién te debe, desde cuándo y cuánto le falta por pagar',
      'Registra pagos parciales o abonos y descuéntalos de la deuda al instante',
      'Deudas protegidas en dólares para que la inflación no se coma tu dinero',
      'Cobra a tiempo con recordatorios claros por cliente'
    ]
  },
  'tab-usuarios': {
    title: '👤 Permisos por Empleado: Tus Cajeros Cobran, Tú Mandas',
    tag: '11. Seguridad de tu Equipo',
    desc: 'Delega el trabajo en tu negocio con total tranquilidad. Crea un usuario para cada cajero o encargado y decide qué puede ver y hacer: tus empleados pueden facturar rápido, pero solo tú como dueño puedes cambiar precios, borrar ventas o ver las ganancias totales.',
    img: '/static/images/app_screens/13_usuarios_y_roles.png',
    mobileImg: '/static/images/app_screens/13_usuarios_y_roles.png',
    bullets: [
      'Cuentas separadas para Dueño (Administrador), Supervisor y Cajeros',
      'Evita que los empleados cambien precios o borren ventas sin tu permiso',
      'Cada venta queda registrada con el nombre del cajero que la realizó',
      'Tranquilidad total para dejar tu negocio operando aunque no estés presente'
    ]
  }
};

function switchShowcaseDevice(mode) {
  showcaseDeviceMode = mode;
  const desktopBtn = document.getElementById('viewModeDesktop');
  const mobileBtn = document.getElementById('viewModeMobile');
  const mockupFrame = document.getElementById('mockupFrame');
  const lbDesktopBtn = document.getElementById('lbViewDesktop');
  const lbMobileBtn = document.getElementById('lbViewMobile');

  if (mode === 'mobile') {
    if (mobileBtn) mobileBtn.classList.add('active');
    if (desktopBtn) desktopBtn.classList.remove('active');
    if (mockupFrame) mockupFrame.classList.add('mobile-mode');
    if (lbMobileBtn) lbMobileBtn.classList.add('active');
    if (lbDesktopBtn) lbDesktopBtn.classList.remove('active');
  } else {
    if (desktopBtn) desktopBtn.classList.add('active');
    if (mobileBtn) mobileBtn.classList.remove('active');
    if (mockupFrame) mockupFrame.classList.remove('mobile-mode');
    if (lbDesktopBtn) lbDesktopBtn.classList.add('active');
    if (lbMobileBtn) lbMobileBtn.classList.remove('active');
  }

  // Volver a renderizar la pestaña activa con el modo seleccionado
  const currentKey = TAB_ORDER[currentTabIndex] || 'tab-login';
  renderShowcase(currentKey);
  syncLightboxContent();
}

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
    showcaseCounter.textContent = `📱 Pantalla ${currentTabIndex + 1} de ${TAB_ORDER.length}`;
  }

  // Seleccionar imagen adecuada según modo dispositivo
  const targetImgSrc = (showcaseDeviceMode === 'mobile' && data.mobileImg) ? data.mobileImg : data.img;

  // Animación fluida de imagen
  if (displayImg) {
    displayImg.classList.add('fade-out');
    displayImg.classList.remove('fade-in');

    setTimeout(() => {
      displayImg.src = targetImgSrc;
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

  syncLightboxContent();
}

function navigateShowcase(direction) {
  let newIndex = currentTabIndex + direction;
  if (newIndex < 0) newIndex = TAB_ORDER.length - 1;
  if (newIndex >= TAB_ORDER.length) newIndex = 0;
  renderShowcase(TAB_ORDER[newIndex]);
}

/* ==========================================================================
   2.1 VISOR INTERACTIVO DE CAPTURAS EN PANTALLA COMPLETA (LIGHTBOX / ZOOM)
   ========================================================================== */
function syncLightboxContent() {
  const modal = document.getElementById('screenshotLightboxModal');
  if (!modal || !modal.classList.contains('active')) return;

  const currentKey = TAB_ORDER[currentTabIndex] || 'tab-login';
  const data = TAB_DATA[currentKey];
  if (!data) return;

  const lbImg = document.getElementById('lightboxImg');
  const lbTag = document.getElementById('lightboxTag');
  const lbTitle = document.getElementById('lightboxTitle');
  const lbDesc = document.getElementById('lightboxDesc');
  const lbBullets = document.getElementById('lightboxBullets');
  const lbCounter = document.getElementById('lightboxCounter');
  const lbStage = document.getElementById('lightboxStage');

  const targetImgSrc = (showcaseDeviceMode === 'mobile' && data.mobileImg) ? data.mobileImg : data.img;

  if (lbImg) {
    lbImg.src = targetImgSrc;
    lbImg.alt = data.title;
    lbImg.classList.remove('zoomed');
  }
  isLightboxZoomed = false;
  const zoomBtn = document.getElementById('lightboxZoomBtn');
  if (zoomBtn) zoomBtn.innerHTML = '🔍 Acercar Zoom';
  if (lbStage) lbStage.scrollTop = 0;

  if (lbTag) lbTag.textContent = data.tag;
  if (lbTitle) lbTitle.textContent = data.title;
  if (lbDesc) lbDesc.textContent = data.desc;
  if (lbCounter) lbCounter.textContent = `Pantalla ${currentTabIndex + 1} de ${TAB_ORDER.length}`;

  if (lbBullets && data.bullets) {
    lbBullets.innerHTML = data.bullets
      .map(b => `<div class="lb-bullet-chip"><span>✓</span> ${b}</div>`)
      .join('');
  }
}

function openScreenshotLightbox() {
  const modal = document.getElementById('screenshotLightboxModal');
  if (!modal) return;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  syncLightboxContent();
}

function closeScreenshotLightbox(event) {
  if (event && event.target && event.target.id !== 'screenshotLightboxModal') return;
  const modal = document.getElementById('screenshotLightboxModal');
  if (!modal) return;

  modal.classList.remove('active');
  document.body.style.overflow = '';
  isLightboxZoomed = false;
  const lbImg = document.getElementById('lightboxImg');
  if (lbImg) lbImg.classList.remove('zoomed');
}

function toggleLightboxZoom() {
  const lbImg = document.getElementById('lightboxImg');
  const zoomBtn = document.getElementById('lightboxZoomBtn');
  if (!lbImg) return;

  isLightboxZoomed = !isLightboxZoomed;
  if (isLightboxZoomed) {
    lbImg.classList.add('zoomed');
    if (zoomBtn) zoomBtn.innerHTML = '🔎 Restablecer Tamaño';
  } else {
    lbImg.classList.remove('zoomed');
    if (zoomBtn) zoomBtn.innerHTML = '🔍 Acercar Zoom';
  }
}

function initDynamicTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetKey = btn.getAttribute('data-target');
      renderShowcase(targetKey);
    });
  });

  // Soporte de teclado para el visor de capturas (Escape, Flechas Izquierda/Derecha)
  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('screenshotLightboxModal');
    if (!modal || !modal.classList.contains('active')) return;
    if (e.key === 'Escape') {
      closeScreenshotLightbox();
    } else if (e.key === 'ArrowLeft') {
      navigateShowcase(-1);
    } else if (e.key === 'ArrowRight') {
      navigateShowcase(1);
    }
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

    // Login exitoso: guardar sesión completa con datos reales y contraseña original
    const userObj = data.user || {};
    saveClientSession(data.access_token, {
      full_name: userObj.nombre_completo || phone,
      company_name: userObj.nombre_empresa || '',
      email: userObj.email || '',
      phone: userObj.telefono || phone,
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
      submitBtn.innerHTML = '🚀 Activar Prueba Gratis en ZNexica POS Ahora';
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
        `👋 ¡Hola equipo de ZNexica POS!\n\n` +
        `Acabo de registrarme y activar mi periodo de prueba gratis (30 días) en ZNexica POS.\n` +
        `👤 *Cliente:* ${fullName}\n` +
        `🏢 *Empresa:* ${companyName || 'Sin especificar'}\n` +
        `📱 *Teléfono / Usuario:* ${phone}\n` +
        `🚀 *Plan:* Plan Prueba Gratis (30 Días)\n\n` +
        `¡Por favor asístanme para comenzar a configurar mi punto de venta!`
      );
      const waUrl = `https://wa.me/${cleanSellerPhone}?text=${waMsg}`;

      alert(
        `🎉 ¡Felicitaciones ${fullName}!\n\n` +
        `Tu empresa "${companyName || 'ZNexica POS'}" y tu usuario han sido activados con éxito en el sistema.\n\n` +
        `Ya puedes abrir la aplicación ZNexica POS e iniciar sesión con tu teléfono (${phone}) y tu contraseña.\n\n` +
        `Se abrirá WhatsApp para que te comuniques con el soporte técnico.`
      );
      window.open(waUrl, '_blank');
    } else {
      const waMsg = encodeURIComponent(
        `👋 ¡Hola equipo de ZNexica POS!\n\n` +
        `Acabo de registrar el pago de mi suscripción al *${data.nombre_plan || 'Plan ZNexica POS'}*.\n` +
        `👤 *Cliente:* ${fullName}\n` +
        `🏢 *Empresa:* ${companyName || 'Sin especificar'}\n` +
        `📱 *Teléfono / Usuario:* ${phone}\n` +
        `💳 *Método:* ${paymentMethodText}\n` +
        `🧾 *Detalles / Ref:* ${referenceLast4}\n\n` +
        `Por favor verifiquen mi pago para activar mi acceso a la app ZNexica POS.`
      );
      const waUrl = `https://wa.me/${cleanSellerPhone}?text=${waMsg}`;

      alert(`✅ ¡Registro y Pago enviado exitosamente!\n\nTu suscripción está registrada. Una vez aprobado el comprobante, tendrás acceso inmediato a la app ZNexica POS.\n\nSe abrirá WhatsApp para que notifiques el pago.`);
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
