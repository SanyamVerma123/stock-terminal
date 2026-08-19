import { ArrowUpRight, Bot } from "lucide-react";
import { ResearchCard } from "@/components/ui/research-card";

export function AIView({ onSelect }: { onSelect: (prompt: string) => void }) {
  const prompts = ["What is moving the market today?", "Compare AAPL and MSFT on a one-year basis", "Summarize recent news for NVDA"];
  return <ResearchCard className="ai-view"><div className="ai-orb"><Bot size={20}/></div><div><span className="eyebrow">AI market research</span><h2>Ask a finance question</h2><p>Bring together price history, fundamentals, and recent market context in one research thread.</p></div><div className="prompt-chips">{prompts.map(prompt => <button key={prompt} onClick={() => onSelect(prompt)}>{prompt}<ArrowUpRight size={14}/></button>)}</div></ResearchCard>;
}
