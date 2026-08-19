# Migration Architecture

The managed application will preserve the original public route contract: `/`, `/stock/:symbol`, `/compare`, and `/chat`. The client will use Wouter and TanStack Query. The server will use tRPC public procedures for data delivery and LLM-backed chat completion, with a dedicated streaming response endpoint for progressive chat rendering where HTTP chunking is required by the browser.

| Layer | Responsibilities | Source material |
| --- | --- | --- |
| Client routes | Home, stock detail, comparison, and research chat experiences; dark and light themes; responsive navigation | Connected repository routes and supplemental archive route updates |
| Shared components | Finance header, autocomplete, quote tables, charts, sector heatmap, dashboard panels, markdown, Mermaid, and artifacts | Connected repository components plus selected interaction treatments from 21st.dev |
| Finance service | Validated public procedures for quotes, history, fundamentals, market lists, news, analyst activity, calendar events, and actions | Original finance models and normalization libraries, rebuilt for tRPC |
| AI research service | Multi-turn chat request handling, finance-specific tool dispatch, model completion, markdown/artifact response shaping, and response streaming | Original chat modules, managed LLM helper, and the supplemental chat package |
| Data quality controls | Ticker normalization, schema-safe transformations, explicit error states, small in-memory cache, data-source disclosure, and informational-use disclaimer | Original utility libraries and finance-data safeguards |

The application will use Yahoo Finance-compatible public endpoints as the default data adapter. Results will be normalized before delivery so components do not depend on provider-specific response shapes. AI assistant tool calls will be limited to bounded finance lookups such as quote retrieval, price history, market news, and financial statements. The assistant will be instructed to distinguish observed data from interpretation and include an informational-use disclaimer.

## Reference-informed product decisions

Public descriptions of both benchmark products emphasize market search, interactive charts, contextual news, research follow-ups, price comparisons, and theme selection. The implementation will adopt those interaction principles in an original branded interface, without reproducing proprietary screens, copy, or logos. [1] [2] [3]

## References

1. [Perplexity Finance](https://www.perplexity.ai/finance)
2. [Perplexity for Finance](https://www.perplexity.ai/enterprise/use-cases/finance)
3. [Google: Use AI-powered Google Finance in Search](https://support.google.com/websearch/answer/16490185?hl=en)
