import { describe, it, expect, beforeEach } from 'vitest';

// Polyfill localStorage globally for Node.js test environment
const storageStore = {};
globalThis.localStorage = {
  getItem: (key) => storageStore[key] || null,
  setItem: (key, val) => { storageStore[key] = String(val); },
  removeItem: (key) => { delete storageStore[key]; },
  clear: () => {
    for (const key in storageStore) {
      delete storageStore[key];
    }
  }
};

// Import the database engine
import { LocalStore } from './store';

describe('LocalStore V3 Database Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Database Lifecycle & Initialization', () => {
    it('should report as uninitialized initially', () => {
      expect(LocalStore.isInitialized()).toBe(false);
    });

    it('should initialize a blank template database', () => {
      const db = LocalStore.initializeBlank();
      expect(LocalStore.isInitialized()).toBe(true);
      expect(db._metadata.schema_version).toBe(1);
      expect(db._metadata.app_version).toBe('3.0.0');
      expect(db.categories.length).toBe(9);
      expect(db.credit_cards.length).toBe(0); // Clean sheet
      expect(db.transactions.length).toBe(0); // Clean sheet
      expect(db.reserves.length).toBe(0);
    });

    it('should load master lists correctly after init', () => {
      LocalStore.initializeBlank();
      const categories = LocalStore.getCategories();
      const cards = LocalStore.getCreditCards();
      const reserves = LocalStore.getReserves();

      expect(categories.find(c => c.id === 'cat-alimento')).toBeDefined();
      expect(cards.length).toBe(0); // Clean sheet
      expect(reserves.length).toBe(0);
    });
  });

  describe('Transactions CRUD Operations', () => {
    let db;
    beforeEach(() => {
      db = LocalStore.initializeBlank();
    });

    it('should add an income transaction and trigger summary recalculation', () => {
      const today = new Date().toISOString().split('T')[0];
      const yyyyMM = today.substring(0, 7);

      const tx = LocalStore.addTransaction({
        description: 'Bônus Extra',
        amount: 500.00,
        type: 'income',
        category_id: 'cat-renda-extra',
        date: today,
        payment_method: 'pix'
      });

      expect(tx.id.startsWith('tx-')).toBe(true);
      expect(tx.amount).toBe(500.00);
      expect(tx.type).toBe('income');

      // Check transaction exists in list
      const txs = LocalStore.getTransactions({ month: yyyyMM });
      expect(txs.find(t => t.id === tx.id)).toBeDefined();

      // Check summary was recalculated
      const summary = LocalStore.getSummary(yyyyMM);
      // Only Bonus (500) = 500
      expect(summary.total_income).toBe(500.00);
      // Reserves initial deposit is 0, so liquid balance is: 500 (income) - 0 (expense) - 0 (saved) = 500
      expect(summary.balance).toBe(500.00);
    });

    it('should add an expense transaction and trigger summary recalculation', () => {
      const today = new Date().toISOString().split('T')[0];
      const yyyyMM = today.substring(0, 7);

      const tx = LocalStore.addTransaction({
        description: 'Jantar',
        amount: 80.00,
        type: 'expense',
        category_id: 'cat-alimento',
        date: today,
        payment_method: 'debit'
      });

      expect(tx.type).toBe('expense');

      // Check summary was recalculated
      const summary = LocalStore.getSummary(yyyyMM);
      expect(summary.total_expenses).toBe(80.00);
      // 0 (income) - 80 (expenses) - 0 (saved) = -80
      expect(summary.balance).toBe(-80.00);
    });

    it('should throw an error on invalid transaction input', () => {
      const today = new Date().toISOString().split('T')[0];

      // Missing fields
      expect(() => {
        LocalStore.addTransaction({ description: 'Teste' });
      }).toThrow();

      // Negative amount
      expect(() => {
        LocalStore.addTransaction({
          description: 'Teste',
          amount: -50.00,
          type: 'expense',
          category_id: 'cat-alimento',
          date: today,
          payment_method: 'debit'
        });
      }).toThrow();

      // Invalid category
      expect(() => {
        LocalStore.addTransaction({
          description: 'Teste',
          amount: 50.00,
          type: 'expense',
          category_id: 'cat-non-existent',
          date: today,
          payment_method: 'debit'
        });
      }).toThrow();
    });

    it('should update a transaction and trigger recalculation', () => {
      const today = new Date().toISOString().split('T')[0];
      const yyyyMM = today.substring(0, 7);

      // Add a dinner transaction
      const tx = LocalStore.addTransaction({
        description: 'Jantar',
        amount: 80.00,
        type: 'expense',
        category_id: 'cat-alimento',
        date: today,
        payment_method: 'debit'
      });

      // Update amount
      const updated = LocalStore.updateTransaction(tx.id, { amount: 100.00 });
      expect(updated.amount).toBe(100.00);

      const summary = LocalStore.getSummary(yyyyMM);
      expect(summary.total_expenses).toBe(100.00);
    });

    it('should recalculate both months if transaction date moves to another month', () => {
      // Add transaction in March 2026
      const tx = LocalStore.addTransaction({
        description: 'Assinatura',
        amount: 50.00,
        type: 'expense',
        category_id: 'cat-fixas',
        date: '2026-03-10',
        payment_method: 'pix'
      });

      const sMarch1 = LocalStore.getSummary('2026-03');
      expect(sMarch1.total_expenses).toBe(50.00);

      // Update transaction date to April 2026
      LocalStore.updateTransaction(tx.id, { date: '2026-04-15' });

      // March should now be 0 expenses, April should be 50 expenses
      const sMarch2 = LocalStore.getSummary('2026-03');
      const sApril = LocalStore.getSummary('2026-04');

      expect(sMarch2.total_expenses).toBe(0.00);
      expect(sApril.total_expenses).toBe(50.00);
    });

    it('should delete a transaction and trigger recalculation', () => {
      const today = new Date().toISOString().split('T')[0];
      const yyyyMM = today.substring(0, 7);

      const tx = LocalStore.addTransaction({
        description: 'Jantar',
        amount: 80.00,
        type: 'expense',
        category_id: 'cat-alimento',
        date: today,
        payment_method: 'debit'
      });

      const deleted = LocalStore.deleteTransaction(tx.id);
      expect(deleted).toBe(true);

      const summary = LocalStore.getSummary(yyyyMM);
      expect(summary.total_expenses).toBe(0.00);
    });
  });

  describe('Credit Card Billing Cycle', () => {
    let db;
    beforeEach(() => {
      db = LocalStore.initializeBlank();

      // Manually seed the card-nubank credit card for cycle tests
      const dbData = LocalStore.exportDatabase();
      dbData.credit_cards = [
        {
          id: 'card-nubank',
          name: 'Nubank',
          limit: 1500,
          closing_day: 28,
          due_day: 5,
          active: true
        }
      ];
      localStorage.setItem('financehub_db', JSON.stringify(dbData));
    });

    it('should allocate card purchases on day <= closing_day to current invoice month', () => {
      // Card closes on day 28. Purchase on March 25th -> falls into March invoice
      const tx = LocalStore.addTransaction({
        description: 'Luz',
        amount: 150.00,
        type: 'expense',
        category_id: 'cat-fixas',
        date: '2026-03-25',
        payment_method: 'credit_card',
        credit_card_id: 'card-nubank'
      });

      // Recalculates March summary
      const summaryMarch = LocalStore.getSummary('2026-03');
      expect(summaryMarch.total_expenses).toBe(150.00);

      const summaryApril = LocalStore.getSummary('2026-04');
      expect(summaryApril.total_expenses).toBe(0.00);

      // Verify invoice grouping
      const invoice = LocalStore.resolveCreditCardInvoice('card-nubank', '2026-03');
      expect(invoice.length).toBe(1);
      expect(invoice[0].id).toBe(tx.id);
    });

    it('should allocate card purchases on day > closing_day to next invoice month', () => {
      // Card closes on day 28. Purchase on March 30th -> falls into April invoice
      const tx = LocalStore.addTransaction({
        description: 'Mercado',
        amount: 200.00,
        type: 'expense',
        category_id: 'cat-alimento',
        date: '2026-03-30',
        payment_method: 'credit_card',
        credit_card_id: 'card-nubank'
      });

      // March should be empty, April should register the 200 expense
      const summaryMarch = LocalStore.getSummary('2026-03');
      const summaryApril = LocalStore.getSummary('2026-04');

      expect(summaryMarch.total_expenses).toBe(0.00);
      expect(summaryApril.total_expenses).toBe(200.00);

      // Verify invoice grouping matches
      const invoiceApril = LocalStore.resolveCreditCardInvoice('card-nubank', '2026-04');
      expect(invoiceApril.length).toBe(1);
      expect(invoiceApril[0].id).toBe(tx.id);
    });
  });

  describe('Financial Reserves & Goal Progress', () => {
    beforeEach(() => {
      LocalStore.initializeBlank();
      
      // Manually seed a reserve goal inside localStorage for these test cases
      const db = LocalStore.exportDatabase();
      db.reserves = [
        {
          id: 'rsv-emergencia',
          name: 'Reserva de Emergência',
          goal_amount: 6000,
          movements: [
            { date: new Date().toISOString().split('T')[0], amount: 200, type: 'deposit', note: 'Saldo inicial' }
          ]
        }
      ];
      localStorage.setItem('financehub_db', JSON.stringify(db));
    });

    it('should calculate reserve balances dynamically from movements', () => {
      // Emergency reserve starts with initial 200 deposit (from seed)
      const reserves = LocalStore.getReserves();
      const rsv = reserves.find(r => r.id === 'rsv-emergencia');
      expect(rsv.current_amount).toBe(200.00);
    });

    it('should support deposit movements and increment balances', () => {
      const today = new Date().toISOString().split('T')[0];
      const yyyyMM = today.substring(0, 7);

      const rsv = LocalStore.addReserveMovement('rsv-emergencia', {
        date: today,
        amount: 300.00,
        type: 'deposit',
        note: 'Aporte extra'
      });

      expect(rsv.current_amount).toBe(500.00);

      // Check summary reflecting saved contribution
      const summary = LocalStore.getSummary(yyyyMM);
      expect(summary.saved).toBe(500.00); // 200 (initial) + 300 (deposit) = 500
    });

    it('should support withdraw movements and decrement balances', () => {
      const today = new Date().toISOString().split('T')[0];
      const yyyyMM = today.substring(0, 7);

      const rsv = LocalStore.addReserveMovement('rsv-emergencia', {
        date: today,
        amount: 150.00,
        type: 'withdraw',
        note: 'Resgate'
      });

      expect(rsv.current_amount).toBe(200.00 - 150.00); // 200 - 150 = 50.00
      expect(rsv.current_amount).toBe(50.00);

      const summary = LocalStore.getSummary(yyyyMM);
      expect(summary.saved).toBe(50.00); // 200 - 150 = 50.00
    });

    it('should throw an error and block withdrawals exceeding current balance', () => {
      const today = new Date().toISOString().split('T')[0];

      expect(() => {
        LocalStore.addReserveMovement('rsv-emergencia', {
          date: today,
          amount: 500.00, // Balance is only 200
          type: 'withdraw',
          note: 'Resgate excessivo'
        });
      }).toThrow();
    });

    it('should NOT discount from liquid balance if reserve movement has ignore_balance set to true', () => {
      const today = new Date().toISOString().split('T')[0];
      const yyyyMM = today.substring(0, 7);

      // Create a plain reserve
      const db = LocalStore.exportDatabase();
      db.reserves.push({
        id: 'rsv-plain',
        name: 'Reserva Comum',
        goal_amount: 1000,
        movements: []
      });
      localStorage.setItem('financehub_db', JSON.stringify(db));

      // Add a deposit movement to the reserve with ignore_balance: true
      LocalStore.addReserveMovement('rsv-plain', {
        date: today,
        amount: 300.00,
        type: 'deposit',
        ignore_balance: true,
        note: 'Aporte poupança antiga'
      });

      // Verify monthly summary saved remains only 200 (from seed), ignoring the 300 deposit
      const summary = LocalStore.getSummary(yyyyMM);
      expect(summary.saved).toBe(200.00);
      expect(summary.balance).toBe(-200.00); // 0 (income) - 0 (expense) - 200 (emergency saved) = -200
    });
  });

  describe('Database Export & Schema Validation', () => {
    beforeEach(() => {
      LocalStore.initializeBlank();
    });

    it('should export database successfully', () => {
      const db = LocalStore.exportDatabase();
      expect(db._metadata.schema_version).toBe(1);
      expect(db.transactions.length).toBe(0); // Clean sheet starts empty
    });

    it('should validate and import valid backup JSONs', () => {
      const backup = {
        _metadata: { schema_version: 1, app_version: '3.0.0' },
        categories: [
          { id: 'cat-lazer', name: 'Lazer', type: 'expense', group: 'Gastos', color: '#06b6d4', icon: '🎬' }
        ],
        credit_cards: [],
        transactions: [
          {
            id: 'tx-test',
            date: '2026-05-10',
            description: 'Cinema',
            amount: 25.00,
            type: 'expense',
            category_id: 'cat-lazer',
            payment_method: 'cash',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        reserves: [],
        monthly_summaries: {}
      };

      const imported = LocalStore.importDatabase(backup);
      expect(imported.transactions.length).toBe(1);
      expect(imported.transactions[0].id).toBe('tx-test');

      // Check summaries were re-generated automatically during import
      const summary = LocalStore.getSummary('2026-05');
      expect(summary.total_expenses).toBe(25.00);
    });

    it('should reject invalid or corrupted backup objects on import', () => {
      // Missing categories
      const badBackup = {
        transactions: []
      };

      expect(() => {
        LocalStore.importDatabase(badBackup);
      }).toThrow();
    });
  });

  describe('On-the-fly Analytics', () => {
    beforeEach(() => {
      LocalStore.initializeBlank();
    });

    it('should calculate weekly breakdowns correctly in runtime', () => {
      // Clear standard salary from seed for clean test
      const raw = LocalStore.exportDatabase();
      raw.transactions = [
        {
          id: 'tx-1',
          date: '2026-03-02', // Monday, Week 10 of 2026
          description: 'Lançamento 1',
          amount: 100.00,
          type: 'income',
          category_id: 'cat-renda-salario',
          payment_method: 'pix',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'tx-2',
          date: '2026-03-05', // Thursday, Week 10 of 2026
          description: 'Lançamento 2',
          amount: 40.00,
          type: 'expense',
          category_id: 'cat-alimento',
          payment_method: 'pix',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      raw.monthly_summaries = {}; // CLEAR CACHED SUMMARIES TO AVOID SEED CONFLICT
      LocalStore.importDatabase(raw);

      const breakdown = LocalStore.getWeeklyBreakdown('2026-03-01', '2026-03-10');
      
      // Should find one week (2026-W10)
      expect(breakdown.length).toBe(1);
      expect(breakdown[0].week).toBe('2026-W10');
      expect(breakdown[0].total_income).toBe(100.00);
      expect(breakdown[0].total_expenses).toBe(40.00);
      expect(breakdown[0].balance).toBe(60.00);
    });

    it('should calculate yearly summaries correctly from cached monthly summaries', () => {
      // Seed transactions in different months
      const raw = LocalStore.exportDatabase();
      raw.transactions = [
        {
          id: 'tx-1',
          date: '2026-01-15',
          description: 'Salário Jan',
          amount: 1000.00,
          type: 'income',
          category_id: 'cat-renda-salario',
          payment_method: 'pix',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'tx-2',
          date: '2026-02-15',
          description: 'Salário Fev',
          amount: 1200.00,
          type: 'income',
          category_id: 'cat-renda-salario',
          payment_method: 'pix',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      raw.monthly_summaries = {}; // CLEAR CACHED SUMMARIES TO AVOID SEED CONFLICT
      LocalStore.importDatabase(raw);

      // This computes summaries for Jan (1000) and Fev (1200)
      const yearly = LocalStore.getYearlySummary(2026);
      
      expect(yearly.year).toBe(2026);
      expect(yearly.total_income).toBe(2200.00);
      expect(yearly.total_expenses).toBe(0.00);
      expect(yearly.average_income).toBe(1100.00); // (1000 + 1200) / 2
    });
  });

  describe('Manual Creations (Reserves & Cards)', () => {
    beforeEach(() => {
      LocalStore.initializeBlank();
    });

    it('should support manually adding a reserve goal and persistence', () => {
      const initialReserves = LocalStore.getReserves();
      expect(initialReserves.length).toBe(0); // Starts blank per previous requirement

      const rsv = LocalStore.addReserve({
        name: 'Notebook Novo',
        goal_amount: 3500.00
      });

      expect(rsv.id.startsWith('rsv-')).toBe(true);
      expect(rsv.name).toBe('Notebook Novo');
      expect(rsv.goal_amount).toBe(3500.00);

      const updatedReserves = LocalStore.getReserves();
      expect(updatedReserves.length).toBe(1);
      expect(updatedReserves[0].name).toBe('Notebook Novo');
    });

    it('should support manually adding a credit card and persistence', () => {
      const initialCards = LocalStore.getCreditCards();
      expect(initialCards.length).toBe(0); // Clean sheet starts empty

      const card = LocalStore.addCreditCard({
        name: 'Visa Infinite',
        limit: 10000.00,
        closing_day: 15,
        due_day: 25
      });

      expect(card.id.startsWith('card-')).toBe(true);
      expect(card.name).toBe('Visa Infinite');
      expect(card.limit).toBe(10000.00);
      expect(card.closing_day).toBe(15);
      expect(card.due_day).toBe(25);

      const updatedCards = LocalStore.getCreditCards();
      expect(updatedCards.length).toBe(1);
      expect(updatedCards.find(c => c.name === 'Visa Infinite')).toBeDefined();
    });
  });
});
