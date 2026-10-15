/* ==========================================================================
   MINIPOS ADMIN PANEL - FRONTEND JAVASCRIPT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  checkAdminSession();
});

function getAdminToken() {
  return localStorage.getItem('minipos_admin_token');
}

function checkAdminSession() {
  const token = getAdminToken();
  const loginView = document.getElementById('adminLoginView');
  const dashboardView = document.getElementById('adminDashboardView');
  const logoutBtn = document.getElementById('logoutBtn');

  if (token) {
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    loadAdminProfile();
    loadAdminPaymentMethods();
    loadSubscriptions();
    loadAdminClients();
  } else {
    loginView.style.display = 'block';
    dashboardView.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

function toggleAdminPassVisibility() {
  const passInput = document.getElementById('adminPass');
  const eyeIcon = document.getElementById('adminPassEyeIcon');
  if (!passInput) return;
  if (passInput.type === 'password') {
    passInput.type = 'text';
    if (eyeIcon) {
      eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    }
  } else {
    passInput.type = 'password';
    if (eyeIcon) {
      eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPass').value;
  const errorBox = document.getElementById('adminLoginError');
  if (errorBox) errorBox.style.display = 'none';

  try {
    const res = await fetch('/api/autenticacion/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono_o_usuario: user, password: pass })
    });

    const data = await res.json();
    if (!res.ok || data.user.rol !== 'admin') {
      const msg = data.detail || 'Credenciales inválidas o acceso no autorizado.';
      if (errorBox) {
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
      } else {
        alert(msg);
      }
      return;
    }

    localStorage.setItem('minipos_admin_token', data.access_token);
    checkAdminSession();
  } catch (err) {
    console.error(err);
    if (errorBox) {
      errorBox.textContent = 'Error de conexión con el servidor.';
      errorBox.style.display = 'block';
    } else {
      alert('Error de conexión.');
    }
  }
}

function handleAdminLogout() {
  localStorage.removeItem('minipos_admin_token');
  checkAdminSession();
}

/* ==========================================================================
   GESTIÓN DE MÚLTIPLES MÉTODOS DE PAGO (SaaS Enterprise)
   ========================================================================== */
let adminPaymentMethods = [];

async function loadAdminPaymentMethods() {
  const token = getAdminToken();
  const tbody = document.getElementById('paymentMethodsTableBody');
  const infoEl = document.getElementById('pmTableInfo');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #64748b;">Cargando métodos de pago configurados...</td></tr>';

  try {
    const res = await fetch('/api/metodos-pago/admin', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) handleAdminLogout();
      return;
    }

    adminPaymentMethods = await res.json();
    filterPaymentMethods();
    updateDashboardKPIs();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #dc2626; padding: 1.5rem;">Error al conectar con el servidor.</td></tr>';
  }
}

function filterPaymentMethods() {
  const searchInput = document.getElementById('pmSearchInput');
  const typeFilter = document.getElementById('pmTypeFilter');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedType = typeFilter ? typeFilter.value : 'all';

  const filtered = adminPaymentMethods.filter(m => {
    const matchesType = selectedType === 'all' || m.tipo_metodo === selectedType;
    const matchesQuery = !query || 
      (m.titulo && m.titulo.toLowerCase().includes(query)) ||
      (m.nombre_banco && m.nombre_banco.toLowerCase().includes(query)) ||
      (m.titular_cuenta && m.titular_cuenta.toLowerCase().includes(query)) ||
      (m.telefono && m.telefono.toLowerCase().includes(query)) ||
      (m.binance_id && m.binance_id.toLowerCase().includes(query));
    return matchesType && matchesQuery;
  });

  renderPaymentMethodsTable(filtered);
}

