import './style.css';
import { LocalStore } from './lib/store';
import { escapeHTML, formatCurrency, formatMonthLabel, getToneMeta } from './lib/ui-helpers';

/**
 * Generates the HTML string containing a premium SVG Doughnut Chart and matching horizontal progressive category bars.
 * @param {Object} byCategory - Map of category_id -> amount
 * @param {number} totalExpenses - Total expenses amount
 * @param {Array<Object>} categories - List of category configurations
 * @returns {string} HTML markup string
 */
function generateCategoryDistributionHTML(byCategory, totalExpenses, categories) {
  const categoryKeys = Object.keys(byCategory || {});
  
  if (categoryKeys.length === 0 || totalExpenses <= 0) {
    return `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 0; gap: 16px;">
        <svg width="120" height="120" viewBox="0 0 120 120" style="display: block; margin: 0 auto;">
          <circle cx="60" cy="60" r="42" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="8"></circle>
          <text x="60" y="56" text-anchor="middle" dominant-baseline="middle" fill="var(--text-muted)" font-size="8" font-weight="600">R$ 0,00</text>
          <text x="60" y="70" text-anchor="middle" dominant-baseline="middle" fill="var(--text-muted)" font-size="7">Sem Despesas</text>
        </svg>
        <div class="category-empty-placeholder" style="text-align: center; color: var(--text-muted); font-size: 13px;">
            Nenhum gasto registrado para este período.
        </div>
      </div>
    `;
  }

  // Sort categories by sum DESC
  const sortedCategories = categoryKeys.map(key => {
    const cat = categories.find(c => c.id === key) || { name: 'Outros', color: '#9ca3af' };
    return {
      id: key,
      name: cat.name,
      color: cat.color,
      amount: parseFloat(byCategory[key] || 0)
    };
  }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

  if (sortedCategories.length === 0) {
    return `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 0; gap: 16px;">
        <svg width="120" height="120" viewBox="0 0 120 120" style="display: block; margin: 0 auto;">
          <circle cx="60" cy="60" r="42" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="8"></circle>
          <text x="60" y="56" text-anchor="middle" dominant-baseline="middle" fill="var(--text-muted)" font-size="8" font-weight="600">R$ 0,00</text>
          <text x="60" y="70" text-anchor="middle" dominant-baseline="middle" fill="var(--text-muted)" font-size="7">Sem Despesas</text>
        </svg>
      </div>
    `;
  }

  // Generate SVG Doughnut Chart Segments
  let cumulativeAngle = -90; // Start at 12 o'clock
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // ~263.89
  
  let svgCircles = '';
  sortedCategories.forEach(cat => {
    const percentage = (cat.amount / totalExpenses) * 100;
    const strokeDashOffset = circumference - (circumference * percentage) / 100;
    
    svgCircles += `
      <circle 
        cx="60" 
        cy="60" 
        r="${radius}" 
        fill="none" 
        stroke="${cat.color}" 
        stroke-width="10" 
        stroke-dasharray="${circumference}" 
        stroke-dashoffset="${strokeDashOffset}" 
        transform="rotate(${cumulativeAngle} 60 60)"
        style="transition: stroke-dashoffset 0.4s ease; transform-origin: center;"
      ></circle>
    `;
    cumulativeAngle += (percentage / 100) * 360;
  });

  const doughnutSVG = `
    <div style="position: relative; width: 140px; height: 140px; margin: 0 auto 28px auto;">
      <svg width="140" height="140" viewBox="0 0 120 120" style="display: block;">
        <!-- Background track -->
        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="10"></circle>
        ${svgCircles}
      </svg>
      <!-- Center Text Overlays -->
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
        <span style="font-size: 11.5px; font-weight: 700; color: var(--text-white); text-align: center; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${formatCurrency(totalExpenses)}
        </span>
        <span style="font-size: 7.5px; font-weight: 700; color: var(--text-muted); margin-top: 3px; letter-spacing: 0.5px;">GASTOS</span>
      </div>
    </div>
  `;

  // Generate progress rows
  let progressRows = '<div style="display: flex; flex-direction: column; gap: 16px;">';
  sortedCategories.forEach(cat => {
    const pct = ((cat.amount / totalExpenses) * 100).toFixed(0);
    progressRows += `
      <div class="category-breakdown-row" style="cursor: pointer; transition: transform 0.15s ease;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 13px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="category-dot" style="background-color: ${cat.color}; width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span>
                  <span style="font-weight: 600; color: var(--text-white);">${escapeHTML(cat.name)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${pct}%</span>
                  <span style="font-weight: 700; color: var(--text-main);">${formatCurrency(cat.amount)}</span>
              </div>
          </div>
          <!-- Custom horizontal track -->
          <div style="width: 100%; height: 6px; background-color: rgba(255,255,255,0.03); border-radius: 50px; overflow: hidden; border: 1px solid rgba(255,255,255,0.02);">
              <div style="width: ${pct}%; height: 100%; background-color: ${cat.color}; border-radius: 50px; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
          </div>
      </div>
    `;
  });
  progressRows += '</div>';

  return doughnutSVG + progressRows;
}

// Application State Variables
let currentDb = null;
let currentView = 'onboarding'; // 'onboarding' | 'dashboard' | 'transaction-form' | 'invoice' | 'reserves'
let currentMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"
let currentCardId = null; // Tracks the selected credit card inside Faturas view
let isYearlySummaryActive = false;
let transactionToEditId = null; // if not null, we are editing a transaction
let isUnsavedEdits = false; // Tracks if modifications happened since last JSON backup export

// DOM Elements
const appContainer = document.getElementById('app');
const appHeader = document.getElementById('app-header');
const dirtyIndicator = document.getElementById('dirty-indicator');
const btnExportBackup = document.getElementById('btn-export-backup');
const btnImportHeader = document.getElementById('btn-import-header');
const headerFileInput = document.getElementById('header-file-input');
const btnResetDb = document.getElementById('btn-reset-db');

// Navigation Tabs
const navDashboard = document.getElementById('nav-dashboard');
const navTransaction = document.getElementById('nav-transaction');
const navInvoice = document.getElementById('nav-invoice');
const navReserves = document.getElementById('nav-reserves');
const navRecurring = document.getElementById('nav-recurring');

// Core Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  bootstrapApp();
});

/**
 * Initializes state, verifies local database existence, and mounts listeners.
 */
function bootstrapApp() {
  if (LocalStore.isInitialized()) {
    currentDb = LocalStore.exportDatabase();
    // Default view
    currentView = 'dashboard';
  } else {
    currentView = 'onboarding';
  }

  setupGlobalListeners();
  render();
}

/**
 * Sets up permanent listeners on static HTML headers/footers.
 */
function setupGlobalListeners() {
  // Navigation
  if (navDashboard) navDashboard.addEventListener('click', () => goTo('dashboard'));
  if (navTransaction) navTransaction.addEventListener('click', () => {
    transactionToEditId = null; // Clean form for new entry
    goTo('transaction-form');
  });
  if (navInvoice) navInvoice.addEventListener('click', () => goTo('invoice'));
  if (navReserves) navReserves.addEventListener('click', () => goTo('reserves'));
  if (navRecurring) navRecurring.addEventListener('click', () => goTo('recurring'));

  // Export File Backup Action
  if (btnExportBackup) {
    btnExportBackup.addEventListener('click', handleExportBackup);
  }

  // Import File Backup Action (Header)
  if (btnImportHeader && headerFileInput) {
    btnImportHeader.addEventListener('click', () => {
      headerFileInput.click();
    });
    headerFileInput.addEventListener('change', handleHeaderFileImport);
  }

  // Reset Local Database Action
  if (btnResetDb) {
    btnResetDb.addEventListener('click', handleResetDatabase);
  }
}

/**
 * Transition router to switch views and trigger re-renders.
 * @param {string} view 
 */
function goTo(view) {
  currentView = view;
  isYearlySummaryActive = false; // reset overlay toggle when switching tabs
  render();
}

/**
 * Helper to update our db memory reference, write to LocalStorage, and re-render.
 */
function updateDbAndAutosave(updatedDb) {
  currentDb = updatedDb;
  isUnsavedEdits = true; // Mark as dirty
  render();
}

/**
 * Triggers the browser download dialog for the physical portable JSON database file.
 */
