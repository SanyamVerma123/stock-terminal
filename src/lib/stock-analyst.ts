import {
  fetchAnalyst,
  fetchFinancials,
  fetchNews,
  fetchSummary,
} from "./finance-data.server";
import type { AnalystSummary, NewsItem, StockSummary } from "./finance-types";
import type { StatementTable } from "./finance-normalize";

const NON_TICKER_WORDS = new Set([
  "AI",
  "AN",
  "AND",
  "ARE",
  "AS",
  "AT",
  "BE",
  "BY",
  "CAN",
  "EPS",
  "ETF",
  "FOR",
  "FROM",
  "I",
  "IF",
  "IN",
  "IS",
  "IT",
  "ME",
  "OF",
  "ON",
  "OR",
  "P",
  "PE",
  "SELL",
  "THE",
  "TO",
  "US",
  "VS",
  "WHAT",
  "WITH",
  "YTD",
]);

const ANALYST_INTENT =
  /\b(analyst|analysis|brief|earnings|financials?|fundamental|margin|overview|price|recommendation|share|stock|target|valuation)\b/i;

export function extractStockSymbol(message: string): string | null {
  const candidates = message.match(/(?:\$|\^)?[A-Z]{1,12}(?:\.(?:NS|BO))?\b/g) ?? [];
  for (const candidate of candidates) {
    const symbol = candidate.replace(/^\$/, "");
    if (!NON_TICKER_WORDS.has(symbol) && symbol.length > 1) return symbol;
  }
  return null;
}

export function isStockAnalystRequest(message: string) {
  return ANALYST_INTENT.test(message);
}

function formatCurrency(value: number | null, currency: string | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency ?? "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
}

function formatCompact(value: number | null, currency: string | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  const formatted = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return currency ? `${formatted} ${currency}` : formatted;
}

function formatPercent(value: number | null, multiplier = 1) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${(value * multiplier).toFixed(1)}%`;
}

function formatMultiple(value: number | null) {
  return value === null || !Number.isFinite(value) ? "—" : `${value.toFixed(1)}×`;
}

function statementValue(statement: StatementTable | null, labels: string[]) {
  const row = statement?.rows.find((item) =>
    labels.some((label) => item.label.toLowerCase() === label.toLowerCase()),
  );
  return row?.values.find((value): value is number => value !== null) ?? null;
}

export function formatStockPageAnalystBrief({
  symbol,
  summary,
  analyst,
  financials,
  news,
}: {
  symbol: string;
  summary: StockSummary;
  analyst: AnalystSummary | null;
  financials: StatementTable | null;
  news: NewsItem[] | null;
}) {
  const { quote, ratios } = summary;
  const currency = quote.currency;
  const targetMean = analyst?.targets.mean ?? ratios.targetMeanPrice;
  const targetDelta =
    quote.price !== null && targetMean !== null && quote.price !== 0
      ? ((targetMean - quote.price) / quote.price) * 100
      : null;
  const latestRatings = analyst?.distribution[0];
  const totalRatings = latestRatings
    ? latestRatings.strongBuy +
      latestRatings.buy +
      latestRatings.hold +
      latestRatings.sell +
      latestRatings.strongSell
    : 0;
  const positiveRatings = latestRatings ? latestRatings.strongBuy + latestRatings.buy : 0;
  const revenue = statementValue(financials, ["Total Revenue", "Operating Revenue"]);
  const netIncome = statementValue(financials, ["Net Income", "Net Income Common Stockholders"]);
  const headlines = (news ?? []).slice(0, 3);

  const analystLine =
    totalRatings > 0
      ? `${positiveRatings} positive, ${latestRatings?.hold ?? 0} hold, and ${(latestRatings?.sell ?? 0) + (latestRatings?.strongSell ?? 0)} negative ratings (${latestRatings?.period || "latest period"}).`
      : "The stock-page analyst feed did not return a current rating distribution.";

  const financialRows = [
    ["Market cap", formatCompact(quote.marketCap, currency)],
    ["Trailing P/E", formatMultiple(ratios.trailingPE)],
    ["Forward P/E", formatMultiple(ratios.forwardPE)],
    ["Profit margin", formatPercent(ratios.profitMargins, 100)],
    ["Revenue growth", formatPercent(ratios.revenueGrowth, 100)],
    ["Debt / equity", ratios.debtToEquity === null ? "—" : ratios.debtToEquity.toFixed(1)],
  ].filter(([, value]) => value !== "—");

  const statementRows = [
    ["Latest reported revenue", formatCompact(revenue, currency)],
    ["Latest reported net income", formatCompact(netIncome, currency)],
  ].filter(([, value]) => value !== "—");

  return [
    `## ${quote.name || symbol} (${symbol}) — live analyst brief`,
    "",
    `This response uses the same live quote, fundamentals, analyst coverage, and news services as the stock page.`,
    "",
    `**Price:** ${formatCurrency(quote.price, currency)} (${formatPercent(quote.changePercent)} today) · **Exchange:** ${quote.exchange ?? "—"}`,
    "",
    "### Analyst view",
    "",
    `- **Recommendation:** ${ratios.recommendationKey ?? "—"}${ratios.numberOfAnalystOpinions ? ` (${ratios.numberOfAnalystOpinions} opinions)` : ""}`,
    `- **Mean target:** ${formatCurrency(targetMean, currency)}${targetDelta === null ? "" : ` (${targetDelta >= 0 ? "+" : ""}${targetDelta.toFixed(1)}% versus the current price)`}`,
    `- **Target range:** ${formatCurrency(analyst?.targets.low ?? null, currency)} to ${formatCurrency(analyst?.targets.high ?? null, currency)}`,
    `- **Rating distribution:** ${analystLine}`,
    "",
    "### Fundamentals",
    "",
    "| Metric | Current |",
    "| --- | ---: |",
    ...financialRows.map(([label, value]) => `| ${label} | ${value} |`),
    ...statementRows.map(([label, value]) => `| ${label} | ${value} |`),
    "",
    "### Recent headlines",
    "",
    ...(headlines.length > 0
      ? headlines.map((item) => `- [${item.title}](${item.link})${item.publisher ? ` — ${item.publisher}` : ""}`)
      : ["- No recent company headlines were returned by the stock-page feed."]),
    "",
    "*This is market research information, not investment advice.*",
  ].join("\n");
}

export async function createStockPageAnalystBrief(symbol: string) {
  const [summary, analyst, financials, news] = await Promise.all([
    fetchSummary(symbol).catch(() => null),
    fetchAnalyst(symbol).catch(() => null),
    fetchFinancials(symbol, "income", false).catch(() => null),
    fetchNews(symbol).catch(() => null),
  ]);

  if (!summary || (summary.quote.price === null && summary.ratios.targetMeanPrice === null)) {
    return null;
  }

  return formatStockPageAnalystBrief({ symbol, summary, analyst, financials, news });
}
