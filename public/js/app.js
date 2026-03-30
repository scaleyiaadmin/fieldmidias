/* ═══════════════════════════════════════════════════
   Field Mídias — app.js  (Design Minimalista v2)
   ═══════════════════════════════════════════════════ */

const API_BASE        = '/api';
const REFRESH_MS      = 30_000;

// ── Estado ──────────────────────────────────────────
const state = {
  view:        'dashboard',  // 'dashboard' | 'contents'
  statusTab:   'pending',    // 'pending' | 'approved' | 'rejected' | 'all'
  contents:    [],
  stats:       null,
  loading:     false,
  modal:       null,         // { contentId, type: 'approve'|'reject' }
  drawerContent: null,
};

// ── DOM helpers ──────────────────────────────────────
const $ = id => document.getElementById(id);

let els = {}; // Será preenchido no init

function initElements() {
  els = {
    // views
    viewDashboard:   $('view-dashboard'),
    viewContents:    $('view-contents'),
    breadcrumb:      $('breadcrumb-label'),
    // sidebar
    navDashboard:    $('nav-dashboard'),
    navContents:     $('nav-contents'),
    pendingBadge:    $('pending-badge'),
    // topbar
    lastUpdate:      $('last-update'),
    refreshBtn:      $('refresh-btn'),
    // dashboard stats
    statTotal:       $('stat-total'),
    statPending:     $('stat-pending'),
    statApproved:    $('stat-approved'),
    statRate:        $('stat-rate'),
    activityList:    $('activity-list'),
    rateApprovedPct: $('rate-approved-pct'),
    ratePendingPct:  $('rate-pending-pct'),
    rateRejectedPct: $('rate-rejected-pct'),
    rateApprovedBar: $('rate-approved-bar'),
    ratePendingBar:  $('rate-pending-bar'),
    rateRejectedBar: $('rate-rejected-bar'),
    dashSeeAll:      $('dash-see-all'),
    // contents
    statusTabs:      $('status-tabs'),
    cardsList:       $('cards-list'),
    resultCount:     $('result-count'),
    tabCountPending:  $('tab-count-pending'),
    tabCountApproved: $('tab-count-approved'),
    tabCountRejected: $('tab-count-rejected'),
    tabCountAll:      $('tab-count-all'),
    // modal
    modal:           $('decision-modal'),
    modalIcon:       $('modal-icon'),
    modalTitle:      $('modal-title'),
    modalSubtitle:   $('modal-subtitle'),
    modalClose:      $('modal-close'),
    modalCancel:     $('modal-cancel'),
    modalConfirm:    $('modal-confirm'),
    modalContentTitle:   $('modal-content-title'),
    modalContentPreview: $('modal-content-preview'),
    commentInput:    $('decision-comment'),
    commentRequired: $('comment-required'),
    commentHint:     $('comment-hint'),
    // drawer
    drawer:         $('detail-drawer'),
    drawerBody:     $('drawer-body'),
    drawerFooter:   $('drawer-footer'),
    drawerClose:    $('drawer-close'),
    // toast
    toastContainer: $('toast-container'),
  };
  
  // Debug: Verificar se algum elemento crítico falhou
  Object.entries(els).forEach(([key, val]) => {
    if (!val) console.warn(`Aviso: Elemento '${key}' não encontrado no DOM.`);
  });
}

// ── API ──────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

async function loadStats() {
  try {
    const data = await apiFetch('/stats');
    state.stats = data.stats;
    renderStats();
  } catch (e) {
    console.error('loadStats:', e);
  }
}

async function loadContents(isBackground = false) {
  if (state.loading) return;
  state.loading = true;
  if (!isBackground) renderSkeletons();

  try {
    const params = new URLSearchParams();
    if (state.statusTab !== 'all') params.set('status', state.statusTab);
    const data = await apiFetch(`/contents?${params}`);
    const newContents = data.contents || [];
    
    // Somente re-renderizar se houver mudanças para não dar "apagão" nem resetar o scroll da tela
    if (JSON.stringify(state.contents) !== JSON.stringify(newContents) || !isBackground) {
      state.contents = newContents;
      renderCards();
    }
    
    updateLastUpdate();
    updateTabCounts();
  } catch (e) {
    console.error('loadContents:', e);
    if (!isBackground) {
      toast('error', 'Erro ao carregar', 'Verifique a conexão com o servidor.');
      showEmpty('Erro ao carregar dados', 'Tente atualizar a página.');
    }
  } finally {
    state.loading = false;
  }
}

