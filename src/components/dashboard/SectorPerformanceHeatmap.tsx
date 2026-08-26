import { useQuery, useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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

const COMPACT_SECTOR_LABELS: Record<string, string> = {
  "basic-materials": "Materials",
  "communication-services": "Comms",
  "consumer-cyclical": "Cyclical",
  "consumer-defensive": "Defensive",
  "financial-services": "Financials",
  "real-estate": "Real estate",
};

export function compactSectorLabel(sectorKey: string) {
  return COMPACT_SECTOR_LABELS[sectorKey] ?? sectorLabel(sectorKey);
}

/**
 * Each output rectangle retains its sector's exact share of total mapped area.
 * A squarified layout groups tiles only when that keeps their aspect ratios closer to squares.
 */
export function capitalizationTreemap(tiles: CapitalizationTile[]): TreemapRect[] {
  const normalized = tiles
    .filter((tile) => Number.isFinite(tile.value) && tile.value > 0)
    .map((tile) => ({ ...tile, value: tile.value }));
  const total = normalized.reduce((sum, tile) => sum + tile.value, 0) || 1;
  const tilesByArea = [...normalized]
    .sort((a, b) => b.value - a.value)
    .map((tile) => ({ ...tile, area: (tile.value / total) * 10_000 }));
  const rectangles: TreemapRect[] = [];
  let remaining = { left: 0, top: 0, width: 100, height: 100 };
  let cursor = 0;

  const worstAspectRatio = (row: typeof tilesByArea, shortSide: number) => {
    const rowArea = row.reduce((sum, tile) => sum + tile.area, 0);
    const smallest = Math.min(...row.map((tile) => tile.area));
    const largest = Math.max(...row.map((tile) => tile.area));
    return Math.max(
      (shortSide * shortSide * largest) / (rowArea * rowArea),
      (rowArea * rowArea) / (shortSide * shortSide * smallest),
    );
  };

  while (cursor < tilesByArea.length && remaining.width > 0 && remaining.height > 0) {
    const row = [tilesByArea[cursor++]!];
    const shortSide = Math.min(remaining.width, remaining.height);
    while (cursor < tilesByArea.length) {
      const candidate = tilesByArea[cursor]!;
      if (worstAspectRatio([...row, candidate], shortSide) > worstAspectRatio(row, shortSide)) break;
      row.push(candidate);
      cursor += 1;
    }

    const rowArea = row.reduce((sum, tile) => sum + tile.area, 0);
    if (remaining.width >= remaining.height) {
      const stripWidth = rowArea / remaining.height;
      let top = remaining.top;
      row.forEach((tile) => {
        const height = tile.area / stripWidth;
        rectangles.push({ key: tile.key, left: remaining.left, top, width: stripWidth, height });
        top += height;
      });
      remaining = { ...remaining, left: remaining.left + stripWidth, width: remaining.width - stripWidth };
    } else {
      const stripHeight = rowArea / remaining.width;
      let left = remaining.left;
      row.forEach((tile) => {
        const width = tile.area / stripHeight;
        rectangles.push({ key: tile.key, left, top: remaining.top, width, height: stripHeight });
        left += width;
      });
      remaining = { ...remaining, top: remaining.top + stripHeight, height: remaining.height - stripHeight };
    }
  }

  return rectangles;
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
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const selected = selectedSector ? resolved.find(({ sectorKey }) => sectorKey === selectedSector) : undefined;
  const { data: selectedDetail } = useQuery({
    queryKey: ["sector-map-selected-detail", cfg.id, selectedSector],
    queryFn: () => overviewFn({ data: { sectorKey: selectedSector!, region: cfg.id, detailIndustryCoverage: true } }),
    enabled: Boolean(selectedSector),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
  const selectedSignal = selectedSector ? signals.find((signal) => signal.sectorKey === selectedSector) : undefined;
  const selectedQuote = selectedSignal?.symbol ? quoteBySymbol.get(selectedSignal.symbol) : undefined;

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
        <div className="heatmap-canvas heatmap-canvas-square relative mt-4 aspect-square overflow-hidden">
          {weightedSectors.map(({ sectorKey, value }) => {
            const signal = signals.find((item) => item.sectorKey === sectorKey);
            const move = signal?.symbol ? quoteBySymbol.get(signal.symbol)?.changePercent ?? null : null;
            const rect = rectangleByKey.get(sectorKey)!;
            const area = rect.width * rect.height;
            const compact = area < 1_050 || rect.width < 29;
            const micro = rect.width < 13 || rect.height < 14;
            const verticalContent = rect.width < 11 && rect.height > 24;
            const label = compact ? compactSectorLabel(sectorKey) : sectorLabel(sectorKey);
            const detail = signal?.label ?? (signal?.symbol ? "Lead-company proxy" : fmtCompact(value!.marketCap));
            return (
              <button
                type="button"
                key={sectorKey}
                title={`${sectorLabel(sectorKey)} · ${fmtCompact(value!.marketCap)}`}
                aria-pressed={selectedSector === sectorKey}
                onClick={() => setSelectedSector(sectorKey)}
                style={{
                  left: `${rect.left}%`,
                  top: `${rect.top}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`,
                }}
                aria-label={`${sectorLabel(sectorKey)} · ${move === null ? "daily movement unavailable" : `${move >= 0 ? "+" : ""}${move.toFixed(2)}%`}`}
                className={`heatmap-cell absolute overflow-hidden border border-background/60 p-1.5 sm:p-2 ${verticalContent ? "heatmap-cell-vertical" : ""} ${micro ? "heatmap-cell-micro" : ""} ${selectedSector === sectorKey ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""} ${movementClass(move)}`}
              >
                {micro ? (
                  <span className="heatmap-cell-direction" aria-hidden="true">
                    {move === null ? "•" : move >= 0 ? "▲" : "▼"}
                  </span>
                ) : (
                  <>
                    <p className={`heatmap-cell-label font-semibold leading-tight text-center ${compact ? "text-[8px] sm:text-[9px]" : "text-[9px] sm:text-[11px]"}`}>
                      {label}
                    </p>
                    <p className={`heatmap-cell-move mt-1 tabular font-semibold text-center ${compact ? "text-[10px] sm:text-xs" : "text-sm sm:text-lg"}`}>
                      {move === null ? "—" : `${move >= 0 ? "+" : ""}${move.toFixed(2)}%`}
                    </p>
                    {!compact && <p className="heatmap-cell-detail mt-1 text-[8px] opacity-75 sm:text-[10px]">{detail}</p>}
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
      {selected && (
        <div className="heatmap-detail mt-3 grid gap-3 rounded-xl border border-border/70 bg-surface/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">
          <div className="min-w-0">
            <p className="market-kicker">Selected sector</p>
            <h3 className="mt-1 text-sm font-semibold text-foreground">{sectorLabel(selected.sectorKey)}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{selected.value?.description ?? "Provider-backed sector overview with live market capitalization and one-day direction."}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right">
            <span><small>Market cap</small><b>{fmtCompact(selected.value?.marketCap)}</b></span>
            <span><small>1D move</small><b className={(selectedQuote?.changePercent ?? 0) >= 0 ? "text-positive" : "text-negative"}>{selectedQuote?.changePercent === null || selectedQuote?.changePercent === undefined ? "—" : `${selectedQuote.changePercent >= 0 ? "+" : ""}${selectedQuote.changePercent.toFixed(2)}%`}</b></span>
            <span><small>{selectedDetail?.source === "tracked" ? "Tracked companies" : "Companies"}</small><b>{(selectedDetail?.companiesCount ?? selected.value?.companiesCount)?.toLocaleString() ?? "—"}</b></span>
          </div>
        </div>
      )}
    </section>
  );
}
