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
