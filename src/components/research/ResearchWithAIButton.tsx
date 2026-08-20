import { Sparkles } from "lucide-react";
import { useAppState } from "@/lib/app-state";

export function ResearchWithAIButton({ prompt }: { prompt: string }) {
  const { setAiPrefill } = useAppState();
  return <button type="button" onClick={() => { setAiPrefill(prompt); window.location.assign("/?view=ai"); }} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15"><Sparkles className="h-3.5 w-3.5" />Research with AI</button>;
}
