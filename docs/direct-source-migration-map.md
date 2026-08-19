# Direct GitHub Source Migration Map

The connected repository contains a TanStack Start application. The managed project uses React, Wouter, tRPC, and an Express runtime. Source files that are framework-neutral will be ported directly with import-path normalization. Source files that depend on TanStack Start server functions, TanStack Router, or the repository’s local AI gateway require mechanical adapters while retaining their source behavior and user-facing layout.

| Source area | Source files | Managed destination | Migration treatment |
| --- | --- | --- | --- |
| Application shell | `routes/__root.tsx`, `router.tsx`, `start.ts`, `server.ts` | `client/src/App.tsx`, `client/src/main.tsx`, `server/_core/index.ts` | Adapt framework bootstrap and providers; preserve routes and global style loading. |
| Public routes | `routes/index.tsx`, `stock.$symbol.tsx`, `compare.tsx`, `chat.tsx` | `client/src/pages/{Home,StockDetail,Compare,Chat}.tsx` | Direct port of markup, state, and interaction behavior; replace router/server hook calls with Wouter and tRPC equivalents. |
| Terminal dashboard | `components/dashboard/*` | `client/src/components/dashboard/*` | Direct port where data props are framework-neutral; replace app-state provider and server-function calls with managed query props and routes. |
| Finance UI | `components/finance/*` | `client/src/components/finance/*` | Direct port with Wouter navigation and managed finance query usage. |
| Chat UI | `components/chat/*`, `components/ui/ai-chat-input.tsx` | matching managed client paths | Direct port of rendering and interaction; bind the prompt transport to `/api/chat/stream`. |
| Utility libraries | `lib/finance-types.ts`, `format.ts`, `finance-normalize.ts`, `markets.ts`, `sector-normalize.ts`, `sector-universe.ts`, `universe.ts` | matching `client/src/lib/*` | Direct port and retain source tests where compatible. |
| Client state | `lib/app-state.tsx` | `client/src/contexts/AppStateContext.tsx` | Port local state model and use it in dashboard views. |
| Finance data server | `finance-data.server.ts`, `finance.functions.ts` | `server/finance.ts`, `server/routers.ts` | Preserve Yahoo Finance behavior through the existing managed tRPC adapter and add missing source contracts. |
| AI server | `ai-gateway.server.ts`, `models.functions.ts`, `routes/api/chat.ts` | `server/chat.ts`, `server/chatStream.ts`, `server/routers.ts` | Preserve prompts, tool semantics, diagnostics, and streaming contract using managed LLM credentials. |
| Source styling | `styles.css` | `client/src/index.css` plus source-compatible style modules | Port terminal/light/paper tokens and shared utilities; preserve managed responsive rules where needed. |
| UI primitives | `components/ui/*` | existing `client/src/components/ui/*` | Replace managed copies with source equivalents only where source-specific UI behavior is used. |

The migration excludes only generated routing output (`routeTree.gen.ts`) and Lovable-specific reporting files. These have no product-facing behavior and are replaced by the managed framework’s routing and runtime facilities.
