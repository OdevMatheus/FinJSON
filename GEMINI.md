# Finjson - Diretrizes de Desenvolvimento e Contexto do Projeto

Este arquivo serve como contexto de instrução definitivo para todos os agentes inteligentes e engenheiros de software que interagirem com este repositório. Siga rigorosamente as diretrizes e padrões arquiteturais documentados abaixo.

---

## 🎯 Visão Geral do Projeto

O **Finjson** é um gerenciador financeiro pessoal de alto padrão, projetado no formato **Single Page Application (SPA) Local-First**. 

### Princípios de Arquitetura:
1. **Zero Backend:** A aplicação roda 100% no lado do cliente (client-side). Não há servidores Node, APIs REST de rede ou conexões a bancos de dados remotos para operações principais.
2. **Navegador como Banco de Dados (`LocalStorage`):** Toda a persistência é feita localmente no navegador do usuário sob a chave `finjson_db` no `LocalStorage`.
3. **Mapeamento de Dados Portável (JSON):** A estrutura de dados é um arquivo JSON modular contendo metadados de controle de versão (`_metadata`) e quatro coleções de dados principais (`categories`, `credit_cards`, `transactions`, `reserves`, `monthly_summaries`).
4. **Inicialização "Clean Slate" (Pura):** Ao clicar em "Iniciar do Zero", o banco de dados é inicializado completamente limpo, contendo exatamente zero lançamentos, zero cartões de crédito e zero metas de poupança. Apenas as taxonomias de categorias estruturais básicas sob `categories` são pré-carregadas.
5. **Velocidade Instantânea:** Como os cálculos, agrupamentos e filtros ocorrem na memória RAM local, a aplicação responde sem latência de rede.

---

## 🛠️ Comandos de Construção e Execução

As tarefas de empacotamento, servidor local e testes unitários são gerenciadas pelo **Vite** e **Vitest**.

- **Instalar Dependências:**
  ```bash
  npm install
  ```
- **Iniciar Servidor de Desenvolvimento:**
  ```bash
  npm run dev
  ```
  *O servidor roda localmente na porta padrão:* `http://localhost:5173/`

- **Executar Suíte de Testes (Vitest - Rodar uma vez):**
  ```bash
  npm test
  ```
- **Executar Testes em Modo Interativo (Watch):**
  ```bash
  npx vitest
  ```

- **Compilar para Produção (Build Estático):**
  ```bash
  npm run build
  ```
  *Compila e otimiza os arquivos para HTML/CSS/JS estáticos puros na pasta `/dist`.*

- **Visualizar o Build de Produção:**
  ```bash
  npm run preview
  ```

---

## 🏛️ Estrutura de Diretórios e Escopo de Arquivos

```text
Finjson/
├── docs/                 # Documentos de especificação técnica e planos de dados
├── public/               # Ativos estáticos públicos
│   ├── favicon.svg       # Ícone de cabeçalho do navegador (Vetor)
│   └── icons.svg         # Ícones públicos adicionais
├── src/
│   ├── lib/
│   │   ├── store.js      # CORE DATABASE ENGINE: Controla LocalStorage, faturas e cálculos de resumo
│   │   └── store.test.js # SUÍTE DE TESTES: 23 testes unitários validando o store no Vitest
│   ├── main.js           # ORQUESTRADOR UI: Liga as ações de tela às atualizações do DOM e à store
│   └── style.css         # ESTILO: Dark theme premium, layouts grids responsivos e tokens de design
├── .gitignore            # Configurações para ignorar node_modules e pastas de compilação (/dist)
├── index.html            # Estrutura HTML única com SVGs inline e esqueleto do cabeçalho
├── package.json          # Dependências exclusivas de desenvolvimento (Vite + Vitest)
├── vite.config.js        # Configurações de porta estática do Vite
└── GEMINI.md             # Este arquivo de instruções para agentes inteligentes (SOT definitivo)
```

---

## 🚨 Convenções de Código e Regras Arquiteturais

Qualquer modificação ou acréscimo de telas na aplicação **DEVE** seguir estes critérios fundamentais de engenharia de software:

### 1. Mandato Local-First
- **NUNCA** adicione requisições `fetch()` de rede ou configure rotas de backend Express para o fluxo principal de dados. 
- Toda a lógica de armazenamento, cálculo de somatórios mensais, faturas de cartão e transição de estados de poupança devem ser codificados exclusivamente na engine `/src/lib/store.js` e mantidos em `window.localStorage`.