function handleExportBackup() {
  if (!LocalStore.isInitialized()) return;
  
  const rawData = LocalStore.exportDatabase();
  const fileContent = JSON.stringify(rawData, null, 2);
  const blob = new Blob([fileContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const tempLink = document.createElement('a');
  tempLink.href = url;
  
  const todayStr = new Date().toISOString().split('T')[0];
  tempLink.download = `finjson_backup_${todayStr}.json`;

  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
  URL.revokeObjectURL(url);

  // Clear visual dirty indicators
  isUnsavedEdits = false;
  syncHeaderState();
  }

/**
 * Reads and validates JSON file imported directly from the header, reloading active layouts.
 */
function handleHeaderFileImport() {
  if (!headerFileInput.files || headerFileInput.files.length === 0) return;

  const file = headerFileInput.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const jsonData = JSON.parse(e.target.result);
      const db = LocalStore.importDatabase(jsonData);
      
      alert('Backup de dados importado e restaurado com sucesso!');
      
      // Update in-memory reference and clear unsaved state
      currentDb = db;
      isUnsavedEdits = false;
      
      // Navigate to dashboard
      goTo('dashboard');
    } catch (err) {
      alert('Erro ao importar backup: ' + err.message);
    } finally {
      // Clear input value so same file can be re-imported
      headerFileInput.value = '';
    }
  };

  reader.onerror = () => {
    alert('Erro ao ler o arquivo selecionado.');
    headerFileInput.value = '';
  };

  reader.readAsText(file);
}

/**
 * Triggers a double-confirmation prompt before wiping the localStorage database.
 */
function handleResetDatabase() {
  if (!confirm('ATENÇÃO: Você deseja apagar definitivamente TODOS os seus dados financeiros deste navegador? Esta ação é irreversível e apagará todos os seus lançamentos, categorias e metas.')) return;
  
  if (confirm('Você realmente deseja prosseguir com a exclusão? Todo o seu histórico local será perdido permanentemente.')) {
    localStorage.removeItem('finjson_db');
    localStorage.removeItem('financehub_db');
    currentDb = null;
    isUnsavedEdits = false;
    alert('Banco de dados excluído com sucesso do seu navegador!');
    goTo('onboarding');
  }
}

/**
 * Synchronizes the visibility of navigation tabs, active classes, and unsaved state dots.
 */
function syncHeaderState() {
  const isInit = LocalStore.isInitialized();
  if (isInit) {
    appHeader.style.display = 'block';
  } else {
    appHeader.style.display = 'none';
  }

  // Active classes
  [navDashboard, navTransaction, navInvoice, navReserves, navRecurring].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });

  if (currentView === 'dashboard' && navDashboard) navDashboard.classList.add('active');
  if (currentView === 'transaction-form' && navTransaction) navTransaction.classList.add('active');
  if (currentView === 'invoice' && navInvoice) navInvoice.classList.add('active');
  if (currentView === 'reserves' && navReserves) navReserves.classList.add('active');
  if (currentView === 'recurring' && navRecurring) navRecurring.classList.add('active');

  // Dirty state pill
  if (dirtyIndicator) {
    dirtyIndicator.style.display = isUnsavedEdits ? 'inline-flex' : 'none';
  }
}

/**
 * Main dynamic router injector. Clears the #app node and injects views.
 */
function render() {
  appContainer.innerHTML = '';
  syncHeaderState();

  // Route Views
  switch (currentView) {
    case 'onboarding':
      appContainer.appendChild(createOnboardingView());
      break;
    case 'dashboard':
      appContainer.appendChild(createDashboardView());
      break;
    case 'transaction-form':
      appContainer.appendChild(createTransactionFormView());
      break;
    case 'invoice':
      appContainer.appendChild(createInvoiceView());
      break;
    case 'reserves':
      appContainer.appendChild(createReservesView());
      break;
    case 'recurring':
      appContainer.appendChild(createRecurringView());
      break;
    default:
      appContainer.appendChild(createOnboardingView());
  }
}

/* ==========================================================================
   VIEW CREATORS
   ========================================================================== */

/**
 * 1. Onboarding Choice & File Import View
 */
