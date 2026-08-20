import { createFileRoute } from '@tanstack/react-router'
import { authorizeScreenerAlertSchedule, evaluateSavedScreenerAlerts } from "@/lib/scheduled-screener-alerts.server";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

export const Route = createFileRoute("/api/scheduled/screener-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json() as { token?: unknown };
          if (typeof body.token !== "string" || !(await authorizeScreenerAlertSchedule(body.token))) {
            return json({ error: "scheduled-task authorization failed" }, 403);
          }
          return json({ ok: true, ...(await evaluateSavedScreenerAlerts()) });
        } catch (error) {
          return json({
            error: error instanceof Error ? error.message : "scheduled screener evaluation failed",
            timestamp: new Date().toISOString(),
          }, 500);
        }
      },
    },
  },
});
