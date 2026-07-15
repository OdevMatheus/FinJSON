# FinJSON Pro V3 - Gestão Financeira Local-First 💰

O **FinJSON Pro** é um gerenciador de finanças pessoais elegante, moderno e **100% Local-First**. Esta aplicação foi desenvolvida no formato **SPA (Single Page Application)**, rodando exclusivamente no seu navegador com máximo desempenho e privacidade absoluta.

---

## 🌟 Diferenciais da Arquitetura V3 (Local-First)

- **Sem Backend / Instalações Complexas:** Você não precisa de servidores adicionais, bancos de dados externos ou Docker. Basta rodar o servidor estático e usar!
- **Privacidade Absoluta:** Seus dados financeiros pertencem apenas a você. Nenhum dado sai do seu computador; toda a persistência é feita localmente no `localStorage` do seu próprio navegador.
- **Portabilidade Total (Móvel & Reutilizável):** O sistema é totalmente orientado a um arquivo JSON portátil. Você pode exportar seus dados a qualquer momento como um backup físico (`db.json`) e importá-lo em qualquer outro dispositivo para restaurar instantaneamente seu histórico completo.
- **Performance Instantânea:** Por rodar integralmente em memória local, todos os cálculos de saldos, lançamentos, deduções e relatórios ocorrem instantaneamente, sem qualquer lentidão ou latência de rede.

---

## 🛠️ Tecnologias Utilizadas

- **Bundler & Servidor Local:** [Vite](https://vite.dev/) (Rápido e leve).
- **Linguagem:** Vanilla JavaScript (utilizando ES Modules e recursos modernos do navegador como `crypto.randomUUID()` para geração de IDs criptograficamente seguros).
- **Estilização:** CSS3 Puro (Custom CSS variables para o Dark Theme premium, layout flexível com CSS Grid e transições fluidas).
- **Ícones:** Vetoriais Inline (SVGs limpos no padrão Lucide).
- **Persistência:** `window.localStorage` do navegador com estruturas de cache de performance para balanços mensais.

---

## 🚀 Como Executar o Projeto Localmente

Você precisará apenas do **Node.js** instalado na sua máquina para subir o servidor estático do Vite durante o desenvolvimento:

### 1. Instalar as dependências do Vite
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

### 3. Gerar Build de Produção
Para compilar a aplicação em arquivos HTML/CSS/JS estáticos otimizados (prontos para serem hospedados de graça em plataformas como Vercel, Netlify ou GitHub Pages), execute:
```bash
npm run build
```
Os arquivos prontos serão gerados na pasta `/dist`.

---

## 📂 Estrutura Simplificada do Repositório

```text
FinJSON/
├── public/               # Ativos estáticos (favicons, manifestos)
├── src/
│   ├── lib/
│   │   └── store.js      # ENGINE: Controla banco local (LocalStorage, UUIDs e cálculos)
│   ├── main.js           # Orquestrador UI: Conecta a LocalStore às visualizações do DOM
│   └── style.css         # Dark Theme premium responsivo e efeitos visuais
├── .gitignore            # Configurações para ignorar builds e pastas de dependências
├── index.html            # Estrutura HTML5 com SVG inlines e telas de Onboarding
├── package.json          # Dependência de desenvolvimento exclusiva do Vite
├── vite.config.js        # Configuração nativa de porta do Vite
└── README.md             # Documentação do projeto
```

---

## 🎮 Guia de Uso e Importação/Exportação

1.  **Primeiro Acesso (Onboarding):**
    *   Ao abrir a página pela primeira vez, o sistema detectará que o banco local está vazio e exibirá uma tela de onboarding em modo escuro.
    *   **Criar Novo Banco:** Clque nesta opção para criar uma carteira limpa pré-carregada com categorias básicas (Trabalho, Alimentação, Lazer, Investimentos, Essenciais) e uma meta inicial de Reserva de Emergência.
    *   **Restaurar Backup:** Selecione ou arraste um arquivo de backup `db.json` gerado anteriormente para continuar de onde parou.
2.  **Operações Diárias:**
    *   Cadastre receitas ou despesas preenchendo o formulário. O sistema calcula automaticamente o Saldo Líquido, Receitas e Despesas totais do mês selecionado.
    *   Guarde ou resgate dinheiro do painel de **Reservas Ativas** para acompanhar o progresso de suas metas de poupança com barras visuais dinâmicas.
    *   Filtre todos os dados selecionando o mês de trabalho no seletor de período no topo.
3.  **Transportando seus Dados:**
    *   Ao final do dia ou quando desejar fazer um backup, clique no botão **"Exportar Dados"** no canto superior direito do cabeçalho.
    *   O navegador iniciará o download de um arquivo `financehub-backup.json`. Guarde este arquivo em um local seguro ou use-o para carregar seus dados em outro computador/navegador usando o botão de **"Importar Backup"**.

---

## 🔒 Licença

Este projeto é open-source e livre para fins de estudo e organização financeira pessoal.