function createOnboardingView() {
  const card = document.createElement('div');
  card.className = 'onboarding-card';
  card.innerHTML = `
    <div class="onboarding-header">
        <span class="onboarding-brand-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </span>
        <h2>Bem-vindo ao Finjson</h2>
        <p>Sua carteira financeira local, 100% privada e portátil.</p>
    </div>
    
    <div class="onboarding-body">
        <p class="onboarding-intro">
            Para começarmos, selecione se deseja iniciar uma nova carteira de dados limpa ou carregar um arquivo JSON de backup existente:
        </p>
        
        <div class="onboarding-options-grid">
            <!-- Option 1: Initialize fresh database -->
            <div class="onboarding-option-card">
                <div class="option-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5 8-6.4 8-12a4 4 0 0 0-8 0c0 5.6 2.5 9.5 8 12Z"/><path d="M14 20v-4"/></svg>
                </div>
                <h3>Iniciar do Zero</h3>
                <p>Cria um banco de dados local zerado, pré-configurado com categorias financeiras essenciais para uso imediato.</p>
                <button id="btn-init-blank" class="btn btn-primary" style="margin-top: auto;">Criar Novo Banco</button>
            </div>

            <!-- Option 2: Import existing backup -->
            <div class="onboarding-option-card">
                <div class="option-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/></svg>
                </div>
                <h3>Importar Backup</h3>
                <p>Selecione um arquivo de dados <code>db.json</code> exportado anteriormente em qualquer máquina para restaurar seu histórico.</p>
                
                <div class="import-upload-area" id="import-drop-zone">
                    <input type="file" id="import-file-input" accept=".json" style="display: none;">
                    <button id="btn-trigger-upload" class="btn btn-secondary">Selecionar Arquivo .json</button>
                    <span id="selected-file-name" class="file-name-text">Nenhum arquivo selecionado</span>
                </div>
                
                <button id="btn-submit-import" class="btn btn-primary" style="margin-top: 14px; display: none;">
                    Confirmar e Restaurar
                </button>
            </div>
        </div>
    </div>
  `;

  // Bind Listeners
  const btnInit = card.querySelector('#btn-init-blank');
  btnInit.addEventListener('click', () => {
    if (!confirm('Deseja iniciar uma nova carteira de dados limpa com categorias essenciais?')) return;
    const db = LocalStore.initializeBlank();
    updateDbAndAutosave(db);
    goTo('dashboard');
  });

  const fileInput = card.querySelector('#import-file-input');
  const btnTrigger = card.querySelector('#btn-trigger-upload');
  const selectedName = card.querySelector('#selected-file-name');
  const btnSubmit = card.querySelector('#btn-submit-import');
  const dropZone = card.querySelector('#import-drop-zone');

  btnTrigger.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      selectedName.textContent = fileInput.files[0].name;
      btnSubmit.style.display = 'block';
    }
  });

  // Drag and drop Visual updates
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--primary-color)';
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--border-color)';
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-color)';
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        fileInput.files = e.dataTransfer.files;
        selectedName.textContent = file.name;
        btnSubmit.style.display = 'block';
      } else {
        alert('Por favor, selecione apenas arquivos do tipo .json');
      }
    }
  });

  btnSubmit.addEventListener('click', () => {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        const db = LocalStore.importDatabase(jsonData);
        alert('Backup importado e restaurado com sucesso!');
        updateDbAndAutosave(db);
        goTo('dashboard');
      } catch (err) {
        alert('Erro ao importar backup: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  return card;
}

/**
 * 2. Monthly Dashboard & Yearly Summary Analytics View
 */
function createDashboardView() {
  const container = document.createElement('div');
  container.className = 'dashboard-container';

  // Calculate or load data
  const summary = LocalStore.getSummary(currentMonth);
  const transactions = LocalStore.getTransactions({ month: currentMonth });
  const categories = LocalStore.getCategories();

  // Create Controls Header (Month Selector)
  const dashboardHeader = document.createElement('div');
  dashboardHeader.className = 'dashboard-header-controls';
  
  // Calculate previous and next months
  const [currYr, currMon] = currentMonth.split('-').map(Number);
  
  let prevMonthKey = `${currYr}-${String(currMon - 1).padStart(2, '0')}`;
  if (currMon === 1) prevMonthKey = `${currYr - 1}-12`;

  let nextMonthKey = `${currYr}-${String(currMon + 1).padStart(2, '0')}`;
  if (currMon === 12) nextMonthKey = `${currYr + 1}-01`;

  dashboardHeader.innerHTML = `
    <div class="period-selector-row">
        <h2>Painel Financeiro</h2>
        
        <div class="month-selector-widget">
            <button id="btn-prev-month" class="month-nav-arrow" title="Mês Anterior">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="active-month-label">${formatMonthLabel(currentMonth)}</span>
            <button id="btn-next-month" class="month-nav-arrow" title="Próximo Mês">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <input type="month" id="month-input-direct" value="${currentMonth}" class="hidden-month-picker">
        </div>

        <button id="btn-toggle-yearly" class="btn-yearly-toggle ${isYearlySummaryActive ? 'active' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            ${isYearlySummaryActive ? 'Ver Resumo Mensal' : 'Ver Resumo Anual (' + currYr + ')'}
        </button>
    </div>
  `;

  // Bind selector events
  dashboardHeader.querySelector('#btn-prev-month').addEventListener('click', () => {
    currentMonth = prevMonthKey;
    render();
  });
  dashboardHeader.querySelector('#btn-next-month').addEventListener('click', () => {
    currentMonth = nextMonthKey;
    render();
  });
  const monthInput = dashboardHeader.querySelector('#month-input-direct');
  const monthLabel = dashboardHeader.querySelector('.active-month-label');
  monthLabel.addEventListener('click', () => monthInput.showPicker());
  monthInput.addEventListener('change', (e) => {
    currentMonth = e.target.value;
    render();
  });

  const btnToggleYearly = dashboardHeader.querySelector('#btn-toggle-yearly');
  btnToggleYearly.addEventListener('click', () => {
    isYearlySummaryActive = !isYearlySummaryActive;
    render();
  });

  container.appendChild(dashboardHeader);

  // If Yearly View is active, inject yearly statistics cards overlay
  if (isYearlySummaryActive) {
    container.appendChild(createYearlySummaryBlock(currYr));
    return container;
  }

  // Cards Summary Grid (Monthly)
  const cardsGrid = document.createElement('div');
  cardsGrid.className = 'dashboard-cards-grid';
  
  const mMetaIncome = getToneMeta('success');
  const mMetaExpense = getToneMeta('danger');
  const mMetaSaved = getToneMeta('info');
  const mMetaBal = getToneMeta('neutral');

  cardsGrid.innerHTML = `
    <!-- Total Income -->
    <div class="metrics-card">
        <div class="metrics-card-header">
            <span>Renda Total</span>
            <span class="metric-badge success">${mMetaIncome.iconSvg}</span>
        </div>
        <div class="metrics-card-value success-text">${formatCurrency(summary.total_income)}</div>
    </div>

    <!-- Total Expenses -->
    <div class="metrics-card">
        <div class="metrics-card-header">
            <span>Gastos Totais</span>
            <span class="metric-badge danger">${mMetaExpense.iconSvg}</span>
        </div>
        <div class="metrics-card-value danger-text">${formatCurrency(summary.total_expenses)}</div>
    </div>

    <!-- Saved to Reserves -->
    <div class="metrics-card">
        <div class="metrics-card-header">
            <span>Poupado / Reservas</span>
            <span class="metric-badge info">${mMetaSaved.iconSvg}</span>
        </div>
        <div class="metrics-card-value info-text">${formatCurrency(summary.saved)}</div>
    </div>

    <!-- Net Liquid Balance -->
    <div class="metrics-card">
        <div class="metrics-card-header">
            <span>Saldo Líquido</span>
            <span class="metric-badge neutral">${mMetaBal.iconSvg}</span>
        </div>
        <div class="metrics-card-value ${summary.balance >= 0 ? 'success-text' : 'danger-text'}">
            ${formatCurrency(summary.balance)}
        </div>
    </div>
  `;
  container.appendChild(cardsGrid);

  // Split View: Transactions List & Category Pie-like list
  const splitView = document.createElement('div');
  splitView.className = 'dashboard-split-view';

  // Left Column: Transactions Logs list
  const leftCol = document.createElement('div');
  leftCol.className = 'dashboard-left-col';

  let tableRows = '';
  if (transactions.length === 0) {
    tableRows = `
      <tr>
          <td colspan="6" class="table-empty-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><circle cx="12" cy="12" r="10"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
              <p>Nenhum lançamento cadastrado para este mês.</p>
              <button id="btn-quick-add" class="btn btn-secondary" style="width: auto; margin-top: 10px;">Lançar Novo Gasto</button>
          </td>
      </tr>
    `;
  } else {
    transactions.forEach(tx => {
      const category = categories.find(c => c.id === tx.category_id) || { name: 'Sem Categoria', color: '#9ca3af' };
      const [yr, mon, day] = tx.date.split('-');
      const formattedDate = `${day}/${mon}`;

      // Payment method translation label
      let methodText = tx.payment_method.toUpperCase();
      if (tx.payment_method === 'credit_card') methodText = 'CRÉDITO';

      tableRows += `
        <tr class="tx-row">
            <td class="cell-date">${formattedDate}</td>
            <td class="cell-desc">
                <span class="tx-desc-title">${escapeHTML(tx.description)}</span>
                ${tx.notes ? `<span class="tx-desc-note">${escapeHTML(tx.notes)}</span>` : ''}
            </td>
            <td class="cell-cat">
                <div class="category-badge-container">
                    <span class="category-indicator-dot" style="background-color: ${category.color};"></span>
                    <span>${escapeHTML(category.name)}</span>
                </div>
            </td>
            <td class="cell-method">
                <span class="method-badge-pill">${methodText}</span>
            </td>
            <td class="cell-amount ${tx.type === 'income' ? 'success-text' : 'danger-text'}">
                ${tx.type === 'income' ? '+' : '-'} ${formatCurrency(tx.amount)}
            </td>
            <td class="cell-actions">
                <button class="action-icon-btn btn-edit-tx" data-id="${tx.id}" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
                <button class="action-icon-btn danger btn-delete-tx" data-id="${tx.id}" title="Excluir">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </td>
        </tr>
      `;
    });
  }

  leftCol.innerHTML = `
    <div class="card-section">
        <div class="card-section-header" style="margin-bottom: 16px;">
            <h3>Lançamentos do Mês</h3>
            <button id="btn-add-tx" class="btn-section-action">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>
                Novo Lançamento
            </button>
        </div>

        <!-- Live Search and Flow-Type Filter Row -->
        <div class="table-search-row" style="margin-bottom: 16px; display: flex; gap: 12px; align-items: center; position: relative; width: 100%;">
            <div style="position: relative; flex: 1; display: flex; align-items: center;">
                <span style="position: absolute; left: 12px; color: var(--text-muted); display: flex; align-items: center; pointer-events: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
                <input type="text" id="tx-search-input" placeholder="Buscar por descrição, obs, categoria..." style="width: 100%; padding: 10px 12px 10px 36px; background-color: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-main); font-size: 13px; outline: none; transition: var(--transition-base);">
            </div>
            <select id="tx-type-filter" style="width: 140px; padding: 10px 12px; background-color: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-main); font-size: 13px; outline: none; cursor: pointer; transition: var(--transition-base);">
                <option value="all">Todos os Fluxos</option>
                <option value="expense">Apenas Despesas</option>
                <option value="income">Apenas Receitas</option>
            </select>
        </div>

        <div class="table-container">
            <table class="tx-table">
                <thead>
                    <tr>
                        <th style="width: 70px;">Data</th>
                        <th>Descrição</th>
                        <th style="width: 140px;">Categoria</th>
                        <th style="width: 110px;">Método</th>
                        <th style="text-align: right; width: 110px;">Valor</th>
                        <th style="width: 80px; text-align: center;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    </div>
  `;

  // Bind actions
  leftCol.querySelectorAll('.btn-edit-tx').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const txId = btn.getAttribute('data-id');
      transactionToEditId = txId;
      goTo('transaction-form');
    });
  });

  leftCol.querySelectorAll('.btn-delete-tx').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const txId = btn.getAttribute('data-id');
      if (confirm('Deseja excluir definitivamente este lançamento financeiro?')) {
        LocalStore.deleteTransaction(txId);
        updateDbAndAutosave(LocalStore.exportDatabase());
      }
    });
  });

  const btnAddTx = leftCol.querySelector('#btn-add-tx');
  if (btnAddTx) {
    btnAddTx.addEventListener('click', () => {
      transactionToEditId = null;
      goTo('transaction-form');
    });
  }

  const btnQuickAdd = leftCol.querySelector('#btn-quick-add');
  if (btnQuickAdd) {
    btnQuickAdd.addEventListener('click', () => {
      transactionToEditId = null;
      goTo('transaction-form');
    });
  }

  // Bind Live Search & Filter Logic
  const searchInput = leftCol.querySelector('#tx-search-input');
  const typeFilter = leftCol.querySelector('#tx-type-filter');
  const tableBody = leftCol.querySelector('.tx-table tbody');
  
  if (searchInput && typeFilter && tableBody) {
    const rows = tableBody.querySelectorAll('.tx-row');
    
    // Create and append "no results" row placeholder
    const noResultsRow = document.createElement('tr');
    noResultsRow.id = 'no-search-results';
    noResultsRow.style.display = 'none';
    noResultsRow.innerHTML = `
      <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px 0;">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-icon" style="color: var(--border-color); margin-bottom: 8px; display: block; margin: 0 auto 8px auto;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <p style="font-size: 13px; font-weight: 500;">Nenhum lançamento corresponde à busca.</p>
      </td>
    `;
    tableBody.appendChild(noResultsRow);

    const filterTable = () => {
      const query = searchInput.value.toLowerCase().trim();
      const selectedType = typeFilter.value; // 'all' | 'expense' | 'income'
      let visibleCount = 0;

      rows.forEach(row => {
        const descTitle = row.querySelector('.tx-desc-title')?.textContent.toLowerCase() || '';
        const descNote = row.querySelector('.tx-desc-note')?.textContent.toLowerCase() || '';
        const catName = row.querySelector('.cell-cat')?.textContent.toLowerCase() || '';
        const methodName = row.querySelector('.cell-method')?.textContent.toLowerCase() || '';
        
        const isIncome = row.querySelector('.cell-amount').classList.contains('success-text');
        const rowType = isIncome ? 'income' : 'expense';

        const matchesSearch = descTitle.includes(query) || descNote.includes(query) || catName.includes(query) || methodName.includes(query);
        const matchesType = selectedType === 'all' || selectedType === rowType;

        if (matchesSearch && matchesType) {
          row.style.display = '';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });

      if (visibleCount === 0 && rows.length > 0) {
        noResultsRow.style.display = 'table-row';
      } else {
        noResultsRow.style.display = 'none';
      }
    };

    searchInput.addEventListener('input', filterTable);
    typeFilter.addEventListener('change', filterTable);
  }

  splitView.appendChild(leftCol);

  // Right Column: Summary by Category breakdown
  const rightCol = document.createElement('div');
  rightCol.className = 'dashboard-right-col';

  rightCol.innerHTML = `
    <div class="card-section">
        <div class="card-section-header">
            <h3>Distribuição por Categoria</h3>
        </div>
        <div class="category-breakdown-card-body" style="gap: 20px;">
            ${generateCategoryDistributionHTML(summary.by_category, summary.total_expenses, categories)}
        </div>
    </div>
  `;
  splitView.appendChild(rightCol);

  container.appendChild(splitView);
  return container;
}

