# Source-to-Target Migration Matrix

This matrix is the confirmed implementation record for the connected repository and both supplied archives; each adopted archive pattern below is present in the managed project files named in the tables.

The connected repository and supplemental archive were audited as source materials. The managed application preserves the requested public route contract while replacing TanStack Start server functions with tRPC procedures and a managed streaming endpoint.

| Original source area | Target module or implementation | Integration status |
| --- | --- | --- |
| `routes/index.tsx` | `client/src/pages/Home.tsx` | Migrated into the markets-search landing experience. |
| `routes/stock.$symbol.tsx` | `client/src/pages/StockDetail.tsx` | Migrated into `/stock/:symbol` with quote, chart, statements, analyst, event, and news views. |
| `routes/compare.tsx` | `client/src/pages/Compare.tsx` | Migrated into `/compare` with side-by-side metrics. |
| `routes/chat.tsx` and `routes/api/chat.ts` | `client/src/pages/Chat.tsx`, `server/chat.ts`, and `server/chatStream.ts` | Migrated into multi-turn streaming AI research. |
| `components/finance/SiteHeader.tsx` | `client/src/components/finance/SiteHeader.tsx` | Migrated with routing, search, and theme controls. |
| `TickerAutocomplete`, `PriceChart`, `TradingViewResearchChart`, `DeltaBadge`, `Sparkline` | Matching `client/src/components/finance/*` files | Migrated as reusable market UI primitives. |
| Finance card and stat widgets | `client/src/pages/Home.tsx` and `StockDetail.tsx` | Consolidated into responsive dashboard panels and metrics. |
| `DashboardShell`, `QuoteTable`, `AIView`, `IndustryHeatmap`, tables, views, tool views | Matching `client/src/components/dashboard/*` files | Migrated as the dashboard layer. |
| `ArtifactPanel`, `HtmlPreview`, `Markdown`, `Mermaid`, artifact types | Matching `client/src/components/chat/*` files | Migrated into the assistant and artifact workspace. |
| `format`, `finance-types`, `finance-normalize`, `sector-normalize`, `sector-universe`, `markets`, and `universe` | Matching `client/src/lib/*` files | Migrated as typed client-side helpers. |
| `finance-data.server.ts` and `finance.functions.ts` | `server/finance.ts` and the `finance` tRPC router | Rebuilt with normalized Yahoo Finance-compatible calls, validation, and caching. |
| `ai-gateway.server.ts`, chat diagnostics, and model functions | `server/chat.ts`, `server/chatStream.ts`, and managed LLM integration | Rebuilt with server-only managed credentials, bounded finance tools, and streamed response events. |
| `styles.css` | `client/src/index.css` | Rebuilt as the original dark/light direction with an institutional research-terminal visual system. |

## Supplied archive integration

| Archive | Selected reusable source | Managed-project integration |
| --- | --- | --- |
| `21st-main.zip` | `components/ui/card.tsx` card hierarchy | Adapted as `client/src/components/ui/research-card.tsx` and used by the AI research view for a consistent card contract. |
| `How to Access My GitHub Account_.zip` | `loading-state.tsx` accessibility and live-data treatment | Adapted as `client/src/components/ui/loading-state.tsx` for use in finance loading states. |
| Supplemental archive | Newer finance, chat, dashboard, route, utility, test, and style files | Compared against the connected repository as documented during audit; the controlled migration uses its relevant additions and preserves the requested filenames and routes. |
