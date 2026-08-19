import { ArrowUp, Bot, FileText, LoaderCircle, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArtifactPanel } from "@/components/chat/ArtifactPanel";
import type { Artifact } from "@/components/chat/artifact-types";
import { Markdown } from "@/components/chat/Markdown";
import { SiteHeader } from "@/components/finance/SiteHeader";

type ChatMessage = { role: "user" | "assistant"; content: string };
const starters = ["What is moving the market today?", "Compare AAPL and MSFT based on current fundamentals", "Summarize recent news for NVDA"];

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("researchPrompt");
    if (saved) {
      setDraft(saved);
      sessionStorage.removeItem("researchPrompt");
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const prompt = draft.trim();
    if (!prompt || loading) return;
    const thread = [...messages, { role: "user" as const, content: prompt }];
    setMessages([...thread, { role: "assistant", content: "" }]);
    setDraft("");
    setLoading(true);
    try {
      const response = await fetch("/api/chat/stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: thread }) });
      if (!response.ok || !response.body) throw new Error("The research service is unavailable.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        events.forEach(block => {
          const dataLine = block.split("\n").find(line => line.startsWith("data: "));
          const typeLine = block.split("\n").find(line => line.startsWith("event: "));
          if (!dataLine) return;
          const payload = JSON.parse(dataLine.slice(6));
          if (typeLine === "event: delta") {
            result += payload.text;
            setMessages([...thread, { role: "assistant", content: result }]);
          }
          if (typeLine === "event: error") throw new Error(payload.message);
        });
      }
      const diagram = /```mermaid\n([\s\S]*?)```/.exec(result);
      setArtifact(diagram ? { title: "Research diagram", kind: "mermaid", content: diagram[1] } : result.includes("|") ? { title: "Research note", kind: "markdown", content: result } : null);
    } catch (error) {
      setMessages([...thread, { role: "assistant", content: `I could not complete that request. ${error instanceof Error ? error.message : "Please try again."}` }]);
    } finally {
      setLoading(false);
    }
  };

  return <><SiteHeader/><main className="chat-page"><section className="chat-thread"><div className="chat-intro"><div className="intro-icon"><Bot size={22}/></div><div><span className="eyebrow">AI research workspace</span><h1>Explore the market in context.</h1><p>Ask a question, follow up, and combine current price data, history, financials, and news.</p></div></div>{messages.length === 0 && <div className="starter-grid">{starters.map(prompt => <button key={prompt} onClick={() => setDraft(prompt)}><Sparkles size={16}/><span>{prompt}</span><ArrowUp size={15}/></button>)}</div>}<div className="messages">{messages.map((message, index) => <article key={`${message.role}-${index}`} className={`message ${message.role}`}><div className="message-avatar">{message.role === "assistant" ? <Bot size={16}/> : "You"}</div><div className="message-body">{message.role === "assistant" ? message.content ? <Markdown content={message.content}/> : <LoaderCircle className="spin" size={18}/> : <p>{message.content}</p>}</div></article>)}</div><div ref={bottomRef}/><form className="chat-composer" onSubmit={submit}><textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) submit(event); }} placeholder="Ask about a company, market event, or financial metric…" rows={2}/><div><span><FileText size={14}/> Research only — not financial advice</span><button type="submit" disabled={!draft.trim() || loading} aria-label="Send research question">{loading ? <LoaderCircle className="spin" size={17}/> : <ArrowUp size={17}/>}</button></div></form></section><ArtifactPanel artifact={artifact}/></main></>;
}