/**
 * 2.1 Yearly Summary Analytics Sub-Block
 */
function createYearlySummaryBlock(year) {
  const container = document.createElement('div');
  container.className = 'yearly-summary-container';

  const yearly = LocalStore.getYearlySummary(year);
  const categories = LocalStore.getCategories();

  container.innerHTML = `
    <!-- Header banner in dark gradient -->
    <div class="yearly-alert-banner">
        <h3>Balanço Estatístico Anual — Ano de ${year}</h3>
        <p>Dados consolidados baseados em todos os meses registrados.</p>
    </div>

    <div class="dashboard-cards-grid">
        <div class="metrics-card">
            <div class="metrics-card-header"><span>Rendimento Anual Total</span></div>
            <div class="metrics-card-value success-text">${formatCurrency(yearly.total_income)}</div>
        </div>
        <div class="metrics-card">
            <div class="metrics-card-header"><span>Despesas Anuais Totais</span></div>
            <div class="metrics-card-value danger-text">${formatCurrency(yearly.total_expenses)}</div>
        </div>
        <div class="metrics-card">
            <div class="metrics-card-header"><span>Média de Renda Mensal</span></div>
            <div class="metrics-card-value success-text">${formatCurrency(yearly.average_income)}</div>
        </div>
        <div class="metrics-card">
            <div class="metrics-card-header"><span>Média de Gastos Mensais</span></div>
            <div class="metrics-card-value danger-text">${formatCurrency(yearly.average_expenses)}</div>
        </div>
    </div>

    <div class="card-section" style="margin-top: 24px;">
        <div class="card-section-header"><h3>Consolidado de Categorias Anual</h3></div>
        <div class="category-breakdown-card-body" style="gap: 20px;">
            ${generateCategoryDistributionHTML(yearly.by_category, yearly.total_expenses, categories)}
        </div>
    </div>
  `;

  return container;
}

/**
 * 3. Add/Edit Transaction Form View
 */