async function loadAllForCounts() {
  try {
    const data = await apiFetch('/contents');
    const all = data.contents || [];
    $('tab-count-pending').textContent  = all.filter(c => c.status === 'pending').length;
    $('tab-count-approved').textContent = all.filter(c => c.status === 'approved').length;
    $('tab-count-rejected').textContent = all.filter(c => c.status === 'rejected').length;
    $('tab-count-all').textContent      = all.length;
  } catch (e) { /* silent */ }
}

async function submitDecision() {
  const { contentId, type } = state.modal;
  const comment = els.commentInput.value.trim();

  if (type === 'reject' && !comment) {
    els.commentInput.style.borderColor = 'var(--red-500)';
    els.commentInput.focus();
    toast('error', 'Comentário obrigatório', 'Explique o motivo da rejeição.');
    return;
  }

  els.modalConfirm.disabled = true;
  els.modalConfirm.textContent = 'Enviando…';

  try {
    await apiFetch(`/contents/${contentId}/decide`, {
      method: 'POST',
      body: JSON.stringify({
        decision:      type === 'approve' ? 'approved' : 'rejected',
        reviewer_name: 'Equipe Field',
        comment,
      }),
    });

    closeModal();
    closeDrawer();

    toast(
      type === 'approve' ? 'success' : 'error',
      type === 'approve' ? 'Conteúdo aprovado!' : 'Conteúdo rejeitado',
      type === 'approve'
        ? 'O n8n foi notificado e irá publicar.'
        : 'O n8n foi notificado e o post não será publicado.'
    );

    await Promise.all([loadStats(), loadContents(), loadAllForCounts()]);
  } catch (e) {
    toast('error', 'Falha ao enviar', e.message);
  } finally {
    els.modalConfirm.disabled = false;
    els.modalConfirm.textContent = type === 'approve' ? 'Aprovar' : 'Rejeitar';
  }
}

// ── Renderização: Stats/Dashboard ────────────────────
function renderStats() {
  console.log("renderStats called with state.stats:", state.stats);
  if (!state.stats) return;
  try {
    const { total, pending, approved, rejected, approval_rate } = state.stats;

    els.statTotal.textContent   = total;
    els.statPending.textContent = pending;
    els.statApproved.textContent = approved;
    els.statRate.textContent    = `${approval_rate}%`;

    // Barras de distribuição
    const base = total || 1;
    const ap = Math.round((approved / base) * 100);
    const pe = Math.round((pending  / base) * 100);
    const re = Math.round((rejected / base) * 100);

    els.rateApprovedPct.textContent = `${ap}%`;
    els.ratePendingPct.textContent  = `${pe}%`;
    els.rateRejectedPct.textContent = `${re}%`;
    els.rateApprovedBar.style.width = `${ap}%`;
    els.ratePendingBar.style.width  = `${pe}%`;
    els.rateRejectedBar.style.width = `${re}%`;

    // Badge sidebar
    els.pendingBadge.textContent = pending > 0 ? pending : '';
    els.pendingBadge.style.display = pending > 0 ? 'flex' : 'none';

    // Atividade Recente
    renderActivity();
  } catch (err) {
    console.error("ERRO NO RENDERSTATS:", err);
  }
}

async function renderActivity() {
  try {
    const data = await apiFetch('/contents?limit=8');
    const items = data.contents || [];

    if (JSON.stringify(state.activity) === JSON.stringify(items)) return;
    state.activity = items;

    if (!items.length) {
      els.activityList.innerHTML = `
        <div class="empty-state" style="padding:32px 20px">
          <div class="empty-icon">📭</div>
          <div class="empty-title">Nenhuma atividade ainda</div>
          <div class="empty-desc">Os conteúdos enviados pelo n8n aparecerão aqui.</div>
        </div>`;
      return;
    }

    els.activityList.innerHTML = items.map(c => `
      <div class="activity-item">
        <div class="activity-dot ${c.status}"></div>
        <div class="activity-body">
          <div class="activity-title">${escHtml(c.title)}</div>
          <div class="activity-meta">${platformLabel(c.platform)} · ${timeAgo(c.created_at)}</div>
        </div>
        <span class="activity-badge ${c.status}">${statusLabel(c.status)}</span>
      </div>`).join('');
  } catch (e) { /* silent */ }
}

