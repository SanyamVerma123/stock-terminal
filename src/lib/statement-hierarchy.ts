import type { StatementTable } from "@/lib/finance-types";

export type FinancialStatementKey = "income" | "balance" | "cash";

const STATEMENT_ACCOUNT_CHILDREN: Record<FinancialStatementKey, Record<string, string[]>> = {
  income: {
    "Operating Expense": ["Research And Development", "Selling General And Administration", "Other Operating Expenses"],
    "Operating Income": ["Gross Profit", "Operating Expense", "Research And Development"],
    "Net Income": ["Pretax Income", "Tax Provision", "Net Income Common Stockholders"],
  },
  balance: {
    "Current Assets": ["Cash And Cash Equivalents", "Receivables", "Inventory", "Other Current Assets"],
    "Total Debt": ["Current Debt", "Long Term Debt", "Current Debt And Capital Lease Obligation", "Long Term Debt And Capital Lease Obligation"],
    "Current Liabilities": ["Accounts Payable", "Current Debt", "Other Current Liabilities"],
    "Stockholders Equity": ["Capital Stock", "Retained Earnings", "Treasury Stock"],
  },
  cash: {
    "Operating Cash Flow": ["Depreciation And Amortization", "Change In Working Capital", "Other Non Cash Items"],
    "Investing Cash Flow": ["Capital Expenditure", "Net Investment Purchase And Sale", "Purchase Of Investment"],
    "Financing Cash Flow": ["Repayment Of Debt", "Issuance Of Debt", "Cash Dividends Paid", "Repurchase Of Capital Stock"],
  },
};

export type StatementGroup = { row: StatementTable["rows"][number]; children: StatementTable["rows"][number][] };

export function buildStatementHierarchy(statement: StatementTable | undefined, statementKey: FinancialStatementKey): StatementGroup[] {
  const rows = statement?.rows ?? [];
  const byLabel = new Map(rows.map((row) => [row.label, row]));
  const groups = STATEMENT_ACCOUNT_CHILDREN[statementKey];
  const claimedChildren = new Set<string>();
  const childrenByParent = new Map<string, StatementTable["rows"][number][]>();

  for (const [parentLabel, childLabels] of Object.entries(groups)) {
    if (!byLabel.has(parentLabel)) continue;
    const children = childLabels.flatMap((childLabel) => {
      const child = byLabel.get(childLabel);
      return child && child.label !== parentLabel && !claimedChildren.has(child.label) ? [child] : [];
    });
    if (children.length) {
      children.forEach((child) => claimedChildren.add(child.label));
      childrenByParent.set(parentLabel, children);
    }
  }

  return rows.flatMap((row) => {
    if (claimedChildren.has(row.label)) return [];
    return [{ row, children: childrenByParent.get(row.label) ?? [] }];
  });
}
