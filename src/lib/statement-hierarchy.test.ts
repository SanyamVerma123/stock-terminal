import { describe, expect, it } from "vitest";
import { buildStatementHierarchy } from "@/lib/statement-hierarchy";

const table = (labels: string[]) => ({
  columns: ["2025-03-31", "2024-03-31"],
  rows: labels.map((label, index) => ({ label, values: [100 - index, 90 - index] })),
});

describe("buildStatementHierarchy", () => {
  it("groups all related income accounts beneath major financial headings", () => {
    const groups = buildStatementHierarchy(table(["Total Revenue", "Operating Expense", "Research And Development", "Selling General And Administration", "Tax Provision", "Pretax Income", "Net Income"]), "income");
    const expenses = groups.find((group) => group.label === "Expenses");
    const tax = groups.find((group) => group.label === "Tax");

    expect(expenses?.summary?.label).toBe("Operating Expense");
    expect(expenses?.children.map((row) => row.label)).toEqual(["Research And Development", "Selling General And Administration"]);
    expect(tax?.summary?.label).toBe("Tax Provision");
    expect(tax?.children.map((row) => row.label)).toEqual(["Pretax Income"]);
    expect((groups.find((group) => group.label === "Other accounts")?.children ?? []).map((row) => row.label)).not.toContain("Research And Development");
  });

  it("groups balance-sheet and cash-flow accounts under broad statement headings", () => {
    const balance = buildStatementHierarchy(table(["Current Assets", "Cash And Cash Equivalents", "Inventory", "Total Assets"]), "balance");
    const cash = buildStatementHierarchy(table(["Operating Cash Flow", "Depreciation And Amortization", "Free Cash Flow"]), "cash");

    expect(balance.find((group) => group.label === "Assets")?.summary?.label).toBe("Total Assets");
    expect(balance.find((group) => group.label === "Assets")?.children.map((row) => row.label)).toEqual(["Current Assets", "Cash And Cash Equivalents", "Inventory"]);
    expect(cash.find((group) => group.label === "Cash from operating activities")?.children.map((row) => row.label)).toEqual(["Depreciation And Amortization"]);
    expect(cash.find((group) => group.label === "Free cash flow")?.summary?.label).toBe("Free Cash Flow");
  });
});
