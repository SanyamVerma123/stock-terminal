import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

type JsonRecord = Record<string, unknown>;

type CachedValue<T> = {
  expiresAt: number;
  value: T;
};

const cache = new Map<string, CachedValue<unknown>>();

const TTL = {
  quote: 15_000,
  search: 60_000,
  history: 60_000,
  fundamentals: 300_000,
  news: 120_000,
};

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value * 1000).toISOString();
  return null;
}

async function withCache<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
  const cached = cache.get(key) as CachedValue<T> | undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await loader();
  cache.set(key, { value, expiresAt: Date.now() + ttl });
  return value;
}

export function normalizeSymbol(value: string): string {
  const symbol = value.trim().toUpperCase();
  if (!/^[A-Z0-9.^=\-]{1,15}$/.test(symbol)) {
    throw new Error("Use a valid ticker symbol, such as AAPL, MSFT, ^GSPC, or RELIANCE.NS.");
  }
  return symbol;
}

function toQuote(raw: JsonRecord) {
  return {
    symbol: readText(raw.symbol) ?? "—",
    name: readText(raw.longName) ?? readText(raw.shortName) ?? readText(raw.displayName) ?? readText(raw.symbol) ?? "Unknown security",
    exchange: readText(raw.fullExchangeName) ?? readText(raw.exchange) ?? "—",
    currency: readText(raw.currency) ?? "USD",
    price: readNumber(raw.regularMarketPrice) ?? readNumber(raw.postMarketPrice) ?? readNumber(raw.preMarketPrice),
    change: readNumber(raw.regularMarketChange),
    changePercent: readNumber(raw.regularMarketChangePercent),
    previousClose: readNumber(raw.regularMarketPreviousClose) ?? readNumber(raw.previousClose),
    open: readNumber(raw.regularMarketOpen),
    dayLow: readNumber(raw.regularMarketDayLow),
    dayHigh: readNumber(raw.regularMarketDayHigh),
    yearLow: readNumber(raw.fiftyTwoWeekLow),
    yearHigh: readNumber(raw.fiftyTwoWeekHigh),
    volume: readNumber(raw.regularMarketVolume),
    marketCap: readNumber(raw.marketCap),
    quoteType: readText(raw.quoteType) ?? "EQUITY",
    marketState: readText(raw.marketState) ?? "UNKNOWN",
    updatedAt: readDate(raw.regularMarketTime),
  };
}

function mapStatementRows(rows: unknown) {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => {
    const record = row as JsonRecord;
    return {
      asOfDate: readDate(record.endDate) ?? readDate(record.asOfDate),
      totalRevenue: readNumber(record.totalRevenue),
      grossProfit: readNumber(record.grossProfit),
      operatingIncome: readNumber(record.operatingIncome),
      netIncome: readNumber(record.netIncome),
      ebitda: readNumber(record.ebitda),
      totalAssets: readNumber(record.totalAssets),
      totalDebt: readNumber(record.totalDebt),
      totalCashFromOperatingActivities: readNumber(record.totalCashFromOperatingActivities),
      capitalExpenditures: readNumber(record.capitalExpenditures),
    };
  });
}

export async function getSummary(inputSymbol: string) {
  const symbol = normalizeSymbol(inputSymbol);
  return withCache(`summary:${symbol}`, TTL.quote, async () => {
    const quote = await yahooFinance.quote(symbol) as unknown as JsonRecord;
    const detailed = await yahooFinance.quoteSummary(symbol, {
      modules: ["summaryDetail", "defaultKeyStatistics", "financialData", "assetProfile"],
    }) as unknown as JsonRecord;
    const detail = detailed.summaryDetail as JsonRecord | undefined;
    const statistics = detailed.defaultKeyStatistics as JsonRecord | undefined;
    const financial = detailed.financialData as JsonRecord | undefined;
    const profile = detailed.assetProfile as JsonRecord | undefined;
    return {
      quote: toQuote(quote),
      ratios: {
        trailingPE: readNumber(detail?.trailingPE),
        forwardPE: readNumber(detail?.forwardPE),
        priceToBook: readNumber(statistics?.priceToBook),
        beta: readNumber(statistics?.beta),
        dividendYield: readNumber(detail?.dividendYield),
        profitMargins: readNumber(financial?.profitMargins),
        returnOnEquity: readNumber(financial?.returnOnEquity),
      },
      profile: {
        sector: readText(profile?.sector),
        industry: readText(profile?.industry),
        website: readText(profile?.website),
        employees: readNumber(profile?.fullTimeEmployees),
        summary: readText(profile?.longBusinessSummary),
      },
    };
  });
}

