export type FinanceQuote = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  open: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  yearLow: number | null;
  yearHigh: number | null;
  volume: number | null;
  marketCap: number | null;
  quoteType: string;
  marketState: string;
  updatedAt: string | null;
};

export type HistoryPoint = { timestamp: string; close: number | null; open: number | null; high: number | null; low: number | null; volume: number | null; };
export type SearchResult = { symbol: string; name: string; exchange: string; quoteType: string; };
export type FinancialRow = { asOfDate: string | null; totalRevenue: number | null; grossProfit: number | null; operatingIncome: number | null; netIncome: number | null; ebitda: number | null; totalAssets: number | null; totalDebt: number | null; totalCashFromOperatingActivities: number | null; capitalExpenditures: number | null; };
