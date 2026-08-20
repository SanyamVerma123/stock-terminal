import { createFileRoute } from "@tanstack/react-router";
import {
  CLOUD_SESSION_COOKIE,
  cloudAccountFromSession,
  loadCloudState,
  saveCloudState,
} from "@/lib/cloud-store.server";

function cookieValue(request: Request, name: string) {
  const prefix = `${name}=`;
  return (request.headers.get("cookie") ?? "")
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function accountFor(request: Request) {
  return cloudAccountFromSession(cookieValue(request, CLOUD_SESSION_COOKIE));
}

export const Route = createFileRoute("/api/cloud/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const account = await accountFor(request);
        if (!account) return json({ error: "Sign in to access cloud state." }, 401);
        return json({ account, state: await loadCloudState(account.id) });
      },
      PUT: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403);
        const account = await accountFor(request);
        if (!account) return json({ error: "Sign in to save cloud state." }, 401);
        try {
          const body = (await request.json()) as { state?: unknown };
          return json({ account, state: await saveCloudState(account.id, body.state) });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Cloud save failed." }, 400);
        }
      },
    },
  },
});
