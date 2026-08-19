import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/finance/SiteHeader";
import { AIView } from "@/components/dashboard/AIView";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Market Analyst — Screener" },
      {
        name: "description",
        content: "Ask an AI analyst about any stock; it reads live quotes, financials, analyst targets and news.",
      },
      { property: "og:title", content: "AI Market Analyst — Screener" },
      { property: "og:description", content: "Live-data answers about companies, valuation and market moves." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-[1440px] px-3 py-3 sm:px-5">
        <AIView />
      </main>
    </div>
  );
}