// ── Renderização: Cards de Conteúdo ─────────────────
function renderCards() {
  if (!state.contents.length) {
    const empties = {
      pending:  ['Nenhum pendente', 'Não há conteúdos aguardando aprovação.'],
      approved: ['Nenhum aprovado', 'Ainda não há conteúdos aprovados.'],
      rejected: ['Nenhum rejeitado', 'Nenhum conteúdo foi rejeitado.'],
      all:      ['Nenhum conteúdo', 'O n8n ainda não enviou conteúdos para revisão.'],
    };
    const [t, d] = empties[state.statusTab] || empties.all;
    showEmpty(t, d);
    els.resultCount.textContent = '0 posts';
    return;
  }

  els.resultCount.textContent = `${state.contents.length} post${state.contents.length !== 1 ? 's' : ''}`;

  els.cardsList.innerHTML = state.contents.map(c => {
    const thumb = c.media_urls && c.media_urls.length > 0
      ? `<div class="content-row-thumb"><img src="${escHtml(c.media_urls[0])}" alt="Thumb" /></div>`
      : `<div class="content-row-thumb">📷</div>`;

    const actions = c.status === 'pending' ? `
      <button class="btn btn-approve btn-sm" style="padding:5px 12px;font-size:12px" data-approve="${c.id}" data-title="${escAttr(c.title)}" data-preview="${escAttr((c.content||'').slice(0,120))}">Aprovar</button>
      <button class="btn btn-reject btn-sm"  style="padding:5px 12px;font-size:12px" data-reject="${c.id}"  data-title="${escAttr(c.title)}" data-preview="${escAttr((c.content||'').slice(0,120))}">Rejeitar</button>
    ` : `<span class="status-badge ${c.status}">${statusLabel(c.status)}</span>`;

    return `
      <div class="content-row" data-id="${c.id}" style="cursor:pointer" title="Ver detalhes">
        ${thumb}
        <div class="content-row-body">
          <div class="content-row-title">${escHtml(c.title)}</div>
          <div class="content-row-meta">
            <span>${platformLabel(c.platform)}</span>
            <span class="dot-sep">·</span>
            <span>${timeAgo(c.created_at)}</span>
            ${c.scheduled_date ? `<span class="dot-sep">·</span><span>Agendado: ${formatDate(c.scheduled_date)}</span>` : ''}
          </div>
        </div>
        <div class="content-row-actions">${actions}</div>
      </div>`;
  }).join('');

  // bind clicks nos botões de ação
  els.cardsList.querySelectorAll('[data-approve]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); openModal('approve', btn.dataset.approve, btn.dataset); })
  );
  els.cardsList.querySelectorAll('[data-reject]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); openModal('reject', btn.dataset.reject, btn.dataset); })
  );

  // bind clique na row para abrir drawer
  els.cardsList.querySelectorAll('.content-row').forEach(row =>
    row.addEventListener('click', () => openDrawer(row.dataset.id))
  );
}

function renderSkeletons() {
  els.cardsList.innerHTML = Array(5).fill(0).map(() => `
    <div class="content-row">
      <div class="skeleton" style="width:48px;height:48px;border-radius:8px;flex-shrink:0;"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
        <div class="skeleton" style="height:14px;width:55%;"></div>
        <div class="skeleton" style="height:12px;width:35%;"></div>
      </div>
      <div class="skeleton" style="height:28px;width:80px;border-radius:6px;"></div>
    </div>`).join('');
}

function updateTabCounts() {
  loadAllForCounts();
}

