import { ExternalLink } from "lucide-react";
import { timeAgo } from "@/lib/format";
import type { NewsItem } from "@/lib/finance-types";

type TimelineItem = NewsItem & { symbol?: string };
const GROUPS = ["Past day", "Past week", "Past month", "Past year"] as const;
function ageHours(value?: string | null) { const stamp = value ? Date.parse(value) : NaN; return Number.isFinite(stamp) ? Math.max(0, (Date.now() - stamp) / 3_600_000) : 8_760; }
function groupFor(item: TimelineItem) { const hours = ageHours(item.pubDate); return hours <= 24 ? "Past day" : hours <= 24 * 7 ? "Past week" : hours <= 24 * 31 ? "Past month" : "Past year"; }

export function NewsTimeline({ items, empty }: { items: TimelineItem[]; empty: string }) {
  const ranked = [...items].map((item) => ({ ...item, priority: Math.max(1, Math.round(100 - Math.min(96, ageHours(item.pubDate) / 6))) })).sort((a, b) => b.priority - a.priority);
  if (!ranked.length) return <p className="py-4 text-sm text-muted-foreground">{empty}</p>;
  return <div className="space-y-5">{GROUPS.map((group) => { const entries = ranked.filter((item) => groupFor(item) === group); if (!entries.length) return null; return <section key={group}><div className="mb-2 flex items-center justify-between"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group}</p><span className="text-[10px] text-muted-foreground">Priority ordered</span></div><div className="space-y-2">{entries.map((item, index) => <a key={`${item.symbol ?? "news"}-${item.link}-${index}`} href={item.link} target="_blank" rel="noreferrer" className="block rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary/40"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium leading-snug text-foreground">{item.symbol ? <span className="mr-2 rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground">{item.symbol}</span> : null}{item.title}</p><span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{item.priority}</span></div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p><p className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">{item.publisher ?? "Source"} · {timeAgo(item.pubDate)} <ExternalLink className="h-3 w-3" /></p></a>)}</div></section>; })}</div>;
}
