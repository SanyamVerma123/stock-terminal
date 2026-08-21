import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const CHEVRON_DELAYS = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3);
  const column = index % 3;
  return (column + Math.abs(row - 1)) * 90;
});

const WORKING_COPY = {
  researching: {
    label: "Gathering market context",
    detail: "Checking the available research signals before the response begins.",
  },
  writing: {
    label: "Writing analysis",
    detail: "The AI analyst is structuring the response as new text arrives.",
  },
} as const;

export type AIWorkingPhase = keyof typeof WORKING_COPY;

function useElapsedTime(active: boolean) {
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setStartedAt(Date.now());
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [active]);

  const seconds = Math.max(0, now - startedAt) / 1000;
  return seconds < 60
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(1)}s`;
}

export function AIWorkingIndicator({ phase, className }: { phase: AIWorkingPhase; className?: string }) {
  const copy = WORKING_COPY[phase];
  const elapsed = useElapsedTime(true);

  return (
    <div className={cn("ai-working-indicator", className)} role="status" aria-live="polite">
      <span className="ai-working-pixel-grid" aria-hidden="true">
        {CHEVRON_DELAYS.map((delay, index) => (
          <i
            key={index}
            className="ai-working-pixel"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span className="min-w-0">
        <span className="ai-working-label">{copy.label}</span>
        <span className="ai-working-detail">{copy.detail}</span>
      </span>
      <span className="ai-working-elapsed" aria-label={`Elapsed ${elapsed}`}>
        {elapsed}
      </span>
    </div>
  );
}
