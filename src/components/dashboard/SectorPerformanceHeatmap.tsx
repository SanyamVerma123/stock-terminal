import { useQuery, useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DataLoading } from "@/components/ui/loading-state";
import { useMarketConfig } from "@/lib/app-state";
import { getQuotes, getSectorOverview } from "@/lib/finance.functions";
import { fmtCompact } from "@/lib/format";
import type { Quote } from "@/lib/finance-types";
import { INDIA_SECTOR_NIFTY_BENCHMARKS, SECTOR_KEYS, sectorLabel } from "@/lib/markets";

function movementClass(value: number | null) {
  if (value === null) return "border-border bg-muted/30 text-muted-foreground";
  if (value >= 1) return "border-positive/35 bg-positive/20 text-positive";
  if (value > 0) return "border-positive/25 bg-positive/10 text-positive";
  if (value <= -1) return "border-negative/35 bg-negative/20 text-negative";
  return "border-negative/25 bg-negative/10 text-negative";
}

type CapitalizationTile = { key: string; value: number };
type TreemapRect = { key: string; left: number; top: number; width: number; height: number };

/**
 * Each output rectangle retains its sector's exact share of total mapped area.
 * Rows are balanced only for readability; width × height remains proportional to market cap.
 */
export function capitalizationTreemap(tiles: CapitalizationTile[]): TreemapRect[] {
  const normalized = tiles
    .filter((tile) => Number.isFinite(tile.value) && tile.value > 0)
    .map((tile) => ({ ...tile, value: tile.value }));
  const total = normalized.reduce((sum, tile) => sum + tile.value, 0) || 1;
  const ordered = [...normalized].sort((a, b) => b.value - a.value);
  const target = total / 2;
  const firstRow: CapitalizationTile[] = [];
  const secondRow: CapitalizationTile[] = [];
  let firstTotal = 0;

  ordered.forEach((tile) => {
    if (firstTotal < target || secondRow.length === 0) {
      firstRow.push(tile);
      firstTotal += tile.value;
    } else {
      secondRow.push(tile);
    }
  });
  if (!secondRow.length && firstRow.length > 1) secondRow.push(firstRow.pop()!);

  let top = 0;
  return [firstRow, secondRow]
    .filter((row) => row.length > 0)
    .flatMap((row) => {
      const rowTotal = row.reduce((sum, tile) => sum + tile.value, 0) || 1;
      const height = (rowTotal / total) * 100;
      let left = 0;
      const rects = row.map((tile) => {
        const width = (tile.value / rowTotal) * 100;
        const rect = { key: tile.key, left, top, width, height };
        left += width;
        return rect;
      });
      top += height;
      return rects;
    });
}

export function SectorPerformanceHeatmap() {
  const cfg = useMarketConfig();
  const overviewFn = useServerFn(getSectorOverview);
  const quotesFn = useServerFn(getQuotes);
  const overviews = useQueries({
    queries: SECTOR_KEYS.map((sectorKey) => ({
      queryKey: ["sector-map", cfg.id, sectorKey],
      queryFn: () => overviewFn({ data: { sectorKey, region: cfg.id } }),
      staleTime: 300_000,
      refetchOnWindowFocus: false,
    })),
  });
  const resolved = overviews.map((query, index) => ({
    sectorKey: SECTOR_KEYS[index]!,
    value: query.data,
  }));
  const signals = resolved.map(({ sectorKey, value }) => {
    const column = value?.topCompanies.columns.find((item) => /symbol|ticker|code/i.test(item));
    const leadSymbol = column ? value?.topCompanies.rows[0]?.[column] : undefined;
    const benchmark = cfg.id === "IN" ? INDIA_SECTOR_NIFTY_BENCHMARKS[sectorKey] : undefined;
    return { sectorKey, symbol: benchmark?.symbol ?? leadSymbol, label: benchmark?.label };
  });
  const symbols = signals
    .map((signal) => signal.symbol)
    .filter((symbol): symbol is string => Boolean(symbol));
  const { data: quotes } = useQuery({
    queryKey: ["sector-map-moves", symbols.join(",")],
    queryFn: () => quotesFn({ data: { symbols: symbols.join(",") } }),
    enabled: symbols.length > 0,
    staleTime: 30_000,
  });
  const quoteBySymbol = new Map<string, Quote>(
    ((quotes ?? []) as Quote[]).map((quote) => [quote.symbol, quote]),
  );
  const weightedSectors = resolved.filter(
    ({ value }) => typeof value?.marketCap === "number" && Number.isFinite(value.marketCap) && value.marketCap > 0,
  );
  const rectangles = capitalizationTreemap(
    weightedSectors.map(({ sectorKey, value }) => ({ key: sectorKey, value: value!.marketCap! })),
  );
  const rectangleByKey = new Map(rectangles.map((rectangle) => [rectangle.key, rectangle]));
  const coverage = weightedSectors.length;
  const canDrawWeightedMap = coverage >= 2;

  return (
    <section className="heatmap-intelligence rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="market-kicker">Sector performance map</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Market weight and direction by sector
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            Tile area is proportional to provider-reported sector market capitalization; color shows the live one-day direction.
          </p>
        </div>
        <span className="heatmap-ready rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
          {coverage}/{SECTOR_KEYS.length} weighted
        </span>
      </div>

      {!canDrawWeightedMap ? (
        <div className="heatmap-canvas mt-4 aspect-square overflow-hidden">
          <DataLoading
            compact
            label="Sizing sector tiles by market capitalization"
            detail="Waiting for enough provider-reported sector capitalization to draw an accurate market-weighted map."
          />
        </div>
      ) : (
        <div className="heatmap-canvas relative mt-4 aspect-square overflow-hidden">
          {weightedSectors.map(({ sectorKey, value }) => {
            const signal = signals.find((item) => item.sectorKey === sectorKey);
            const move = signal?.symbol ? quoteBySymbol.get(signal.symbol)?.changePercent ?? null : null;
            const rect = rectangleByKey.get(sectorKey)!;
            const area = rect.width * rect.height;
            const compact = area < 800;
            const detail = signal?.label ?? (signal?.symbol ? "Lead-company proxy" : fmtCompact(value!.marketCap));
            return (
              <article
                key={sectorKey}
                title={`${sectorLabel(sectorKey)} · ${fmtCompact(value!.marketCap)}`}
                style={{
                  left: `${rect.left}%`,
                  top: `${rect.top}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`,
                }}
                className={`heatmap-cell absolute overflow-hidden border border-background/60 p-1.5 sm:p-2 ${movementClass(move)}`}
              >
                <p className={`truncate font-semibold leading-tight ${compact ? "text-[7px] sm:text-[9px]" : "text-[9px] sm:text-[11px]"}`}>
                  {sectorLabel(sectorKey)}
                </p>
                <p className={`mt-1 truncate tabular font-semibold ${compact ? "text-[10px] sm:text-xs" : "text-sm sm:text-lg"}`}>
                  {move === null ? "—" : `${move >= 0 ? "+" : ""}${move.toFixed(2)}%`}
                </p>
                {!compact && <p className="mt-1 truncate text-[8px] opacity-75 sm:text-[10px]">{detail}</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
