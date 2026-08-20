import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateCloudAccount,
  CLOUD_SESSION_COOKIE,
  CLOUD_SESSION_MAX_AGE,
  cloudAccountFromSession,
  changeCloudPassword,
  createCloudSession,
  registerCloudAccount,
  removeCloudSession,
} from "@/lib/cloud-store.server";

function cookieValue(request: Request, name: string) {
  const prefix = `${name}=`;
  return (request.headers.get("cookie") ?? "")
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function sessionCookie(token: string) {
  return `${CLOUD_SESSION_COOKIE}=${token}; Path=/; Max-Age=${CLOUD_SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

function expiredSessionCookie() {
  return `${CLOUD_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function json(payload: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export const Route = createFileRoute("/api/cloud/auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const account = await cloudAccountFromSession(cookieValue(request, CLOUD_SESSION_COOKIE));
        return json({ account });
      },
      POST: async ({ request }) => {
        if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
        try {
          const body = (await request.json()) as {
            action?: string;
            email?: string;
            password?: string;
            displayName?: string;
            currentPassword?: string;
            newPassword?: string;
          };
          if (body.action === "logout") {
            await removeCloudSession(cookieValue(request, CLOUD_SESSION_COOKIE));
            return json({ account: null }, 200, { "set-cookie": expiredSessionCookie() });
          }
          const activeAccount = await cloudAccountFromSession(cookieValue(request, CLOUD_SESSION_COOKIE));
          if (body.action === "change_password") {
            if (!activeAccount) return json({ error: "Sign in to change your password." }, 401);
            if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string") {
              return json({ error: "Your current and new passwords are required." }, 400);
            }
            await changeCloudPassword(activeAccount.id, body.currentPassword, body.newPassword);
            const session = await createCloudSession(activeAccount.id);
            return json({ account: activeAccount }, 200, { "set-cookie": sessionCookie(session) });
          }
          if (typeof body.email !== "string" || typeof body.password !== "string") {
            return json({ error: "Email and password are required." }, 400);
          }
          const isRegistration = body.action === "register";
          const account =
            isRegistration
              ? await registerCloudAccount({
                  email: body.email,
                  password: body.password,
                  ...(typeof body.displayName === "string" ? { displayName: body.displayName } : {}),
                })
              : await authenticateCloudAccount(body.email, body.password);
          const token = await createCloudSession(account.id);
          return json({ account }, 200, { "set-cookie": sessionCookie(token) });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Cloud sign-in failed." }, 400);
        }
      },
    },
  },
});
