<div align="center">

[🌍 Read this in English (Ler em Inglês)](../README.md)

# 💎 FinJSON Pro V3

O gerenciador financeiro pessoal de alto padrão, **100% Local-First** e **orientado a arquivos portáveis (JSON)**.

---

[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![AI-Powered](https://img.shields.io/badge/AI--Powered-FF6F61?style=for-the-badge&logo=google&logoColor=white)](https://github.com/google-gemini/gemini-cli)
[![Local-First](https://img.shields.io/badge/Local--First-0052CC?style=for-the-badge&logo=databricks&logoColor=white)](#-arquitetura-local-first)

</div>

---

## 🤖 Showcase de Desenvolvimento com IA (Agentic & TDD)

O **FinJSON Pro** é muito mais do que apenas uma carteira de despesas: ele foi **desenvolvido integralmente por Agentes de Inteligência Artificial de Engenharia de Software (Gemini CLI)** sob o modo **Auto-Edit**. 

Este projeto atua como um repositório demonstrativo de excelência na interação máquina-código, aplicando práticas de ponta em engenharia cognitiva:
- **Test-Driven Development (TDD) Autônomo:** Toda a inteligência de negócios, cálculos de fechamento de faturas em meses curtos (como Fevereiro) e travas de retroatividade foram escritos e validados por **29 testes unitários estritos** executados sob o Vitest antes de qualquer renderização de interface.
- **Integração de Skills Especializadas:** O agente de desenvolvimento utilizou e ativou habilidades (skills) modulares especializadas (como `ui-ux-pro-max`, `javascript-pro`, `clean-code` e `readme-wizard`) para projetar os fluxos com consistência de dados, prevenção de injeção XSS e design semântico.
- **Higienização Visual de UI/UX:** A interface do aplicativo segue regras de design rigorosas. Não há uso de emojis em botões e menus principais (apenas SVGs inline), as transições de microinterações de hover duram entre `150-300ms` sem alterar a altura ou deslocamento físico de outros elements no DOM, e o layout herda classes responsivas com alinhamento pixel-perfect.

---

## 🎯 Objetivo do Projeto

O objetivo principal do **FinJSON Pro** é dar ao usuário **soberania absoluta sobre os seus dados financeiros**. 

Na era dos SaaS por assinatura e vazamentos de dados, o aplicativo propõe um ecossistema **Local-First puro**:
1. **Nenhum Servidor / Sem Conta:** A aplicação roda 100% localmente no navegador (`client-side`). Não há servidores adicionais, bancos de dados em nuvem ou requisições REST pela rede.
2. **Navegador como Banco de Dados:** Toda a persistência de configurações, metas, cartões e lançamentos utiliza a chave `finjson_db` sob o `LocalStorage` do próprio navegador.
3. **Seus dados no seu Drive:** Suas finanças pertencem a você. O sistema é baseado em um fluxo físico de **Exportar/Importar backups em formato JSON portátil**. Ao final do dia, você exporta o arquivo e o guarda na sua pasta do Google Drive, Dropbox, ou pen drive de forma portátil.

---

## 🌟 Diferenciais da Arquitetura V3

- **Lançamentos Mensais Recorrentes Inteligentes:** Você configura suas contas (despesas) e recibos (receitas) uma única vez. Ao visualizar qualquer mês no futuro, o processador automático gera os lançamentos de forma transparente no dia agendado.
- **Ajuste Automatizado de Calendário (O "Efeito Fevereiro"):** Lógicas matemáticas refinadas garantem que compras em cartões com fechamento próximo ao fim do mês (como dia 28) caiam na fatura certa mesmo durante meses curtos como Fevereiro (desviando o dia da compra para o dia 1º do mês corrente para evitar furos).
- **Proteção de Retroatividade:** O cadastro de novas recorrências armazena o mês de criação (`start_month`), garantindo que o seu histórico e relatórios de meses anteriores nunca sejam alterados por regras criadas no presente.
- **Poupados Isolados e Controle de Metas:** Guarde dinheiro para metas de poupança no painel de **Reservas Ativas**. Depósitos podem ser marcados para ignorar o saldo principal, registrando o progresso da meta sem inflar ou descontar o fluxo de caixa regular.
- **Visual "Midnight Slate" Premium:** Uma interface esteticamente elegante e luxuosa inspirada em designs industriais escuros modernos.

---

## 🏛️ Estrutura do Repositório

```text
FinJSON/
├── docs/                 # Documentos de especificação técnica e planos de dados
│   ├── README-PT.md      # Documentação do projeto em Português
│   ├── plano-estrutura-json.md
│   ├── plano-main-js.md
│   └── plano-store-js.md
├── public/               # Ativos estáticos públicos (Favicons, ícones)
│   ├── favicon.svg       # Ícone de cabeçalho do navegador (Vetor)
│   └── icons.svg         # Biblioteca de ícones vetoriais adicionais
├── src/
│   ├── lib/
│   │   ├── store.js      # CORE DATABASE ENGINE: Lógica LocalStorage, faturas e processamento
│   │   ├── store.test.js # SUÍTE DE TESTES: 29 testes unitários validando a engine no Vitest
│   │   └── ui-helpers.js # UI HELPERS: Sanitização anti-XSS, formatação e layout de células
│   ├── main.js           # ORQUESTRADOR UI: Renderização das views (Onboarding, Painel, Mensais, Reservas)
│   └── style.css         # ESTILO: Dark theme, grid layouts, classes responsivas e micro-animações
├── index.html            # Estrutura HTML única com SVGs inline e esqueleto do cabeçalho
├── package.json          # Dependências exclusivas de desenvolvimento (Vite + Vitest)
├── vite.config.js        # Configurações de porta estática do Vite
└── GEMINI.md             # Instruções consolidadas e diretrizes de desenvolvimento
```

---

## 🚀 Como Executar o Projeto Localmente

Você precisará apenas do **Node.js** instalado na sua máquina para subir o servidor estático do Vite durante o desenvolvimento:

### 1. Instalar as dependências
Abra o terminal na raiz do projeto e execute:
```bash
npm install
```

### 2. Iniciar o Servidor de Desenvolvimento
Para rodar a aplicação localmente, execute o comando:
```bash
npm run dev
```

O console exibirá o link de acesso local:
```text
  VITE v8.1.4  ready in 106 ms

  ➜  Local:   http://localhost:5173/
```
Abra **[http://localhost:5173/](http://localhost:5173/)** no seu navegador para utilizar o sistema.

### 3. Rodar a Suíte de Testes (Vitest)
Para executar a suíte completa de **29 testes unitários** que validam a consistência matemática e financeira:
```bash
npm test
```

### 4. Gerar Build de Produção
Para compilar a aplicação em arquivos HTML/CSS/JS estáticos otimizados (prontos para serem hospedados de graça em plataformas como Vercel, Netlify ou GitHub Pages), execute:
```bash
npm run build
```
Os arquivos prontos serão gerados na pasta `/dist`.

---

## 🎮 Guia de Uso e Importação/Exportação

1. **Primeiro Acesso (Onboarding):**
   * Ao abrir a página pela primeira vez, o sistema detectará que o banco local está vazio e exibirá uma tela de onboarding em modo escuro.
   * **Iniciar do Zero:** Clique nesta opção para criar uma carteira limpa pré-carregada com 7 categorias básicas utilizando melhores práticas financeiras (Salário, Renda Extra, Despesas Fixas, Alimentação, Serviços, Lazer e Cuidados Pessoais).
   * **Restaurar Backup:** Selecione ou arraste um arquivo de backup `db.json` gerado anteriormente para continuar de onde parou.
2. **Operações Diárias:**
   * Cadastre receitas ou despesas preenchendo o formulário. O sistema calcula automaticamente o Saldo Líquido, Receitas e Despesas totais do mês selecionado.
   * Cadastre despesas e receitas recorrentes na aba **"Mensais"** (marcando-as em contas de saldo ou cartões de crédito). O sistema se encarrega de preencher os meses seguintes para você.
   * Guarde ou resgate dinheiro do painel de **Reservas Ativas** para acompanhar o progresso de suas metas de poupança com barras visuais dinâmicas.
3. **Transportando seus Dados:**
   * Ao final do dia ou quando desejar fazer um backup, clique no botão **"Exportar Dados"** no canto superior direito do cabeçalho.
   * O navegador iniciará o download de um arquivo `finjson_backup_YYYY-MM-DD.json`. Guarde este arquivo em um local seguro (no seu Google Drive ou Dropbox) e use-o para carregar seus dados em qualquer outro computador ou celular.

---

## 🔒 Licença

Este projeto é open-source e livre para fins de estudo, organização financeira pessoal e demonstração de práticas de engenharia de software baseadas em IA.

---

<div align="center">

*Desenvolvido com excelência técnica em uma colaboração Humano-Agente.* 🚀

</div>