function createTransactionFormView() {
  const container = document.createElement('div');
  container.className = 'form-container';

  const isEditing = transactionToEditId !== null;
  const categories = LocalStore.getCategories();
  const cards = LocalStore.getCreditCards();
  
  // Find current transaction fields if editing
  let tx = {
    description: '',
    amount: '',
    type: 'expense',
    category_id: categories.length > 0 ? categories[0].id : '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'pix',
    credit_card_id: cards.length > 0 ? cards[0].id : '',
    notes: ''
  };

  if (isEditing) {
    const rawTx = currentDb.transactions.find(t => t.id === transactionToEditId);
    if (rawTx) tx = { ...rawTx };
  }

  // Populate category options based on type
  const filterCatOptions = (type) => {
    return categories
      .filter(c => c.type === type)
      .map(c => `<option value="${c.id}" ${c.id === tx.category_id ? 'selected' : ''}>${escapeHTML(c.name)}</option>`)
      .join('');
  };

  container.innerHTML = `
    <div class="form-card">
        <div class="form-header">
            <h2>${isEditing ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}</h2>
            <p>Os dados inseridos são persistidos e calculados localmente.</p>
        </div>
        
        <form id="tx-form" class="form-body">
            <!-- Grid 1: Descrição e Valor -->
            <div class="form-grid-2">
                <div class="form-field">
                    <label for="tx-description">Descrição *</label>
                    <input type="text" id="tx-description" value="${escapeHTML(tx.description)}" placeholder="Ex: iFood jantar" required autocomplete="off">
                </div>
                <div class="form-field">
                    <label for="tx-amount">Valor (R$) *</label>
                    <input type="number" id="tx-amount" value="${tx.amount}" placeholder="Ex: 80.00" step="0.01" min="0.01" required autocomplete="off">
                </div>
            </div>

            <!-- Grid 2: Tipo, Categoria e Data -->
            <div class="form-grid-3">
                <div class="form-field">
                    <label for="tx-type">Tipo de Fluxo *</label>
                    <select id="tx-type" required>
                        <option value="expense" ${tx.type === 'expense' ? 'selected' : ''}>Despesa (Gasto)</option>
                        <option value="income" ${tx.type === 'income' ? 'selected' : ''}>Receita (Entrada)</option>
                    </select>
                </div>
                <div class="form-field">
                    <label for="tx-category">Categoria *</label>
                    <select id="tx-category" required>
                        ${filterCatOptions(tx.type)}
                    </select>
                </div>
                <div class="form-field">
                    <label for="tx-date">Data do Fato *</label>
                    <input type="date" id="tx-date" value="${tx.date}" required>
                </div>
            </div>

            <!-- Grid 3: Método de Pagamento -->
            <div class="form-grid-2">
                <div class="form-field">
                    <label for="tx-method">Método de Pagamento *</label>
                    <select id="tx-method" required>
                        <option value="pix" ${tx.payment_method === 'pix' ? 'selected' : ''}>Pix</option>
                        <option value="debit" ${tx.payment_method === 'debit' ? 'selected' : ''}>Débito</option>
                        <option value="cash" ${tx.payment_method === 'cash' ? 'selected' : ''}>Dinheiro Físico</option>
                        <option value="credit_card" ${tx.payment_method === 'credit_card' ? 'selected' : ''}>Cartão de Crédito</option>
                    </select>
                </div>
                
                <!-- Conditional Card Selector (Visible only when method is credit_card) -->
                <div class="form-field" id="card-selector-wrapper" style="display: ${tx.payment_method === 'credit_card' ? 'block' : 'none'};">
                    <label for="tx-card">Qual Cartão de Crédito? *</label>
                    <select id="tx-card">
                        ${cards.map(c => `<option value="${c.id}" ${c.id === tx.credit_card_id ? 'selected' : ''}>${escapeHTML(c.name)} (Fechamento: dia ${c.closing_day})</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- REAL-TIME BILLING INVOICE CALCULATION BOX (Only shown for credit cards) -->
            <div id="realtime-invoice-calc-box" class="invoice-cycle-meta-card" style="margin-top: 10px; border-color: var(--secondary-color); background-color: rgba(14, 165, 233, 0.04); display: none;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--secondary-color);"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <div id="invoice-calc-text" style="color: var(--text-main); font-size: 12.5px; line-height: 1.4;"></div>
            </div>

            <!-- Text Area Notes -->
            <div class="form-field">
                <label for="tx-notes">Observações e Notas</label>
                <textarea id="tx-notes" rows="2" placeholder="Notas adicionais sobre a compra">${escapeHTML(tx.notes)}</textarea>
            </div>

            <!-- Action buttons -->
            <div class="form-actions-row">
                <button type="button" id="btn-form-cancel" class="btn btn-secondary" style="width: auto;">Cancelar</button>
                <button type="submit" class="btn btn-primary" style="width: auto;">${isEditing ? 'Salvar Alterações' : 'Confirmar Lançamento'}</button>
            </div>
        </form>
    </div>
  `;

  // Bind Form Listeners
  const form = container.querySelector('#tx-form');
  const typeSelect = container.querySelector('#tx-type');
  const catSelect = container.querySelector('#tx-category');
  const methodSelect = container.querySelector('#tx-method');
  const cardWrapper = container.querySelector('#card-selector-wrapper');
  const cardSelect = container.querySelector('#tx-card');
  const dateInput = container.querySelector('#tx-date');
  const cancelBtn = container.querySelector('#btn-form-cancel');

  // Trigger real-time invoice calculations
  const triggerRealtimeCalc = () => {
    updateRealtimeInvoiceCalculation(container);
  };

  // Change category options dynamically when toggling Income/Expense
  typeSelect.addEventListener('change', (e) => {
    const selectedType = e.target.value;
    catSelect.innerHTML = filterCatOptions(selectedType);
    triggerRealtimeCalc();
  });

  // Toggle card wrapper
  methodSelect.addEventListener('change', (e) => {
    if (e.target.value === 'credit_card') {
      cardWrapper.style.display = 'block';
      cardSelect.required = true;
    } else {
      cardWrapper.style.display = 'none';
      cardSelect.required = false;
    }
    triggerRealtimeCalc();
  });

  cardSelect.addEventListener('change', triggerRealtimeCalc);
  dateInput.addEventListener('change', triggerRealtimeCalc);

  // Initial trigger
  triggerRealtimeCalc();

  cancelBtn.addEventListener('click', () => {
    goTo('dashboard');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const desc = container.querySelector('#tx-description').value;
    const amt = parseFloat(container.querySelector('#tx-amount').value);
    const dateVal = dateInput.value;
    const catId = catSelect.value;
    const method = methodSelect.value;
    const cardId = method === 'credit_card' ? cardSelect.value : null;
    const notesVal = container.querySelector('#tx-notes').value;

    try {
      if (isEditing) {
        LocalStore.updateTransaction(transactionToEditId, {
          description: desc,
          amount: amt,
          type: typeSelect.value,
          category_id: catId,
          date: dateVal,
          payment_method: method,
          credit_card_id: cardId,
          notes: notesVal
        });
      } else {
        LocalStore.addTransaction({
          description: desc,
          amount: amt,
          type: typeSelect.value,
          category_id: catId,
          date: dateVal,
          payment_method: method,
          credit_card_id: cardId,
          notes: notesVal
        });
      }

      // Update local state month reference to match the month of the added transaction
      currentMonth = dateVal.substring(0, 7);

      alert(isEditing ? 'Lançamento atualizado com sucesso!' : 'Lançamento adicionado com sucesso!');
      updateDbAndAutosave(LocalStore.exportDatabase());
      goTo('dashboard');
    } catch (err) {
      alert('Falha ao processar lançamento: ' + err.message);
    }
  });

  return container;
}

/**
 * Calculates and renders real-time credit card due date and monthly invoice calculations inside the form.
 */
function updateRealtimeInvoiceCalculation(formContainer) {
  const methodSelect = formContainer.querySelector('#tx-method');
  const cardSelect = formContainer.querySelector('#tx-card');
  const dateInput = formContainer.querySelector('#tx-date');
  const calcBox = formContainer.querySelector('#realtime-invoice-calc-box');
  const calcText = formContainer.querySelector('#invoice-calc-text');

  if (!methodSelect || !cardSelect || !dateInput || !calcBox || !calcText) return;

  if (methodSelect.value === 'credit_card' && dateInput.value && cardSelect.value) {
    const cards = LocalStore.getCreditCards();
    const card = cards.find(c => c.id === cardSelect.value);
    if (card) {
      const parts = dateInput.value.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts.map(Number);
        
        let invoiceYear = year;
        let invoiceMonth = month;
        
        if (day > card.closing_day) {
          invoiceMonth += 1;
          if (invoiceMonth > 12) {
            invoiceMonth = 1;
            invoiceYear += 1;
          }
        }
        
        let dueMonth = invoiceMonth + 1;
        let dueYear = invoiceYear;
        if (dueMonth > 12) {
          dueMonth = 1;
          dueYear += 1;
        }
        
        const formattedInvoiceMonth = formatMonthLabel(`${invoiceYear}-${String(invoiceMonth).padStart(2, '0')}`);
        const formattedDueDate = `${String(card.due_day).padStart(2, '0')}/${String(dueMonth).padStart(2, '0')}/${dueYear}`;
        
        calcText.innerHTML = `
          Esta compra fechará na fatura de <strong>${formattedInvoiceMonth}</strong> e o pagamento (vencimento) será em <strong>${formattedDueDate}</strong>!
        `;
        calcBox.style.display = 'flex';
        return;
      }
    }
  }
  calcBox.style.display = 'none';
}

/**
 * 4. Credit Card Invoice (Faturas) View
 */
function createInvoiceView() {
  const container = document.createElement('div');
  container.className = 'invoice-container';

  const cards = LocalStore.getCreditCards();
  if (cards.length === 0) {
    container.innerHTML = `
      <div class="period-selector-row" style="margin-bottom: 24px;">
          <h2>Faturas do Cartão</h2>
          <button id="btn-create-card" class="btn-section-action" style="background-color: var(--primary-color); color: var(--text-white);">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>
              Adicionar Cartão
          </button>
      </div>
      <div class="card-section table-empty-placeholder">
          <p>Nenhum cartão de crédito cadastrado no sistema.</p>
          <button id="btn-quick-create-card" class="btn btn-primary" style="width: auto; margin-top: 14px;">Cadastrar Novo Cartão</button>
      </div>
      <div id="reserve-modal-layer"></div>
    `;

    // Bind triggers
    container.querySelector('#btn-create-card').addEventListener('click', triggerCreateCardModal);
    container.querySelector('#btn-quick-create-card').addEventListener('click', triggerCreateCardModal);
    return container;
  }

  // Choose selectedCardId from state. If not in list, default to first card
  if (!currentCardId || !cards.find(c => c.id === currentCardId)) {
    currentCardId = cards[0].id;
  }

  const card = cards.find(c => c.id === currentCardId);

  // Fetch transactions of Nubank in this specific fatura month
  const cardTxs = LocalStore.resolveCreditCardInvoice(currentCardId, currentMonth);

  // Sum up fatura total
  const invoiceTotal = cardTxs.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  // Calculate limits percentage
  const limit = parseFloat(card.limit);
  const limitPercent = Math.min(100, Math.max(0, (invoiceTotal / limit) * 100));

  let invoiceRows = '';
  if (cardTxs.length === 0) {
    invoiceRows = `
      <tr>
          <td colspan="4" class="table-empty-placeholder">Nenhuma compra no crédito lançada para esta fatura.</td>
      </tr>
    `;
  } else {
    cardTxs.forEach(tx => {
      const category = LocalStore.getCategories().find(c => c.id === tx.category_id) || { name: 'Geral' };
      const [yr, mon, day] = tx.date.split('-');
      invoiceRows += `
        <tr class="tx-row">
            <td class="cell-date">${day}/${mon}</td>
            <td class="cell-desc">${escapeHTML(tx.description)}</td>
            <td class="cell-cat">${escapeHTML(category.name)}</td>
            <td class="cell-amount danger-text" style="text-align: right;">${formatCurrency(tx.amount)}</td>
        </tr>
      `;
    });
  }

  // Render HTML structure
  container.innerHTML = `
    <div class="period-selector-row" style="margin-bottom: 24px;">
        <h2>Fatura do Cartão</h2>
        
        <button id="btn-create-card" class="btn-section-action" style="background-color: var(--primary-color); color: var(--text-white); padding: 10px 16px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>
            Adicionar Cartão
        </button>
    </div>

    <!-- Dropdowns filter grid -->
    <div class="form-grid-2" style="margin-bottom: 24px;">
        <div class="form-field">
            <label for="invoice-card-filter">Selecione o Cartão</label>
            <select id="invoice-card-filter" class="form-field">
                ${cards.map(c => `<option value="${c.id}" ${c.id === currentCardId ? 'selected' : ''}>${escapeHTML(c.name)}</option>`).join('')}
            </select>
        </div>
        <div class="form-field">
            <label for="invoice-month-filter">Mês de Cobrança</label>
            <select id="invoice-month-filter" class="form-field">
                <!-- Populate 3 months around the current one for easy select -->
                <option value="${currentMonth}">${formatMonthLabel(currentMonth)}</option>
            </select>
        </div>
    </div>

    <div class="invoice-grid-layout">
        <!-- Left panel: limit info & card vizualizer -->
        <div class="invoice-card-panel">
            <div class="credit-card-mock">
                <div class="card-mock-brand">${escapeHTML(card.name)}</div>
                <div class="card-mock-chip">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="12" x="3" y="6" rx="2"/><line x1="3" x2="21" y1="10" y2="10"/><line x1="3" x2="21" y1="14" y2="14"/></svg>
                </div>
                <div class="card-mock-limit">Limite Disponível: ${formatCurrency(limit - invoiceTotal)}</div>
                <div class="card-mock-owner">Fatura Aberta</div>
            </div>

            <div class="card-section" style="margin-top: 18px;">
                <div class="invoice-detail-item">
                    <span class="detail-label">Total da Fatura</span>
                    <span class="detail-value danger-text">${formatCurrency(invoiceTotal)}</span>
                </div>
                <div class="invoice-detail-item">
                    <span class="detail-label">Limite Total do Cartão</span>
                    <span class="detail-value">${formatCurrency(limit)}</span>
                </div>
                
                <div class="progress-bar-wrapper" style="margin-top: 14px;">
                    <div class="progress-bar-info">
                        <span>Consumo do Limite</span>
                        <span>${limitPercent.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar-track">
                        <div class="progress-bar-fill danger" style="width: ${limitPercent}%;"></div>
                    </div>
                </div>

                <div class="invoice-cycle-meta-card">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary-color); margin-top: 2px;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    <div>
                        <strong>Ciclo de faturamento:</strong> compras após o dia <strong>${card.closing_day}</strong> deste mês serão cobradas na fatura seguinte. O vencimento desta fatura será em: <strong>${card.due_day}/${String(parseInt(currentMonth.split('-')[1]) % 12 + 1).padStart(2, '0')}/${currentMonth.split('-')[0]}</strong>.
                    </div>
                </div>
            </div>
        </div>

        <!-- Right panel: purchase details table -->
        <div class="invoice-tx-panel">
            <div class="card-section">
                <div class="card-section-header">
                    <h3>Compras desta Fatura</h3>
                </div>
                <div class="table-container">
                    <table class="tx-table">
                        <thead>
                            <tr>
                                <th style="width: 70px;">Data</th>
                                <th>Descrição</th>
                                <th style="width: 140px;">Categoria</th>
                                <th style="text-align: right; width: 110px;">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoiceRows}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Modals backdrop layer -->
    <div id="reserve-modal-layer"></div>
  `;

  // Bind actions
  const cardFilter = container.querySelector('#invoice-card-filter');
  cardFilter.addEventListener('change', (e) => {
    currentCardId = e.target.value;
    render();
  });

  const btnCreateCard = container.querySelector('#btn-create-card');
  btnCreateCard.addEventListener('click', triggerCreateCardModal);

  return container;
}

/**
 * 5. Financial Reserves Goal List & Movements View
 */
function createReservesView() {
  const container = document.createElement('div');
  container.className = 'reserves-container';

  const reserves = LocalStore.getReserves();

  let reservesBlock = '';
  reserves.forEach(r => {
    const goal = parseFloat(r.goal_amount);
    const balance = parseFloat(r.current_amount);
    const progressPercent = Math.min(100, Math.max(0, (balance / goal) * 100));

    reservesBlock += `
      <div class="reserve-meta-card">
          <div class="reserve-meta-header">
              <div>
                  <h4>${escapeHTML(r.name)}</h4>
                  <p>Meta total de ${formatCurrency(goal)}</p>
              </div>
              <div class="reserve-meta-balance info-text">${formatCurrency(balance)}</div>
          </div>

          <!-- Progress Bar -->
          <div class="progress-bar-track" style="margin: 14px 0;">
              <div class="progress-bar-fill info" style="width: ${progressPercent}%;"></div>
          </div>
          
          <div class="reserve-progress-labels">
              <span>Progresso Alcançado</span>
              <span>${progressPercent.toFixed(1)}%</span>
          </div>

          <!-- Actions: deposit / withdraw triggers -->
          <div class="reserve-actions-row">
              <button class="btn btn-primary btn-add-deposit" data-id="${r.id}" style="font-size: 12px; padding: 8px 12px;">Guardar (Aporte)</button>
              <button class="btn btn-secondary btn-add-withdraw" data-id="${r.id}" style="font-size: 12px; padding: 8px 12px; background-color: var(--border-color); color: var(--text-main);">Resgatar (Saque)</button>
          </div>
      </div>
    `;
  });

  container.innerHTML = `
    <div class="period-selector-row" style="margin-bottom: 24px;">
        <h2>Reservas e Metas Ativas</h2>
        
        <button id="btn-create-reserve" class="btn-section-action" style="background-color: var(--primary-color); color: var(--text-white);">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>
            Criar Nova Meta
        </button>
    </div>

    <!-- Active Goals Grid -->
    <div class="reserves-grid-grid">
        ${reservesBlock}
    </div>

    <!-- Modals (Hidden by default, triggered dynamically by JS inserts) -->
    <div id="reserve-modal-layer"></div>
  `;

  // Bind deposit / withdrawal triggers
  container.querySelectorAll('.btn-add-deposit').forEach(btn => {
    btn.addEventListener('click', () => {
      const resId = btn.getAttribute('data-id');
      triggerReserveMovementModal(resId, 'deposit');
    });
  });

  container.querySelectorAll('.btn-add-withdraw').forEach(btn => {
    btn.addEventListener('click', () => {
      const resId = btn.getAttribute('data-id');
      triggerReserveMovementModal(resId, 'withdraw');
    });
  });

  // Bind Reserve Creator
  const btnCreateRsv = container.querySelector('#btn-create-reserve');
  btnCreateRsv.addEventListener('click', triggerCreateReserveModal);

  return container;
}

/**
 * 6. Recurring Transactions & Configurations View (Contas e Recibos Mensais)
 */
function createRecurringView() {
  const container = document.createElement('div');
  container.className = 'recurring-container';

  const recurrences = LocalStore.getRecurringTransactions();
  const categories = LocalStore.getCategories();
  const cards = LocalStore.getCreditCards();

  // Populate category options based on type
  const filterCatOptions = (type) => {
    return categories
      .filter(c => c.type === type)
      .map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`)
      .join('');
  };

  // Build active recurrence rows
  let recurringRows = '';
  if (recurrences.length === 0) {
    recurringRows = `
      <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px 0;">
              Nenhum lançamento recorrente cadastrado. Use o formulário ao lado para cadastrar!
          </td>
      </tr>
    `;
  } else {
    recurrences.forEach(rec => {
      const cat = categories.find(c => c.id === rec.category_id) || { name: 'Outros', color: '#9ca3af' };
      
      let paymentText = '';
      if (rec.payment_method === 'credit_card') {
        const card = cards.find(c => c.id === rec.credit_card_id);
        paymentText = `Crédito (${card ? escapeHTML(card.name) : 'Cartão'})`;
      } else {
        paymentText = rec.payment_method.toUpperCase();
      }

      const typeBadge = rec.type === 'income' ? 
        `<span class="badge success" style="background-color: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Receita</span>` : 
        `<span class="badge danger" style="background-color: rgba(244, 63, 94, 0.15); color: #f43f5e; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Despesa</span>`;

      const statusStyle = rec.active ? 
        'color: var(--text-muted);' : 
        'color: var(--text-muted); text-decoration: line-through; opacity: 0.5;';

      recurringRows += `
        <tr style="${statusStyle}">
            <td style="font-weight: 600;">Dia ${rec.day}</td>
            <td>
                <div style="font-weight: 600; color: var(--text-white);">${escapeHTML(rec.description)}</div>
                <div style="margin-top: 4px;">${typeBadge}</div>
            </td>
            <td>
                <div class="category-badge-container">
                    <span class="category-indicator-dot" style="background-color: ${cat.color};"></span>
                    <span>${escapeHTML(cat.name)}</span>
                </div>
            </td>
            <td>
                <span class="method-badge-pill">${paymentText}</span>
            </td>
            <td style="text-align: right; font-weight: 700; color: ${rec.type === 'income' ? '#10b981' : '#f43f5e'}">
                ${formatCurrency(rec.amount)}
            </td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button class="btn btn-toggle-active" data-id="${rec.id}" style="font-size: 11px; padding: 6px 10px; background-color: ${rec.active ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color: ${rec.active ? '#f59e0b' : '#10b981'}; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                        ${rec.active ? 'Pausar' : 'Ativar'}
                    </button>
                    <button class="btn btn-delete-rec" data-id="${rec.id}" style="font-size: 11px; padding: 6px 10px; background-color: rgba(244, 63, 94, 0.15); color: #f43f5e; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                        Excluir
                    </button>
                </div>
            </td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <div class="period-selector-row" style="margin-bottom: 24px;">
        <div>
            <h2>Lançamentos Mensais Recorrentes</h2>
            <p style="color: var(--text-muted); font-size: 13.5px; margin-top: 4px;">Configure aqui as cobranças e os recebimentos que se repetem todo mês automaticamente.</p>
        </div>
    </div>

    <div class="invoice-grid-layout">
        <!-- Left panel: Register new recurring item -->
        <div class="invoice-card-panel">
            <div class="card-section">
                <div class="card-section-header" style="margin-bottom: 20px;">
                    <h3>Nova Recorrência</h3>
                </div>
                <form id="recurring-form" class="form-body" style="padding: 0; gap: 16px;">
                    <div class="form-field">
                        <label for="rec-description">Descrição *</label>
                        <input type="text" id="rec-description" placeholder="Ex: Netflix, Internet, Salário" required autocomplete="off" class="form-field" style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); padding: 10px; border-radius: var(--radius-sm);">
                    </div>
                    <div class="form-field">
                        <label for="rec-amount">Valor (R$) *</label>
                        <input type="number" id="rec-amount" placeholder="Ex: 55.90" step="0.01" min="0.01" required autocomplete="off" class="form-field" style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); padding: 10px; border-radius: var(--radius-sm);">
                    </div>
                    <div class="form-grid-2" style="gap: 16px; grid-template-columns: 1fr 1fr;">
                        <div class="form-field">
                            <label for="rec-type">Tipo de Fluxo *</label>
                            <select id="rec-type" required style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); padding: 10px; border-radius: var(--radius-sm);">
                                <option value="expense">Despesa</option>
                                <option value="income">Receita</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label for="rec-day">Dia do Mês *</label>
                            <input type="number" id="rec-day" min="1" max="31" placeholder="Ex: 10" required class="form-field" style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); padding: 10px; border-radius: var(--radius-sm);">
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="rec-category">Categoria *</label>
                        <select id="rec-category" required style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); padding: 10px; border-radius: var(--radius-sm);">
                            ${filterCatOptions('expense')}
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="rec-method">Método de Pagamento *</label>
                        <select id="rec-method" required style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); padding: 10px; border-radius: var(--radius-sm);">
                            <option value="pix">Pix</option>
                            <option value="debit">Débito</option>
                            <option value="cash">Dinheiro Físico</option>
                            <option value="credit_card">Cartão de Crédito</option>
                        </select>
                    </div>
                    <!-- Conditional Card Selector -->
                    <div class="form-field" id="rec-card-wrapper" style="display: none;">
                        <label for="rec-card">Qual Cartão de Crédito? *</label>
                        <select id="rec-card" style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); padding: 10px; border-radius: var(--radius-sm);">
                            ${cards.map(c => `<option value="${c.id}">${escapeHTML(c.name)} (Fechamento: dia ${c.closing_day})</option>`).join('')}
                        </select>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="margin-top: 10px; width: 100%; padding: 12px; background-color: var(--primary-color); border: none; border-radius: var(--radius-sm); color: var(--text-white); font-weight: 600; cursor: pointer;">
                        Salvar Recorrência
                    </button>
                </form>
            </div>
        </div>

        <!-- Right panel: List of active recurring items -->
        <div class="invoice-tx-panel">
            <div class="card-section">
                <div class="card-section-header" style="margin-bottom: 20px;">
                    <h3>Sua Configuração de Lançamentos Recorrentes</h3>
                </div>
                <div class="table-container">
                    <table class="tx-table">
                        <thead>
                            <tr>
                                <th style="width: 70px;">Dia</th>
                                <th>Descrição</th>
                                <th style="width: 130px;">Categoria</th>
                                <th style="width: 140px;">Pagamento</th>
                                <th style="text-align: right; width: 110px;">Valor</th>
                                <th style="text-align: center; width: 140px;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recurringRows}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  `;

  // Bind conditional selector toggle
  const methodSelect = container.querySelector('#rec-method');
  const cardSelectorWrapper = container.querySelector('#rec-card-wrapper');
  methodSelect.addEventListener('change', (e) => {
    cardSelectorWrapper.style.display = e.target.value === 'credit_card' ? 'block' : 'none';
  });

  // Bind dynamic category filter
  const typeSelect = container.querySelector('#rec-type');
  const catSelect = container.querySelector('#rec-category');
  typeSelect.addEventListener('change', (e) => {
    catSelect.innerHTML = filterCatOptions(e.target.value);
  });

  // Form submit handler
  const form = container.querySelector('#recurring-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const description = container.querySelector('#rec-description').value;
    const amount = parseFloat(container.querySelector('#rec-amount').value);
    const type = container.querySelector('#rec-type').value;
    const category_id = container.querySelector('#rec-category').value;
    const day = parseInt(container.querySelector('#rec-day').value);
    const payment_method = container.querySelector('#rec-method').value;
    const credit_card_id = payment_method === 'credit_card' ? container.querySelector('#rec-card').value : null;

    try {
      LocalStore.addRecurringTransaction({
        description,
        amount,
        type,
        category_id,
        day,
        payment_method,
        credit_card_id,
        start_month: currentMonth
      });

      // Immediately process for current active month so user sees transaction right away!
      LocalStore.processRecurringTransactions(currentMonth);

      // Reload database reference and view using helper
      updateDbAndAutosave(LocalStore.exportDatabase());
    } catch (err) {
      alert('Erro ao cadastrar recorrência: ' + err.message);
    }
  });

  // Action listeners: Toggle status
  container.querySelectorAll('.btn-toggle-active').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const rec = recurrences.find(r => r.id === id);
      if (rec) {
        LocalStore.updateRecurringTransaction(id, { active: !rec.active });
        
        // Immediately process for current month if activated
        if (!rec.active) {
          LocalStore.processRecurringTransactions(currentMonth);
        }

        updateDbAndAutosave(LocalStore.exportDatabase());
      }
    });
  });

  // Action listeners: Delete
  container.querySelectorAll('.btn-delete-rec').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Tem certeza que deseja excluir esta recorrência? Novos lançamentos automáticos não serão mais gerados para os próximos meses.')) {
        LocalStore.deleteRecurringTransaction(id);
        updateDbAndAutosave(LocalStore.exportDatabase());
      }
    });
  });

  return container;
}

