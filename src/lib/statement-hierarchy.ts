import type { StatementTable } from "@/lib/finance-types";

export type FinancialStatementKey = "income" | "balance" | "cash";

type AccountGroupDefinition = {
  label: string;
  summary: string[];
  children: string[];
};

const MAJOR_ACCOUNT_GROUPS: Record<FinancialStatementKey, AccountGroupDefinition[]> = {
  income: [
    { label: "Revenue", summary: ["Total Revenue"], children: ["Cost Of Revenue", "Gross Profit"] },
    { label: "Expenses", summary: ["Operating Expense", "Total Expenses"], children: ["Cost Of Revenue", "Research And Development", "Selling General And Administration", "Other Operating Expenses"] },
    { label: "Operating profit", summary: ["Operating Income"], children: ["Gross Profit", "EBITDA", "EBIT"] },
    { label: "Other income & finance", summary: ["Other Non Operating Income Expenses", "Interest Expense"], children: ["Interest Expense", "Interest Income", "Other Non Operating Income Expenses"] },
    { label: "Tax", summary: ["Tax Provision"], children: ["Pretax Income", "Tax Provision"] },
    { label: "Net profit", summary: ["Net Income", "Net Income Common Stockholders"], children: ["Net Income Common Stockholders", "Minority Interests"] },
    { label: "Earnings per share", summary: ["Diluted EPS", "Basic EPS"], children: ["Basic EPS", "Diluted EPS"] },
  ],
  balance: [
    { label: "Assets", summary: ["Total Assets"], children: ["Current Assets", "Cash And Cash Equivalents", "Receivables", "Inventory", "Net PPE", "Goodwill", "Other Intangible Assets", "Other Assets"] },
    { label: "Liabilities", summary: ["Total Liabilities Net Minority Interest", "Total Liabilities"], children: ["Current Liabilities", "Accounts Payable", "Total Debt", "Current Debt", "Long Term Debt", "Other Current Liabilities", "Other Non Current Liabilities"] },
    { label: "Equity", summary: ["Stockholders Equity", "Total Equity Gross Minority Interest"], children: ["Capital Stock", "Retained Earnings", "Treasury Stock", "Minority Interest"] },
    { label: "Working capital", summary: ["Working Capital"], children: ["Current Assets", "Current Liabilities"] },
  ],
  cash: [
    { label: "Cash from operating activities", summary: ["Operating Cash Flow"], children: ["Depreciation And Amortization", "Change In Working Capital", "Other Non Cash Items", "Deferred Income Tax"] },
    { label: "Cash from investing activities", summary: ["Investing Cash Flow"], children: ["Capital Expenditure", "Net Investment Purchase And Sale", "Purchase Of Investment", "Sale Of Investment"] },
    { label: "Cash from financing activities", summary: ["Financing Cash Flow"], children: ["Repayment Of Debt", "Issuance Of Debt", "Cash Dividends Paid", "Repurchase Of Capital Stock", "Common Stock Issuance"] },
    { label: "Free cash flow", summary: ["Free Cash Flow"], children: ["Operating Cash Flow", "Capital Expenditure"] },
    { label: "Closing cash position", summary: ["End Cash Position"], children: ["Beginning Cash Position", "Changes In Cash"] },
  ],
};

export type StatementGroup = {
  label: string;
  summary: StatementTable["rows"][number] | null;
  children: StatementTable["rows"][number][];
};

function firstMatchingRow(rowsByLabel: Map<string, StatementTable["rows"][number]>, labels: string[]) {
  return labels.map((label) => rowsByLabel.get(label)).find((row): row is StatementTable["rows"][number] => Boolean(row)) ?? null;
}

export function buildStatementHierarchy(statement: StatementTable | undefined, statementKey: FinancialStatementKey): StatementGroup[] {
  const rows = statement?.rows ?? [];
  const rowsByLabel = new Map(rows.map((row) => [row.label, row]));
  const claimed = new Set<string>();
  const groups: StatementGroup[] = [];

  for (const definition of MAJOR_ACCOUNT_GROUPS[statementKey]) {
    const summary = firstMatchingRow(rowsByLabel, definition.summary);
    const children = definition.children.flatMap((label) => {
      const child = rowsByLabel.get(label);
      return child && child.label !== summary?.label && !claimed.has(child.label) ? [child] : [];
    });
    if (!summary && children.length === 0) continue;
    if (summary) claimed.add(summary.label);
    children.forEach((child) => claimed.add(child.label));
    groups.push({ label: definition.label, summary, children });
  }

  const remaining = rows.filter((row) => !claimed.has(row.label));
  if (remaining.length) groups.push({ label: "Other accounts", summary: null, children: remaining });
  return groups;
}
