import { createFileRoute } from '@tanstack/react-router'
import { handleScreenerAlertCallback } from "@/lib/scheduled-screener-alerts.server";

export const Route = createFileRoute("/api/scheduled/screener-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handleScreenerAlertCallback(request);
      },
    },
  },
});
