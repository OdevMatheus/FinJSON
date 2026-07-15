/**
 * FinanceHub Pro V3 - Local-First Database Engine
 * 
 * Handles all CRUD operations, schema migrations, credit card billing cycles,
 * reserve goals calculations, and monthly caching.
 * 
 * @module LocalStore
 */

const STORAGE_KEY = 'financehub_db';

/**
 * Gets the raw parsed data from LocalStorage.
 * Returns null if not initialized.
 * @private
 * @returns {Object|null}
 */
function _readRaw() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error parsing LocalStorage database:', err);
    return null;
  }
}

/**
 * Saves raw data to LocalStorage and updates metadata.
 * @private
 * @param {Object} data 
 */
function _writeRaw(data) {
  if (data && data._metadata) {
    data._metadata.updated_at = new Date().toISOString();
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Helper to determine which invoice month a credit card purchase belongs to
 * based on its purchase date and the card's closing day.
 * 
 * @private
 * @param {string} dateStr - Date formatted as YYYY-MM-DD
 * @param {number} closingDay - The day the invoice closes (e.g., 28)
 * @returns {string} The invoice month formatted as "YYYY-MM"
 */
function _getCardInvoiceMonth(dateStr, closingDay) {
  const [year, month, day] = dateStr.split('-').map(Number);
  
  if (day <= closingDay) {
    // Belongs to the current month's invoice
    const mm = String(month).padStart(2, '0');
    return `${year}-${mm}`;
  } else {
    // Belongs to the next month's invoice
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const mm = String(nextMonth).padStart(2, '0');
    return `${nextYear}-${mm}`;
  }
}

/**
 * Recalculates and caches the summary of a specific month (YYYY-MM).
 * This function processes both physical transactions and reserves movements.
 * 
 * @private
 * @param {Object} dbData - The raw db state
 * @param {string} yearMonth - Format "YYYY-MM"
 */
function _recalculateMonth(dbData, yearMonth) {
  const transactions = dbData.transactions || [];
  const creditCards = dbData.credit_cards || [];
  const reserves = dbData.reserves || [];

  // 1. Filter Transactions that belong to this billing/accounting month.
  const monthlyTxs = transactions.filter(tx => {
    if (tx.payment_method === 'credit_card' && tx.credit_card_id) {
      const card = creditCards.find(c => c.id === tx.credit_card_id);
      if (card) {
        // Evaluate based on credit card closing cycle
        const invoiceMonth = _getCardInvoiceMonth(tx.date, card.closing_day);
        return invoiceMonth === yearMonth;
      }
    }
    // Default fallback: match by purchase date prefix
    return tx.date.startsWith(yearMonth);
  });

  // 2. Sum up totals
  let totalIncome = 0;
  let totalExpenses = 0;
  const byCategory = {};

  monthlyTxs.forEach(tx => {
    const amount = parseFloat(tx.amount);
    if (tx.type === 'income') {
      totalIncome += amount;
      byCategory[tx.category_id] = parseFloat(((byCategory[tx.category_id] || 0) + amount).toFixed(2));
    } else if (tx.type === 'expense') {
      totalExpenses += amount;
      byCategory[tx.category_id] = parseFloat(((byCategory[tx.category_id] || 0) + amount).toFixed(2));
    }
  });

  // 3. Sum up reserves movements saved (deposited minus withdrawn) in this month
  let saved = 0;
  reserves.forEach(res => {
    const movements = res.movements || [];
    const monthlyMovements = movements.filter(m => m.date.startsWith(yearMonth));
    
    monthlyMovements.forEach(m => {
      const amount = parseFloat(m.amount);
      if (m.type === 'deposit') {
        saved += amount;
      } else if (m.type === 'withdraw') {
        saved -= amount;
      }
    });
  });

  // 4. Calculate final liquid balance
  const balance = totalIncome - totalExpenses - saved;

  // 5. Save/Overwrite summary cache
  if (!dbData.monthly_summaries) {
    dbData.monthly_summaries = {};
  }

  dbData.monthly_summaries[yearMonth] = {
    total_income: parseFloat(totalIncome.toFixed(2)),
    total_expenses: parseFloat(totalExpenses.toFixed(2)),
    saved: parseFloat(saved.toFixed(2)),
    balance: parseFloat(balance.toFixed(2)),
    by_category: byCategory,
    is_closed: dbData.monthly_summaries[yearMonth]?.is_closed || false,
    generated_at: new Date().toISOString()
  };
}

/**
 * High-standard initial database template seed.
 * @private
 */
function _getBlankTemplate() {
  const today = new Date().toISOString().split('T')[0];
  
  return {
    "_metadata": {
      "schema_version": 1,
      "app_version": "3.0.0",
      "created_at": new Date().toISOString(),
      "updated_at": new Date().toISOString(),
      "settings": {
        "currency": "BRL",
        "locale": "pt-BR",
        "fiscal_year_start_month": 1,
        "week_starts_on": "monday"
      }
    },
    "categories": [
      { "id": "cat-renda-salario", "name": "Salário / Bolsa Estágio", "type": "income", "group": "Renda", "color": "#10b981", "icon": "💼" },
      { "id": "cat-renda-extra",   "name": "Outras Entradas",         "type": "income", "group": "Renda", "color": "#10b981", "icon": "🪙" },
      { "id": "cat-fixas",         "name": "Contas Fixas",            "type": "expense", "group": "Gastos", "color": "#f43f5e", "icon": "🏠" },
      { "id": "cat-alimento",      "name": "Alimentação",             "type": "expense", "group": "Gastos", "color": "#f59e0b", "icon": "🍔" },
      { "id": "cat-cartao",        "name": "Cartão de Crédito",       "type": "expense", "group": "Gastos", "color": "#4f46e5", "icon": "💳" },
      { "id": "cat-lazer",         "name": "Lazer",                   "type": "expense", "group": "Gastos", "color": "#06b6d4", "icon": "🎬" },
      { "id": "cat-pessoal",       "name": "Pessoal",                 "type": "expense", "group": "Gastos", "color": "#8b5cf6", "icon": "💅" },
      { "id": "cat-viagem",        "name": "Viagem",                  "type": "expense", "group": "Gastos", "color": "#0ea5e9", "icon": "✈️" },
      { "id": "cat-gas",           "name": "Gás / Casa",              "type": "expense", "group": "Gastos", "color": "#10b981", "icon": "🔧" }
    ],
    "credit_cards": [
      {
        "id": "card-nubank",
        "name": "Nubank",
        "limit": 1500,
        "closing_day": 28,
        "due_day": 5,
        "active": true
      }
    ],
    "transactions": [
      {
        "id": `tx-${crypto.randomUUID()}`,
        "date": today,
        "description": "Bolsa estágio Celepar",
        "amount": 1150.00,
        "type": "income",
        "category_id": "cat-renda-salario",
        "payment_method": "pix",
        "credit_card_id": null,
        "recurring": true,
        "recurrence_rule": "monthly",
        "created_at": new Date().toISOString(),
        "updated_at": new Date().toISOString()
      }
    ],
    "reserves": [
      {
        "id": "rsv-emergencia",
        "name": "Reserva de Emergência",
        "goal_amount": 6000,
        "movements": [
          { "date": today, "amount": 200, "type": "deposit", "note": "Saldo inicial" }
        ]
      },
      {
        "id": "rsv-viagem",
        "name": "Viagem de Fim de Ano",
        "goal_amount": 400,
        "movements": []
      }
    ],
    "monthly_summaries": {}
  };
}

export const LocalStore = {
  /**
   * Checks if a LocalStorage FinanceHub database is present.
   * @returns {boolean}
   */
  isInitialized() {
    return localStorage.getItem(STORAGE_KEY) !== null;
  },

  /**
   * Initializes a fresh database with standard structured categories.
   * @returns {Object} The seeded database template.
   */
  initializeBlank() {
    const template = _getBlankTemplate();
    _writeRaw(template);
    
    // Compute initial summaries
    const dbData = _readRaw();
    const today = new Date().toISOString().split('T')[0];
    const yyyyMM = today.substring(0, 7);
    _recalculateMonth(dbData, yyyyMM);
    _writeRaw(dbData);

    return dbData;
  },

  /**
   * Imports a fully-formed JSON database file after basic schema validation.
   * @param {Object} importedData 
   * @returns {Object} Validated and saved database.
   */
  importDatabase(importedData) {
    if (
      !importedData ||
      typeof importedData !== 'object' ||
      !Array.isArray(importedData.transactions) ||
      !Array.isArray(importedData.categories) ||
      !Array.isArray(importedData.reserves)
    ) {
      throw new Error('Formato de arquivo inválido. O JSON de backup deve conter as coleções "transactions", "categories" e "reserves".');
    }

    const validatedData = {
      _metadata: {
        schema_version: importedData._metadata?.schema_version || 1,
        app_version: importedData._metadata?.app_version || "3.0.0",
        created_at: importedData._metadata?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: importedData._metadata?.settings || {
          currency: "BRL",
          locale: "pt-BR",
          fiscal_year_start_month: 1,
          week_starts_on: "monday"
        }
      },
      categories: importedData.categories,
      credit_cards: importedData.credit_cards || [],
      transactions: importedData.transactions,
      reserves: importedData.reserves,
      monthly_summaries: importedData.monthly_summaries || {}
    };

    _writeRaw(validatedData);
    
    // Regenerate summaries for safety
    const dbData = _readRaw();
    const months = new Set();
    dbData.transactions.forEach(t => months.add(t.date.substring(0, 7)));
    months.forEach(m => _recalculateMonth(dbData, m));
    _writeRaw(dbData);

    return dbData;
  },

  /**
   * Retrieves entire database to export.
   * @returns {Object}
   */
  exportDatabase() {
    return _readRaw();
  },

  /**
   * Fetch categories list.
   * @returns {Array<Object>}
   */
  getCategories() {
    const dbData = _readRaw();
    if (!dbData) return [];
    return dbData.categories || [];
  },

  /**
   * Fetch credit cards list.
   * @returns {Array<Object>}
   */
  getCreditCards() {
    const dbData = _readRaw();
    if (!dbData) return [];
    return dbData.credit_cards || [];
  },

  /**
   * Fetch reserves list with dynamic balance calculation.
   * @returns {Array<Object>}
   */
  getReserves() {
    const dbData = _readRaw();
    if (!dbData) return [];
    
    const reserves = dbData.reserves || [];
    return reserves.map(res => {
      const movements = res.movements || [];
      const current_amount = movements.reduce((sum, m) => {
        const amt = parseFloat(m.amount);
        return m.type === 'deposit' ? sum + amt : sum - amt;
      }, 0);

      return {
        ...res,
        current_amount: parseFloat(current_amount.toFixed(2))
      };
    });
  },

  /**
   * Fetch transactions filtered by month.
   * @param {Object} filters - { month: "YYYY-MM", type: "income"|"expense" }
   * @returns {Array<Object>}
   */
  getTransactions(filters = {}) {
    const dbData = _readRaw();
    if (!dbData) return [];
    const transactions = dbData.transactions || [];
    const creditCards = dbData.credit_cards || [];

    let list = [...transactions];

    if (filters.month) {
      list = list.filter(tx => {
        if (tx.payment_method === 'credit_card' && tx.credit_card_id) {
          const card = creditCards.find(c => c.id === tx.credit_card_id);
          if (card) {
            const invoiceMonth = _getCardInvoiceMonth(tx.date, card.closing_day);
            return invoiceMonth === filters.month;
          }
        }
        return tx.date.startsWith(filters.month);
      });
    }

    if (filters.type) {
      list = list.filter(tx => tx.type === filters.type.toLowerCase());
    }

    // Sort by date DESC, then created_at DESC
    return list.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.created_at.localeCompare(a.created_at);
    });
  },

  /**
   * Fetch a monthly summary from cache or calculate it on the fly.
   * @param {string} yearMonth - YYYY-MM
   * @returns {Object}
   */
  getSummary(yearMonth) {
    const dbData = _readRaw();
    if (!dbData) return null;

    if (!dbData.monthly_summaries) {
      dbData.monthly_summaries = {};
    }

    let summary = dbData.monthly_summaries[yearMonth];
    if (!summary) {
      _recalculateMonth(dbData, yearMonth);
      _writeRaw(dbData);
      summary = dbData.monthly_summaries[yearMonth];
    }

    return summary;
  },

  /**
   * Add a new transaction.
   * @param {Object} txData 
   * @returns {Object} The created transaction
   */
  addTransaction(txData) {
    const dbData = _readRaw();
    if (!dbData) throw new Error('Database not initialized');

    const { description, amount, type, category_id, date, payment_method, credit_card_id, notes } = txData;

    const id = `tx-${crypto.randomUUID()}`;
    const normalizedType = type.toLowerCase();

    const tx = {
      id,
      date,
      description: description.trim(),
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      type: normalizedType,
      category_id,
      payment_method,
      credit_card_id: payment_method === 'credit_card' ? credit_card_id : null,
      installment: txData.installment || { current: 1, total: 1 },
      recurring: txData.recurring || false,
      notes: (notes || '').trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    dbData.transactions.push(tx);

    // Update summaries
    let monthToRecalculate = date.substring(0, 7);
    if (tx.payment_method === 'credit_card' && tx.credit_card_id) {
      const card = dbData.credit_cards.find(c => c.id === tx.credit_card_id);
      if (card) {
        monthToRecalculate = _getCardInvoiceMonth(tx.date, card.closing_day);
      }
    }

    _recalculateMonth(dbData, monthToRecalculate);
    _writeRaw(dbData);

    return tx;
  },

  /**
   * Update an existing transaction.
   * @param {string} id 
   * @param {Object} updatedFields 
   * @returns {Object} The updated transaction
   */
  updateTransaction(id, updatedFields) {
    const dbData = _readRaw();
    if (!dbData) throw new Error('Database not initialized');

    const index = dbData.transactions.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Transaction not found');

    const existing = dbData.transactions[index];
    const previousDate = existing.date;
    const previousMethod = existing.payment_method;
    const previousCardId = existing.credit_card_id;

    const updated = {
      ...existing,
      ...updatedFields,
      id: existing.id, // Immutable ID
      updated_at: new Date().toISOString()
    };

    dbData.transactions[index] = updated;

    // Recalculate original and new months in case of date or payment cycle change
    const monthsToRecalculate = new Set();
    
    // Month 1: Original
    let m1 = previousDate.substring(0, 7);
    if (previousMethod === 'credit_card' && previousCardId) {
      const card = dbData.credit_cards.find(c => c.id === previousCardId);
      if (card) m1 = _getCardInvoiceMonth(previousDate, card.closing_day);
    }
    monthsToRecalculate.add(m1);

    // Month 2: New
    let m2 = updated.date.substring(0, 7);
    if (updated.payment_method === 'credit_card' && updated.credit_card_id) {
      const card = dbData.credit_cards.find(c => c.id === updated.credit_card_id);
      if (card) m2 = _getCardInvoiceMonth(updated.date, card.closing_day);
    }
    monthsToRecalculate.add(m2);

    monthsToRecalculate.forEach(m => _recalculateMonth(dbData, m));
    _writeRaw(dbData);

    return updated;
  },

  /**
   * Delete a transaction.
   * @param {string} id 
   * @returns {boolean} True if deleted
   */
  deleteTransaction(id) {
    const dbData = _readRaw();
    if (!dbData) return false;

    const index = dbData.transactions.findIndex(t => t.id === id);
    if (index === -1) return false;

    const tx = dbData.transactions[index];
    dbData.transactions.splice(index, 1);

    // Calculate month of deletion
    let monthToRecalculate = tx.date.substring(0, 7);
    if (tx.payment_method === 'credit_card' && tx.credit_card_id) {
      const card = dbData.credit_cards.find(c => c.id === tx.credit_card_id);
      if (card) {
        monthToRecalculate = _getCardInvoiceMonth(tx.date, card.closing_day);
      }
    }

    _recalculateMonth(dbData, monthToRecalculate);
    _writeRaw(dbData);

    return true;
  },

  /**
   * Add a movement (deposit or withdrawal) into a financial reserve goal.
   * @param {string} reserveId 
   * @param {Object} movementData - { amount, type, date, note }
   * @returns {Object} The updated reserve item
   */
  addReserveMovement(reserveId, movementData) {
    const dbData = _readRaw();
    if (!dbData) throw new Error('Database not initialized');

    const reserves = dbData.reserves || [];
    const index = reserves.findIndex(r => r.id === reserveId);
    if (index === -1) throw new Error('Reserve not found');

    const reserve = reserves[index];
    const { amount, type, date, note } = movementData;

    const movement = {
      id: `mov-${crypto.randomUUID()}`,
      date,
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      type: type.toLowerCase(), // "deposit" | "withdraw"
      note: (note || '').trim()
    };

    if (!reserve.movements) {
      reserve.movements = [];
    }

    // Double check balance limits if withdrawing
    const currentBalance = reserve.movements.reduce((sum, m) => {
      return m.type === 'deposit' ? sum + m.amount : sum - m.amount;
    }, 0);

    if (movement.type === 'withdraw' && currentBalance < movement.amount) {
      throw new Error('Saldo insuficiente na reserva para realizar este resgate.');
    }

    reserve.movements.push(movement);

    // Update monthly summary for the month of the movement
    const yearMonth = date.substring(0, 7);
    _recalculateMonth(dbData, yearMonth);
    _writeRaw(dbData);

    // Return reserve with calculated current amount
    const updatedBalance = parseFloat((currentBalance + (movement.type === 'deposit' ? movement.amount : -movement.amount)).toFixed(2));
    return {
      ...reserve,
      current_amount: updatedBalance
    };
  },

  /**
   * Get weekly breakdown within a date range (runtime, no persistence).
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @returns {Array<Object>} Weeks array with totals
   */
  getWeeklyBreakdown(startDate, endDate) {
    const dbData = _readRaw();
    if (!dbData) return [];

    const transactions = dbData.transactions || [];
    
    // Filter transactions in range
    const filtered = transactions.filter(t => t.date >= startDate && t.date <= endDate);

    // Group transactions by ISO Week or custom 7-day windows.
    // For simplicity and standard, we group by Calendar ISO Weeks.
    const weeks = {};

    filtered.forEach(tx => {
      // Get ISO week number
      const d = new Date(tx.date);
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      const weekKey = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;

      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          week: weekKey,
          total_income: 0,
          total_expenses: 0,
          transactions: []
        };
      }

      const amount = parseFloat(tx.amount);
      if (tx.type === 'income') {
        weeks[weekKey].total_income += amount;
      } else if (tx.type === 'expense') {
        weeks[weekKey].total_expenses += amount;
      }
      weeks[weekKey].transactions.push(tx);
    });

    return Object.values(weeks).map(w => ({
      ...w,
      total_income: parseFloat(w.total_income.toFixed(2)),
      total_expenses: parseFloat(w.total_expenses.toFixed(2)),
      balance: parseFloat((w.total_income - w.total_expenses).toFixed(2))
    })).sort((a, b) => b.week.localeCompare(a.week));
  },

  /**
   * Get yearly statistics by combining the cached monthly summaries.
   * @param {number} year - YYYY
   * @returns {Object} Yearly balance sheet
   */
  getYearlySummary(year) {
    const dbData = _readRaw();
    if (!dbData) return null;

    const summaries = dbData.monthly_summaries || {};
    const months = Object.keys(summaries).filter(m => m.startsWith(String(year)));

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalSaved = 0;
    const categoryTotals = {};

    months.forEach(m => {
      const s = summaries[m];
      totalIncome += s.total_income || 0;
      totalExpenses += s.total_expenses || 0;
      totalSaved += s.saved || 0;

      if (s.by_category) {
        Object.keys(s.by_category).forEach(catId => {
          categoryTotals[catId] = parseFloat(((categoryTotals[catId] || 0) + s.by_category[catId]).toFixed(2));
        });
      }
    });

    const averageIncome = months.length > 0 ? (totalIncome / months.length) : 0;
    const averageExpenses = months.length > 0 ? (totalExpenses / months.length) : 0;

    return {
      year,
      total_income: parseFloat(totalIncome.toFixed(2)),
      total_expenses: parseFloat(totalExpenses.toFixed(2)),
      total_saved: parseFloat(totalSaved.toFixed(2)),
      net_balance: parseFloat((totalIncome - totalExpenses - totalSaved).toFixed(2)),
      average_income: parseFloat(averageIncome.toFixed(2)),
      average_expenses: parseFloat(averageExpenses.toFixed(2)),
      by_category: categoryTotals,
      months_tracked: months.length
    };
  },

  /**
   * Groups transactions that belong to a specific credit card invoice.
   * @param {string} cardId 
   * @param {string} yearMonth - Fatura month "YYYY-MM"
   * @returns {Array<Object>} List of transactions in this invoice
   */
  resolveCreditCardInvoice(cardId, yearMonth) {
    const dbData = _readRaw();
    if (!dbData) return [];

    const transactions = dbData.transactions || [];
    const card = (dbData.credit_cards || []).find(c => c.id === cardId);
    if (!card) return [];

    return transactions.filter(tx => {
      return (
        tx.payment_method === 'credit_card' &&
        tx.credit_card_id === cardId &&
        _getCardInvoiceMonth(tx.date, card.closing_day) === yearMonth
      );
    }).sort((a, b) => b.date.localeCompare(a.date));
  }
};