export function rangeToDates(range: string) {
  const end = new Date();
  const start = new Date(end);
  const ranges: Record<string, number> = { "1D": 2, "5D": 7, "1M": 31, "6M": 183, "1Y": 366, "5Y": 1827 };
  start.setDate(end.getDate() - (ranges[range] ?? 366));
  return { start, end, interval: range === "1D" || range === "5D" ? "5m" : "1d" } as const;
}

export async function getHistory(inputSymbol: string, range = "1Y") {
  const symbol = normalizeSymbol(inputSymbol);
  const normalizedRange = ["1D", "5D", "1M", "6M", "1Y", "5Y"].includes(range) ? range : "1Y";
  return withCache(`history:${symbol}:${normalizedRange}`, TTL.history, async () => {
    const { start, end, interval } = rangeToDates(normalizedRange);
    const chart = await yahooFinance.chart(symbol, { period1: start, period2: end, interval }) as unknown as { quotes?: JsonRecord[] };
    const rows = chart.quotes ?? [];
    return rows.map(row => ({
      timestamp: readDate(row.date) ?? new Date().toISOString(),
      close: readNumber(row.close),
      open: readNumber(row.open),
      high: readNumber(row.high),
      low: readNumber(row.low),
      volume: readNumber(row.volume),
    })).filter(row => row.close !== null);
  });
}

export async function searchTickers(query: string) {
  const clean = query.trim();
  if (!clean) return [];
  return withCache(`search:${clean.toLowerCase()}`, TTL.search, async () => {
    const result = await yahooFinance.search(clean, { quotesCount: 8, newsCount: 0 }) as unknown as JsonRecord;
    const quotes = Array.isArray(result.quotes) ? result.quotes as JsonRecord[] : [];
    return quotes.filter(item => ["EQUITY", "ETF", "MUTUALFUND", "INDEX", "CRYPTOCURRENCY"].includes(readText(item.quoteType) ?? ""))
      .map(item => ({
        symbol: readText(item.symbol) ?? "",
        name: readText(item.longname) ?? readText(item.shortname) ?? readText(item.symbol) ?? "Unknown security",
        exchange: readText(item.exchDisp) ?? readText(item.exchange) ?? "—",
        quoteType: readText(item.quoteType) ?? "EQUITY",
      })).filter(item => item.symbol);
  });
}

export async function getNews(inputSymbol: string) {
  const symbol = normalizeSymbol(inputSymbol);
  return withCache(`news:${symbol}`, TTL.news, async () => {
    const result = await yahooFinance.search(symbol, { quotesCount: 0, newsCount: 12 }) as unknown as JsonRecord;
    const articles = Array.isArray(result.news) ? result.news as JsonRecord[] : [];
    return articles.map(item => ({
      title: readText(item.title) ?? "Market update",
      publisher: readText(item.publisher) ?? "Yahoo Finance",
      link: readText(item.link) ?? "",
      publishedAt: readDate(item.providerPublishTime),
      thumbnail: readText((item.thumbnail as JsonRecord | undefined)?.resolutions instanceof Array ? undefined : undefined),
    })).filter(item => item.link);
  });
}

export async function getFinancials(inputSymbol: string, statement = "income", quarterly = false) {
  const symbol = normalizeSymbol(inputSymbol);
  const module = statement === "balance"
    ? quarterly ? "balanceSheetHistoryQuarterly" : "balanceSheetHistory"
    : statement === "cashflow"
      ? quarterly ? "cashflowStatementHistoryQuarterly" : "cashflowStatementHistory"
      : quarterly ? "incomeStatementHistoryQuarterly" : "incomeStatementHistory";
  return withCache(`financials:${symbol}:${module}`, TTL.fundamentals, async () => {
    const result = await yahooFinance.quoteSummary(symbol, { modules: [module] }) as unknown as JsonRecord;
    const grouped = result[module] as JsonRecord | undefined;
    const statementRows = grouped ? Object.values(grouped).find(value => Array.isArray(value)) : [];
    return { statement, quarterly, rows: mapStatementRows(statementRows) };
  });
}

