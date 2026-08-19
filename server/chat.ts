import { z } from "zod";
import { invokeLLM, type Message, type Tool } from "./_core/llm";
import { getFinancials, getHistory, getNews, getSummary, normalizeSymbol } from "./finance";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(6000),
});

export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(14),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

const financeTools: Tool[] = [
  { type: "function", function: { name: "get_stock_quote", description: "Get a current market quote and core company metrics for one ticker.", parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"], additionalProperties: false } } },
  { type: "function", function: { name: "get_price_history", description: "Get OHLC price history for a ticker. Use for chart or performance questions.", parameters: { type: "object", properties: { symbol: { type: "string" }, range: { type: "string", enum: ["1D", "5D", "1M", "6M", "1Y", "5Y"] } }, required: ["symbol"], additionalProperties: false } } },
  { type: "function", function: { name: "get_stock_news", description: "Get recent news headlines for a ticker.", parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"], additionalProperties: false } } },
  { type: "function", function: { name: "get_financials", description: "Get income, balance-sheet, or cash-flow statement rows for a ticker.", parameters: { type: "object", properties: { symbol: { type: "string" }, statement: { type: "string", enum: ["income", "balance", "cashflow"] }, quarterly: { type: "boolean" } }, required: ["symbol"], additionalProperties: false } } },
];

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(part => typeof part === "object" && part && "text" in part ? String((part as { text: unknown }).text) : "").join("\n");
  return "";
}

async function executeTool(name: string, rawArguments: string) {
  const args = z.object({ symbol: z.string(), range: z.string().optional(), statement: z.string().optional(), quarterly: z.boolean().optional() }).parse(JSON.parse(rawArguments));
  const symbol = normalizeSymbol(args.symbol);
  if (name === "get_stock_quote") return getSummary(symbol);
  if (name === "get_price_history") return getHistory(symbol, args.range ?? "1Y");
  if (name === "get_stock_news") return getNews(symbol);
  if (name === "get_financials") return getFinancials(symbol, args.statement ?? "income", args.quarterly ?? false);
  throw new Error("Requested tool is not available.");
}

export async function respondToChat(input: ChatRequest) {
  const messages: Message[] = [
    {
      role: "system",
      content: "You are Insightful Search, a careful finance research assistant. Use the supplied finance tools whenever the user asks for current prices, historical performance, news, financials, analyst activity, or company metrics. Clearly distinguish data from interpretation, do not make buy/sell recommendations, cite ticker symbols and dates when available, and end finance-specific answers with: 'Research only — not personalized financial advice.' Use concise Markdown with tables only when they improve clarity.",
    },
    ...input.messages.map(message => ({ role: message.role, content: message.content } as Message)),
  ];

  const first = await invokeLLM({ model: "gpt-5-mini", messages, tools: financeTools, toolChoice: "auto", maxTokens: 1400 });
  const choice = first.choices[0]?.message;
  const toolCalls = choice?.tool_calls ?? [];
  if (toolCalls.length === 0) {
    return { content: textFromContent(choice?.content), toolsUsed: [] as string[] };
  }

  const toolResults = await Promise.all(toolCalls.slice(0, 3).map(async call => {
    try {
      return { name: call.function.name, result: await executeTool(call.function.name, call.function.arguments) };
    } catch (error) {
      return { name: call.function.name, result: { error: error instanceof Error ? error.message : "Tool lookup failed" } };
    }
  }));

  const followUp = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      ...messages,
      { role: "system", content: `Finance tool outputs for the current question:\n${JSON.stringify(toolResults).slice(0, 22000)}` },
      { role: "user", content: "Use the tool outputs above to provide the final answer. If data is absent, say so plainly. Do not mention internal tool mechanics." },
    ],
    maxTokens: 1600,
  });
  return { content: textFromContent(followUp.choices[0]?.message.content), toolsUsed: toolResults.map(item => item.name) };
}
