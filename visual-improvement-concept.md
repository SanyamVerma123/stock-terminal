# Visual Improvement Concept: Insightful Search

## Design position

The product should evolve toward a **refined market workstation**, not a generic SaaS dashboard. Its strongest existing assets are the persistent research sidebar, live price semantics, warm paper theme, terminal theme, data tables, and AI Analyst. The upgrade should make the information hierarchy feel more intentional while protecting scan speed, numeric legibility, and the distinction between live market data and analysis.

> **Recommended direction:** retain the current paper and terminal themes, then add a stronger hierarchy of market context, research focus, and actionability. Use genuine market data for all charts; reserve generated or photographic imagery for empty states, onboarding, and restrained atmosphere only.

## The three highest-value visual upgrades

| Priority | Visual upgrade | Where it belongs | Why it helps | 21st.dev starting point |
| --- | --- | --- | --- | --- |
| 1 | **Market pulse band** | Top of Markets, Screeners, and stock detail pages | Replaces a plain title with a compact region switcher, live-market status, index micro-sparklines, and a “last refreshed” indicator. It makes the terminal feel live before a user reads a table. | [Statistics Card 1][2] and [Area Chart][3] |
| 2 | **Research KPI mosaic** | Stock pages and the AI Analyst landing state | A 2×2 or 4×1 tile system for price, day change, market cap, analyst target, and earnings date. Use one dominant tile and three quieter support tiles instead of identical cards. | [Efferd Dashboard 2][1] and [KPI Card][4] |
| 3 | **Screener intelligence canvas** | Daily movers, Pro Screener, saved screens, ETF Screener | Place a compact heat map or distribution ribbon above results, add filter pills with result counts, and give the first row a clear “why it surfaced” annotation. This removes the feeling of a raw table without hiding precision. | [Dashboard components][5] and [Charts & Data Viz][6] |

## Recommended visual system

### 1. Market pulse band

Create a thin, responsive strip under the page title. On desktop, place region selection, market-open status, three small index cards, and a refresh timestamp in one line. On mobile, allow it to wrap into a two-row control surface. Each index card should contain only a label, a value, a compact sparkline, and a positive/negative delta.

The current dashboard already provides the raw ingredients: region choice, market strip data, and live-update status. The improvement is **composition**, not new data collection. The [Efferd Dashboard 2][1] example is useful for its dense KPI grouping, but its business-dashboard layout should be adapted rather than copied.

### 2. A real market map, not decorative stock imagery

For the Markets page, make the sector-performance region the main visual anchor. Replace the uniformly weighted sector cards with a treemap-like grid or proportionally sized heat map when market-cap data is present. Keep the existing green/red semantics, add a compact legend, and allow a sector click to open filtered stocks.

This direction is more useful than a hero photograph because it gives users an immediate answer to “where is activity today?” The heat-map reference style in the collected visual research is appropriate for **hierarchy and color restraint**, but the final grid should be built from live data, not an image.

### 3. Stock-page “research sheet” layout

Make each stock page feel like a research report with three visual levels:

| Level | Treatment | Content |
| --- | --- | --- |
| **Hero** | Large price, change, company name, exchange badge, and primary action row | Price, percentage move, session status, follow/watch action |
| **Decision cards** | Four asymmetric tiles; the first is larger | Analyst target gap, valuation, earnings countdown, quality/momentum signal |
| **Evidence rail** | Tabs with visible summary snippets before the table | Chart, financial statement, analyst coverage, ownership, news |

Use restrained borders, one soft shadow level, and a subtle 1px glow on the active data module in terminal mode. Avoid putting gradients behind dense data or using glass effects on tables; they reduce contrast and scanning speed.

### 4. AI Analyst as a research workspace

The AI Analyst should look less like a generic chat app and more like a two-panel research canvas. Keep the existing chat interface but add an optional narrow right rail on desktop for **active ticker**, **source chips**, **key metrics**, and **saved insight** actions. At the beginning of a conversation, show three large prompt cards: “Analyze a ticker,” “Compare two stocks,” and “Find a screen.”

The relevant 21st.dev collection includes a large number of AI chat patterns, and the existing [Chat template][7] demonstrates an interaction structure to borrow selectively. Do not import a full chat template: retain the current streaming, markdown, and data-aware behavior.

### 5. Better state design

The most visible visual weakness in a live-data tool is usually loading and empty states. Use a consistent “market data is arriving” treatment:

* A thin animated line chart skeleton for price modules.
* A six-cell micro-grid skeleton for screeners.
* A clear source-status line such as “Refreshing provider-ranked universe” rather than a generic spinner.
* An empty-state illustration only when there truly is no result; do not place illustrations behind functional tables.

The component gallery offers many loading, progress, and empty-state options, but the terminal needs a small family of **consistent** states instead of varied decorative loaders.[5]

## Optional visual assets

No stock-photo imagery is needed on the core research routes. If you want new visual assets, these are the three safe additions:

| Asset | Best use | Brief | Constraint |
| --- | --- | --- | --- |
| **Abstract market contour** | AI Analyst empty state or onboarding banner | A dark navy and teal contour field with fine grid lines, soft radial glow, no text, and open space for UI copy | Use as a subtle background only; never place behind a table. |
| **Regional market globe** | Global Markets page | A restrained 3D or vector globe with glowing exchange nodes and no labels | Keep it decorative and static; actual geographic metrics remain HTML/data-driven. |
| **Research notebook texture** | Paper theme section divider | Warm off-white paper grain with faint green chart marks, no logos or text | Use below 6% opacity so it does not compete with numbers. |

