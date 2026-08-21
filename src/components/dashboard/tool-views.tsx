import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, ExternalLink, Globe2, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import {
  getEstimates,
  getMarketCalendar,
  getMarketStatus,
  getQuotes,
  getMarketSummary,
  getOptionChain,
  getOptionExpirations,
  getOwnership,
  getSecFilings,
  getSectorOverview,
  getIndustryOverview,
  getSustainability,
  getValuationMeasures,
  listPredefinedScreeners,
  listSectors,
  runEquityScreener,
  runEtfScreener,
  runPredefinedScreener,
  getFastMovers,
  searchNews,
} from "@/lib/finance.functions";
import { DataTable, Panel, ScreenerTable, StatementView } from "./tables";
import { DeltaBadge } from "@/components/finance/DeltaBadge";
import { TickerAutocomplete } from "@/components/finance/TickerAutocomplete";
import { fmtCompact, fmtPrice, timeAgo } from "@/lib/format";
import { useAppState, useMarketConfig, EMPTY_FILTERS, type ScreenerFilters } from "@/lib/app-state";
import { SECTOR_INDUSTRIES, SECTOR_KEYS, sectorLabel } from "@/lib/markets";
import { canonicalSectorKey } from "@/lib/sector-normalize";
import { profilesForRegion } from "@/lib/sector-universe";
import { cn } from "@/lib/utils";
import { IndustryHeatmap } from "@/components/dashboard/industry-heatmap/IndustryHeatmap";
import { DataLoading } from "@/components/ui/loading-state";
import "@/sector-analysis.css";
import type { Quote, ScreenerRow } from "@/lib/finance-types";

const field =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/60";

