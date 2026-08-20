# Insightful Search

**Insightful Search** is a market-research terminal for exploring listed securities, screening markets, tracking watchlists, and turning live market data into research briefs. It is built as a responsive React and TanStack Start application with server-side market-data adapters, optional model-provider integrations, and account-backed cloud sync.

> Market data can be delayed, incomplete, or unavailable for some instruments. The application provides research information only and does not constitute investment advice.

## Product capabilities

<!-- prettier-ignore -->
| Area | What it provides |
| --- | --- |
| **Markets dashboard** | Market snapshots, gainers, losers, active symbols, sector and industry coverage, and regional market context. |
| **Stock research** | Live quotes, price history, company ratios, financial statements, analyst targets and recommendations, events, corporate actions, ownership, and news. |
| **Screeners** | Predefined and custom equity/ETF screeners, saved presets, filterable results, and scheduled screener-match inbox notifications. |
| **AI Analyst** | Persistent, multi-turn research chats with model selection, markdown tables, Mermaid diagrams, HTML artifacts, retry controls, and “Research with AI” handoffs from relevant pages. |
| **Ticker-backed analyst briefs** | Explicit ticker questions such as `AAPL` or `RELIANCE.NS` reuse the same normalized quote, analyst, financial, and news data sources as the stock detail page. This provides a grounded analyst brief directly in the chat UI. |
| **Personal workspace** | Watchlists, watch folders, price alerts, saved screeners, themes, market preferences, chat history, browser-notification permission, and a cross-device screener-match inbox. |
| **Cloud account** | Optional account registration and sign-in, email-based one-time password recovery, signed-in password changes, secure cookie sessions, and cloud-synced non-sensitive workspace state. Provider API keys remain local to the browser. |

## Technology overview

The application uses React 19, TanStack Start and TanStack Router for the UI and server routes, TanStack Query for data loading, Tailwind CSS for styling, Vitest for unit tests, and Nitro/Vite for the production build. Market data is normalized in `src/lib/finance-data.server.ts`; interactive research is handled by `src/routes/api/chat.ts`.

## Getting started

Use a current Node.js 22 installation and pnpm.

```sh
git clone <repository-url>
cd insightful-search-deployed
pnpm install
pnpm dev
```

The development server will print the local preview URL. Open it in a browser and choose **AI Analyst** from the sidebar to start a research chat.

## Configuration

The application works best with a database for cloud accounts and a configured AI provider for general-purpose research. Individual provider keys can also be entered in the application settings; they are kept in browser-local storage rather than cloud-synced state.

<!-- prettier-ignore -->
| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | For accounts and cloud sync | MySQL-compatible connection string used for accounts, encrypted-session metadata, and cloud workspace state. |
| `RESEND_API_KEY` | For email flows | Resend credential used for password-recovery messages. |
| `EMAIL_FROM` | With Resend | Verified sender address for transactional account email. |
| `OPENROUTER_API_KEY` | Optional | Server-side OpenRouter access for AI research and model discovery. |
| `KILO_API_KEY`, `GROQ_API_KEY`, `TOGETHER_API_KEY`, `DEEPSEEK_API_KEY`, `OPENCODE_ZEN_API_KEY` | Optional | Alternative server-side providers for AI research. |
| `TINYFISH_API_KEY` | Optional | Enables web-source search within AI research responses. |

Never commit credentials. Use your hosting platform’s secret-management interface for production values.

## AI Analyst behavior

The AI Analyst accepts focused questions about companies, sectors, indices, ETFs, screeners, and market activity. For general research, it uses the selected configured provider and can call dedicated market-data tools. Ask for an explicit ticker when you need a stock-page-backed brief, for example:

```text
Give me an analyst overview and valuation for AAPL.
Compare the live fundamentals of RELIANCE.NS and TCS.NS.
```

For a single explicit ticker, the chat uses the same live summary, analyst coverage, annual income statement, and headlines feeds as the stock page. The response includes price context, analyst recommendation and targets, rating distribution, selected fundamentals, and recent headlines without changing the chat interface.

## Development commands

<!-- prettier-ignore -->
| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local development server. |
| `pnpm test` | Run the Vitest unit test suite. |
| `pnpm lint` | Run ESLint across the project. |
| `pnpm build` | Run the managed production build bridge and generate the deployable Node entrypoint and client assets. |
| `pnpm build:vercel` | Generate the Vercel-native Nitro build output. |
| `pnpm preview` | Start a local Vite preview when a preview build is available. |

## Project structure

```text
src/
  components/       Reusable dashboard, finance, research, chat, and UI components
  hooks/            Client hooks, including screener-alert state
  lib/              Market adapters, AI gateway, cloud state, model catalog, and utilities
  routes/           File-based UI routes and server API handlers
scripts/
  build-deployment.mjs  Production build bridge for managed hosting
```

The primary product routes are the dashboard at `/`, stock details at `/stock/$symbol`, the standalone chat view at `/chat`, and the AI dashboard view at `/?view=ai`.

## Validation and release

Before opening a pull request or saving a release checkpoint, run:

```sh
pnpm test
pnpm lint
pnpm build
```

The production build prepares `dist/index.js` as the Node HTTP entrypoint and mirrors browser assets to `dist/public` for the managed hosting pipeline.

## Contributing

Keep data adapters server-side, do not expose provider secrets in client code, and add focused Vitest coverage whenever market normalization, cloud-state handling, or AI request behavior changes. Preserve existing shared-project changes and avoid modifying generated route files by hand.
