import { describe, expect, it } from "vitest";
import { buildStatementHierarchy } from "@/lib/statement-hierarchy";

const table = (labels: string[]) => ({
  columns: ["2025-03-31", "2024-03-31"],
  rows: labels.map((label, index) => ({ label, values: [100 - index, 90 - index] })),
});

describe("buildStatementHierarchy", () => {
  it("places income child accounts directly under an expandable parent", () => {
    const groups = buildStatementHierarchy(table(["Operating Expense", "Research And Development", "Selling General And Administration", "Net Income"]), "income");
    const operatingExpense = groups.find((group) => group.row.label === "Operating Expense");

    expect(operatingExpense?.children.map((row) => row.label)).toEqual(["Research And Development", "Selling General And Administration"]);
    expect(groups.map((group) => group.row.label)).not.toContain("Research And Development");
  });

  it("groups balance-sheet and cash-flow child accounts without inventing missing details", () => {
    const balance = buildStatementHierarchy(table(["Current Assets", "Cash And Cash Equivalents", "Inventory", "Total Assets"]), "balance");
    const cash = buildStatementHierarchy(table(["Operating Cash Flow", "Depreciation And Amortization", "Free Cash Flow"]), "cash");

    expect(balance.find((group) => group.row.label === "Current Assets")?.children.map((row) => row.label)).toEqual(["Cash And Cash Equivalents", "Inventory"]);
    expect(cash.find((group) => group.row.label === "Operating Cash Flow")?.children.map((row) => row.label)).toEqual(["Depreciation And Amortization"]);
    expect(cash.find((group) => group.row.label === "Free Cash Flow")?.children).toEqual([]);
  });
});