For generated assets, request **no text** and use them as separate static files. For actual performance, prices, maps, and charts, use React components and live data instead of generated graphics.

## Suggested 21st.dev component shortlist

| Component | Use it for | Adaptation needed |
| --- | --- | --- |
| [Efferd Dashboard 2][1] | Dense KPI grouping and mixed chart/table hierarchy | Replace revenue and billing metrics with market metrics; preserve the existing navigation. |
| [Statistics Card 1][2] | Index summary cards in the market pulse band | Use compact sparklines and positive/negative deltas, not generic growth copy. |
| [Area Chart][3] | Price-history or market-breadth visual treatment | Continue using the application’s existing chart library unless this provides a specific missing interaction. |
| [KPI Card][4] | Analyst target, valuation, or earnings countdown tiles | Use one visual emphasis level per row; do not create a wall of equal cards. |
| [Dashboard collection][5] | Sidebar, card, table, and activity-feed composition references | Copy visual principles, not a whole template. |
| [Data-visualization collection][6] | Heat maps, treemaps, gauges, and compact distribution charts | Keep charts data-driven and accessible, with tooltips and explicit legends. |

## Uploaded 21st.dev source archive

I reviewed the uploaded `21st-main.zip` archive in the project shared files. It is the **full 21st.dev web source repository**, rather than a small drop-in component folder. It includes reusable UI primitives such as `aurora-background`, `command-menu`, `sidebar`, `skeleton`, `skeletons`, `chart`, `scroll-area`, `resizable`, `tabs`, `table`, `tooltip`, `sheet`, and `shimmer-button`, together with template, search, studio, and navigation feature modules.

| Archive component | Best terminal use | Adoption decision |
| --- | --- | --- |
| `aurora-background` | AI Analyst empty state, onboarding, or a low-opacity Global Markets backdrop | **Adapt the visual technique only.** Its full-screen layout and animated gradient should not sit behind market tables. |
| `command-menu` | Expand the existing search command palette with recent symbols, saved screens, and market shortcuts | **Adapt selectively.** The archive implementation depends on Next.js, Clerk, Jotai, and 21st.dev-specific services; this project already has `cmdk`, so reuse the interaction model rather than importing its code. |
| `sidebar` and `studio-navigation` | Improved compact navigation, mobile drawer behavior, and grouped terminal sections | **Borrow structure and motion.** Keep the existing dashboard navigation and route model. |
| `chart`, `table`, `scroll-area`, and `resizable` | More structured research-sheet panels, sortable data modules, and an optional desktop AI research rail | **Use as design references.** Retain the application’s existing chart and table stack unless a specific interaction is missing. |
| `skeleton`, `skeletons`, and `shimmer-button` | Unified live-data loading cards and subtle primary-action feedback | **Most portable candidates.** Recreate the styling with the project’s current Tailwind tokens to avoid dependency duplication. |

> The recommended approach is to **port only isolated markup and visual behavior** into new local components. Do not copy the archive wholesale: several files import Next.js routing, Clerk authentication, Jotai storage, or 21st.dev backend utilities that are not part of this application.

## Component-informed implementation order

| First build | Existing capability to reuse | Uploaded-archive pattern to adapt | User-visible result |
| --- | --- | --- | --- |
| **Market pulse band** | Current market strip and region controls | `chart`, `badge`, `tooltip`, compact sidebar header rhythm | A cleaner live context bar with mini charts and refresh state. |
| **Screener loading system** | Existing `DataLoading` component and provider status | `skeletons` and shimmer treatment | Consistent loading grids that signal live market-data activity without blocking the page. |
| **AI research rail** | Existing AI Analyst chat, markdown, and saved context | `resizable`, `scroll-area`, `tabs` | A desktop research workspace with ticker context and source chips beside the conversation. |
| **Ambient visual polish** | Existing paper and terminal theme tokens | Restrained `aurora-background` technique | One controlled visual anchor for AI and Global Markets, not decorative clutter across the app. |

## Delivery sequence

| Phase | Scope | Outcome |
| --- | --- | --- |
| **A — Visual foundation** | Market pulse band, unified loading states, active-module styling | A more polished dashboard without restructuring routes. |
| **B — Market intelligence** | Sector heat map, screener distribution ribbon, enhanced mover cards | The Markets and Screeners pages gain a recognisable visual signature. |
| **C — Research depth** | Stock research sheet, AI Analyst right rail, save-insight controls | The product feels like an analysis terminal rather than a collection of screens. |
| **D — Optional atmosphere** | One abstract contour asset and one globe asset | Adds identity while keeping the product data-first. |

## Recommendation

Start with **Phase A plus the sector heat map**. It gives the biggest perceived quality improvement with minimal risk to working screener, equity, and AI data paths. Once that is approved, the stock-page research sheet is the most valuable next build.

## References

[1]: https://21st.dev/@sshahaider/components/efferd-dashboard-2 "Efferd Dashboard 2 — 21st.dev"
[2]: https://21st.dev/@sean0205/components/statistics-card-1 "Statistics Card 1 — 21st.dev"
[3]: https://21st.dev/@reaviz/components/area-chart-1 "Area Chart — 21st.dev"
[4]: https://21st.dev/@nayan_radadiya6/components/kpi-card/basic-kpi-card "KPI Card — 21st.dev"
[5]: https://21st.dev/community/components/s/dashboard "Dashboard Components for React & Tailwind — 21st.dev"
[6]: https://21st.dev/community/components/s/data-visualization "Data Visualization Components — 21st.dev"
[7]: https://21st.dev/@rayimanoj8/components/chat-template/whatsapp-mock "Chat Template — 21st.dev"
