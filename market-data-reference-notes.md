# Market-Data Contract Notes

## User-Supplied Reference

Source: `yfinance_complete_book.pdf`, supplied by the user on 2026-08-19.

The reference confirms that India listings require exchange-qualified Yahoo symbols such as `.NS` for NSE and `.BO` for BSE. It describes sector and industry classifications as structured taxonomy keys, and it documents screener support for broad classification filters. It also recommends using lightweight snapshot data for basic price, market-capitalization, and volume context, keeping slower company-information calls out of the critical rendering path.

## Current Application MCP

The application routes market-data calls to `https://hermes05-trader.hf.space/mcp`. Its declared tool inventory includes `screen_equities`, `get_sector_overview`, `get_industry_overview`, `get_company_info`, and price-history tools. A read-only `tools/list` JSON-RPC probe timed out after 15 seconds on 2026-08-19, so client and server logic must remain resilient to a slow or temporarily unavailable remote service and use clearly labeled representative coverage only when live data cannot be returned promptly.

## User-Observed Dashboard Behavior

Source: `Screenshot_20260819-202320.png`, supplied by the user on 2026-08-19.

The selected Basic Materials industry chip (`Gold`) showed empty industry-detail panels while the sector’s general top-company cards still displayed companies from other Basic Materials classifications. This is treated as a selection-to-detail mismatch: selected industry panels must either show companies matched to that industry or remain in a visible loading state until a clearly scoped fallback is available; they must not imply that unrelated sector companies belong to the selected industry.
