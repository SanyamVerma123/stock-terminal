# Repository Layout Alignment Plan

The connected repository is a **Screener Terminal**, not a landing-page finance dashboard. The correction will preserve the managed data and AI services while restoring the original visual hierarchy and route composition.

| Route | Repository layout | Current managed divergence | Alignment action |
| --- | --- | --- | --- |
| `/` | Full-height terminal with a collapsible left sidebar, compact top bar, breadcrumb, command search, and scrollable market workspace | Marketing-style hero with a top navigation and card grid | Replace with the terminal shell, sidebar group hierarchy, compact top bar, and market-intelligence workspace. |
| `/stock/:symbol` | Plain compact `SiteHeader`, centered max-width content, card-based data columns, and an embedded research chart | Broader research-dashboard treatment with dense custom panel framing | Rebase content into the source’s centered card structure, section headers, stat tiles, and source-style chart/tab treatment. |
| `/compare` | Narrow centered page with a comma-separated input and one large rebased performance line chart | Side-by-side metrics table and ticker-picker experience | Replace with a source-style chart-first comparison form and performance chart. |
| `/chat` | Simple centered conversation page with empty-state hero, left/right bubbles, tool pills, and sticky prompt input | Split workspace with starter cards and an artifact rail | Replace with the original single-column chat composition while preserving managed streaming and Markdown. |

The style correction will use the repository’s **quiet terminal** language: a dark blue-charcoal background, thin low-contrast borders, compact `Inter Tight`/mono information hierarchy, rounded-xl and rounded-2xl cards, quiet live-status indicators, and restrained cyan-positive/negative data colors. The existing mobile adaptation will be retained only where it does not conflict with the source hierarchy; the home route will use the source-style mobile drawer rather than a separate mobile tab strip.
