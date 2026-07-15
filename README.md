<div align="center">

[🌍 Ler em Português (Read in Portuguese)](docs/README-PT.md)

# 💎 Finjson

The premium personal finance manager, **100% Local-First** and **portable JSON-file oriented**.

---

[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![AI-Powered](https://img.shields.io/badge/AI--Powered-FF6F61?style=for-the-badge&logo=google&logoColor=white)](https://github.com/google-gemini/gemini-cli)
[![Local-First](https://img.shields.io/badge/Local--First-0052CC?style=for-the-badge&logo=databricks&logoColor=white)](#-local-first-architecture)

</div>

---

## 🤖 AI-Agent Driven & TDD Showcase

**Finjson** is much more than a simple expenses tracker: it was **developed entirely by AI Software Engineering Agents (Gemini CLI)** operating under **Auto-Edit** mode.

This project serves as a model showcase of human-agent collaboration and machine-code engineering excellence, adhering to rigorous cognitive and architectural standards:
- **Autonomous Test-Driven Development (TDD):** All core calculations, credit card billing cycles, short-month adjustments (like the February edge case), and retroactivity protections were designed and validated through **29 strict unit tests** running under Vitest before any UI component was rendered.
- **Specialized Cognitive Skills:** The engineering agent utilized and activated modular specialized skills (such as `ui-ux-pro-max`, `javascript-pro`, `clean-code`, and `readme-wizard`) to construct type-safe state transitions, robust LocalStorage caching, and thorough anti-XSS string sanitization.
- **UI/UX Craftsmanship:** The application layout strictly enforces visual polish. Emojis are never used on primary buttons or navigation tabs (clean inline SVGs only), hover micro-animations last exactly `150-300ms` without causing layout shifting, and all touch targets maintain a minimum size of `44x44px`.

---

## 🎯 Project Goal

The primary goal of **Finjson** is to give users **absolute sovereignty over their financial data**.

In a web landscape dominated by subscription-based SaaS and frequent cloud database breaches, this application advocates for a **pure Local-First ecosystem**:
1. **Zero Backend / No Accounts:** The application runs 100% on the client-side. No node servers, no cloud databases, and zero network calls for database transactions.
2. **Browser as the Database:** All settings, custom cards, recurring bills, and savings reserves are persisted locally using the `'finjson_db'` key under your browser's `LocalStorage`.
3. **Your Data in Your Drive:** Your data belongs to you. Simply click **"Export Backup"** at any time to download a portable JSON file (`finjson_backup_YYYY-MM-DD.json`) that you can store securely in your own Google Drive, Dropbox, or offline storage.

---

## 🌟 V3 Architecture Highlights

- **Intelligent Recurring Bills & Receipts:** Set your monthly subscriptions (expenses) and salary schedules (income) once. Whenever you view any month in the future, the background processor automatically generates actual transaction records on the agendated day.
- **Automated Calendar Cycle Correction (The "February Effect"):** Smart billing algorithms ensure that credit card transactions scheduled after the closing day fall into the correct billing invoice even during short months like February (by deviating the purchase date to the 1st of the target month to prevent cycle mismatches).
- **Retroactivity Protection:** A registered recurrence tracks its creation month (`start_month`), guaranteeing that your closed historical months' balances are never altered by rules created in the present.
- **Isolated Savings & Goal Tracking:** Allocate money to savings reserves on the **Active Reserves** panel. Individual deposits can be flagged to "Ignore Balance," allowing you to track meta progress without deducting from your regular monthly cash flow.
- **Premium "Midnight Slate" Dark Theme:** A visually rich dark editorial interface built using custom CSS variables, rigid flex grids, and subtle glowing borders.

---

## 🏛️ Repository Structure

```text
Finjson/
├── docs/                 # Technical specifications and docs
│   └── README-PT.md      # Portuguese documentation
├── public/               # Public static assets
│   ├── favicon.svg       # Browser header icon (Vector SVG)
│   └── icons.svg         # Additional public SVGs
├── src/
│   ├── lib/
│   │   ├── store.js      # CORE DATABASE ENGINE: Handles LocalStorage, credit cycles, and recalculations
│   │   ├── store.test.js # TEST SUITE: 29 unit tests validating core math and logic in Vitest
│   │   └── ui-helpers.js # UI HELPERS: Anti-XSS sanitization, curreny formatting, and layout cells
│   ├── main.js           # UI ORCHESTRATOR: Renders SPA views (Onboarding, Dashboard, Recurring, Reserves)
│   └── style.css         # STYLING: Premium Midnight Dark Theme, flex grids, and responsive constraints
├── index.html            # Core HTML5 index with inline SVGs and esqueleto loaders
├── package.json          # Dev dependencies (Vite + Vitest)
├── vite.config.js        # Native Vite static port configurations
└── GEMINI.md             # Consolidaded agent development mandates and context
```

---

## 🚀 How to Run Locally

You only need **Node.js** installed on your machine to launch Vite's static development server:

### 1. Install dependencies
Open your terminal in the repository's root and run:
```bash
npm install
```

### 2. Launch the Development Server
To start the application locally, run:
```bash
npm run dev
```

The console will display your local access link:
```text
  VITE v8.1.4  ready in 106 ms

  ➜  Local:   http://localhost:5173/
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your web browser to use the application.

### 3. Run the Unit Test Suite (Vitest)
To execute all **29 unit tests** that validate mathematical and billing cycle integrity:
```bash
npm test
```

### 4. Build for Production
To compile the application into fully optimized, static HTML/CSS/JS assets (ready to be hosted for free on Vercel, Netlify, or GitHub Pages), execute:
```bash
npm run build
```
The compiled, ready-to-deploy assets will be generated in the `/dist` folder.

---

## 🎮 Usage Guide & Data Portability

1. **First-time Access (Onboarding):**
   * If you open the application with a blank database, a dark onboarding screen will guide you through the initial setup.
   * **Start Fresh:** Click this option to seed a clean database pre-populated with 7 default categories designed around financial best practices (Salary, Extra Income, Fixed Expenses, Food, Services, Leisure, and Personal Care).
   * **Restore Backup:** Select or drag an existing `db.json` backup file to resume right where you left off.
2. **Daily Transactions:**
   * Log income and expenses using the transaction form. The dashboard immediately recalculates your Net Liquid Balance, Total Revenue, and Total Expenses for the selected period.
   * Log monthly configurations on the **"Mensais"** tab. The system will handle auto-billing and receipts for any subsequent months.
   * Save or withdraw money on the **Active Reserves** panel to track your progress visually.
3. **Transporting Your Data:**
   * At the end of the day or whenever you want to secure a backup, click **"Export Backup"** in the top-right header actions.
   * The browser will download a physical file named `finjson_backup_YYYY-MM-DD.json`. Save this file securely in your cloud drive (Google Drive, Dropbox) or physical key, and load it in any other browser or mobile device to restore your full history instantly.

---

## 🔒 License

This project is open-source and free for educational study, personal finance planning, and demonstrating agentic software engineering practices.

---

<div align="center">

*Engineered with technical excellence in a collaborative Human-Agent session.* 🚀

</div>