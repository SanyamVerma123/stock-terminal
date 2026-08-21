# Industrial Coverage Investigation

The persistent dashboard browser session was used to distinguish an initial loading state from resolved provider coverage. The Technology baseline completed with provider-ranked output showing 50 companies and 12 industries. The same session reported all 11 dashboard sectors as market-cap weighted after the request window. The next validation step is to select Industrials in this resolved dashboard state and compare its rendered row counts with the provider-backed Screener response.

The United States Industrials panel resolved with 50 provider-ranked companies and 25 industries, so the reported reduced coverage is not in the United States aggregation. Switching the same dashboard session to India moved Industrials to representative coverage; this is the path that must be aligned with the working India Screener result.

The India provider returned 50 Industrials companies but an empty `industries` array. The reduced three-industry view therefore came from representative profiles, not from the provider-ranked constituents. The repair classifies the 50 returned constituents in provider-safe batches and rebuilds the industry mix from their reported industry metadata. Persistent-browser validation after the repair showed 50 provider-ranked companies and 15 distinct Industrial industry groups, including aerospace and defense, electrical equipment, marine shipping, airlines, construction, and logistics.

After a complete browser reload, the terminal correctly returns to its standard loading state before market and sector queries settle. The selected detail view must therefore be rechecked after changing the region and allowing the provider classification window to finish.

On a clean India-market selection, the Industrials detail correctly enters the dedicated sector-loading state while the provider overview and batched company classification requests are in progress; it does not immediately display the former three-industry fallback as a final result.

During final browser verification, a stale interactive index opened an individual stock route. Returning directly to the Markets workspace restored the intended India-sector validation state without altering saved market configuration or the repaired server-side aggregation path.