function showEmpty(title, desc) {
  els.cardsList.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <div class="empty-title">${escHtml(title)}</div>
      <div class="empty-desc">${escHtml(desc)}</div>
    </div>`;
}

// ── Drawer de Detalhes ───────────────────────────────
function openDrawer(contentId) {
  const c = state.contents.find(x => x.id === contentId);
  if (!c) return;
  state.drawerContent = c;

  let mediaHtml = '';
  if (c.media_urls && c.media_urls.length > 0) {
    if (c.media_urls.length === 1) {
      mediaHtml = `<div class="drawer-media"><img src="${escHtml(c.media_urls[0])}" alt="Mídia" /></div>`;
    } else {
      mediaHtml = `
        <div class="carousel-container">
          <button class="carousel-btn prev" onclick="scrollCarousel(this, -1)">&#10094;</button>
          <div class="drawer-carousel">
            ${c.media_urls.map(url => `<img src="${escHtml(url)}" alt="Mídia" />`).join('')}
          </div>
          <button class="carousel-btn next" onclick="scrollCarousel(this, 1)">&#10095;</button>
        </div>
      `;
    }
  } else {
    mediaHtml = `<div class="drawer-media">📷</div>`;
  }

  const reviewSection = c.reviewer_name ? `
    <div class="drawer-section">
      <div class="drawer-section-label">Revisão</div>
      <div class="drawer-section-value">
        <span class="status-badge ${c.status}" style="margin-bottom:6px;display:inline-flex">${statusLabel(c.status)}</span><br/>
        ${escHtml(c.reviewer_name)} · ${timeAgo(c.decided_at)}
        ${c.review_comment ? `<br/><span style="color:var(--gray-500);font-size:12px;">${escHtml(c.review_comment)}</span>` : ''}
      </div>
    </div>` : '';

  els.drawerBody.innerHTML = `
    ${mediaHtml}
    <div class="drawer-section">
      <div class="drawer-section-label">Título</div>
      <div class="drawer-section-value" style="font-weight:600">${escHtml(c.title)}</div>
    </div>
    ${c.content ? `
    <div class="drawer-section">
      <div class="drawer-section-label">Texto do Post</div>
      <div class="drawer-section-value" style="white-space:pre-wrap">${escHtml(c.content)}</div>
    </div>` : ''}
    <div class="drawer-section">
      <div class="drawer-section-label">Plataforma</div>
      <div class="drawer-section-value">${platformLabel(c.platform)}</div>
    </div>
    <div class="drawer-section">
      <div class="drawer-section-label">Status</div>
      <div class="drawer-section-value"><span class="status-badge ${c.status}">${statusLabel(c.status)}</span></div>
    </div>
    ${c.scheduled_date ? `
    <div class="drawer-section">
      <div class="drawer-section-label">Agendamento</div>
      <div class="drawer-section-value">${formatDate(c.scheduled_date)}</div>
    </div>` : ''}
    <div class="drawer-section">
      <div class="drawer-section-label">Recebido</div>
      <div class="drawer-section-value">${formatDate(c.created_at)}</div>
    </div>
    ${reviewSection}`;

  // Footer com ações se pendente
  if (c.status === 'pending') {
    els.drawerFooter.innerHTML = `
      <button class="btn btn-approve" style="flex:1" id="drawer-approve">Aprovar</button>
      <button class="btn btn-reject"  style="flex:1" id="drawer-reject">Rejeitar</button>`;
    
    const clickApprove = () => {
      openModal('approve', c.id, { title: c.title, preview: (c.content||'').slice(0,120) });
      closeDrawer();
    };
    const clickReject = () => {
      openModal('reject', c.id, { title: c.title, preview: (c.content||'').slice(0,120) });
      closeDrawer();
    };
    
    // Remover eventos anteriores se houver, ou recriar
    const btnApprove = $('drawer-approve');
    const btnReject = $('drawer-reject');
    btnApprove.replaceWith(btnApprove.cloneNode(true));
    btnReject.replaceWith(btnReject.cloneNode(true));
    $('drawer-approve').addEventListener('click', clickApprove);
    $('drawer-reject').addEventListener('click', clickReject);
  } else {
    els.drawerFooter.innerHTML = '';
  }

  els.drawer.classList.add('open');
}

function closeDrawer() {
  els.drawer.classList.remove('open');
  state.drawerContent = null;
}

window.scrollCarousel = function(btn, dir) {
  const container = btn.parentElement.querySelector('.drawer-carousel');
  const scrollAmount = container.clientWidth * 0.9;
  container.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
};

// ── Modal ────────────────────────────────────────────
function openModal(type, contentId, dataset) {
  state.modal = { contentId, type };
  const isApprove = type === 'approve';

  els.modalIcon.className = `modal-header-icon ${isApprove ? 'approve' : 'reject'}`;
  els.modalIcon.innerHTML = isApprove
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  els.modalTitle.textContent    = isApprove ? 'Aprovar Conteúdo' : 'Rejeitar Conteúdo';
  els.modalSubtitle.textContent = isApprove
    ? 'O n8n será notificado e irá publicar o post.'
    : 'O n8n será notificado e o post não será publicado.';

  els.modalContentTitle.textContent   = dataset.title || '';
  els.modalContentPreview.textContent = dataset.preview || '(sem texto)';

  els.commentRequired.textContent = isApprove ? '' : '*';
  els.commentHint.textContent     = isApprove
    ? 'Opcional: adicione uma observação.'
    : 'Obrigatório: explique o motivo da rejeição.';

  els.commentInput.value = '';
  els.commentInput.style.borderColor = '';
  els.commentInput.placeholder = isApprove
    ? 'Ex: Aprovado! Publicar no horário agendado.'
    : 'Ex: Texto muito longo, revisar antes de publicar.';

  els.modalConfirm.className = `btn ${isApprove ? 'btn-approve' : 'btn-reject'}`;
  els.modalConfirm.textContent = isApprove ? 'Aprovar' : 'Rejeitar';

  els.modal.classList.add('open');
  setTimeout(() => els.commentInput.focus(), 250);
}

function closeModal() {
  els.modal.classList.remove('open');
  state.modal = null;
}

// ── Navegação ────────────────────────────────────────
function setView(view) {
  state.view = view;

  els.viewDashboard.classList.toggle('active', view === 'dashboard');
  els.viewContents.classList.toggle('active', view === 'contents');

  els.navDashboard.classList.toggle('active', view === 'dashboard');
  els.navContents.classList.toggle('active', view === 'contents');

  const labels = { dashboard: 'Dashboard', contents: 'Conteúdos' };
  els.breadcrumb.textContent = labels[view] || view;

  if (view === 'contents') {
    loadContents();
    loadAllForCounts();
  } else {
    loadStats();
  }
}

function setStatusTab(status) {
  state.statusTab = status;
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.status === status)
  );
  loadContents();
}

// ── Helpers ──────────────────────────────────────────
function platformLabel(p) {
  const m = { instagram:'📸 Instagram', linkedin:'💼 LinkedIn', twitter:'𝕏 Twitter', facebook:'📘 Facebook' };
  return m[p] || `📱 ${p}`;
}

function statusLabel(s) {
  return { pending:'Pendente', approved:'Aprovado', rejected:'Rejeitado' }[s] || s;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit',
    timeZone:'America/Sao_Paulo',
  });
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

function updateLastUpdate() {
  const t = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
  els.lastUpdate.textContent = `Atualizado às ${t}`;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(str) {
  return String(str ?? '').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Toast ────────────────────────────────────────────
const ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
  error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
};

function toast(type, title, desc = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <div class="toast-icon-wrap">${ICONS[type]}</div>
    <div>
      <div class="toast-title">${escHtml(title)}</div>
      ${desc ? `<div class="toast-desc">${escHtml(desc)}</div>` : ''}
    </div>`;

  els.toastContainer.prepend(el);

  setTimeout(() => {
    el.classList.add('hide');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, 4500);
}

// ── Event Listeners ──────────────────────────────────
function bindEvents() {
  // Navegação
  document.querySelectorAll('.nav-item[data-view]').forEach(el =>
    el.addEventListener('click', () => setView(el.dataset.view))
  );

  // Abas de status
  els.statusTabs.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (btn && btn.dataset.status) setStatusTab(btn.dataset.status);
  });

  // "Ver todos" no dash
  els.dashSeeAll.addEventListener('click', () => setView('contents'));

  // Refresh
  els.refreshBtn.addEventListener('click', async () => {
    els.refreshBtn.classList.add('spinning');
    await refresh();
    setTimeout(() => els.refreshBtn.classList.remove('spinning'), 600);
  });

  // Modal
  els.modalClose.addEventListener('click', closeModal);
  els.modalCancel.addEventListener('click', closeModal);
  els.modal.addEventListener('click', e => { if (e.target === els.modal) closeModal(); });
  els.modalConfirm.addEventListener('click', submitDecision);

  // Drawer
  els.drawerClose.addEventListener('click', closeDrawer);
  els.drawer.addEventListener('click', e => { if (e.target === els.drawer) closeDrawer(); });

  // Limpar borda vermelha ao digitar
  els.commentInput.addEventListener('input', () => {
    els.commentInput.style.borderColor = '';
  });

  // ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeDrawer(); }
  });
}

// ── Refresh ──────────────────────────────────────────
async function refresh() {
  if (state.view === 'dashboard') {
    await Promise.all([loadStats(), renderActivity()]);
  } else {
    await Promise.all([loadStats(), loadContents(true)]);
  }
  // Remove updateLastUpdate from here because we don't want to show the user that it updated 
  // unless something actually changed (handled inside loadContents)
  // If we just hide it, we can remove the updateLastUpdate call from periodic refresh entirely.
}

// ── Init ─────────────────────────────────────────────
async function init() {
  console.log("Iniciando Field Mídias App...");
  initElements();
  bindEvents();
  
  try {
    console.log("Carregando dados iniciais...");
    await Promise.all([loadStats(), loadAllForCounts()]);
    console.log("Dados carregados com sucesso.");
  } catch (err) {
    console.error("Erro no carregamento inicial:", err);
  }
  
  updateLastUpdate();
  setInterval(refresh, REFRESH_MS);
}

init();
