import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { chatRequestSchema, respondToChat } from "./chat";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as finance from "./finance";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  finance: router({
    summary: publicProcedure.input(z.object({ symbol: z.string() })).query(({ input }) => finance.getSummary(input.symbol)),
    history: publicProcedure.input(z.object({ symbol: z.string(), range: z.enum(["1D", "5D", "1M", "6M", "1Y", "5Y"]).default("1Y") })).query(({ input }) => finance.getHistory(input.symbol, input.range)),
    search: publicProcedure.input(z.object({ query: z.string().max(64) })).query(({ input }) => finance.searchTickers(input.query)),
    news: publicProcedure.input(z.object({ symbol: z.string() })).query(({ input }) => finance.getNews(input.symbol)),
    financials: publicProcedure.input(z.object({ symbol: z.string(), statement: z.enum(["income", "balance", "cashflow"]).default("income"), quarterly: z.boolean().default(false) })).query(({ input }) => finance.getFinancials(input.symbol, input.statement, input.quarterly)),
    analyst: publicProcedure.input(z.object({ symbol: z.string() })).query(({ input }) => finance.getAnalyst(input.symbol)),
    upgrades: publicProcedure.input(z.object({ symbol: z.string() })).query(({ input }) => finance.getUpgrades(input.symbol)),
    calendar: publicProcedure.input(z.object({ symbol: z.string() })).query(({ input }) => finance.getCalendar(input.symbol)),
    corporateActions: publicProcedure.input(z.object({ symbol: z.string() })).query(({ input }) => finance.getCorporateActions(input.symbol)),
    marketStrip: publicProcedure.query(() => finance.getMarketStrip()),
    quotes: publicProcedure.input(z.object({ symbols: z.array(z.string()).min(1).max(12) })).query(({ input }) => finance.getQuotes(input.symbols)),
    compare: publicProcedure.input(z.object({ symbols: z.string().min(1).max(120), range: z.enum(["1D", "5D", "1M", "6M", "1Y", "5Y"]).default("1Y") })).query(({ input }) => finance.getCompare(input.symbols, input.range)),
  }),
  chat: router({
    respond: publicProcedure.input(chatRequestSchema).mutation(({ input }) => respondToChat(input)),
  }),
});

export type AppRouter = typeof appRouter;
