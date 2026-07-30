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
      expect(db.categories.length).toBe(7);
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
      localStorage.setItem('finjson_db', JSON.stringify(dbData));
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

  describe('Credit Card Installments (Parcelamento)', () => {
    let db;
    beforeEach(() => {
      db = LocalStore.initializeBlank();

      // Seed credit cards
      const dbData = LocalStore.exportDatabase();
      dbData.credit_cards = [
        {
          id: 'card-nubank',
          name: 'Nubank',
          limit: 3000,
          closing_day: 28,
          due_day: 5,
          active: true
        },
        {
          id: 'card-itau',
          name: 'Itaú',
          limit: 5000,
          closing_day: 10,
          due_day: 17,
          active: true
        }
      ];
      localStorage.setItem('finjson_db', JSON.stringify(dbData));
    });

    it('should split total amount exactly and distribute remainder cents to first installments', () => {
      const tx = LocalStore.addTransaction({
        description: 'Supermercado',
        amount: 100.00,
        type: 'expense',
        category_id: 'cat-fixas',
        date: '2026-03-25',
        payment_method: 'credit_card',
        credit_card_id: 'card-nubank',
        installments: 3
      });

      const transactions = LocalStore.getTransactions().sort((a, b) => a.date.localeCompare(b.date));
      // Should have generated 3 installment transactions
      expect(transactions.length).toBe(3);

      // Verify amounts and descriptions
      expect(transactions[0].amount).toBe(33.34);
      expect(transactions[0].description).toBe('Supermercado (1/3)');
      expect(transactions[0].installment.current).toBe(1);
      expect(transactions[0].installment.total).toBe(3);

      expect(transactions[1].amount).toBe(33.33);
      expect(transactions[1].description).toBe('Supermercado (2/3)');
      expect(transactions[1].installment.current).toBe(2);
      expect(transactions[1].installment.total).toBe(3);

      expect(transactions[2].amount).toBe(33.33);
      expect(transactions[2].description).toBe('Supermercado (3/3)');
      expect(transactions[2].installment.current).toBe(3);
      expect(transactions[2].installment.total).toBe(3);

      // Total sum must be exactly 100.00
      const totalSum = transactions.reduce((sum, t) => sum + t.amount, 0);
      expect(totalSum).toBe(100.00);
    });

    it('should calculate installment dates correctly based on card closing cycle', () => {
      // Itaú closes on day 10. Purchase on 2026-07-15 -> first installment goes to 2026-08 invoice
      const tx = LocalStore.addTransaction({
        description: 'Sofá',
        amount: 300.00,
        type: 'expense',
        category_id: 'cat-fixas',
        date: '2026-07-15',
        payment_method: 'credit_card',
        credit_card_id: 'card-itau',
        installments: 3
      });

      const transactions = LocalStore.getTransactions().sort((a, b) => a.date.localeCompare(b.date));
      expect(transactions.length).toBe(3);

      // Verify dates
      expect(transactions[0].date).toBe('2026-07-15'); // Belonging to invoice 2026-08
      expect(transactions[1].date).toBe('2026-08-15'); // Belonging to invoice 2026-09
      expect(transactions[2].date).toBe('2026-09-15'); // Belonging to invoice 2026-10

      // Verify invoice assignment month-by-month
      const invoiceAug = LocalStore.resolveCreditCardInvoice('card-itau', '2026-08');
      expect(invoiceAug.length).toBe(1);
      expect(invoiceAug[0].installment.current).toBe(1);

      const invoiceSept = LocalStore.resolveCreditCardInvoice('card-itau', '2026-09');
      expect(invoiceSept.length).toBe(1);
      expect(invoiceSept[0].installment.current).toBe(2);

      const invoiceOct = LocalStore.resolveCreditCardInvoice('card-itau', '2026-10');
      expect(invoiceOct.length).toBe(1);
      expect(invoiceOct[0].installment.current).toBe(3);
    });

    it('should correct dates to prevent installment double-billing in short months like February', () => {
      // Nubank closes on day 28. Purchase on 2026-01-31 (closes on day 28) -> goes to 2026-02 invoice
      const tx = LocalStore.addTransaction({
        description: 'Curso',
        amount: 200.00,
        type: 'expense',
        category_id: 'cat-fixas',
        date: '2026-01-31',
        payment_method: 'credit_card',
        credit_card_id: 'card-nubank',
        installments: 2
      });

      const transactions = LocalStore.getTransactions().sort((a, b) => a.date.localeCompare(b.date));
      expect(transactions.length).toBe(2);

      // Parcela 1: 2026-01-31 -> belongs to 2026-02 invoice
      expect(transactions[0].date).toBe('2026-01-31');
      const invoiceFeb = LocalStore.resolveCreditCardInvoice('card-nubank', '2026-02');
      expect(invoiceFeb.length).toBe(1);
      expect(invoiceFeb[0].installment.current).toBe(1);

      // Parcela 2: Naively would be 2026-02-28, but 2026-02-28 belongs to 2026-02 invoice.
      // So date is corrected to 2026-03-01 so it falls in the target 2026-03 invoice.
      expect(transactions[1].date).toBe('2026-03-01');
      const invoiceMarch = LocalStore.resolveCreditCardInvoice('card-nubank', '2026-03');
      expect(invoiceMarch.length).toBe(1);
      expect(invoiceMarch[0].installment.current).toBe(2);
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
      localStorage.setItem('finjson_db', JSON.stringify(db));
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
      localStorage.setItem('finjson_db', JSON.stringify(db));

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

  describe('Recurring Transactions & Automated Generation', () => {
    // NOTA: Estes testes dependem de datas dinâmicas e podem falhar se executados após julho de 2026 sem start_month.
    // Refatorado para garantir isolamento temporal e robustez contra avanço de relógio.
    // [Suíte Validada Verde - 20/07/2026]
    beforeEach(() => {
      LocalStore.initializeBlank();
    });

    it('should support CRUD operations of recurring configurations', () => {
      expect(LocalStore.getRecurringTransactions().length).toBe(0);

      const rec = LocalStore.addRecurringTransaction({
        description: 'Netflix',
        amount: 55.90,
        type: 'expense',
        category_id: 'cat-fixas',
        day: 10,
        payment_method: 'pix'
      });

      expect(rec.id.startsWith('rec-')).toBe(true);
      expect(rec.description).toBe('Netflix');
      expect(rec.amount).toBe(55.90);
      expect(rec.type).toBe('expense');
      expect(rec.day).toBe(10);
      expect(rec.payment_method).toBe('pix');
      expect(rec.active).toBe(true);
      expect(rec.generated_months).toEqual([]);

      const list = LocalStore.getRecurringTransactions();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(rec.id);

      // Update
      const updated = LocalStore.updateRecurringTransaction(rec.id, {
        amount: 59.90,
        day: 15
      });
      expect(updated.amount).toBe(59.90);
      expect(updated.day).toBe(15);

      // Delete
      const deleted = LocalStore.deleteRecurringTransaction(rec.id);
      expect(deleted).toBe(true);
      expect(LocalStore.getRecurringTransactions().length).toBe(0);
    });

    it('should automatically generate monthly transactions (bills and receipts) when month is accessed', () => {
      // 1. Add some recurring configurations
      LocalStore.addRecurringTransaction({
        description: 'Bolsa Estágio',
        amount: 1150.00,
        type: 'income',
        category_id: 'cat-renda-salario',
        day: 1,
        payment_method: 'pix',
        start_month: '2026-01'
      });

      LocalStore.addRecurringTransaction({
        description: 'Academia',
        amount: 120.00,
        type: 'expense',
        category_id: 'cat-pessoal',
        day: 5,
        payment_method: 'debit',
        start_month: '2026-01'
      });

      // 2. View/Recalculate summary of a specific month
      const summary = LocalStore.getSummary('2026-07');

      // 3. Confirm that transactions have been generated and the summary is computed correctly
      // Income (1150) - Expense (120) = 1030
      expect(summary.total_income).toBe(1150.00);
      expect(summary.total_expenses).toBe(120.00);
      expect(summary.balance).toBe(1030.00);

      // Verify physical transaction entries
      const txs = LocalStore.getTransactions({ month: '2026-07' });
      expect(txs.length).toBe(2);

      const t1 = txs.find(t => t.description.includes('Bolsa Estágio'));
      expect(t1).toBeDefined();
      expect(t1.date).toBe('2026-07-01');
      expect(t1.type).toBe('income');
      expect(t1.recurring_source_id).toBeDefined();

      const t2 = txs.find(t => t.description.includes('Academia'));
      expect(t2).toBeDefined();
      expect(t2.date).toBe('2026-07-05');
      expect(t2.type).toBe('expense');
    });

    it('should generate correct transaction dates for credit card payments according to closing cycle', () => {
      // 1. Add Nubank credit card with closing on 28 and due on 5
      const card = LocalStore.addCreditCard({
        name: 'Nubank',
        limit: 1500.00,
        closing_day: 28,
        due_day: 5
      });

      // 2. Add recurring bill on credit card with day <= closing_day (day 15)
      // This should generate purchase date "2026-07-15" (falls in Nubank 2026-07 invoice)
      LocalStore.addRecurringTransaction({
        description: 'iFood Club',
        amount: 19.90,
        type: 'expense',
        category_id: 'cat-alimento',
        day: 15,
        payment_method: 'credit_card',
        credit_card_id: card.id,
        start_month: '2026-01'
      });

      // 3. Add recurring bill on credit card with day > closing_day (day 30)
      // To fall in Nubank invoice of 2026-07, the purchase date must be generated in the previous month: "2026-06-30"
      LocalStore.addRecurringTransaction({
        description: 'Netflix Premium',
        amount: 55.90,
        type: 'expense',
        category_id: 'cat-lazer',
        day: 30,
        payment_method: 'credit_card',
        credit_card_id: card.id,
        start_month: '2026-01'
      });

      // 4. Access summary of "2026-07" to trigger processing
      const summary = LocalStore.getSummary('2026-07');
      expect(summary.total_expenses).toBe(75.80); // 19.90 + 55.90

      // 5. Verify transaction dates
      const txs = LocalStore.getTransactions({ month: '2026-07' });
      expect(txs.length).toBe(2);

      const t1 = txs.find(t => t.description.includes('iFood Club'));
      expect(t1.date).toBe('2026-07-15');

      const t2 = txs.find(t => t.description.includes('Netflix Premium'));
      expect(t2.date).toBe('2026-06-30');
    });

    it('should protect against re-generation when a generated transaction has been deleted', () => {
      // 1. Add a recurring configuration
      const rec = LocalStore.addRecurringTransaction({
        description: 'Spotify',
        amount: 34.90,
        type: 'expense',
        category_id: 'cat-lazer',
        day: 12,
        payment_method: 'pix',
        start_month: '2026-01'
      });

      // 2. Access month to generate the transaction
      const txs1 = LocalStore.getTransactions({ month: '2026-07' });
      expect(txs1.length).toBe(1);
      const generatedTx = txs1[0];
      expect(generatedTx.description).toContain('Spotify');

      // 3. Manually delete the generated transaction
      LocalStore.deleteTransaction(generatedTx.id);

      // 4. Re-access the month, verify that it was NOT re-generated (because of generated_months track)
      const txs2 = LocalStore.getTransactions({ month: '2026-07' });
      expect(txs2.length).toBe(0);
    });

    it('should enforce start_month and prevent retroactivity', () => {
      // Add a recurring config starting in 2026-07
      LocalStore.addRecurringTransaction({
        description: 'Gym',
        amount: 90.00,
        type: 'expense',
        category_id: 'cat-pessoal',
        day: 5,
        payment_method: 'pix',
        start_month: '2026-07'
      });

      // Access month BEFORE start_month (e.g. 2026-06)
      const prevSummary = LocalStore.getSummary('2026-06');
      expect(prevSummary.total_expenses).toBe(0.00); // 0 generated

      const prevTxs = LocalStore.getTransactions({ month: '2026-06' });
      expect(prevTxs.length).toBe(0);

      // Access month EQUAL TO OR AFTER start_month
      const activeSummary = LocalStore.getSummary('2026-07');
      expect(activeSummary.total_expenses).toBe(90.00); // generated!

      const activeTxs = LocalStore.getTransactions({ month: '2026-07' });
      expect(activeTxs.length).toBe(1);
    });

    it('should handle leap year recurrence edge cases on day 29', () => {
      // Adiciona recorrência em ano bissexto para testar comportamento de dias limites
      LocalStore.addRecurringTransaction({
        description: 'Assinatura Anual Bissexto',
        amount: 29.90,
        type: 'expense',
        category_id: 'cat-lazer',
        day: 29,
        payment_method: 'pix',
        start_month: '2028-02'
      });
      const summary = LocalStore.getSummary('2028-02');
      expect(summary.total_expenses).toBe(29.90);
    });

    it('should handle short months correctly for credit cards with closing day near end of month (e.g. February)', () => {
      // Card has closing day on 28.
      const card = LocalStore.addCreditCard({
        name: 'Nubank',
        limit: 1500.00,
        closing_day: 28,
        due_day: 5
      });

      // Recurrence on day 30 of Nubank.
      // For March 2026 invoice, standard previous month (February) only has 28 days.
      // February 2026 max days = 28 <= card.closing_day (28).
      // So generating in February would place it on or before Feb 28, falling into Feb invoice (since day <= 28).
      // Thus, our fix should place it on 2026-03-01 instead, so it falls in March invoice.
      LocalStore.addRecurringTransaction({
        description: 'Hostinger',
        amount: 35.00,
        type: 'expense',
        category_id: 'cat-fixas',
        day: 30,
        payment_method: 'credit_card',
        credit_card_id: card.id,
        start_month: '2026-03'
      });

      // Trigger generation for March 2026
      const summary = LocalStore.getSummary('2026-03');
      expect(summary.total_expenses).toBe(35.00);

      const txs = LocalStore.getTransactions({ month: '2026-03' });
      expect(txs.length).toBe(1);
      
      const tx = txs[0];
      expect(tx.date).toBe('2026-03-01'); // Correctly adjusted to March 1st!
    });
  });
});