/* ==========================================================================
   DYNAMIC DIALOG POPUPS
   ========================================================================== */

/**
 * Renders a modular modal to handle deposits or withdrawals.
 */
function triggerReserveMovementModal(reserveId, type) {
  const modalLayer = document.getElementById('reserve-modal-layer');
  if (!modalLayer) return;

  const today = new Date().toISOString().split('T')[0];
  const isDeposit = type === 'deposit';

  modalLayer.innerHTML = `
    <div class="modal-backdrop">
        <div class="modal-card">
            <div class="modal-header">
                <h3>${isDeposit ? 'Registrar Aporte (Guardar)' : 'Registrar Resgate (Saque)'}</h3>
            </div>
            <form id="modal-movement-form" class="modal-body">
                <div class="form-field">
                    <label for="modal-amount">Valor (R$) *</label>
                    <input type="number" id="modal-amount" placeholder="Ex: 100.00" step="0.01" min="0.01" required autocomplete="off">
                </div>
                <div class="form-field">
                    <label for="modal-date">Data do Fato *</label>
                    <input type="date" id="modal-date" value="${today}" required>
                </div>
                <div class="form-field">
                    <label for="modal-note">Notas / Observação</label>
                    <input type="text" id="modal-note" placeholder="Ex: Aporte sob bolsa celebrada" autocomplete="off">
                </div>
                ${isDeposit ? `
                <div class="form-field-checkbox" style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                    <input type="checkbox" id="modal-movement-ignore" style="width: auto; height: 16px; cursor: pointer;">
                    <label for="modal-movement-ignore" style="cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-muted); user-select: none;">Ignorar saldo (Não descontar do saldo líquido mensal)</label>
                </div>
                ` : ''}

                <div class="form-actions-row" style="margin-top: 18px;">
                    <button type="button" id="btn-modal-close" class="btn btn-secondary" style="background-color: var(--border-color); color: var(--text-main);">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isDeposit ? 'Confirmar Aporte' : 'Confirmar Resgate'}</button>
                </div>
            </form>
        </div>
    </div>
  `;

  const form = modalLayer.querySelector('#modal-movement-form');
  const closeBtn = modalLayer.querySelector('#btn-modal-close');

  const cleanModal = () => {
    modalLayer.innerHTML = '';
  };

  closeBtn.addEventListener('click', cleanModal);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const amt = parseFloat(modalLayer.querySelector('#modal-amount').value);
    const dateVal = modalLayer.querySelector('#modal-date').value;
    const noteVal = modalLayer.querySelector('#modal-note').value;
    const ignoreBalance = isDeposit ? modalLayer.querySelector('#modal-movement-ignore').checked : false;

    try {
      LocalStore.addReserveMovement(reserveId, {
        amount: amt,
        type,
        date: dateVal,
        note: noteVal,
        ignore_balance: ignoreBalance
      });

      alert(isDeposit ? 'Dinheiro guardado na reserva com sucesso!' : 'Resgate efetuado com sucesso!');
      cleanModal();
      updateDbAndAutosave(LocalStore.exportDatabase());
    } catch (err) {
      alert('Falha na operação: ' + err.message);
    }
  });
}