function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "true" : "false"}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Ticker picker scoped to the watchlist — research tools only run on watched names. */
function WatchSymbolPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { watchlist, addToWatchlist } = useAppState();
  if (watchlist.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-foreground">Add a stock to your watchlist to use this tool.</p>
        <TickerAutocomplete className="mt-3 max-w-sm" onSelect={(s, n) => addToWatchlist(s, n)} />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TickerAutocomplete
        className="w-64"
        value={value}
        scope={watchlist.map((w) => ({ symbol: w.symbol, name: w.name }))}
        onSelect={onChange}
        placeholder="Watchlist ticker"
      />
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {watchlist.slice(0, 12).map((w) => (
          <Chip key={w.symbol} active={w.symbol === value} onClick={() => onChange(w.symbol)}>
            {w.symbol}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function useWatchSymbol() {
  const { watchlist } = useAppState();
  const cfg = useMarketConfig();
  const fallback = watchlist[0]?.symbol ?? cfg.equities[0] ?? "AAPL";
  const [symbol, setSymbol] = useState(fallback);

  useEffect(() => {
    setSymbol((current) => {
      if (watchlist.some((item) => item.symbol === current)) return current;
      return watchlist[0]?.symbol ?? cfg.equities[0] ?? "AAPL";
    });
  }, [cfg.equities, cfg.id, watchlist]);

  return [symbol, setSymbol] as const;
}

/* ---------------- Movers ---------------- */

const PRIMARY_MOVER_NAMES = ["day_gainers", "day_losers", "most_actives"] as const;

function MoverCardDeck({ rows }: { rows: ScreenerRow[] }) {
  const deckRows = rows.slice(0, 25);
  const max = Math.max(...deckRows.map(row => Math.abs(row.changePercent ?? 0)), 1);
  return <div className="mover-card-deck" aria-label="Scrollable market mover cards">{deckRows.map((row) => { const hasPrice = row.price !== null && row.price !== undefined; const hasChange = row.changePercent !== null && row.changePercent !== undefined; const positive = (row.changePercent ?? 0) >= 0; const width = `${Math.max(12, Math.min(100, Math.abs(row.changePercent ?? 0) / max * 100))}%`; return <a className="mover-card" href={`/stock/${encodeURIComponent(row.symbol)}`} key={row.symbol}><div className="mover-card-main"><div className="min-w-0"><b>{row.symbol}</b><small title={row.name}>{row.name || "Company name unavailable"}</small></div>{hasPrice ? <strong>{fmtPrice(row.price, row.currency)}</strong> : <span className="mover-quote-status">Live quote syncing</span>}</div><div className="mover-card-footer"><span className="mover-performance"><i className={positive ? "positive" : "negative"} style={{ width }}/></span>{hasChange ? <DeltaBadge value={row.changePercent} size="sm"/> : <span className="mover-change-pending">Awaiting price action</span>}</div></a>; })}</div>;
}

export function MoversView({ initialName = "day_gainers" }: { initialName?: string } = {}) {
  const listPresetsFn = useServerFn(listPredefinedScreeners);
  const runPresetFn = useServerFn(runPredefinedScreener);
  const fastMoversFn = useServerFn(getFastMovers);
  const cfg = useMarketConfig();
  const [name, setName] = useState(initialName);
  const { data: listedPresets } = useQuery({
    queryKey: ["predefined-screeners"],
    queryFn: () => listPresetsFn(),
    staleTime: 3_600_000,
  });
  const availablePresets = Array.from(
    new Set([...PRIMARY_MOVER_NAMES, ...(listedPresets ?? [])]),
  );
  const primaryName = PRIMARY_MOVER_NAMES.includes(name as (typeof PRIMARY_MOVER_NAMES)[number])
    ? (name as (typeof PRIMARY_MOVER_NAMES)[number])
    : null;
  const {
    data: fastMovers,
    isLoading: loadingFastMovers,
    isFetching: fetchingFastMovers,
  } = useQuery({
    queryKey: ["fresh-fast-movers", cfg.region, 25],
    queryFn: () => fastMoversFn({ data: { size: 25, region: cfg.region } }),
    enabled: primaryName !== null,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const {
    data: presetRows,
    isLoading: loadingPreset,
    isFetching: fetchingPreset,
  } = useQuery({
    queryKey: ["predefined-mover", name, cfg.region],
    queryFn: () => runPresetFn({ data: { name, size: 25, region: cfg.region } }),
    enabled: primaryName === null,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const data = primaryName ? fastMovers?.[primaryName] : presetRows;
  const isLoading = primaryName ? loadingFastMovers : loadingPreset;
  const isFetching = primaryName ? fetchingFastMovers : fetchingPreset;

  return (
    <div className="market-movers space-y-4">
      <div className="market-mover-intro">
        <div>
          <p className="market-kicker">Live ranking desk</p>
          <h2>{cfg.label} market movers</h2>
          <p>Switch between fresh directional and activity-led screens.</p>
        </div>
        <span className="market-mover-count">{data?.length ?? 0} names</span>
      </div>
      <div className="market-mover-rail no-scrollbar">
        {availablePresets.map((n) => (
          <Chip className="mover-tab" key={n} active={n === name} onClick={() => setName(n)}>
            {n.replace(/_/g, " ")}
          </Chip>
        ))}
      </div>
      <Panel title={name.replace(/_/g, " ")} subtitle="Fresh provider-ranked market screener">
        {isLoading || isFetching || !data || data.length === 0 ? <DataLoading compact label={`Ranking ${name.replace(/_/g, " ")}`} detail="Retrieving the provider-defined live ranked universe and quote fields for this screener." /> : <MoverCardDeck rows={data} />}
      </Panel>
    </div>
  );
}

/* ---------------- Screener builder ---------------- */

function Num({
  label,
  value,
  onChange,
  placeholder,
  width = "w-32",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string;
}) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "any"}
        className={cn(field, "mt-1 block", width)}
      />
    </label>
  );
}

type ScreenParams = Parameters<typeof runEquityScreener>[0]["data"];

function toParams(f: ScreenerFilters): ScreenParams {
  const out: Record<string, string | number | boolean> = {
    region: f.region,
    size: f.size,
    sortField: f.sortField,
    sortAscending: f.sortAscending,
  };
  const num = (k: string, v: string) => {
    const n = Number(v);
    if (v.trim() !== "" && Number.isFinite(n)) out[k] = n;
  };
  const str = (k: string, v: string) => {
    if (v.trim() !== "") out[k] = v.trim();
  };
  str("sector", canonicalSectorKey(f.sector));
  str("industry", f.industry ?? "");
  str("exchange", f.exchange);
  str("nameContains", f.nameContains);
  num("minMarketCap", f.minMarketCap);
  num("maxMarketCap", f.maxMarketCap);
  num("minPe", f.minPe);
  num("maxPe", f.maxPe);
  num("minGrowth", f.minGrowth);
  num("minDividendYield", f.minDividendYield);
  num("minPrice", f.minPrice);
  num("maxPrice", f.maxPrice);
  num("minVolume", f.minVolume);
  num("minChangePercent", f.minChangePercent);
  num("maxChangePercent", f.maxChangePercent);
  return out as ScreenParams;
}

/** Read-only run of a saved screener preset. */
export function SavedScreenerView({ screenerId, filters, name }: { screenerId: string; filters: ScreenerFilters; name: string }) {
  const runFn = useServerFn(runEquityScreener);
  const { screenerAlertRules, setScreenerAlertRules, browserNotificationPermission, requestBrowserNotifications } = useAppState();
  const rule = screenerAlertRules.find((item) => item.screenerId === screenerId);
  const params = toParams(filters);
  const { data, isLoading } = useQuery({
    queryKey: ["saved-screen", JSON.stringify(params)],
    queryFn: () => runFn({ data: params }),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-card/55 p-4">
      <div><p className="text-sm font-medium text-foreground">Match alerts</p><p className="mt-1 text-xs text-muted-foreground">Check this saved screen while the terminal is active; changed results appear in your cloud-synced inbox and can trigger a browser alert on this device.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setScreenerAlertRules(rule ? screenerAlertRules.filter((item) => item.id !== rule.id) : [...screenerAlertRules, { id: crypto.randomUUID(), screenerId, enabled: true, browserEnabled: true, emailEnabled: false }])} className={cn("h-9 rounded-lg border px-3 text-xs font-medium", rule?.enabled ? "border-positive/40 bg-positive/10 text-positive" : "border-primary/40 text-primary")}>{rule?.enabled ? "Alert enabled" : "Enable match alert"}</button>
        {rule?.enabled && <button type="button" onClick={() => setScreenerAlertRules(screenerAlertRules.map((item) => item.id === rule.id ? { ...item, browserEnabled: !item.browserEnabled } : item))} className="h-9 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:text-foreground">Browser: {rule.browserEnabled ? "on" : "off"}</button>}
        {rule?.enabled && browserNotificationPermission !== "granted" && browserNotificationPermission !== "unsupported" ? <button type="button" onClick={() => void requestBrowserNotifications()} className="h-9 rounded-lg border border-primary/40 px-3 text-xs text-primary">Allow browser alerts</button> : null}
      </div>
    </div>
    <Panel title={name} subtitle="Saved custom screener — re-run live on every visit"><ScreenerTable rows={data} loading={isLoading} /></Panel>
  </div>;
}

export function ProScreenerView() {
  const cfg = useMarketConfig();
  const { saveScreener, screeners, deleteScreener } = useAppState();
  const runFn = useServerFn(runEquityScreener);
  const sectorsFn = useServerFn(listSectors);
  const { data: sectors } = useQuery({
    queryKey: ["sectors"],
    queryFn: () => sectorsFn(),
    staleTime: 600_000,
  });

  const [f, setF] = useState<ScreenerFilters>({ ...EMPTY_FILTERS, region: cfg.region });
  const [runs, setRuns] = useState(0);

  useEffect(() => {
    setF((current) =>
      current.region === cfg.region ? current : { ...current, region: cfg.region },
    );
  }, [cfg.region]);
  const [name, setName] = useState("");
  const set = <K extends keyof ScreenerFilters>(k: K, v: ScreenerFilters[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const params = toParams(f);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["proscreen", runs, JSON.stringify(params)],
    queryFn: () => runFn({ data: params }),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const sectorOptions = Array.from(
    new Set((sectors && sectors.length > 0 ? sectors : [...SECTOR_KEYS]).map(canonicalSectorKey)),
  ).filter(Boolean);
  const industryOptions = f.sector ? (SECTOR_INDUSTRIES[f.sector] ?? []) : [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted-foreground">
            Region
            <select
              value={f.region}
              onChange={(e) => set("region", e.target.value)}
              className={cn(field, "mt-1 block w-24")}
            >
              {["us", "in", "gb", "de", "jp", "hk", "ca", "au", "fr"].map((r) => (
                <option key={r} value={r}>
                  {r.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Sector
            <select
              value={f.sector}
              onChange={(e) =>
                setF((previous) => ({ ...previous, sector: e.target.value, industry: "" }))
              }
              className={cn(field, "mt-1 block w-48")}
            >
              <option value="">Any sector</option>
              {sectorOptions.map((s) => (
                <option key={s} value={s}>
                  {sectorLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Industry
            <select
              value={f.industry ?? ""}
              onChange={(e) => set("industry", e.target.value)}
              disabled={!f.sector}
              className={cn(field, "mt-1 block w-56 disabled:cursor-not-allowed disabled:opacity-55")}
            >
              <option value="">{f.sector ? "Any industry" : "Choose a sector first"}</option>
              {industryOptions.map((industry) => (
                <option key={industry} value={industry}>
                  {sectorLabel(industry)}
                </option>
              ))}
            </select>
          </label>
          <Num
            label="Min market cap"
            value={f.minMarketCap}
            onChange={(v) => set("minMarketCap", v)}
            width="w-36"
          />
          <Num
            label="Max market cap"
            value={f.maxMarketCap}
            onChange={(v) => set("maxMarketCap", v)}
            width="w-36"
          />
          <Num label="Min P/E" value={f.minPe} onChange={(v) => set("minPe", v)} width="w-24" />
          <Num label="Max P/E" value={f.maxPe} onChange={(v) => set("maxPe", v)} width="w-24" />
          <Num
            label="Min growth %"
            value={f.minGrowth}
            onChange={(v) => set("minGrowth", v)}
            width="w-28"
          />
          <Num
            label="Min div. yield %"
            value={f.minDividendYield}
            onChange={(v) => set("minDividendYield", v)}
            width="w-32"
          />
          <Num
            label="Min price"
            value={f.minPrice}
            onChange={(v) => set("minPrice", v)}
            width="w-24"
          />
          <Num
            label="Max price"
            value={f.maxPrice}
            onChange={(v) => set("maxPrice", v)}
            width="w-24"
          />
          <Num
            label="Min volume"
            value={f.minVolume}
            onChange={(v) => set("minVolume", v)}
            width="w-32"
          />
          <Num
            label="Min day %"
            value={f.minChangePercent}
            onChange={(v) => set("minChangePercent", v)}
            width="w-24"
          />
          <Num
            label="Max day %"
            value={f.maxChangePercent}
            onChange={(v) => set("maxChangePercent", v)}
            width="w-24"
          />
          <label className="text-xs text-muted-foreground">
            Exchange contains
            <input
              value={f.exchange}
              onChange={(e) => set("exchange", e.target.value)}
              placeholder="NMS, NSI…"
              className={cn(field, "mt-1 block w-32")}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Name contains
            <input
              value={f.nameContains}
              onChange={(e) => set("nameContains", e.target.value)}
              placeholder="any"
              className={cn(field, "mt-1 block w-36")}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Sort by
            <select
              value={f.sortField}
              onChange={(e) => set("sortField", e.target.value)}
              className={cn(field, "mt-1 block w-44")}
            >
              {[
                ["intradaymarketcap", "Market cap"],
                ["percentchange", "Day change %"],
                ["dayvolume", "Volume"],
                ["peratio.lasttwelvemonths", "P/E"],
                ["intradayprice", "Price"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Order
            <select
              value={f.sortAscending ? "asc" : "desc"}
              onChange={(e) => set("sortAscending", e.target.value === "asc")}
              className={cn(field, "mt-1 block w-28")}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
          <Num
            label="Results"
            value={String(f.size)}
            onChange={(v) => set("size", Number(v) || 50)}
            width="w-24"
          />

          <button
            type="button"
            onClick={() => setRuns((r) => r + 1)}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Run screen
          </button>
          <button
            type="button"
            onClick={() => setF({ ...EMPTY_FILTERS, region: cfg.region })}
            className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this screener"
            className={cn(field, "w-56")}
          />
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => {
              saveScreener({ id: crypto.randomUUID(), name: name.trim(), filters: f });
              setName("");
            }}
            className="h-9 rounded-lg border border-primary/50 bg-primary/10 px-4 text-sm font-medium text-primary disabled:opacity-50"
          >
            Save to presets
          </button>
          {screeners.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
            >
              <button
                type="button"
                onClick={() => setF(s.filters)}
                className="hover:text-foreground"
              >
                {s.name}
              </button>
              <button
                type="button"
                onClick={() => deleteScreener(s.id)}
                className="hover:text-negative"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <Panel title="Screen results" subtitle="Live equity screener from the market data service">
        <ScreenerTable rows={data} loading={isLoading || isFetching} />
      </Panel>
    </div>
  );
}

export function EtfScreenerView() {
  const cfg = useMarketConfig();
  const fn = useServerFn(runEtfScreener);
  const [region, setRegion] = useState(cfg.region);

  useEffect(() => {
    setRegion(cfg.region);
  }, [cfg.region]);
  const { data, isLoading } = useQuery({
    queryKey: ["etfscreen", region],
    queryFn: () => fn({ data: { region, size: 30 } }),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["us", "in", "gb"].map((r) => (
          <Chip key={r} active={r === region} onClick={() => setRegion(r)}>
            {r.toUpperCase()}
          </Chip>
        ))}
      </div>
      <Panel title="ETF screener">
        <ScreenerTable rows={data} loading={isLoading} />
      </Panel>
    </div>
  );
}

/* ---------------- Sectors & industries ---------------- */

function numeric(v: string | undefined) {
  if (!v) return null;
  const n = Number(String(v).replace(/[%,+]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function readableIndustryLabel(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function IndustryMixPieChart({ table }: { table?: { columns: string[]; rows: Record<string, string>[] } | undefined }) {
  if (!table || table.rows.length === 0) return <p className="p-5 text-sm text-muted-foreground">No industry mix is available yet.</p>;
  const label = table.columns[0] ?? "Industry";
  const value = table.columns.find((column) => /weight|share|market cap/i.test(column)) ?? table.columns[1] ?? label;
  const raw = table.rows.map((row) => ({ name: readableIndustryLabel(row[label] ?? "Industry"), value: numeric(row[value]) })).filter((row): row is { name: string; value: number } => row.value !== null && row.value > 0);
  const total = raw.reduce((sum, row) => sum + row.value, 0);
  if (total <= 0) return <p className="p-5 text-sm text-muted-foreground">No numeric industry mix is available yet.</p>;
  const data = raw.map((row) => ({ ...row, percentage: (row.value / total) * 100 }));
  const colors = ["#168A5B", "#259B74", "#4BB184", "#77C796", "#3A7D6A", "#C88C3D", "#6588B5"];
  return <div className="industry-mix-layout"><div className="industry-mix-chart" aria-label="Industry market mix pie chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Tooltip formatter={(_, __, item) => [`${Number(item.payload.percentage).toFixed(1)}%`, item.payload.name]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} /><Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={16} outerRadius={96} paddingAngle={3} cornerRadius={8} stroke="none" startAngle={90} endAngle={-270}>{data.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Pie></PieChart></ResponsiveContainer></div><div className="industry-mix-legend">{data.map((entry, index) => <div key={entry.name}><span style={{ background: colors[index % colors.length] }} /><b title={entry.name}>{entry.name}</b><small>{entry.percentage.toFixed(1)}%</small></div>)}</div></div>;
}

/** Horizontal bar chart from a generic table column. */
export function TableBarChart({
  table,
  labelKey,
  valueKey,
  height = 280,
}: {
  table?: { columns: string[]; rows: Record<string, string>[] } | undefined;
  labelKey?: string;
  valueKey?: string;
  height?: number;
}) {
  if (!table || table.rows.length === 0)
    return <p className="p-5 text-sm text-muted-foreground">No data to plot.</p>;
  const label = labelKey ?? table.columns[0]!;
  const value =
    valueKey ??
    table.columns.find((c) => /change|perf|weight|share|return|%/i.test(c)) ??
    table.columns[1] ??
    table.columns[0]!;
  const data = table.rows
    .map((r) => ({
      name: /industry/i.test(label) ? readableIndustryLabel(r[label] ?? "") : r[label] ?? "",
      value: numeric(r[value]),
    }))
    .filter((d): d is { name: string; value: number } => d.value !== null)
    .slice(0, 15);
  if (data.length === 0)
    return <p className="p-5 text-sm text-muted-foreground">No numeric column to plot.</p>;

  return (
    <div className="bar-chart-surface p-4" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16, top: 8, bottom: 8 }} barCategoryGap="26%">
          <defs><linearGradient id="bar-positive" x1="0" x2="1"><stop offset="0%" stopColor="var(--positive)" stopOpacity=".68"/><stop offset="100%" stopColor="var(--positive)" stopOpacity="1"/></linearGradient><linearGradient id="bar-negative" x1="0" x2="1"><stop offset="0%" stopColor="var(--negative)" stopOpacity=".64"/><stop offset="100%" stopColor="var(--negative)" stopOpacity="1"/></linearGradient></defs>
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in oklab,var(--primary) 9%,transparent)" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[9, 9, 9, 9]} background={{ fill: "color-mix(in oklab,var(--muted) 46%,transparent)", radius: 9 }}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.value >= 0 ? "url(#bar-positive)" : "url(#bar-negative)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectorPulseVisual({ quotes }: { quotes: Quote[] }) {
  const moving = quotes.filter((quote) => quote.changePercent !== null && quote.changePercent !== undefined);
  const advancing = moving.filter((quote) => (quote.changePercent ?? 0) >= 0);
  const declining = moving.filter((quote) => (quote.changePercent ?? 0) < 0);
  const averageMove = moving.length ? moving.reduce((sum, quote) => sum + (quote.changePercent ?? 0), 0) / moving.length : null;
  const largest = [...quotes].filter((quote) => quote.marketCap !== null).sort((left, right) => (right.marketCap ?? 0) - (left.marketCap ?? 0))[0];
  const scatterData = moving.filter((quote) => (quote.marketCap ?? 0) > 0).map((quote) => ({ symbol: quote.symbol, marketCap: quote.marketCap ?? 0, move: quote.changePercent ?? 0, z: Math.max(18, Math.log10(Math.max(quote.marketCap ?? 1, 1)) * 10) })).slice(0, 25);
  const breadth = moving.length ? (advancing.length / moving.length) * 100 : 0;
  return (
    <section className="sector-pulse-visual" aria-labelledby="sector-pulse-title">
      <div className="sector-pulse-heading"><div><p className="market-kicker">Sector pulse</p><h3 id="sector-pulse-title">Breadth, leadership, and size</h3></div><span>{moving.length ? `${moving.length} live constituents` : "Live quotes syncing"}</span></div>
      <div className="sector-pulse-grid">
        <article className="sector-breadth-card"><p>Market breadth</p>{moving.length ? <><strong>{advancing.length}<small> advancing</small></strong><div className="sector-breadth-track"><i style={{ width: `${breadth}%` }}/></div><div><span>{declining.length} declining</span><b>{breadth.toFixed(0)}% positive</b></div></> : <p className="sector-pulse-empty">Awaiting constituent price changes.</p>}</article>
        <article className="sector-snapshot-card"><p>Average 1D move</p><strong className={cn(averageMove !== null && averageMove < 0 && "negative")}>{averageMove === null ? "—" : `${averageMove >= 0 ? "+" : ""}${averageMove.toFixed(2)}%`}</strong><small>Equal-weight across available sector quotes</small></article>
        <article className="sector-snapshot-card"><p>Largest tracked company</p><strong>{largest?.symbol ?? "—"}</strong><small>{largest?.marketCap ? fmtCompact(largest.marketCap) : "Market cap unavailable"}</small></article>
        <article className="sector-scatter-card"><div><p>Size vs. daily direction</p><small>Bubble size reflects market capitalization</small></div>{scatterData.length >= 2 ? <div className="sector-scatter-frame"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: -14 }}><CartesianGrid stroke="var(--border)" strokeOpacity={.45} strokeDasharray="3 6"/><XAxis type="number" dataKey="marketCap" name="Market cap" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(number) => fmtCompact(Number(number))}/><YAxis type="number" dataKey="move" name="1D move" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(number) => `${number}%`}/><ZAxis type="number" dataKey="z" range={[56, 250]}/><ReferenceLine y={0} stroke="var(--border)"/><Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(number: number | string, name: string) => name === "Market cap" ? fmtCompact(Number(number)) : `${Number(number).toFixed(2)}%`}/><Scatter name="Companies" data={scatterData} fill="var(--primary)" fillOpacity={.72}/></ScatterChart></ResponsiveContainer></div> : <p className="sector-pulse-empty">Two or more live company quotes are needed for this comparison.</p>}</article>
      </div>
    </section>
  );
}

function IndustrySignalDeck({ table, selectedIndustry, onSelect }: { table: { columns: string[]; rows: Record<string, string>[] }; selectedIndustry: string | null; onSelect: (industry: string) => void }) {
  const label = table.columns[0] ?? "Industry";
  const share = table.columns.find((column) => /weight|share|market cap/i.test(column)) ?? table.columns[1] ?? "";
  return <div className="industry-signal-deck">{table.rows.slice(0, 8).map((row) => { const industry = row[label] ?? "Industry"; return <button key={industry} type="button" onClick={() => onSelect(industry)} className={cn(selectedIndustry === industry && "is-active")}><span>{readableIndustryLabel(industry)}</span><b>{row[share] ?? "—"}</b><small>{selectedIndustry === industry ? "Open detail" : "Inspect industry"}</small></button>; })}</div>;
}

export function SectorsView() {
  const overviewFn = useServerFn(getSectorOverview);
  const industryFn = useServerFn(getIndustryOverview);
  const quotesFn = useServerFn(getQuotes);
  const cfg = useMarketConfig();
  const [sector, setSector] = useState("technology");
  const [industry, setIndustry] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sector", sector, cfg.id],
    queryFn: () => overviewFn({ data: { sectorKey: sector, region: cfg.id } }),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const { data: ind, isLoading: isIndustryLoading } = useQuery({
    queryKey: ["industry", industry, cfg.id],
    queryFn: () => industryFn({ data: { industryKey: industry!, region: cfg.id } }),
    enabled: Boolean(industry),
    staleTime: 300_000,
  });
  const sectorSymbolColumn = data?.topCompanies.columns.find((column) => /symbol|ticker|code/i.test(column)) ?? "Symbol";
  const sectorSymbols = data?.topCompanies.rows
    .map((row) => row[sectorSymbolColumn])
    .filter((symbol): symbol is string => Boolean(symbol)) ?? [];
  const { data: sectorQuotes, isLoading: isSectorQuotesLoading } = useQuery({
    queryKey: ["sector-live-quotes", cfg.id, sectorSymbols.join(",")],
    queryFn: () => quotesFn({ data: { symbols: sectorSymbols.join(",") } }),
    enabled: Boolean(sectorSymbols.length > 0),
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const quoteBySymbol = new Map((sectorQuotes ?? []).map((quote) => [quote.symbol, quote]));
  const totalTrackedMarketCap = (sectorQuotes ?? []).reduce(
    (total, quote) => total + (quote.marketCap ?? 0),
    0,
  );
  const liveMarketCap = data?.marketCap ?? (totalTrackedMarketCap > 0 ? totalTrackedMarketCap : null);
  const liveCompanyTable = data ? {
    columns: [...new Set([...data.topCompanies.columns, "Price", "Market Cap", "Market Weight"])],
    rows: data.topCompanies.rows.map((row) => {
      const quote: Quote | undefined = quoteBySymbol.get(row[sectorSymbolColumn] ?? "");
      const weight = quote?.marketCap && totalTrackedMarketCap > 0
        ? (quote.marketCap / totalTrackedMarketCap) * 100
        : null;
      return {
        ...row,
        Price: quote?.price === null || quote?.price === undefined
          ? isSectorQuotesLoading ? "Syncing live quote" : "Live quote unavailable"
          : fmtPrice(quote.price, quote.currency),
        "Market Cap": quote?.marketCap === null || quote?.marketCap === undefined
          ? isSectorQuotesLoading ? "Syncing live quote" : "Live quote unavailable"
          : fmtCompact(quote.marketCap),
        "Market Weight": weight === null
          ? isSectorQuotesLoading ? "Syncing live quote" : "Live quote unavailable"
          : `${weight.toFixed(2)}%`,
      };
    }),
  } : undefined;
  const matchingProfiles = profilesForRegion(cfg.id).filter(
    (profile) => canonicalSectorKey(profile.sector) === sector,
  );
  const industryCounts = matchingProfiles.reduce<Map<string, number>>((counts, profile) => {
    counts.set(profile.industry, (counts.get(profile.industry) ?? 0) + 1);
    return counts;
  }, new Map());
  const representativeIndustries: Record<string, string>[] = Array.from(industryCounts, ([industryName, count]) => ({
    Industry: industryName,
    "Tracked Share": `${((count / Math.max(matchingProfiles.length, 1)) * 100).toFixed(2)}%`,
  }));
  const industryTable: { columns: string[]; rows: Record<string, string>[] } = data?.industries.rows.length
    ? data.industries
    : { columns: ["Industry", "Tracked Share"], rows: representativeIndustries };
  const providedIndustries = industryTable.columns[0]
    ? industryTable.rows.map((row) => row[industryTable.columns[0]!]).filter((value): value is string => Boolean(value && value !== "—"))
    : [];
  const industryOptions = data?.source === "provider" && providedIndustries.length > 0
    ? [...new Set(providedIndustries)]
    : [...new Set(matchingProfiles.map((profile) => profile.industry))];

  return (
    <div className="sector-workspace space-y-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {SECTOR_KEYS.map((s) => (
          <Chip
            key={s}
            active={s === sector}
            onClick={() => {
              setSector(s);
              setIndustry(null);
            }}
          >
            {sectorLabel(s)}
          </Chip>
        ))}
      </div>

      <section className="sector-intelligence-hero">
        <div><p className="market-kicker">Sector intelligence lab</p><h2>{sectorLabel(sector)} research desk</h2><p>Move beyond the dashboard heat map with industry structure, constituent breadth, market-cap leadership, and company-level drilldowns.</p></div>
        <div className="sector-hero-status"><span>{cfg.label}</span><b>{data?.source === "provider" ? "Provider-ranked" : "Representative coverage"}</b><small>{data?.coverageStatus ?? "Syncing coverage"}</small></div>
      </section>

      {data ? (
        <>
        <div className="sector-kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ...(liveMarketCap !== null ? [["Market cap", fmtCompact(liveMarketCap)]] : []),
            [data.source === "tracked" ? "Tracked companies" : "Companies", data.companiesCount?.toLocaleString() ?? "—"],
            ["Industries", data.industriesCount?.toLocaleString() ?? "—"],
            ...(data.marketWeight !== null ? [["Market weight", `${(data.marketWeight * 100).toFixed(1)}%`]] : []),
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="tabular mt-1 text-lg font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

      <SectorPulseVisual quotes={sectorQuotes ?? []} />

      {data.description && (
        <p className="rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
          {data.description}
        </p>
      )}

      <div
        className={cn(
          "rounded-xl border px-3 py-2 text-xs leading-5",
          data.coverageStatus === "full"
            ? "border-positive/20 bg-positive/[0.05] text-positive"
            : data.coverageStatus === "partial"
              ? "border-amber-500/25 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300"
              : "border-border bg-muted/25 text-muted-foreground",
        )}
      >
        {data.coverageStatus === "full"
          ? `Provider coverage: all ${data.topCompanies.rows.length} returned companies are displayed.`
          : data.coverageStatus === "partial"
            ? `Provider-ranked coverage: showing ${data.topCompanies.rows.length} returned companies from a ${data.companiesCount?.toLocaleString() ?? "larger"} company classification.`
            : `Representative coverage: ${data.topCompanies.rows.length} curated companies are shown while full provider classification data is unavailable.`}
      </div>

      <div className="sector-analysis-grid">
        <Panel title="Industry leadership" subtitle={data.mixBasis === "market-cap" ? "Industry rank by available market capitalization." : "Industry rank by represented company coverage."}>
          <TableBarChart table={industryTable} />
        </Panel>
        <Panel title="Industry composition" subtitle="Concentration of the selected sector across available industries.">
          <IndustryMixPieChart table={industryTable} />
        </Panel>
      </div>

      <Panel title="Industry signals" subtitle="Select an industry card to open its company-level detail without leaving the sector workspace.">
        <IndustrySignalDeck table={industryTable} selectedIndustry={industry} onSelect={(nextIndustry) => setIndustry(nextIndustry === industry ? null : nextIndustry)} />
      </Panel>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {industryOptions.map((i) => (
          <Chip
            key={i}
            active={i === industry}
            onClick={() => setIndustry(i === industry ? null : i)}
          >
            {readableIndustryLabel(i)}
          </Chip>
        ))}
      </div>

      {industry && (
        <>
          <Panel title={`${readableIndustryLabel(industry)} — companies`}>
            {isIndustryLoading || !ind ? <DataLoading compact label="Loading company coverage" detail="Resolving available company coverage for the selected industry." /> : <DataTable table={ind} empty="No matching company coverage returned for this industry." />}
          </Panel>
        </>
      )}

      <Panel
        title={
          data.source === "provider"
            ? `${sectorLabel(sector)} — provider-ranked companies`
            : `${sectorLabel(sector)} — listed company coverage`
        }
        subtitle={
          data.source === "provider"
            ? `Showing all ${data.topCompanies.rows.length} companies returned by the provider’s ranked sector overview${data.companiesCount && data.companiesCount > data.topCompanies.rows.length ? `, from ${data.companiesCount.toLocaleString()} companies in its classification` : ""}.`
            : "All companies matched to the selected representative sector coverage."
        }
      >
        <DataTable table={liveCompanyTable} empty="No matching company coverage returned for this sector." />
      </Panel>
      {data?.industries.rows.length ? (
        <Panel title={`${sectorLabel(sector)} — industry directory`} subtitle="Industry coverage and its share of the selected sector only.">
          <DataTable table={data.industries} />
        </Panel>
      ) : null}
      {data?.topEtfs.rows.length ? (
        <Panel title={`${sectorLabel(sector)} — related ETFs`} subtitle="Provider-reported ETFs associated with the selected sector.">
          <DataTable table={data.topEtfs} />
        </Panel>
      ) : null}
        </>
      ) : (
        <DataLoading label="Loading sector coverage" detail={isLoading ? "Resolving live prices, market capitalization, industry composition, and listed companies for the selected sector." : "Refreshing the selected sector coverage."} />
      )}
    </div>
  );
}

/* ---------------- Calendars ---------------- */

const CALENDARS = [
  { key: "earnings", label: "Earnings" },
  { key: "ipo", label: "IPOs" },
  { key: "splits", label: "Splits" },
  { key: "economic", label: "Economic events" },
] as const;
const CALENDAR_WINDOWS = ["All events", "Next events", "High impact"] as const;

function calendarValue(row: Record<string, string>, matcher: RegExp, fallback = "") {
  return Object.entries(row).find(([key]) => matcher.test(key))?.[1] ?? fallback;
}

function CalendarEventDeck({ table, filter }: { table?: { columns: string[]; rows: Record<string, string>[] } | undefined; filter: (typeof CALENDAR_WINDOWS)[number] }) {
  const rows = (table?.rows ?? []).filter((row) => filter !== "High impact" || /high|important|3/i.test(Object.values(row).join(" "))).slice(0, 10);
  if (rows.length === 0) return <div className="calendar-empty">No matching events are scheduled for this filter.</div>;
  return <div className="calendar-event-deck">{rows.map((row, index) => { const values = Object.values(row); const date = calendarValue(row, /date|time/i, values[0] ?? "Upcoming"); const name = calendarValue(row, /^event$|^name$|^title$/i, values[1] ?? "Market event"); const impact = calendarValue(row, /impact|importance/i, "Scheduled"); return <article key={`${date}-${name}-${index}`} className="calendar-event"><span className="calendar-date">{date}</span><div><b>{name}</b><small>{Object.entries(row).filter(([key]) => !/date|time|event|name|title|impact|importance/i.test(key)).slice(0, 2).map(([, value]) => value).join(" · ") || "Event details pending"}</small></div><em className={/high|important|3/i.test(impact) ? "high" : ""}>{impact}</em></article>; })}</div>;
}

export function CalendarsView() {
  const fn = useServerFn(getMarketCalendar);
  const [kind, setKind] = useState<(typeof CALENDARS)[number]["key"]>("earnings");
  const [window, setWindow] = useState<(typeof CALENDAR_WINDOWS)[number]>("All events");
  const [region, setRegion] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["cal", kind, region, selectedDate],
    queryFn: () => fn({ data: { kind, ...(region === "ALL" ? {} : { region }), ...(selectedDate ? { date: selectedDate } : {}) } }),
    staleTime: 300_000,
  });
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">{CALENDARS.map((c) => <Chip key={c.key} active={c.key === kind} onClick={() => setKind(c.key)}>{c.label}</Chip>)}</div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/20 p-1" aria-label="Economic event region"><Globe2 className="ml-1 h-3.5 w-3.5 text-muted-foreground" />{["ALL", "US", "IN", "GB", "DE", "JP"].map((code) => <button type="button" key={code} onClick={() => setRegion(code)} className={cn("rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors", region === code ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{code === "ALL" ? "Global" : code}</button>)}</div>
            <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 text-primary" /><span className="sr-only">Filter by event date</span><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-w-28 bg-transparent text-xs text-foreground outline-none" /></label>
            {selectedDate ? <button type="button" onClick={() => setSelectedDate("")} className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"><X className="h-3.5 w-3.5" />Clear date</button> : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><p className="text-xs text-muted-foreground">{region === "ALL" ? "Global" : region} event feed{selectedDate ? ` · ${selectedDate}` : " · all available dates"}</p><div className="calendar-window-control">{CALENDAR_WINDOWS.map(item => <button key={item} className={window === item ? "active" : ""} onClick={() => setWindow(item)}>{item}</button>)}</div></div>
      </div>
      <Panel title={`${CALENDARS.find((c) => c.key === kind)?.label} calendar`}>
        {isLoading ? (
          <DataLoading compact label="Loading market calendar" detail="Retrieving the next scheduled market events." />
        ) : (
          <CalendarEventDeck table={data} filter={window} />
        )}
      </Panel>
    </div>
  );
}

/* ---------------- Market summary / status ---------------- */

export function GlobalMarketsView() {
  const summaryFn = useServerFn(getMarketSummary);
  const statusFn = useServerFn(getMarketStatus);
  const { market: selectedMarket } = useAppState();
  const [market, setMarket] = useState<string>(selectedMarket);

  useEffect(() => {
    setMarket(selectedMarket);
  }, [selectedMarket]);
  const { data: summary } = useQuery({
    queryKey: ["summary", market],
    queryFn: () => summaryFn({ data: { market } }),
    staleTime: 60_000,
  });
  const { data: status } = useQuery({
    queryKey: ["status", market],
    queryFn: () => statusFn({ data: { market } }),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["US", "IN", "GB", "DE", "JP", "HK"].map((m) => (
          <Chip key={m} active={m === market} onClick={() => setMarket(m)}>
            {m}
          </Chip>
        ))}
      </div>
      {status && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">
            {status.name} ·{" "}
            <span className={status.status === "open" ? "text-positive" : "text-muted-foreground"}>
              {status.status}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{status.message}</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(summary ?? []).map((q) => (
          <div key={q.name} className="rounded-2xl border border-border bg-card p-4">
            <p className="truncate text-xs uppercase tracking-wider text-muted-foreground">
              {q.name}
            </p>
            <p className="tabular mt-1 text-lg font-semibold text-foreground">
              {fmtPrice(q.price)}
            </p>
            <DeltaBadge value={q.changePercent} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Options ---------------- */

export function OptionsView() {
  const expFn = useServerFn(getOptionExpirations);
  const chainFn = useServerFn(getOptionChain);
  const [symbol, setSymbol] = useWatchSymbol();
  const [expiration, setExpiration] = useState<string | null>(null);

  const { data: expirations } = useQuery({
    queryKey: ["exp", symbol],
    queryFn: () => expFn({ data: { symbol } }),
    staleTime: 300_000,
  });
  const active = expiration ?? expirations?.[0] ?? null;
  const { data: chain, isLoading } = useQuery({
    queryKey: ["chain", symbol, active],
    queryFn: () => chainFn({ data: { symbol, expiration: active! } }),
    enabled: Boolean(active),
    staleTime: 120_000,
  });

  return (
    <div className="space-y-4">
      <WatchSymbolPicker
        value={symbol}
        onChange={(v) => {
          setSymbol(v);
          setExpiration(null);
        }}
      />
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {(expirations ?? []).map((e) => (
          <Chip key={e} active={e === active} onClick={() => setExpiration(e)}>
            {e}
          </Chip>
        ))}
      </div>
      <Panel title={`Calls · ${symbol} ${active ?? ""}`}>
        {isLoading ? (
          <DataLoading compact label="Loading options chain" detail="Gathering live contracts and open interest." />
        ) : (
          <DataTable table={chain?.calls} />
        )}
      </Panel>
      <Panel title={`Puts · ${symbol} ${active ?? ""}`}>
        <DataTable table={chain?.puts} />
      </Panel>
    </div>
  );
}

/* ---------------- Ownership ---------------- */

export function OwnershipView() {
  const fn = useServerFn(getOwnership);
  const [symbol, setSymbol] = useWatchSymbol();
  const { data } = useQuery({
    queryKey: ["own", symbol],
    queryFn: () => fn({ data: { symbol } }),
    staleTime: 300_000,
  });
  return (
    <div className="space-y-4">
      <WatchSymbolPicker value={symbol} onChange={setSymbol} />
      <Panel title="Institutional ownership split">
        <TableBarChart table={data?.institutional} height={320} />
      </Panel>
      <Panel title="Major holders">
        <DataTable table={data?.major} />
      </Panel>
      <Panel title="Institutional holders">
        <DataTable table={data?.institutional} />
      </Panel>
      <Panel title="Mutual fund holders">
        <DataTable table={data?.funds} />
      </Panel>
      <Panel title="Insider transactions">
        <DataTable
          table={data?.insider}
          empty="No insider activity reported (common outside the US)."
        />
      </Panel>
    </div>
  );
}

/* ---------------- Estimates & valuation ---------------- */

export function EstimatesView() {
  const estFn = useServerFn(getEstimates);
  const valFn = useServerFn(getValuationMeasures);
  const [symbol, setSymbol] = useWatchSymbol();
  const { data } = useQuery({
    queryKey: ["est", symbol],
    queryFn: () => estFn({ data: { symbol } }),
    staleTime: 300_000,
  });
  const { data: valuation } = useQuery({
    queryKey: ["val", symbol],
    queryFn: () => valFn({ data: { symbol } }),
    staleTime: 300_000,
  });
  return (
    <div className="space-y-4">
      <WatchSymbolPicker value={symbol} onChange={setSymbol} />
      <Panel title="EPS estimate trend">
        <TableBarChart table={data?.eps} />
      </Panel>
      <Panel title="Valuation measures">
        <StatementView table={valuation} />
      </Panel>
      <Panel title="EPS estimates">
        <DataTable table={data?.eps} />
      </Panel>
      <Panel title="Revenue estimates">
        <DataTable table={data?.revenue} />
      </Panel>
      <Panel title="Growth estimates">
        <DataTable table={data?.growth} />
      </Panel>
      <Panel title="EPS trend">
        <DataTable table={data?.epsTrend} />
      </Panel>
      <Panel title="EPS revisions">
        <DataTable table={data?.epsRevisions} />
      </Panel>
    </div>
  );
}

/* ---------------- Filings & ESG (US only) ---------------- */

export function FilingsView() {
  const filingsFn = useServerFn(getSecFilings);
  const esgFn = useServerFn(getSustainability);
  const [symbol, setSymbol] = useWatchSymbol();
  const { data: filings } = useQuery({
    queryKey: ["filings", symbol],
    queryFn: () => filingsFn({ data: { symbol } }),
    staleTime: 300_000,
  });
  const { data: esg } = useQuery({
    queryKey: ["esg", symbol],
    queryFn: () => esgFn({ data: { symbol } }),
    staleTime: 300_000,
  });
  return (
    <div className="space-y-4">
      <WatchSymbolPicker value={symbol} onChange={setSymbol} />
      <Panel title="SEC filings" subtitle="US-listed companies only">
        <DataTable table={filings} empty="No filings found for this listing." />
      </Panel>
      <Panel title="ESG / sustainability">
        <DataTable table={esg} empty="No ESG coverage for this ticker." />
      </Panel>
    </div>
  );
}

/* ---------------- News search ---------------- */

export function NewsSearchView() {
  const fn = useServerFn(searchNews);
  const [query, setQuery] = useState("stock market");
  const { data, isLoading } = useQuery({
    queryKey: ["newssearch", query],
    queryFn: () => fn({ data: { query } }),
    staleTime: 120_000,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <TickerAutocomplete
          className="max-w-md"
          onSelect={(s, n) => setQuery(n ? `${s} ${n}` : s)}
          placeholder="Search a company for news…"
        />
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {isLoading && <DataLoading compact label="Searching market news" detail="Finding current coverage for your query." />}
        {(data ?? []).map((n) => (
          <a
            key={n.link}
            href={n.link}
            target="_blank"
            rel="noreferrer"
            className="block px-5 py-4 hover:bg-accent/40"
          >
            <p className="text-sm font-medium text-foreground">{n.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.summary}</p>
            <p className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              {n.publisher} · {timeAgo(n.pubDate)} <ExternalLink className="h-3 w-3" />
            </p>
          </a>
        ))}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No results.</p>
        )}
      </div>
    </div>
  );
}
