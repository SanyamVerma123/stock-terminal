import { cn } from "@/lib/utils";
import { Loader, TextShimmerLoader } from "@/components/ui/loader";

export function InlineLoading({ label, variant = "pulse-dot" }: { label: string; variant?: "pulse-dot" | "wave" }) {
  return <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground" role="status" aria-live="polite"><span className={cn("inline-flex items-center gap-0.5", variant === "wave" && "animate-pulse")} aria-hidden="true"><span className="tool-dot h-1.5 w-1.5 rounded-full bg-primary"/><span className="tool-dot tool-dot-delay-1 h-1.5 w-1.5 rounded-full bg-primary"/><span className="tool-dot tool-dot-delay-2 h-1.5 w-1.5 rounded-full bg-primary"/></span>{label}</span>;
}

/** Source-native animated data surface, enhanced with the layered halo treatment from the supplied 21st.dev loading patterns. */
export function DataLoading({ label = "Loading live market data", detail, compact = false, className }: { label?: string; detail?: string; compact?: boolean; className?: string }) {
  return <div className={cn("data-loading", compact && "data-loading-compact", className)} role="status" aria-live="polite"><span className="data-loading-rail" aria-hidden="true"><i/></span><span className="data-loading-copy"><b><TextShimmerLoader text={label}/></b>{detail && <small>{detail}</small>}<span className="data-loading-status"><Loader variant="terminal" size="sm"/> Syncing market data</span></span></div>;
}