function renderPaymentMethodsTable(methods) {
  const tbody = document.getElementById('paymentMethodsTableBody');
  const infoEl = document.getElementById('pmTableInfo');
  if (!tbody) return;

  if (methods.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2.5rem; color: #64748b;">No se encontraron métodos de pago con los criterios seleccionados.</td></tr>';
    if (infoEl) infoEl.textContent = `Mostrando 0 de ${adminPaymentMethods.length} métodos configurados`;
    return;
  }

  tbody.innerHTML = '';
  methods.forEach(m => {
    const tr = document.createElement('tr');

    // Icono y etiqueta por tipo
    let typeIcon = '💳';
    let typeLabel = 'Transferencia Bancaria';
    if (m.tipo_metodo === 'pago_movil') {
      typeIcon = '📱';
      typeLabel = 'Pago Móvil';
    } else if (m.tipo_metodo === 'binance') {
      typeIcon = '🟡';
      typeLabel = 'Binance Pay (USDT)';
    } else if (m.tipo_metodo === 'zelle') {
      typeIcon = '🏦';
      typeLabel = 'Zelle';
    }

    // Datos de cuenta limpios con tipografía Parclgo
    let accountHtml = '';
    if (m.tipo_metodo === 'pago_movil') {
      accountHtml = `
        <div class="parclgo-cell-bold">${escapeHtml(m.nombre_banco || 'Banco no especificado')}</div>
        <span class="parclgo-cell-sub">Tel: <strong>${escapeHtml(m.telefono || '-')}</strong> • CI: <strong>${escapeHtml(m.cedula || '-')}</strong></span>
      `;
    } else if (m.tipo_metodo === 'binance') {
      accountHtml = `
        <div class="parclgo-cell-bold">Binance Pay ID</div>
        <span class="parclgo-cell-sub">ID: <strong>${escapeHtml(m.binance_id || '-')}</strong> (USDT)</span>
      `;
    } else {
      accountHtml = `
        <div class="parclgo-cell-bold">${escapeHtml(m.nombre_banco || 'Cuenta Bancaria')}</div>
        <span class="parclgo-cell-sub">Ref/Tel: <strong>${escapeHtml(m.telefono || m.binance_id || '-')}</strong></span>
      `;
    }

    const toggleBadgeBtn = `
      <button type="button" class="parclgo-badge ${m.esta_activo ? 'parclgo-badge-active' : 'parclgo-badge-inactive'}" onclick="togglePaymentMethodStatus(${m.id}, ${!m.esta_activo})" title="Clic para ${m.esta_activo ? 'desactivar (quitar de la web)' : 'activar (mostrar en la web)'}" style="cursor: pointer; border: none; font-family: inherit;">
        <span class="parclgo-badge-dot"></span>${m.esta_activo ? 'Activo (En Web)' : 'Inactivo (Oculto)'}
      </button>
    `;

    tr.innerHTML = `
      <td style="text-align: center;"><input type="checkbox" class="saas-checkbox pm-row-checkbox" value="${m.id}"></td>
      <td>
        <div class="parclgo-cell-user">
          <div class="parclgo-user-avatar" style="background: #f1f5f9; color: #0f172a; font-size: 1.15rem;">${typeIcon}</div>
          <div>
            <div class="parclgo-cell-bold">${escapeHtml(m.titulo)}</div>
            <span class="parclgo-cell-sub" style="font-weight: 600; color: #059669;">${typeLabel}</span>
          </div>
        </div>
      </td>
      <td>${accountHtml}</td>
      <td>
        <div class="parclgo-cell-bold">${escapeHtml(m.titular_cuenta || 'Sin titular')}</div>
        <span class="parclgo-cell-sub">Beneficiario Registrado</span>
      </td>
      <td>${toggleBadgeBtn}</td>
      <td style="text-align: right;">
        <div class="action-btn-group" style="justify-content: flex-end;">
          <button class="btn-micro" onclick="openEditPaymentMethodModal(${m.id})" title="Editar método de pago">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-micro btn-micro-danger" onclick="deletePaymentMethod(${m.id})" title="Eliminar método permanentemente">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (infoEl) {
    infoEl.textContent = `Mostrando ${methods.length} de ${adminPaymentMethods.length} métodos configurados`;
  }
  renderPmPagination(methods.length);
}

function togglePmTypeFields() {
  const typeSelect = document.getElementById('pmType');
  if (!typeSelect) return;
  const type = typeSelect.value;

  const grpBank = document.getElementById('pmBankName')?.parentElement;
  const lblBank = document.querySelector('label[for="pmBankName"]');
  
  const grpPhone = document.getElementById('pmPhone')?.parentElement;
  const lblPhone = document.querySelector('label[for="pmPhone"]');
  
  const grpIdCard = document.getElementById('pmIdCard')?.parentElement;
  const lblIdCard = document.querySelector('label[for="pmIdCard"]');
  
  const grpBinance = document.getElementById('pmBinanceId')?.parentElement;
  const lblBinance = document.querySelector('label[for="pmBinanceId"]');
  
  const grpHolder = document.getElementById('pmHolder')?.parentElement;
  const lblHolder = document.querySelector('label[for="pmHolder"]');

  if (!grpBank || !grpPhone || !grpIdCard || !grpBinance || !grpHolder) return;

  // Reset all to visible initially
  grpBank.style.display = 'block';
  grpPhone.style.display = 'block';
  grpIdCard.style.display = 'block';
  grpBinance.style.display = 'block';
  grpHolder.style.display = 'block';

  // Customize based on type
  if (type === 'pago_movil') {
    lblBank.textContent = 'Banco (Opcional)';
    lblPhone.textContent = 'Teléfono (Opcional)';
    lblIdCard.textContent = 'Cédula / RIF (Opcional)';
    grpBinance.style.display = 'none';
  } else if (type === 'transferencia') {
    lblBank.textContent = 'Banco (Opcional)';
    lblPhone.textContent = 'Número de Cuenta (Opcional)';
    lblIdCard.textContent = 'Cédula / RIF (Opcional)';
    grpBinance.style.display = 'none';
  } else if (type === 'zelle') {
    grpBank.style.display = 'none';
    grpIdCard.style.display = 'none';
    grpBinance.style.display = 'none';
    lblPhone.textContent = 'Correo Electrónico de Zelle (Opcional)';
  } else if (type === 'zinli' || type === 'paypal') {
    grpBank.style.display = 'none';
    grpIdCard.style.display = 'none';
    grpBinance.style.display = 'none';
    lblPhone.textContent = 'Correo Electrónico (Opcional)';
  } else if (type === 'binance') {
    grpBank.style.display = 'none';
    grpPhone.style.display = 'none';
    grpIdCard.style.display = 'none';
    lblBinance.textContent = 'Binance Pay ID / Correo / Billetera USDT (Opcional)';
  } else if (type === 'efectivo') {
    grpBank.style.display = 'none';
    grpPhone.style.display = 'none';
    grpIdCard.style.display = 'none';
    grpBinance.style.display = 'none';
    grpHolder.style.display = 'none';
  } else {
    // otro
    lblBank.textContent = 'Plataforma / Medio (Opcional)';
    lblPhone.textContent = 'Dato Principal (Teléfono/Correo/Cuenta) (Opcional)';
    lblIdCard.textContent = 'Documento de Identidad (Opcional)';
  }
}

function openAddPaymentMethodModal() {
  document.getElementById('pmId').value = '';
  document.getElementById('pmModalTitle').textContent = 'Nuevo Método de Pago';
  document.getElementById('pmType').value = 'pago_movil';
  document.getElementById('pmTitle').value = '';
  document.getElementById('pmBankName').value = '';
  document.getElementById('pmPhone').value = '';
  document.getElementById('pmIdCard').value = '';
  document.getElementById('pmBinanceId').value = '';
  document.getElementById('pmHolder').value = '';
  togglePmTypeFields();

  document.getElementById('pmModal').classList.add('active');
}

function openEditPaymentMethodModal(methodId) {
  const method = adminPaymentMethods.find(m => m.id === methodId);
  if (!method) return;

  document.getElementById('pmId').value = method.id;
  document.getElementById('pmModalTitle').textContent = `Editar Método #${method.id}`;
  document.getElementById('pmType').value = method.tipo_metodo || 'pago_movil';
  document.getElementById('pmTitle').value = method.titulo || '';
  document.getElementById('pmBankName').value = method.nombre_banco || '';
  document.getElementById('pmPhone').value = method.telefono || '';
  document.getElementById('pmIdCard').value = method.cedula || '';
  document.getElementById('pmBinanceId').value = method.binance_id || '';
  document.getElementById('pmHolder').value = method.titular_cuenta || '';
  togglePmTypeFields();

  document.getElementById('pmModal').classList.add('active');
}

function closePmModal() {
  document.getElementById('pmModal').classList.remove('active');
}

async function handleSavePaymentMethod(event) {
  event.preventDefault();
  const token = getAdminToken();
  const methodId = document.getElementById('pmId').value;
  const isEdit = methodId !== '';

  const payload = {
    tipo_metodo: document.getElementById('pmType').value,
    titulo: document.getElementById('pmTitle').value.trim(),
    nombre_banco: document.getElementById('pmBankName').value.trim(),
    telefono: document.getElementById('pmPhone').value.trim(),
    cedula: document.getElementById('pmIdCard').value.trim(),
    binance_id: document.getElementById('pmBinanceId').value.trim(),
    titular_cuenta: document.getElementById('pmHolder').value.trim(),
    esta_activo: true
  };

  try {
    const url = isEdit ? `/api/metodos-pago/admin/${methodId}` : '/api/metodos-pago/admin';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert(`✅ Método de pago ${isEdit ? 'actualizado' : 'creado'} con éxito.`);
      closePmModal();
      loadAdminPaymentMethods();
    } else {
      const data = await res.json();
      alert(data.detail || 'Error al guardar el método de pago.');
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión.');
  }
}

async function deletePaymentMethod(methodId) {
  if (!confirm(`¿Estás seguro de eliminar el método de pago #${methodId}?`)) return;

  const token = getAdminToken();
  try {
    const res = await fetch(`/api/metodos-pago/admin/${methodId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      alert(`🗑️ Método de pago #${methodId} eliminado.`);
      loadAdminPaymentMethods();
    } else {
      alert('Error al eliminar método de pago.');
    }
  } catch (err) {
    console.error(err);
  }
}

/* ==========================================================================
   CONTROL Y AUDITORÍA DE SUSCRIPCIONES Y PAGOS (SaaS Enterprise)
   ========================================================================== */
let adminSubscriptions = [];

async function loadSubscriptions() {
  const token = getAdminToken();
  const tbody = document.getElementById('subscriptionsTableBody');
  const infoEl = document.getElementById('subTableInfo');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #64748b;">Cargando registro de transacciones...</td></tr>';

  try {
    const res = await fetch('/api/admin/suscripciones', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) handleAdminLogout();
      return;
    }

    adminSubscriptions = await res.json();
    filterSubscriptions();
    updateDashboardKPIs();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: #dc2626; padding: 1.5rem;">Error al cargar transacciones.</td></tr>';
  }
}

function filterSubscriptions() {
  const searchInput = document.getElementById('subSearchInput');
  const statusFilter = document.getElementById('subStatusFilter');
  const planFilter = document.getElementById('subPlanFilter');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedStatus = statusFilter ? statusFilter.value : 'all';
  const selectedPlan = planFilter ? planFilter.value : 'all';

  const filtered = adminSubscriptions.filter(sub => {
    const matchesStatus = selectedStatus === 'all' || sub.estado === selectedStatus;
    const matchesPlan = selectedPlan === 'all' || sub.codigo_plan === selectedPlan;
    const clientName = (sub.usuario && sub.usuario.nombre_completo) ? sub.usuario.nombre_completo.toLowerCase() : '';
    const clientPhone = (sub.usuario && sub.usuario.telefono) ? sub.usuario.telefono.toLowerCase() : '';
    const ref = sub.referencia_ultimos4 ? sub.referencia_ultimos4.toLowerCase() : '';
    const plan = sub.nombre_plan ? sub.nombre_plan.toLowerCase() : '';

    const matchesQuery = !query ||
      clientName.includes(query) ||
      clientPhone.includes(query) ||
      ref.includes(query) ||
      plan.includes(query);

    return matchesStatus && matchesPlan && matchesQuery;
  });

  renderSubscriptionsTable(filtered);
}

function formatPaymentDetails(raw) {
  if (!raw) return '<span class="parclgo-cell-sub">Sin detalles</span>';
  const parts = raw.split(' | ');
  if (parts.length === 1) {
    return `<span class="parclgo-cell-sub">Ref: <strong>#${escapeHtml(raw)}</strong></span>`;
  }
  let html = '<div style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.78rem; text-align: left;">';
  parts.forEach(p => {
    const colonIdx = p.indexOf(':');
    if (colonIdx !== -1) {
      const label = p.substring(0, colonIdx).trim();
      const val = p.substring(colonIdx + 1).trim();
      if (label.toLowerCase().includes('fecha')) {
        html += `<div><span style="color: #64748b;">${escapeHtml(label)}:</span> <strong style="color: #1e40af; background: #dbeafe; padding: 0.1rem 0.4rem; border-radius: 4px; display: inline-block;">📅 ${escapeHtml(val)}</strong></div>`;
      } else if (label.toLowerCase().includes('ref')) {
        html += `<div><span style="color: #64748b;">${escapeHtml(label)}:</span> <strong style="color: #065f46; background: #d1fae5; padding: 0.1rem 0.4rem; border-radius: 4px; display: inline-block;">#${escapeHtml(val)}</strong></div>`;
      } else {
        html += `<div><span style="color: #64748b;">${escapeHtml(label)}:</span> <span style="font-weight: 600; color: #1e293b;">${escapeHtml(val)}</span></div>`;
      }
    } else {
      html += `<div>${escapeHtml(p)}</div>`;
    }
  });
  html += '</div>';
  return html;
}

function renderSubscriptionsTable(subs) {
  const tbody = document.getElementById('subscriptionsTableBody');
  const infoEl = document.getElementById('subTableInfo');
  if (!tbody) return;

  if (subs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 2.5rem; color: #64748b;">No se encontraron pagos con los filtros indicados.</td></tr>';
    if (infoEl) infoEl.textContent = `Mostrando 0 de ${adminSubscriptions.length} transacciones registradas`;
    renderSubPagination(0);
    return;
  }

  tbody.innerHTML = '';
  subs.forEach(sub => {
    const tr = document.createElement('tr');

    const userFull = sub.usuario ? sub.usuario.nombre_completo : 'Cliente Anónimo';
    const userPhone = sub.usuario ? sub.usuario.telefono : 'Sin teléfono';

    // Generar iniciales del cliente para el avatar Parclgo
    const initials = userFull.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'CL';

    // Fecha de registro en el servidor
    let regDateStr = '';
    if (sub.creado_en) {
      try {
        const d = new Date(sub.creado_en);
        regDateStr = d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        regDateStr = String(sub.creado_en).substring(0, 16);
      }
    }

    // Badge de estado dot estilo Parclgo
    let statusBadge = '';
    if (sub.estado === 'aprobado') {
      statusBadge = '<span class="parclgo-badge parclgo-badge-active"><span class="parclgo-badge-dot"></span>Aprobado</span>';
    } else if (sub.estado === 'pendiente') {
      statusBadge = '<span class="parclgo-badge parclgo-badge-pending"><span class="parclgo-badge-dot"></span>Pendiente</span>';
    } else {
      statusBadge = '<span class="parclgo-badge parclgo-badge-rejected"><span class="parclgo-badge-dot"></span>Rechazado</span>';
    }

    // Botón de comprobante
    const proofCell = sub.ruta_comprobante
      ? `<button class="proof-btn-link" onclick="openProofModal('${sub.ruta_comprobante}', '${escapeJs(userFull)}')">
           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
           Ver Recibo
         </button>`
      : '<span class="parclgo-cell-sub" style="font-style: italic;">Sin archivo</span>';

    // Formatear método y referencia
    const methodClean = (sub.metodo_pago || 'transferencia').replace('_', ' ').toUpperCase();
    const detailsHtml = formatPaymentDetails(sub.referencia_ultimos4);

    tr.innerHTML = `
      <td style="text-align: center;"><input type="checkbox" class="saas-checkbox sub-row-checkbox" value="${sub.id}"></td>
      <td>
        <div class="parclgo-cell-user">
          <div class="parclgo-user-avatar">${initials}</div>
          <div>
            <div class="parclgo-cell-bold">${escapeHtml(userFull)}</div>
            <span class="parclgo-cell-sub">ID: #${sub.id} ${regDateStr ? `• 🕒 ${regDateStr}` : ''}</span>
          </div>
        </div>
      </td>
      <td>
        <div class="parclgo-cell-bold">${escapeHtml(userPhone)}</div>
        <span class="parclgo-cell-sub">Cliente miniPOS</span>
      </td>
      <td>
        <div class="parclgo-cell-bold">${escapeHtml(sub.nombre_plan)}</div>
        <span class="parclgo-cell-sub" style="text-transform: capitalize;">Plan: ${escapeHtml(sub.codigo_plan)}</span>
      </td>
      <td>
        <span class="parclgo-cell-amount">$${Number(sub.monto_usd || 0).toFixed(2)}</span>
      </td>
      <td>
        <div class="parclgo-cell-bold" style="margin-bottom: 0.25rem;">${methodClean}</div>
        ${detailsHtml}
      </td>
      <td>${proofCell}</td>
      <td>${statusBadge}</td>
      <td style="text-align: right;">
        <div class="action-btn-group" style="justify-content: flex-end;">
          <button class="btn-micro btn-micro-success" onclick="updateSubStatus(${sub.id}, 'aprobado')" title="Aprobar pago y activar acceso miniPOS">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="btn-micro btn-micro-danger" onclick="updateSubStatus(${sub.id}, 'rechazado')" title="Rechazar comprobante">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <button class="btn-micro btn-micro-wa" onclick="notifyWhatsApp(${sub.id})" title="Notificar por WhatsApp">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </button>
          <button class="btn-micro" onclick="deleteSubscription(${sub.id})" title="Eliminar registro">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (infoEl) {
    infoEl.textContent = `Mostrando ${subs.length} de ${adminSubscriptions.length} transacciones registradas`;
  }
  renderSubPagination(subs.length);
}

/* ==========================================================================
   INTERACCIÓN Y CONTROL DE VISTAS (Sidebar & Búsqueda Global)
   ========================================================================== */
function switchAdminView(view) {
  const sectionSubs = document.getElementById('sectionSubscriptions');
  const sectionPm = document.getElementById('sectionPaymentMethods');
  const sectionClients = document.getElementById('sectionClients');
  const sectionProfile = document.getElementById('sectionAdminProfile');
  const kpiGrid = document.querySelector('.parclgo-kpi-grid');
  const searchContainer = document.getElementById('globalSearchContainer');
  const viewTitle = document.getElementById('parclgoViewTitle');
  const navLinks = document.querySelectorAll('.parclgo-nav-link');
  const mobNavBtns = document.querySelectorAll('.parclgo-mobile-nav-btn');

  navLinks.forEach(link => link.classList.remove('active'));
  mobNavBtns.forEach(btn => btn.classList.remove('active'));

  if (view === 'profile') {
    if (sectionSubs) sectionSubs.style.display = 'none';
    if (sectionPm) sectionPm.style.display = 'none';
    if (sectionClients) sectionClients.style.display = 'none';
    if (sectionProfile) sectionProfile.style.display = 'block';
    if (kpiGrid) kpiGrid.style.display = 'none';
    if (searchContainer) searchContainer.style.display = 'none';
    if (viewTitle) viewTitle.textContent = 'Mi Perfil de Administrador';
    const profileNav = document.getElementById('navLinkProfile');
    if (profileNav) profileNav.classList.add('active');
    document.getElementById('mobNavProfile')?.classList.add('active');
    loadAdminProfile();
    return;
  }

  if (view === 'clients') {
    if (sectionSubs) sectionSubs.style.display = 'none';
    if (sectionPm) sectionPm.style.display = 'none';
    if (sectionProfile) sectionProfile.style.display = 'none';
    if (sectionClients) sectionClients.style.display = 'block';
    if (kpiGrid) kpiGrid.style.display = 'grid';
    if (searchContainer) searchContainer.style.display = 'flex';
    if (viewTitle) viewTitle.textContent = 'Directorio de Clientes & Control de Licencias';
    const clientNav = document.getElementById('navLinkClients');
    if (clientNav) clientNav.classList.add('active');
    document.getElementById('mobNavClients')?.classList.add('active');
    loadAdminClients();
    return;
  }

  // Restore KPI grid and search container for dashboard views
  if (kpiGrid) kpiGrid.style.display = 'grid';
  if (searchContainer) searchContainer.style.display = 'flex';
  if (sectionProfile) sectionProfile.style.display = 'none';
  if (sectionClients) sectionClients.style.display = 'none';

  if (view === 'all') {
    if (sectionSubs) sectionSubs.style.display = 'block';
    if (sectionPm) sectionPm.style.display = 'block';
    if (viewTitle) viewTitle.textContent = 'Dashboard Ejecutivo miniPOS';
    if (navLinks[0]) navLinks[0].classList.add('active');
    document.getElementById('mobNavAll')?.classList.add('active');
  } else if (view === 'subs') {
    if (sectionSubs) sectionSubs.style.display = 'block';
    if (sectionPm) sectionPm.style.display = 'none';
    if (viewTitle) viewTitle.textContent = 'Control de Clientes & Suscripciones';
    const subsNav = document.getElementById('navLinkSubs') || navLinks[1];
    if (subsNav) subsNav.classList.add('active');
    document.getElementById('mobNavSubs')?.classList.add('active');
  } else if (view === 'pm') {
    if (sectionSubs) sectionSubs.style.display = 'none';
    if (sectionPm) sectionPm.style.display = 'block';
    if (viewTitle) viewTitle.textContent = 'Gestión de Métodos de Pago';
    const pmNav = document.getElementById('navLinkPm') || navLinks[3];
    if (pmNav) pmNav.classList.add('active');
    document.getElementById('mobNavPm')?.classList.add('active');
  }
}

function handleGlobalSearch(query) {
  const subInput = document.getElementById('subSearchInput');
  const pmInput = document.getElementById('pmSearchInput');
  if (subInput) subInput.value = query;
  if (pmInput) pmInput.value = query;
  filterSubscriptions();
  filterPaymentMethods();
}

async function togglePaymentMethodStatus(methodId, newStatus) {
  const token = getAdminToken();
  const method = adminPaymentMethods.find(m => m.id === methodId);
  if (!method) return;

  const payload = {
    tipo_metodo: method.tipo_metodo,
    titulo: method.titulo,
    nombre_banco: method.nombre_banco || '',
    telefono: method.telefono || '',
    cedula: method.cedula || '',
    binance_id: method.binance_id || '',
    titular_cuenta: method.titular_cuenta || '',
    esta_activo: newStatus
  };

  try {
    const res = await fetch(`/api/metodos-pago/admin/${methodId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      method.esta_activo = newStatus;
      filterPaymentMethods();
      updateDashboardKPIs();
    } else {
      alert('Error al actualizar el estado del método de pago.');
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión.');
  }
}

function toggleSelectAllSubs(checked) {
  document.querySelectorAll('.sub-row-checkbox').forEach(cb => { cb.checked = checked; });
}

function toggleSelectAllPm(checked) {
  document.querySelectorAll('.pm-row-checkbox').forEach(cb => { cb.checked = checked; });
}

function handleAdminNotifications() {
  const pending = adminSubscriptions.filter(s => s.estado === 'pendiente');
  if (pending.length > 0) {
    alert(`🔔 Notificaciones de miniPOS:\nTienes ${pending.length} pago(s) pendiente(s) de revisión.\n\nSe filtrará la lista por 'Pendientes' para que puedas verificarlos y aprobarlos.`);
    const statusFilter = document.getElementById('subStatusFilter');
    if (statusFilter) {
      statusFilter.value = 'pendiente';
      filterSubscriptions();
    }
  } else {
    alert('✅ Todo al día:\nNo tienes pagos pendientes de verificación en este momento.');
  }
}

function renderSubPagination(totalItems) {
  const container = document.getElementById('subPaginationControls');
  if (!container) return;
  const pages = Math.max(1, Math.ceil(totalItems / 10));
  container.innerHTML = `
    <button type="button" class="parclgo-page-btn" aria-label="Anterior" title="Página 1">❮</button>
    <button type="button" class="parclgo-page-btn active">1</button>
    ${pages > 1 ? `<button type="button" class="parclgo-page-btn" title="Página 2">2</button>` : ''}
    <button type="button" class="parclgo-page-btn" aria-label="Siguiente" title="Página ${pages}">❯</button>
  `;
}

function renderPmPagination(totalItems) {
  const container = document.getElementById('pmPaginationControls');
  if (!container) return;
  const pages = Math.max(1, Math.ceil(totalItems / 10));
  container.innerHTML = `
    <button type="button" class="parclgo-page-btn" aria-label="Anterior" title="Página 1">❮</button>
    <button type="button" class="parclgo-page-btn active">1</button>
    ${pages > 1 ? `<button type="button" class="parclgo-page-btn" title="Página 2">2</button>` : ''}
    <button type="button" class="parclgo-page-btn" aria-label="Siguiente" title="Página ${pages}">❯</button>
  `;
}

/* ==========================================================================
   ACTUALIZACIÓN DE KPIS EN TIEMPO REAL
   ========================================================================== */
function updateDashboardKPIs() {
  const totalSubsEl = document.getElementById('kpiTotalSubs');
  const approvedSubsEl = document.getElementById('kpiApprovedSubs');
  const pendingSubsEl = document.getElementById('kpiPendingSubs');
  const totalAmountEl = document.getElementById('kpiTotalAmount');
  const activeMethodsEl = document.getElementById('kpiActiveMethods');
  const notifDot = document.getElementById('adminNotifDot');

  // Solo contabilizar transacciones comerciales reales (excluir planes FREE/de prueba que son de $0)
  const paidSubs = adminSubscriptions.filter(s => s.codigo_plan !== 'FREE' && Number(s.monto_usd || 0) > 0);
  const totalSubs = paidSubs.length;
  const approvedSubs = paidSubs.filter(s => s.estado === 'aprobado');
  const pendingSubs = paidSubs.filter(s => s.estado === 'pendiente');
  const totalAmount = approvedSubs.reduce((acc, curr) => acc + Number(curr.monto_usd || 0), 0);
  const activeMethods = adminPaymentMethods.filter(m => m.esta_activo).length;

  if (totalSubsEl) totalSubsEl.textContent = totalSubs;
  if (approvedSubsEl) approvedSubsEl.textContent = approvedSubs.length;
  if (pendingSubsEl) pendingSubsEl.textContent = pendingSubs.length;
  if (totalAmountEl) totalAmountEl.textContent = `$${totalAmount.toFixed(0)}`;
  if (activeMethodsEl) activeMethodsEl.textContent = activeMethods;
  if (notifDot) notifDot.style.display = pendingSubs.length > 0 ? 'block' : 'none';
}

/* ==========================================================================
   MODAL LIGHTBOX PARA SOPORTE / COMPROBANTE DE PAGO
   ========================================================================== */
function openProofModal(imageUrl, clientName) {
  const modal = document.getElementById('proofModal');
  const img = document.getElementById('proofModalImage');
  const sub = document.getElementById('proofModalSubtitle');
  const downloadBtn = document.getElementById('proofModalDownload');

  if (!modal || !img) return;

  img.src = imageUrl;
  if (downloadBtn) downloadBtn.href = imageUrl;
  if (sub) sub.textContent = `Soporte adjunto por el cliente: ${clientName || 'Cliente'}`;

  modal.classList.add('active');
}

function closeProofModal() {
  const modal = document.getElementById('proofModal');
  if (modal) modal.classList.remove('active');
}

/* Helpers de sanitización */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'");
}

async function updateSubStatus(subId, newStatus) {
  const token = getAdminToken();
  try {
    const res = await fetch(`/api/admin/suscripciones/${subId}/estado`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      alert(`✅ Suscripción #${subId} marcada como ${newStatus.toUpperCase()}. Acceso a la app actualizado.`);
      loadSubscriptions();
    } else {
      alert('Error al cambiar estado.');
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteSubscription(subId) {
  if (!confirm(`¿Deseas eliminar permanentemente el registro de pago #${subId}?`)) return;

  const token = getAdminToken();
  try {
    const res = await fetch(`/api/admin/suscripciones/${subId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      alert(`🗑️ Registro de pago #${subId} eliminado exitosamente.`);
      loadSubscriptions();
    } else {
      alert('Error al eliminar registro.');
    }
  } catch (err) {
    console.error(err);
  }
}

async function triggerAutoCleanup7Days() {
  if (!confirm('¿Deseas ejecutar el borrado automático de pagos viejos (más de 7 días) o rechazados?')) return;

  const token = getAdminToken();
  try {
    const res = await fetch('/api/admin/suscripciones/limpiar-antiguos?days=7', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (res.ok) {
      alert(`🧹 ${data.message}`);
      loadSubscriptions();
    } else {
      alert('Error al ejecutar la limpieza automática.');
    }
  } catch (err) {
    console.error(err);
  }
}

async function triggerPurgeAllSubscriptions() {
  if (!confirm('⚠️ ATENCIÓN: ¿Estás completamente seguro de borrar TODOS los registros de pagos? Esta acción no se puede deshacer.')) return;

  const token = getAdminToken();
  try {
    const res = await fetch('/api/admin/suscripciones/purgar-todo', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (res.ok) {
      alert(`⚠️ ${data.message}`);
      loadSubscriptions();
    } else {
      alert('Error al purgar los registros de pago.');
    }
  } catch (err) {
    console.error(err);
  }
}

async function notifyWhatsApp(subId) {
  const token = getAdminToken();
  try {
    const res = await fetch(`/api/admin/whatsapp-link/${subId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (res.ok && data.whatsapp_url) {
      window.open(data.whatsapp_url, '_blank');
    } else {
      alert('Error al generar enlace de WhatsApp.');
    }
  } catch (err) {
    console.error(err);
  }
}

/* ==========================================================================
   PERFIL DEL ADMINISTRADOR Y PURGA DE DATOS DE PRUEBA
   ========================================================================== */

async function loadAdminProfile() {
  const token = getAdminToken();
  if (!token) return;

  const successAlert = document.getElementById('adminProfileSuccessAlert');
  const errorAlert = document.getElementById('adminProfileErrorAlert');
  if (successAlert) successAlert.style.display = 'none';
  if (errorAlert) errorAlert.style.display = 'none';

  try {
    const res = await fetch('/api/admin/perfil', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      handleAdminLogout();
      return;
    }

    const data = await res.json();
    if (res.ok) {
      const nameInput = document.getElementById('profileFullName');
      const userInput = document.getElementById('profileUsername');
      const badgeName = document.getElementById('adminUserBadgeName');
      const avatar = document.getElementById('adminUserAvatar');

      if (nameInput) nameInput.value = data.nombre_completo || '';
      if (userInput) userInput.value = data.username || '';
      if (badgeName) badgeName.textContent = data.nombre_completo || data.username || 'Admin';
      if (avatar) avatar.textContent = (data.nombre_completo || data.username || 'A').charAt(0).toUpperCase();

      // Limpiar campos de contraseña
      const curPass = document.getElementById('profileCurrentPass');
      const newPass = document.getElementById('profileNewPass');
      const confPass = document.getElementById('profileConfirmPass');
      if (curPass) curPass.value = '';
      if (newPass) newPass.value = '';
      if (confPass) confPass.value = '';
    }
  } catch (err) {
    console.error('Error al cargar perfil de admin:', err);
  }
}

async function handleAdminProfileSubmit(event) {
  event.preventDefault();
  const token = getAdminToken();
  if (!token) return;

  const successAlert = document.getElementById('adminProfileSuccessAlert');
  const errorAlert = document.getElementById('adminProfileErrorAlert');
  if (successAlert) successAlert.style.display = 'none';
  if (errorAlert) errorAlert.style.display = 'none';

  const fullName = document.getElementById('profileFullName')?.value.trim();
  const username = document.getElementById('profileUsername')?.value.trim();
  const currentPass = document.getElementById('profileCurrentPass')?.value;
  const newPass = document.getElementById('profileNewPass')?.value;
  const confirmPass = document.getElementById('profileConfirmPass')?.value;

  if (!currentPass) {
    if (errorAlert) {
      errorAlert.textContent = 'Debes ingresar tu contraseña actual para autorizar la actualización.';
      errorAlert.style.display = 'block';
    }
    return;
  }

  if (newPass) {
    if (newPass.length < 6) {
      if (errorAlert) {
        errorAlert.textContent = 'La nueva contraseña debe tener un mínimo de 6 caracteres.';
        errorAlert.style.display = 'block';
      }
      return;
    }
    if (newPass !== confirmPass) {
      if (errorAlert) {
        errorAlert.textContent = 'La confirmación de la contraseña no coincide con la nueva contraseña.';
        errorAlert.style.display = 'block';
      }
      return;
    }
  }

  const payload = {
    nombre_completo: fullName,
    nuevo_username: username,
    password_actual: currentPass,
    nueva_password: newPass || undefined
  };

  const saveBtn = document.getElementById('saveProfileBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = 'Guardando cambios...';
  }

  try {
    const res = await fetch('/api/admin/perfil', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok) {
      // Guardar el nuevo token emitido
      if (data.token) {
        localStorage.setItem('minipos_admin_token', data.token);
      }

      // Actualizar visualmente la barra superior
      const badgeName = document.getElementById('adminUserBadgeName');
      const avatar = document.getElementById('adminUserAvatar');
      if (badgeName && data.user) badgeName.textContent = data.user.nombre_completo || data.user.username;
      if (avatar && data.user) avatar.textContent = (data.user.nombre_completo || data.user.username || 'A').charAt(0).toUpperCase();

      // Limpiar campos de contraseña
      const curPass = document.getElementById('profileCurrentPass');
      const newP = document.getElementById('profileNewPass');
      const confP = document.getElementById('profileConfirmPass');
      if (curPass) curPass.value = '';
      if (newP) newP.value = '';
      if (confP) confP.value = '';

      if (successAlert) {
        successAlert.innerHTML = `✅ <strong>${data.message}</strong> Los cambios ya están activos en la base de datos sin necesidad de reiniciar el servidor.`;
        successAlert.style.display = 'block';
      }
    } else {
      if (errorAlert) {
        errorAlert.textContent = data.detail || 'Ocurrió un error al actualizar el perfil.';
        errorAlert.style.display = 'block';
      }
    }
  } catch (err) {
    console.error(err);
    if (errorAlert) {
      errorAlert.textContent = 'Error de conexión con el servidor.';
      errorAlert.style.display = 'block';
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Guardar Cambios de Perfil
      `;
    }
  }
}

async function handlePurgeTestData() {
  const confirmMsg = '⚠️ ATENCIÓN: Esta acción eliminará permanentemente todos los clientes y suscripciones de prueba de la base de datos.\n\nLas 3 cuentas de administrador y los métodos de pago se conservarán 100% seguros e intactos.\n\n¿Deseas continuar?';
  if (!confirm(confirmMsg)) return;

  const token = getAdminToken();
  if (!token) return;

  try {
    const res = await fetch('/api/admin/limpiar-datos-prueba', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (res.ok) {
      alert(`✅ ${data.message}`);
      loadSubscriptions();
    } else {
      alert(`Error al limpiar datos: ${data.detail || 'Error en el servidor.'}`);
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión con el servidor al ejecutar la limpieza.');
  }
}

/* ==========================================================================
   DIRECTORIO DE CLIENTES & CONTROL DE LICENCIAS (CORTE DE SERVICIO)
   ========================================================================== */

let adminClients = [];

async function loadAdminClients() {
  const token = getAdminToken();
  const tbody = document.getElementById('clientsTableBody');
  const infoEl = document.getElementById('clientsTableInfo');
  if (!token || !tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #64748b;">Cargando directorio de clientes...</td></tr>';

  try {
    const res = await fetch('/api/admin/clientes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      handleAdminLogout();
      return;
    }

    if (!res.ok) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #dc2626; padding: 1.5rem;">Error al cargar directorio de clientes.</td></tr>';
      return;
    }

    adminClients = await res.json();
    renderClientsTable(adminClients);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #dc2626; padding: 1.5rem;">Error de conexión al cargar clientes.</td></tr>';
  }
}

function filterClients() {
  const query = (document.getElementById('clientSearchInput')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('clientStatusFilter')?.value || 'all';

  const filtered = adminClients.filter(c => {
    // Filtro por texto
    const matchQuery = !query ||
      (c.nombre_completo || '').toLowerCase().includes(query) ||
      (c.nombre_empresa || '').toLowerCase().includes(query) ||
      (c.telefono || '').toLowerCase().includes(query) ||
      (c.email || '').toLowerCase().includes(query);

    // Filtro por estado
    let matchStatus = true;
    if (statusFilter === 'activo') {
      matchStatus = c.servicio_activo && !c.esta_bloqueado;
    } else if (statusFilter === 'suspendido') {
      matchStatus = c.esta_bloqueado || c.esta_vencido;
    } else if (statusFilter === 'por_vencer') {
      matchStatus = c.dias_restantes <= 5 && !c.esta_bloqueado;
    }

    return matchQuery && matchStatus;
  });

  renderClientsTable(filtered);
}

function renderClientsTable(clients) {
  const tbody = document.getElementById('clientsTableBody');
  const infoEl = document.getElementById('clientsTableInfo');
  if (!tbody) return;

  if (clients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2.5rem; color: #64748b;">No se encontraron clientes registrados en este filtro.</td></tr>';
    if (infoEl) infoEl.textContent = `Mostrando 0 de ${adminClients.length} clientes`;
    return;
  }

  tbody.innerHTML = '';
  clients.forEach(c => {
    const tr = document.createElement('tr');

    const initials = (c.nombre_completo || 'CL').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'CL';
    
    // Badge de días restantes / vencimiento
    let cycleBadge = '';
    if (c.esta_vencido) {
      cycleBadge = `<span style="background: #fee2e2; color: #991b1b; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.76rem; display: inline-block;">🔴 Vencido (${c.dias_restantes} días)</span>`;
    } else if (c.dias_restantes <= 5) {
      cycleBadge = `<span style="background: #fef3c7; color: #92400e; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.76rem; display: inline-block;">⚠️ Vence en ${c.dias_restantes} días</span>`;
    } else {
      cycleBadge = `<span style="background: #dcfce7; color: #166534; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.76rem; display: inline-block;">🟢 ${c.dias_restantes} días restantes</span>`;
    }

    // Badge y mensaje de estado del servicio
    let serviceBadge = '';
    let statusMsgColor = '#64748b';

    if (c.estado_servicio === 'pendiente_aprobacion') {
      serviceBadge = `<span class="parclgo-badge parclgo-badge-pending"><span class="parclgo-badge-dot"></span>Pendiente Aprobación</span>`;
      statusMsgColor = '#b45309';
    } else if (c.esta_bloqueado || c.estado_servicio === 'suspendido') {
      serviceBadge = `<span class="parclgo-badge parclgo-badge-rejected"><span class="parclgo-badge-dot"></span>Servicio Suspendido</span>`;
      statusMsgColor = '#dc2626';
    } else if (c.esta_vencido || c.estado_servicio === 'vencido') {
      serviceBadge = `<span class="parclgo-badge parclgo-badge-rejected"><span class="parclgo-badge-dot"></span>Vencido (Ciclo Cumplido)</span>`;
      statusMsgColor = '#dc2626';
    } else if (c.estado_servicio === 'por_vencer') {
      serviceBadge = `<span class="parclgo-badge" style="background:#fef3c7; color:#92400e;"><span class="parclgo-badge-dot" style="background:#d97706;"></span>Por Vencer (${c.dias_restantes}d)</span>`;
      statusMsgColor = '#b45309';
    } else {
      serviceBadge = `<span class="parclgo-badge parclgo-badge-active"><span class="parclgo-badge-dot"></span>Activo en la App</span>`;
      statusMsgColor = '#059669';
    }

    // Botones de acción de servicio
    let serviceActionBtn = '';
    if (c.esta_bloqueado || c.esta_vencido) {
      serviceActionBtn = `
        <button type="button" class="saas-btn-primary" style="padding: 0.38rem 0.7rem; font-size: 0.78rem;" onclick="handleReactivateClient(${c.id}, '${escapeJs(c.nombre_completo)}')">
          ✅ Reactivar Servicio
        </button>
      `;
    } else {
      serviceActionBtn = `
        <button type="button" class="saas-btn-danger" style="padding: 0.38rem 0.7rem; font-size: 0.78rem;" onclick="handleSuspendClient(${c.id}, '${escapeJs(c.nombre_completo)}')">
          ⏸️ Suspender Servicio
        </button>
      `;
    }

    tr.innerHTML = `
      <td>
        <div class="parclgo-cell-user">
          <div class="parclgo-user-avatar" style="background: #4f46e5; color: #fff;">${initials}</div>
          <div>
            <div class="parclgo-cell-bold">${escapeHtml(c.nombre_completo)}</div>
            <span class="parclgo-cell-sub">🏢 ${escapeHtml(c.nombre_empresa)}</span>
            ${c.email ? `<span class="parclgo-cell-sub" style="font-size: 0.72rem; color: #94a3b8;">✉️ ${escapeHtml(c.email)}</span>` : ''}
          </div>
        </div>
      </td>
      <td>
        <div class="parclgo-cell-bold" style="font-family: monospace; font-size: 0.88rem;">📱 ${escapeHtml(c.telefono)}</div>
        <span class="parclgo-cell-sub">Usuario App Móvil</span>
      </td>
      <td>
        <div class="parclgo-cell-bold">${escapeHtml(c.plan_nombre)}</div>
        <span class="parclgo-cell-sub" style="font-weight: 700; color: #4338ca;">Código: ${escapeHtml(c.plan_codigo)}</span>
      </td>
      <td>
        <div style="font-size: 0.78rem; line-height: 1.4;">
          <div><span style="color: #64748b;">Inicio:</span> <strong>${escapeHtml(c.fecha_inicio)}</strong></div>
          <div><span style="color: #64748b;">Corte:</span> <strong>${escapeHtml(c.fecha_fin)}</strong></div>
          <div style="margin-top: 0.25rem;">${cycleBadge}</div>
        </div>
      </td>
      <td>
        ${serviceBadge}
        <div style="font-size: 0.72rem; color: ${statusMsgColor}; margin-top: 0.25rem; max-width: 190px; line-height: 1.3;">
          ${escapeHtml(c.mensaje_servicio || '')}
        </div>
      </td>
      <td style="text-align: right;">
        <div style="display: flex; gap: 0.35rem; justify-content: flex-end; align-items: center; flex-wrap: wrap;">
          ${serviceActionBtn}
          <button type="button" class="btn-micro" onclick="sendClientWhatsAppReminder('${escapeJs(c.telefono)}', '${escapeJs(c.nombre_completo)}', '${escapeJs(c.plan_nombre)}', '${escapeJs(c.fecha_fin)}')" title="Enviar recordatorio de cobro por WhatsApp">
            💬
          </button>
          <button type="button" class="btn-micro btn-micro-danger" onclick="handleDeleteClient(${c.id}, '${escapeJs(c.nombre_completo)}')" title="Eliminar cliente definitivamente de la base de datos">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (infoEl) {
    infoEl.textContent = `Mostrando ${clients.length} de ${adminClients.length} clientes registrados`;
  }
}

async function handleSuspendClient(userId, clientName) {
  const msg = `⚠️ ATENCIÓN: ¿Deseas SUSPENDER temporalmente el servicio a ${clientName}?\n\nAl suspender el servicio:\n1. La app móvil miniPOS cerrará la sesión de forma inmediata.\n2. Se denegará el acceso al punto de venta hasta la regularización del pago.\n3. El cliente verá en pantalla la indicación para renovar su suscripción.`;
  if (!confirm(msg)) return;

  const token = getAdminToken();
  if (!token) return;

  try {
    const res = await fetch(`/api/admin/clientes/${userId}/suspender-servicio`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (res.ok) {
      alert(`⛔ ${data.message}`);
      loadAdminClients();
    } else {
      alert(`Error al suspender servicio: ${data.detail || 'Error en el servidor.'}`);
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión al suspender servicio.');
  }
}

async function handleReactivateClient(userId, clientName) {
  const token = getAdminToken();
  if (!token) return;

  try {
    const res = await fetch(`/api/admin/clientes/${userId}/reactivar-servicio`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (res.ok) {
      alert(`✅ ${data.message}`);
      loadAdminClients();
    } else {
      alert(`Error al reactivar servicio: ${data.detail || 'Error en el servidor.'}`);
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión al reactivar servicio.');
  }
}

function sendClientWhatsAppReminder(phone, clientName, planName, expiryDate) {
  let cleanPhone = (phone || '').toString().replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '58' + cleanPhone.substring(1);
  if (!cleanPhone.startsWith('58')) cleanPhone = '58' + cleanPhone;

  const text = encodeURIComponent(
    `👋 Hola ${clientName}, te escribimos del equipo de *miniPOS*.\n\n` +
    `Te recordamos que tu suscripción al *${planName}* tiene fecha de corte el *${expiryDate}*.\n\n` +
    `💳 Para evitar interrupciones en el uso de tu punto de venta y app móvil miniPOS, por favor realiza tu renovación a tiempo.\n\n` +
    `¡Cualquier duda estamos a tu disposición!`
  );

  const url = `https://wa.me/${cleanPhone}?text=${text}`;
  window.open(url, '_blank');
}

/* ==========================================================================
   BORRADO DIRECTO DE CLIENTE CON CONTEXTO/MOTIVO (SIN MODALES COMPLICADOS)
   ========================================================================== */
async function handleDeleteClient(userId, clientName) {
  const motivo = prompt(
    `🗑️ Eliminar cliente "${clientName}" de la base de datos:\n\n` +
    `Escribe el contexto o motivo por el cual se da de baja este cliente:\n` +
    `(Ejemplo: "Ya no usará el sistema", "Baja voluntaria", "Mora prolongada")`
  );

  // Si presiona cancelar
  if (motivo === null) return;

  const contextText = motivo.trim() || 'Baja solicitada / Ya no utiliza el sistema';

  const token = getAdminToken();
  if (!token) {
    alert('Debes iniciar sesión como administrador.');
    return;
  }

  try {
    const res = await fetch(`/api/admin/clientes/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ motivo: contextText })
    });

    const data = await res.json();
    if (res.ok) {
      alert(`✅ Cliente eliminado de la base de datos correctamente.\n\nMotivo guardado: "${contextText}"`);
      loadAdminClients();
      updateDashboardKPIs();
    } else {
      alert(`⚠️ No se pudo eliminar el cliente: ${data.detail || 'Error en el servidor.'}`);
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión al eliminar el cliente.');
  }
}




