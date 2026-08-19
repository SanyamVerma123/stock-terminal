import { canonicalIndustryKey, canonicalSectorKey } from "./sector-normalize";

export type StaticSectorProfile = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
};

const PROFILES: StaticSectorProfile[] = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "technology", industry: "consumer-electronics" },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    sector: "technology",
    industry: "software-infrastructure",
  },
  { symbol: "NVDA", name: "NVIDIA Corp.", sector: "technology", industry: "semiconductors" },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    sector: "communication-services",
    industry: "internet-content",
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    sector: "consumer-cyclical",
    industry: "internet-retail",
  },
  {
    symbol: "META",
    name: "Meta Platforms",
    sector: "communication-services",
    industry: "internet-content",
  },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "consumer-cyclical", industry: "automobiles" },
  { symbol: "JPM", name: "JPMorgan Chase", sector: "financial-services", industry: "banks" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "healthcare", industry: "pharmaceuticals" },
  { symbol: "XOM", name: "Exxon Mobil", sector: "energy", industry: "oil-gas-integrated" },
  { symbol: "KO", name: "Coca-Cola Co.", sector: "consumer-defensive", industry: "beverages" },
  {
    symbol: "PG",
    name: "Procter & Gamble",
    sector: "consumer-defensive",
    industry: "household-products",
  },
  { symbol: "LIN", name: "Linde plc", sector: "basic-materials", industry: "specialty-chemicals" },
  { symbol: "FCX", name: "Freeport-McMoRan", sector: "basic-materials", industry: "copper" },
  { symbol: "CAT", name: "Caterpillar Inc.", sector: "industrials", industry: "farm-heavy-construction-machinery" },
  { symbol: "HON", name: "Honeywell International", sector: "industrials", industry: "conglomerates" },
  { symbol: "PLD", name: "Prologis Inc.", sector: "real-estate", industry: "reit-industrial" },
  { symbol: "AMT", name: "American Tower", sector: "real-estate", industry: "reit-specialty" },
  { symbol: "NEE", name: "NextEra Energy", sector: "utilities", industry: "utilities-renewable" },
  { symbol: "DUK", name: "Duke Energy", sector: "utilities", industry: "utilities-regulated-electric" },
  {
    symbol: "RELIANCE.NS",
    name: "Reliance Industries",
    sector: "energy",
    industry: "oil-gas-integrated",
  },
  {
    symbol: "TCS.NS",
    name: "Tata Consultancy Services",
    sector: "technology",
    industry: "information-technology-services",
  },
  {
    symbol: "INFY.NS",
    name: "Infosys Ltd.",
    sector: "technology",
    industry: "information-technology-services",
  },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", sector: "financial-services", industry: "banks" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank", sector: "financial-services", industry: "banks" },
  { symbol: "ITC.NS", name: "ITC Ltd.", sector: "consumer-defensive", industry: "tobacco" },
  { symbol: "TATASTEEL.NS", name: "Tata Steel", sector: "basic-materials", industry: "steel" },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel", sector: "communication-services", industry: "telecom-services" },
  { symbol: "MARUTI.NS", name: "Maruti Suzuki India", sector: "consumer-cyclical", industry: "automobiles" },
  { symbol: "CIPLA.NS", name: "Cipla", sector: "healthcare", industry: "pharmaceuticals" },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical Industries", sector: "healthcare", industry: "pharmaceuticals" },
  { symbol: "DRREDDY.NS", name: "Dr. Reddy's Laboratories", sector: "healthcare", industry: "pharmaceuticals" },
  { symbol: "DIVISLAB.NS", name: "Divi's Laboratories", sector: "healthcare", industry: "pharmaceuticals" },
  { symbol: "LUPIN.NS", name: "Lupin", sector: "healthcare", industry: "pharmaceuticals" },
  { symbol: "APOLLOHOSP.NS", name: "Apollo Hospitals Enterprise", sector: "healthcare", industry: "medical-care-facilities" },
  { symbol: "MAXHEALTH.NS", name: "Max Healthcare Institute", sector: "healthcare", industry: "medical-care-facilities" },
  { symbol: "HCLTECH.NS", name: "HCL Technologies", sector: "technology", industry: "information-technology-services" },
  { symbol: "WIPRO.NS", name: "Wipro", sector: "technology", industry: "information-technology-services" },
  { symbol: "TECHM.NS", name: "Tech Mahindra", sector: "technology", industry: "information-technology-services" },
  { symbol: "PERSISTENT.NS", name: "Persistent Systems", sector: "technology", industry: "information-technology-services" },
  { symbol: "MPHASIS.NS", name: "Mphasis", sector: "technology", industry: "information-technology-services" },
  { symbol: "POWERGRID.NS", name: "Power Grid Corporation of India", sector: "utilities", industry: "utilities-regulated-electric" },
  { symbol: "TATAPOWER.NS", name: "Tata Power", sector: "utilities", industry: "utilities-regulated-electric" },
  { symbol: "ADANIGREEN.NS", name: "Adani Green Energy", sector: "utilities", industry: "utilities-renewable" },
  { symbol: "DLF.NS", name: "DLF Ltd.", sector: "real-estate", industry: "real-estate-development" },
  { symbol: "GODREJPROP.NS", name: "Godrej Properties", sector: "real-estate", industry: "real-estate-development" },
  { symbol: "OBEROIRLTY.NS", name: "Oberoi Realty", sector: "real-estate", industry: "real-estate-development" },
  { symbol: "PRESTIGE.NS", name: "Prestige Estates Projects", sector: "real-estate", industry: "real-estate-development" },
  { symbol: "NTPC.NS", name: "NTPC Ltd.", sector: "utilities", industry: "utilities-regulated-electric" },
  { symbol: "SBIN.NS", name: "State Bank of India", sector: "financial-services", industry: "banks" },
  { symbol: "AXISBANK.NS", name: "Axis Bank", sector: "financial-services", industry: "banks" },
  { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank", sector: "financial-services", industry: "banks" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance", sector: "financial-services", industry: "credit-services" },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever", sector: "consumer-defensive", industry: "household-products" },
  { symbol: "NESTLEIND.NS", name: "Nestle India", sector: "consumer-defensive", industry: "packaged-foods" },
  { symbol: "BRITANNIA.NS", name: "Britannia Industries", sector: "consumer-defensive", industry: "packaged-foods" },
  { symbol: "DABUR.NS", name: "Dabur India", sector: "consumer-defensive", industry: "household-products" },
  { symbol: "M&M.NS", name: "Mahindra & Mahindra", sector: "consumer-cyclical", industry: "automobiles" },
  { symbol: "TITAN.NS", name: "Titan Company", sector: "consumer-cyclical", industry: "specialty-retail" },
  { symbol: "EICHERMOT.NS", name: "Eicher Motors", sector: "consumer-cyclical", industry: "automobiles" },
  { symbol: "LT.NS", name: "Larsen & Toubro", sector: "industrials", industry: "engineering-construction" },
  { symbol: "SIEMENS.NS", name: "Siemens India", sector: "industrials", industry: "specialty-industrial-machinery" },
  { symbol: "ABB.NS", name: "ABB India", sector: "industrials", industry: "specialty-industrial-machinery" },
  { symbol: "BEL.NS", name: "Bharat Electronics", sector: "industrials", industry: "aerospace-defense" },
  { symbol: "ULTRACEMCO.NS", name: "UltraTech Cement", sector: "basic-materials", industry: "building-materials" },
  { symbol: "JSWSTEEL.NS", name: "JSW Steel", sector: "basic-materials", industry: "steel" },
  { symbol: "HINDZINC.NS", name: "Hindustan Zinc", sector: "basic-materials", industry: "other-industrial-metals-mining" },
  { symbol: "ASIANPAINT.NS", name: "Asian Paints", sector: "basic-materials", industry: "specialty-chemicals" },
];

function normalizeRegion(region: string) {
  return region.trim().toLowerCase();
}

export function profilesForRegion(region: string): StaticSectorProfile[] {
  const normalized = normalizeRegion(region);
  const india =
    normalized === "in" || normalized === "india" || normalized === "nse" || normalized === "bse";
  return PROFILES.filter((profile) =>
    india ? profile.symbol.endsWith(".NS") : !profile.symbol.endsWith(".NS"),
  ).map((profile) => ({
    ...profile,
    sector: canonicalSectorKey(profile.sector),
    industry: canonicalIndustryKey(profile.industry),
  }));
}