/**
 * Renders a modular modal to create a new financial goal manually.
 */
function triggerCreateReserveModal() {
  const modalLayer = document.getElementById('reserve-modal-layer');
  if (!modalLayer) return;

  modalLayer.innerHTML = `
    <div class="modal-backdrop">
        <div class="modal-card">
            <div class="modal-header">
                <h3>Criar Nova Meta de Poupança</h3>
            </div>
            <form id="modal-reserve-form" class="modal-body">
                <div class="form-field">
                    <label for="modal-rsv-name">Nome da Reserva / Objetivo *</label>
                    <input type="text" id="modal-rsv-name" placeholder="Ex: Troca de Notebook" required autocomplete="off">
                </div>
                <div class="form-field">
                    <label for="modal-rsv-goal">Valor Alvo da Meta (R$) *</label>
                    <input type="number" id="modal-rsv-goal" placeholder="Ex: 4000.00" step="0.01" min="1" required autocomplete="off">
                </div>

                <div class="form-actions-row" style="margin-top: 18px;">
                    <button type="button" id="btn-modal-close" class="btn btn-secondary" style="background-color: var(--border-color); color: var(--text-main);">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Criar Meta</button>
                </div>
            </form>
        </div>
    </div>
  `;

  const form = modalLayer.querySelector('#modal-reserve-form');
  const closeBtn = modalLayer.querySelector('#btn-modal-close');

  const cleanModal = () => {
    modalLayer.innerHTML = '';
  };

  closeBtn.addEventListener('click', cleanModal);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const rsvName = modalLayer.querySelector('#modal-rsv-name').value;
    const rsvGoal = parseFloat(modalLayer.querySelector('#modal-rsv-goal').value);

    try {
      LocalStore.addReserve({
        name: rsvName,
        goal_amount: rsvGoal
      });

      alert('Nova meta de poupança criada com sucesso!');
      cleanModal();
      updateDbAndAutosave(LocalStore.exportDatabase());
    } catch (err) {
      alert('Falha ao criar meta: ' + err.message);
    }
  });
}