### 2. Geração de Identificadores Únicos
- Não utilize pacotes npm externos como `uuid` no frontend. Utilize a API nativa de alta performance e criptograficamente segura do próprio navegador:
  ```javascript
  const id = `tx-${crypto.randomUUID()}`;
  ```

### 3. Ciclo de Faturamento de Cartões de Crédito
- **Calculo de Faturas Dinâmico:** Uma compra no crédito no dia `day` pertence à fatura de `YYYY-MM` do próprio mês se `day <= closing_day` do cartão selecionado. Se `day > closing_day`, pertence à fatura de `YYYY-MM + 1 mês` (mês seguinte). O vencimento correspondente sempre cai no dia `due_day` do mês subsequente ao mês da fatura calculada.
- **Simulação em Tempo Real:** No formulário de transações, ao selecionar cartão de crédito, utilize o helper `calculateInvoiceAndDueDate` em `src/lib/ui-helpers.js` para alertar o usuário dinamicamente em qual fatura e em qual dia a cobrança será cobrada antes que ele confirme o envio.

### 4. Gestão de Reservas e Aportes Isolados
- **Saldo de Metas Dinâmico:** O saldo atual de qualquer objetivo financeiro (`current_amount`) **NÃO** deve ser salvo de forma persistente. Ele deve ser sempre computado em runtime somando todos os aportes e subtraindo os saques da reserva correspondente.
- **Aportes Isolados do Fluxo Mensal:** No formulário de depósitos, caso o usuário selecione a opção de "Ignorar Saldo" (`ignore_balance: true`), o sistema deve registrar a movimentação normalmente na reserva para fins de meta, mas **NÃO** deve contabilizá-la ou descontá-la do somatório mensal de poupados (`saved` do mês) no balanço líquido.

### 5. Padrão Estético "UI/UX Pro Max"
- **Regra de Emojis:** **NÃO use emojis** (como 💰, 💼, 🗑️) como ícones primários de interface. Sempre utilize inline SVGs limpos no padrão Lucide ou Heroicons para botões, menus e cabeçalhos.
- **Transições Suaves:** Mantenha estados de hover estáveis que usem transições de cor ou opacidade com duração de `150-300ms`. Nunca use propriedades de escala ou altura que desloquem o fluxo físico de outros elementos no DOM.
- **Temas e CSS Custom Variables:** A folha de estilo deve se basear estritamente nos tokens de design declarados em `:root` dentro de `src/style.css`:
  - Fundo Geral: `#090d16` (Midnight dark)
  - Cards de Painel: `#111827` (Slate 900)
  - Elementos de Input: `#1f2937` (Slate 800)
  - Cores semânticas claras para Sucesso (Emerald `#10b981`), Perigo (Rose `#f43f5e`), e Informações (Cyan `#06b6d4`).

### 6. Segurança e Higiene de Dados
- **Sanitização contra XSS:** Sempre passe strings digitadas pelo usuário (descrições, nomes de metas) pela função auxiliar `escapeHTML()` antes de inseri-las de forma dinâmica no DOM. Nunca utilize `innerHTML` com variáveis cruas não tratadas.
- **Acessibilidade:** Certifique-se de que todos os inputs de formulário tenham marcações semânticas de rótulo `<label for="...">` correspondentes, e que botões que contenham apenas ícones possuam tags `aria-label` descritivas para leitores de tela.

### 7. Práticas de Teste (TDD com Vitest)
- **Cálculos Puros:** Todas as funções matemáticas e computacionais em `store.js` devem preferencialmente operar como funções puras que aceitam o estado `db` como argumento. Isso permite testabilidade imediata sem dependências de estado global ou de I/O.
- **Mock de LocalStorage:** Utilize o mock leve em memória declarado no topo de `store.test.js` para simular o comportamento de armazenamento do navegador perfeitamente em ambientes de terminal Node.js.
- **Não Romper Build Verde:** Sempre execute `npm test` antes de commitá-lo. O repositório conta com **23 testes unitários estritos** cobrindo todas as faturas, limites, recálculos de datas cruzando linhas mensais e fluxos destrutivos. Mantenha a taxa de sucesso sempre em 100%!
