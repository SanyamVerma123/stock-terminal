const SECTOR_ALIASES: Record<string, string> = {
  basicmaterials: "basic-materials",
  materials: "basic-materials",
  communication: "communication-services",
  communications: "communication-services",
  communicationservices: "communication-services",
  consumer: "consumer-cyclical",
  consumerdiscretionary: "consumer-cyclical",
  consumercyclical: "consumer-cyclical",
  consumerstaples: "consumer-defensive",
  consumerdefensive: "consumer-defensive",
  financial: "financial-services",
  financials: "financial-services",
  financialservices: "financial-services",
  healthcare: "healthcare",
  health: "healthcare",
  industrials: "industrials",
  industrial: "industrials",
  realestate: "real-estate",
  technology: "technology",
  informationtechnology: "technology",
  utilities: "utilities",
  energy: "energy",
  etf: "etf",
  crypto: "crypto",
  forex: "forex",
};

const INDUSTRY_ALIASES: Record<string, string> = {
  softwareinfrastructure: "software-infrastructure",
  softwareapplication: "software-application",
  semiconductors: "semiconductors",
  semiconductorequipmentmaterials: "semiconductor-equipment-materials",
  consumerelectronics: "consumer-electronics",
  informationtechnologyservices: "information-technology-services",
  computerhardware: "computer-hardware",
  communicationequipment: "communication-equipment",
  electroniccomponents: "electronic-components",
  pharmaceuticals: "pharmaceuticals",
  drugmanufacturersgeneral: "pharmaceuticals",
  drugmanufacturersspecialtygeneric: "pharmaceuticals",
  banks: "banks",
  diversifiedbanks: "banks",
  banksdiversified: "banks",
  banksregional: "banks",
  oilgasintegrated: "oil-gas-integrated",
  automobiles: "automobiles",
  automanufacturers: "automobiles",
  internetcontent: "internet-content",
  internetcontentinformation: "internet-content",
  internetcontentandinformation: "internet-content",
  beverages: "beverages",
  beveragesnonalcoholic: "beverages",
  householdproducts: "household-products",
  householdpersonalproducts: "household-products",
  householdandpersonalproducts: "household-products",
};

const PROVIDER_INDUSTRY_KEYS: Record<string, string> = {
  "internet-content": "internet-content-information",
  automobiles: "auto-manufacturers",
  banks: "banks-diversified",
  pharmaceuticals: "drug-manufacturers-general",
  beverages: "beverages-non-alcoholic",
  "household-products": "household-personal-products",
};

function clean(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function canonicalSectorKey(value: string | null | undefined) {
  if (!value) return "";
  const normalized = clean(value);
  return SECTOR_ALIASES[normalized] ?? slug(value);
}

export function canonicalIndustryKey(value: string | null | undefined) {
  if (!value) return "";
  const normalized = clean(value);
  return INDUSTRY_ALIASES[normalized] ?? slug(value);
}

export function providerTaxonomyLabel(
  value: string | null | undefined,
  kind: "sector" | "industry",
) {
  if (!value) return "";
  if (kind === "sector") return canonicalSectorKey(value);
  const canonical = canonicalIndustryKey(value);
  return PROVIDER_INDUSTRY_KEYS[canonical] ?? canonical;
}

export function taxonomyMatches(
  left: string | null | undefined,
  right: string | null | undefined,
  kind: "sector" | "industry",
) {
  if (!left || !right) return false;
  const canonicalLeft = kind === "sector" ? canonicalSectorKey(left) : canonicalIndustryKey(left);
  const canonicalRight =
    kind === "sector" ? canonicalSectorKey(right) : canonicalIndustryKey(right);
  return (
    canonicalLeft === canonicalRight ||
    canonicalLeft.includes(canonicalRight) ||
    canonicalRight.includes(canonicalLeft)
  );
}