export async function getAnalyst(inputSymbol: string) {
  const symbol = normalizeSymbol(inputSymbol);
  return withCache(`analyst:${symbol}`, TTL.fundamentals, async () => {
    const result = await yahooFinance.quoteSummary(symbol, { modules: ["financialData", "recommendationTrend"] }) as unknown as JsonRecord;
    const financial = result.financialData as JsonRecord | undefined;
    const trend = result.recommendationTrend as JsonRecord | undefined;
    return {
      targetMeanPrice: readNumber(financial?.targetMeanPrice),
      targetHighPrice: readNumber(financial?.targetHighPrice),
      targetLowPrice: readNumber(financial?.targetLowPrice),
      recommendationKey: readText(financial?.recommendationKey),
      recommendationMean: readNumber(financial?.recommendationMean),
      trend: Array.isArray(trend?.trend) ? trend.trend : [],
    };
  });
}

export async function getUpgrades(inputSymbol: string) {
  const symbol = normalizeSymbol(inputSymbol);
  return withCache(`upgrades:${symbol}`, TTL.fundamentals, async () => {
    const result = await yahooFinance.quoteSummary(symbol, { modules: ["upgradeDowngradeHistory"] }) as unknown as JsonRecord;
    const history = result.upgradeDowngradeHistory as JsonRecord | undefined;
    const rows = Array.isArray(history?.history) ? history.history as JsonRecord[] : [];
    return rows.map(row => ({ firm: readText(row.firm) ?? "—", fromGrade: readText(row.fromGrade), toGrade: readText(row.toGrade), action: readText(row.action), date: readDate(row.epochGradeDate) }));
  });
}

export async function getCalendar(inputSymbol: string) {
  const symbol = normalizeSymbol(inputSymbol);
  return withCache(`calendar:${symbol}`, TTL.fundamentals, async () => {
    const result = await yahooFinance.quoteSummary(symbol, { modules: ["calendarEvents"] }) as unknown as JsonRecord;
    return result.calendarEvents ?? {};
  });
}

export async function getCorporateActions(inputSymbol: string) {
  const symbol = normalizeSymbol(inputSymbol);
  return withCache(`actions:${symbol}`, TTL.fundamentals, async () => {
    const { start, end } = rangeToDates("5Y");
    const chart = await yahooFinance.chart(symbol, { period1: start, period2: end, interval: "1d", events: "div|split" }) as unknown as { events?: JsonRecord };
    const dividends = Array.isArray(chart.events?.dividends) ? chart.events?.dividends as JsonRecord[] : [];
    const splits = Array.isArray(chart.events?.splits) ? chart.events?.splits as JsonRecord[] : [];
    return [...dividends.map(event => ({ type: "dividend", date: readDate(event.date), event })), ...splits.map(event => ({ type: "split", date: readDate(event.date), event }))];
  });
}

export async function getMarketStrip() {
  const symbols = ["^GSPC", "^IXIC", "^DJI", "^RUT", "BTC-USD", "GC=F"];
  const quotes = await Promise.all(symbols.map(symbol => getSummary(symbol).then(item => item.quote).catch(() => null)));
  return quotes.filter(Boolean);
}

export async function getQuotes(symbols: string[]) {
  const unique = Array.from(new Set(symbols.map(normalizeSymbol))).slice(0, 12);
  return Promise.all(unique.map(symbol => getSummary(symbol).then(item => item.quote).catch(() => null))).then(items => items.filter(Boolean));
}

export async function getCompare(inputSymbols: string, range = "1Y") {
  const symbols = Array.from(new Set(inputSymbols.split(",").map(value => value.trim()).filter(Boolean).map(normalizeSymbol))).slice(0, 5);
  return Promise.all(symbols.map(async symbol => ({ symbol, points: await getHistory(symbol, range) })));
}
