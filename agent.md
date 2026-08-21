# Insightful Search — Agent Guide

## Purpose and architecture

Insightful Search is a server-rendered finance research terminal built with **TanStack Start, React, TypeScript, Vite, TanStack Router, and TanStack Query**. The product provides market dashboards, provider-backed sector and industry research, screeners, stock detail pages, comparison tools, AI-assisted research, and cloud-synced user state.

| Area | Primary location | Responsibility |
|---|---|---|
| Application routes | `src/routes/` | Dashboard route, stock detail, and tool pages. |
| Dashboard shell | `src/components/dashboard/DashboardShell.tsx` | Sidebar, top header, market selection, search, command palette, and responsive navigation. |
| Dashboard views | `src/components/dashboard/views.tsx` | Markets, watchlist, news, alerts, and settings views. |
| Sector tools | `src/components/dashboard/tool-views.tsx` | Sector research, movers, screeners, and economic-calendar tools. |
| Stock lists | `src/components/dashboard/QuoteTable.tsx` and `tables.tsx` | Compact quote cards, data tables, and stock-detail navigation. |
| Market data | `src/lib/finance-data.server.ts` | Normalization and provider-backed data retrieval. |
| Shared styling | `src/styles.css` | Terminal tokens, responsive rules, heatmap, cards, and stock-detail layout. |

## Current interaction contract

The market dashboard treats **provider data as authoritative**. Preserve clear loading, empty, partial-coverage, and error states; do not replace an incomplete live response with fabricated metrics. Sector and industry requests should retain all available rows rather than applying arbitrary display caps.

The sector heatmap is a capitalization-weighted treemap. Its tile area reflects available sector market capitalization and its color reflects one-day movement. Every tile is keyboard-accessible and selectable. Selecting a sector shows a concise detail panel below the map. For narrow tiles, labels may switch to the supplied vertical-label treatment rather than overlap or truncate important text.

The watchlist is a single sector-filterable stock list. Keep its horizontal sector filter menu, and do not reintroduce separate industry-group tables. Symbol cells in `DataTable` and stock cards must navigate to `/stock/$symbol`. The India Equities view intentionally uses compact stock cards **without** the duplicate mobile detail rail below them; other list contexts may expose that rail when secondary quote metrics need to remain reachable.

## Responsive design rules

The interface is mobile-first. On phones, the dashboard shell must not create page-level horizontal scrolling; content regions that hold dense data require `min-width: 0` and controlled overflow. Stock research charts and metric panels must remain readable at the device viewport without browser zoom. Preserve the responsive stock-detail shell rules in `styles.css` when extending cards, charts, or side panels.

The header prioritizes actions in this order: collapse/menu, search, market selector, refresh, then an explicit status badge. The US/India selector stays visible at the right edge on phones with compact labels. The market state must use explicit text such as **Market open** or **Market closed** with the matching green or red treatment; do not reduce it to an unlabeled dot. Hide nonessential breadcrumbs on small screens before removing primary controls.

## Implementation conventions

Use existing components before adding replacements. Reuse `QuoteTable` for quote-card collections and `DataTable` for tabular research surfaces. Preserve `Link`-based navigation rather than manual `window.location` changes. For data-driven UI, stabilize object and array inputs with `useMemo` or state before passing them to query hooks.

Avoid static mock financial data, fabricated reviews, and misleading equal-sized heatmap tiles. Keep API credentials out of source, browser state intended for sync, and documentation. Provider keys remain local to the browser-side settings flow; cloud state is reserved for non-sensitive preferences and user workspace data.

## Validation and release checklist

Run the following commands from the project root after application-code changes:

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Verify the primary dashboard, Watchlist, Sectors, and a stock detail page at desktop and phone breakpoints. For interaction changes, check the loading states as well as populated states. Update `todo.md` before implementation, mark the item complete immediately after validation, read the tracker before release, and save a checkpoint. A successful checkpoint publishes this autoscaled project and is the release record for the connected deployment.

## Recent baseline

The current baseline includes a clean selectable sector heatmap, a unified sector-filterable watchlist, direct stock navigation from data lists, expanded industry coverage, a phone-safe stock detail layout, simplified header controls, and card-only India Equities presentation. Retain these decisions unless a future user request explicitly supersedes them.
