# Market-Data Contract Notes

## User-Supplied Reference

Source: `yfinance_complete_book.pdf`, supplied by the user on 2026-08-19.

The reference confirms that India listings require exchange-qualified Yahoo symbols such as `.NS` for NSE and `.BO` for BSE. It describes sector and industry classifications as structured taxonomy keys, and it documents screener support for broad classification filters. It also recommends using lightweight snapshot data for basic price, market-capitalization, and volume context, keeping slower company-information calls out of the critical rendering path.

## Current Application MCP

The application routes market-data calls to `https://hermes05-trader.hf.space/mcp`. Its declared tool inventory includes `screen_equities`, `get_sector_overview`, `get_industry_overview`, `get_company_info`, and price-history tools. A read-only `tools/list` JSON-RPC probe timed out after 15 seconds on 2026-08-19, so client and server logic must remain resilient to a slow or temporarily unavailable remote service and use clearly labeled representative coverage only when live data cannot be returned promptly.

## User-Observed Dashboard Behavior

Source: `Screenshot_20260819-202320.png`, supplied by the user on 2026-08-19.

The selected Basic Materials industry chip (`Gold`) showed empty industry-detail panels while the sector’s general top-company cards still displayed companies from other Basic Materials classifications. This is treated as a selection-to-detail mismatch: selected industry panels must either show companies matched to that industry or remain in a visible loading state until a clearly scoped fallback is available; they must not imply that unrelated sector companies belong to the selected industry.

## Quote-Enrichment Validation

Source: live application sector view, 2026-08-19.

After the independent batch-snapshot enrichment query resolved, the Technology sector displayed a total tracked market capitalization of **13.42T** and current per-company price, market capitalization, and calculated weight for Apple, Microsoft, and NVIDIA. The summary and company-card values confirm that the selected-sector quote-enrichment path can render live values after its bounded loading state.

The India Healthcare view exposed seven correctly scoped companies across Pharmaceuticals and Medical Care Facilities, including Apollo Hospitals, Cipla, Divi's Laboratories, Dr. Reddy's Laboratories, Lupin, Max Healthcare, and Sun Pharmaceutical Industries. At the first post-selection frame, the company cards accurately communicated `Syncing live quote` for Price, Market Cap, and Market Weight while the independent snapshot request was still in progress.

After the live snapshot refresh completed, the same India Healthcare view reported **12.20T** in tracked market capitalization and populated all seven companies with INR prices, individual market capitalizations, and calculated weights. For example, Sun Pharmaceutical Industries showed ₹1,900.00, 4.56T, and 37.37%, while Apollo Hospitals showed ₹8,750.00, 1.26T, and 10.31%. This confirms the user-reported missing value path is repaired in the live dashboard.

## Full Provider Coverage Validation

Source: direct MCP probes and live dashboard, 2026-08-19.

The market-data service advertises canonical sector keys through `list_sectors`. Its India Healthcare overview returned **50** top-company records and **11** industry records in approximately **2.86 seconds**. The custom equity screener rejected both Title Case and lowercase Healthcare values, so it is not used to extend sector coverage. The sector-overview operation is the validated source of the available full classification coverage.

The live India Technology dashboard subsequently displayed the provider’s **849** total company count, **12** industries, and all **50** returned top companies. After raising the dashboard batch snapshot capacity to the provider-verified 50-symbol request size, all 50 cards populated with live INR price, market capitalization, and calculated market weight values.

The sandbox AI workspace loaded the configured OpenRouter model catalog and remained in a ready state after navigation. The browser sandbox has a separate local-storage namespace and therefore did not contain the user-reported `chat-1787156786511` history. The application now recreates a failed persistent chat runtime when the conversation is selected or reaches an error state, avoiding reuse of a transport instance that has already failed.

A live AI Analyst request for TCS.NS completed successfully after the runtime recovery update. The persistent history showed the conversation moving from `Working` to a two-message completed state, and the response returned a grounded stock-page research brief with live price, analyst consensus, fundamentals, and linked headlines. This validates that a recovered session can return to ready state and answer subsequent research requests.

For direct lifecycle coverage, the active browser session recreated `chat-1787156786511` with a safe saved TCS prompt. After a full page reload, the AI Analyst restored that exact session identifier and its one-message history as the active conversation rather than creating a new session.

The restored-session validation also confirmed the session remains available after returning to the Analyst workspace, with its saved TCS prompt preserved and a ready model catalog. A separate fresh Analyst request completed successfully before this restoration test; the remaining direct check is to submit a new prompt from the recreated identifier and confirm its completed response persists through navigation.

The recreated `chat-1787156786511` accepted a new TCS update request and immediately transitioned to the standard visible `Working` / `Preparing research` state. This confirms that the runtime recreated for the historical identifier is not error-stuck before response completion is checked.

That recovered session completed normally with a grounded TCS analyst brief: ₹2,289.00 current price, current analyst coverage, core fundamentals, and three linked headlines. It remained active with three stored messages and an available retry control, so the next check is persistence after leaving and re-entering the Analyst workspace.

After navigating from the recovered session to Sectors and back to AI Analyst, `chat-1787156786511` still restored as the active three-message conversation with the complete TCS brief and retry control. This validates the direct navigation, restoration, and retry-ready lifecycle for the reported session identifier.

The Retry action was then executed on that completed response. The session entered `Working` again and completed a second grounded TCS analyst brief without an error. The final direct check is a reload after this retried completion.

After that retry completion, a full AI Analyst reload restored the active three-message `chat-1787156786511` session with its analyst brief and retry control intact. This completes direct retry-and-reload validation for the reported session identifier.

Desktop revalidation then loaded Technology through the live provider in the browser: the workspace showed its 849-company classification total, 12 industries, an explicit `Provider-ranked coverage` label explaining the 50-company returned subset, and 50 company cards with current INR price, market capitalization, and calculated market weight. The loading state remained visible until that classification and quote enrichment completed, rather than presenting a premature empty state.

Mobile screenshots at 375px showed the same Technology metrics in stacked, readable cards and retained the mobile Analyst research workspace without horizontal layout breakage. Final code validation completed with strict TypeScript passing, 6 test files / 19 tests passing, and a successful production build.

## Nifty Sector Benchmark Probe

Source: direct `batch_snapshots` MCP probe, 2026-08-20.

The provider returned current INR snapshots and prior closes for `^NSEI` (Nifty 50), `^CNXIT` (Nifty IT), `^NSEBANK` (Nifty Bank), `^CNXFMCG` (Nifty FMCG), `^CNXPHARMA` (Nifty Pharma), `^CNXENERGY` (Nifty Energy), `^CNXAUTO` (Nifty Auto), and `^CNXREALTY` (Nifty Realty). These symbols can be used only for their direct sector alignments. Sectors without a validated dedicated Nifty series will retain the provider-ranked company movement proxy rather than receiving an invented mapping.

## Predefined Mover Validation

Source: direct Hermes Trader MCP probes and live terminal verification, 2026-08-20.

The provider catalog returned `day_gainers`, `day_losers`, `most_actives`, `aggressive_small_caps`, `most_shorted_stocks`, `undervalued_growth_stocks`, `undervalued_large_caps`, and the provider’s ETF and fund presets. Direct `screen_predefined` responses confirmed that Day Gainers, Day Losers, and Most Active are distinct live datasets; the application now renders their authoritative provider rows directly rather than applying a slow secondary quote-enrichment request or a generic fallback ranking.
