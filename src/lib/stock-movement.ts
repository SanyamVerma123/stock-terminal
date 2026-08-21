export function stockMovementClass(changePercent: number | null | undefined) {
  if (typeof changePercent !== "number" || !Number.isFinite(changePercent) || changePercent === 0) return "stock-move-neutral";
  return changePercent > 0 ? "stock-move-positive" : "stock-move-negative";
}
