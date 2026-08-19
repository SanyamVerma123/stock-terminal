import { ChartNoAxesCombined } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact empty data surface adapted from the supplied 21st.dev empty/card patterns. */
export function EmptyState({ title = "No live data yet", detail = "Try a different symbol or return when the provider has refreshed.", compact = false, className }: { title?: string; detail?: string; compact?: boolean; className?: string }) { return <div className={cn("empty-state", compact && "empty-state-compact", className)}><span className="empty-state-icon"><ChartNoAxesCombined size={compact ? 16 : 20}/></span><span><b>{title}</b><small>{detail}</small></span></div>; }
