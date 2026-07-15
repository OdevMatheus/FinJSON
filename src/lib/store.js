const STORAGE_KEY = 'financehub_db';

/**
 * Gets the raw parsed data from LocalStorage.
 * Returns null if not initialized.
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
 */
function _writeRaw(data) {
  if (data && data._metadata) {
    data._metadata.last_updated = new Date().toISOString();
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Recalculates monthly summaries for a specific month YYYY-MM
 * based on all existing transactions and reserves allocations.
 */
function _recalculateMonth(dbData, yearMonth) {
  const transactions = dbData.transactions || [];
  const monthlyTxs = transactions.filter(tx => tx.date.startsWith(yearMonth));

  let totalIncome = 0;
  let totalExpense = 0;

  monthlyTxs.forEach(tx => {
    const amount = parseFloat(tx.amount);
    if (tx.type === 'INCOME') {
      totalIncome += amount;
    } else if (tx.type === 'EXPENSE') {
      totalExpense += amount;
    }
  });

  const netBalance = totalIncome - totalExpense;

  if (!dbData.monthly_summaries) {
    dbData.monthly_summaries = [];
  }

  const existingIndex = dbData.monthly_summaries.findIndex(s => s.year_month === yearMonth);
  
  // Preserve saved_to_reserves if summary already exists, otherwise 0
  const savedToReserves = existingIndex !== -1 ? (dbData.monthly_summaries[existingIndex].saved_to_reserves || 0) : 0;

  const updatedSummary = {
    id: `sum-${yearMonth}`,
    year_month: yearMonth,
    total_income: parseFloat(totalIncome.toFixed(2)),
    total_expense: parseFloat(totalExpense.toFixed(2)),
    net_balance: parseFloat(netBalance.toFixed(2)),
    saved_to_reserves: parseFloat(savedToReserves.toFixed(2)),
    last_calculated_at: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    dbData.monthly_summaries[existingIndex] = updatedSummary;
  } else {
    dbData.monthly_summaries.push(updatedSummary);
  }
}

/**
 * Default clean slate database template.
 */
function _getBlankTemplate() {
  return {
    "_metadata": {
      "version": "1.1.0",
      "last_updated": new Date().toISOString(),
      "schema_validation": "strict"
    },
    "categories": [
      {
        "id": "cat-work",
        "name": "Trabalho",
        "type": "INCOME",
        "color_hex": "#6366f1",
        "icon": "💼",
        "is_active": true
      },
      {
        "id": "cat-food",
        "name": "Alimentação",
        "type": "EXPENSE",
        "color_hex": "#f59e0b",
        "icon": "🍔",
        "is_active": true
      },
      {
        "id": "cat-leisure",
        "name": "Lazer",
        "type": "EXPENSE",
        "color_hex": "#3b82f6",
        "icon": "🎬",
        "is_active": true
      },
      {
        "id": "cat-investment",
        "name": "Investimentos",
        "type": "EXPENSE",
        "color_hex": "#10b981",
        "icon": "📈",
        "is_active": true
      },
      {
        "id": "cat-essential",
        "name": "Moradia / Essencial",
        "type": "EXPENSE",
        "color_hex": "#f43f5e",
        "icon": "🏠",
        "is_active": true
      }
    ],
    "transactions": [],
    "reserves": [
      {
        "id": "res-emergency",
        "name": "Reserva de Emergência",
        "target_amount": 10000.00,
        "current_amount": 0.00,
        "currency": "BRL",
        "color_hex": "#10b981",
        "audit": {
          "created_at": new Date().toISOString(),
          "updated_at": new Date().toISOString()
        }
      }
    ],
    "monthly_summaries": []
  };
}

export const LocalStore = {
  /**
   * Check if LocalStorage data is present.
   */
  isInitialized() {
    return localStorage.getItem(STORAGE_KEY) !== null;
  },

  /**
   * Initialize a fresh default database.
   */
  initializeBlank() {
    const template = _getBlankTemplate();
    _writeRaw(template);
    return template;
  },

  /**
   * Validate and import complete database JSON payload.
   */
  importDatabase(importedData) {
    if (
      !importedData ||
      typeof importedData !== 'object' ||
      !Array.isArray(importedData.transactions) ||
      !Array.isArray(importedData.categories) ||
      !Array.isArray(importedData.reserves) ||
      !Array.isArray(importedData.monthly_summaries)
    ) {
      throw new Error('Formato de arquivo inválido. O JSON de backup deve conter as coleções "transactions", "categories", "reserves" e "monthly_summaries".');
    }

    const validatedData = {
      _metadata: {
        version: importedData._metadata?.version || '1.1.0',
        last_updated: new Date().toISOString(),
        schema_validation: 'strict'
      },
      categories: importedData.categories,
      transactions: importedData.transactions,
      reserves: importedData.reserves,
      monthly_summaries: importedData.monthly_summaries
    };

    _writeRaw(validatedData);
    return validatedData;
  },

  /**
   * Retrieves entire database to export.
   */
  exportDatabase() {
    return _readRaw();
  },

  /**
   * Fetch all categories.
   */
  getCategories() {
    const dbData = _readRaw();
    if (!dbData) return [];
    return dbData.categories.filter(cat => cat.is_active !== false);
  },

  /**
   * Fetch all active financial reserves.
   */
  getReserves() {
    const dbData = _readRaw();
    if (!dbData) return [];
    return dbData.reserves || [];
  },

  /**
   * Fetch transactions filtered by month.
   */
  getTransactions(filters = {}) {
    const dbData = _readRaw();
    if (!dbData) return [];
    let list = dbData.transactions || [];

    if (filters.month) {
      list = list.filter(tx => tx.date.startsWith(filters.month));
    }

    // Sort by date DESC, then created_at DESC
    return list.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.audit.created_at.localeCompare(a.audit.created_at);
    });
  },

  /**
   * Fetch or calculate on-the-fly a month summary.
   */
  getSummary(yearMonth) {
    const dbData = _readRaw();
    if (!dbData) return null;

    if (!dbData.monthly_summaries) {
      dbData.monthly_summaries = [];
    }

    let summary = dbData.monthly_summaries.find(s => s.year_month === yearMonth);
    if (!summary) {
      // Calculate on-the-fly and save
      _recalculateMonth(dbData, yearMonth);
      _writeRaw(dbData);
      summary = dbData.monthly_summaries.find(s => s.year_month === yearMonth);
    }

    return summary;
  },

  /**
   * Add a new transaction.
   */
  addTransaction(txData) {
    const dbData = _readRaw();
    if (!dbData) throw new Error('Database not initialized');

    const { description, amount, type, category_id, date } = txData;

    // Use native web crypto.randomUUID() for high-standard IDs
    const id = `tx-${crypto.randomUUID()}`;

    const tx = {
      id,
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      type: type.toUpperCase(),
      status: 'COMPLETED',
      category_id,
      description: description.trim(),
      date,
      audit: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    dbData.transactions.push(tx);
    
    // Auto-update summary
    const yearMonth = date.substring(0, 7);
    _recalculateMonth(dbData, yearMonth);
    
    _writeRaw(dbData);
    return tx;
  },

  /**
   * Delete a transaction.
   */
  deleteTransaction(id) {
    const dbData = _readRaw();
    if (!dbData) return false;

    const txIndex = dbData.transactions.findIndex(t => t.id === id);
    if (txIndex === -1) return false;

    const tx = dbData.transactions[txIndex];
    dbData.transactions.splice(txIndex, 1);

    // Auto-update summary for the affected month
    const yearMonth = tx.date.substring(0, 7);
    _recalculateMonth(dbData, yearMonth);

    _writeRaw(dbData);
    return true;
  },

  /**
   * Fund or withdraw from a reserve.
   */
  fundReserve(id, amount, yearMonth) {
    const dbData = _readRaw();
    if (!dbData) throw new Error('Database not initialized');

    const reserves = dbData.reserves || [];
    const index = reserves.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Reserve not found');

    const reserve = reserves[index];
    const parsedAmount = parseFloat(amount);
    const newCurrent = parseFloat((reserve.current_amount + parsedAmount).toFixed(2));

    if (newCurrent < 0) {
      throw new Error('Saldo insuficiente na reserva para realizar este resgate.');
    }

    // Update current amount
    reserve.current_amount = newCurrent;
    reserve.audit.updated_at = new Date().toISOString();

    // Mirror this contribution in the monthly summary under saved_to_reserves
    if (!dbData.monthly_summaries) {
      dbData.monthly_summaries = [];
    }

    let summaryIndex = dbData.monthly_summaries.findIndex(s => s.year_month === yearMonth);
    if (summaryIndex === -1) {
      _recalculateMonth(dbData, yearMonth);
      summaryIndex = dbData.monthly_summaries.findIndex(s => s.year_month === yearMonth);
    }

    const summary = dbData.monthly_summaries[summaryIndex];
    summary.saved_to_reserves = parseFloat(((summary.saved_to_reserves || 0) + parsedAmount).toFixed(2));
    summary.last_calculated_at = new Date().toISOString();

    _writeRaw(dbData);
    return reserve;
  }
};
