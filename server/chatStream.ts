import type { Express, Request, Response } from "express";
import { chatRequestSchema, respondToChat } from "./chat";

function writeEvent(response: Response, event: string, payload: unknown) {
  response.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

export function registerChatStream(app: Express) {
  app.post("/api/chat/stream", async (request: Request, response: Response) => {
    response.status(200);
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();
    try {
      const body = chatRequestSchema.parse(request.body);
      const answer = await respondToChat(body);
      const parts = answer.content.split(/(\s+)/).filter(Boolean);
      for (const part of parts) writeEvent(response, "delta", { text: part });
      writeEvent(response, "complete", { toolsUsed: answer.toolsUsed });
    } catch (error) {
      writeEvent(response, "error", { message: error instanceof Error ? error.message : "Unable to complete the research request." });
    } finally {
      response.end();
    }
  });
}