/**
 * Renders a modular modal to register a new credit card manually.
 */
function triggerCreateCardModal() {
  const modalLayer = document.getElementById('reserve-modal-layer');
  if (!modalLayer) return;

  modalLayer.innerHTML = `
    <div class="modal-backdrop">
        <div class="modal-card">
            <div class="modal-header">
                <h3>Cadastrar Novo Cartão de Crédito</h3>
            </div>
            <form id="modal-card-form" class="modal-body">
                <div class="form-field">
                    <label for="modal-card-name">Nome do Cartão *</label>
                    <input type="text" id="modal-card-name" placeholder="Ex: Nubank" required autocomplete="off">
                </div>
                <div class="form-field">
                    <label for="modal-card-limit">Limite de Crédito Total (R$) *</label>
                    <input type="number" id="modal-card-limit" placeholder="Ex: 1500.00" step="0.01" min="1" required autocomplete="off">
                </div>
                <div class="form-grid-2">
                    <div class="form-field">
                        <label for="modal-card-closing">Dia do Fechamento (1-31) *</label>
                        <input type="number" id="modal-card-closing" placeholder="Ex: 28" min="1" max="31" required autocomplete="off">
                    </div>
                    <div class="form-field">
                        <label for="modal-card-due">Dia do Vencimento (1-31) *</label>
                        <input type="number" id="modal-card-due" placeholder="Ex: 5" min="1" max="31" required autocomplete="off">
                    </div>
                </div>

                <div class="form-actions-row" style="margin-top: 18px;">
                    <button type="button" id="btn-modal-close" class="btn btn-secondary" style="background-color: var(--border-color); color: var(--text-main);">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Cadastrar Cartão</button>
                </div>
            </form>
        </div>
    </div>
  `;

  const form = modalLayer.querySelector('#modal-card-form');
  const closeBtn = modalLayer.querySelector('#btn-modal-close');

  const cleanModal = () => {
    modalLayer.innerHTML = '';
  };

  closeBtn.addEventListener('click', cleanModal);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const cardName = modalLayer.querySelector('#modal-card-name').value;
    const cardLimit = parseFloat(modalLayer.querySelector('#modal-card-limit').value);
    const cardClosing = parseInt(modalLayer.querySelector('#modal-card-closing').value);
    const cardDue = parseInt(modalLayer.querySelector('#modal-card-due').value);

    try {
      const card = LocalStore.addCreditCard({
        name: cardName,
        limit: cardLimit,
        closing_day: cardClosing,
        due_day: cardDue
      });

      alert('Novo cartão de crédito cadastrado com sucesso!');
      cleanModal();
      currentCardId = card.id; // Auto-focus on the new card
      updateDbAndAutosave(LocalStore.exportDatabase());
    } catch (err) {
      alert('Falha ao cadastrar cartão: ' + err.message);
    }
  });
}
