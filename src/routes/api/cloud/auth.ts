import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateCloudAccount,
  CLOUD_SESSION_COOKIE,
  CLOUD_SESSION_MAX_AGE,
  cloudAccountFromSession,
  changeCloudPassword,
  confirmCloudPasswordReset,
  createCloudSession,
  registerCloudAccount,
  removeCloudSession,
  requestCloudPasswordReset,
  sendCloudEmailVerification,
  verifyCloudEmail,
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
        const url = new URL(request.url);
        if (url.searchParams.get("action") === "verify_email") {
          const token = url.searchParams.get("token");
          if (!token) return json({ error: "The verification link is missing its token." }, 400);
          try {
            await verifyCloudEmail(token);
            return Response.redirect(`${url.origin}/?emailVerified=1`, 303);
          } catch (error) {
            return json({ error: error instanceof Error ? error.message : "The verification link could not be used." }, 400);
          }
        }
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
            token?: string;
            currentPassword?: string;
            newPassword?: string;
          };
          const origin = new URL(request.url).origin;
          if (body.action === "logout") {
            await removeCloudSession(cookieValue(request, CLOUD_SESSION_COOKIE));
            return json({ account: null }, 200, { "set-cookie": expiredSessionCookie() });
          }
          if (body.action === "request_reset") {
            if (typeof body.email !== "string") return json({ error: "Email is required." }, 400);
            await requestCloudPasswordReset(body.email, origin);
            return json({ accepted: true, message: "If this email has an account, a reset link has been sent." });
          }
          if (body.action === "confirm_reset") {
            if (typeof body.token !== "string" || typeof body.password !== "string") {
              return json({ error: "A reset token and new password are required." }, 400);
            }
            const account = await confirmCloudPasswordReset(body.token, body.password);
            if (!account) return json({ error: "Your account could not be loaded." }, 400);
            const session = await createCloudSession(account.id);
            return json({ account }, 200, { "set-cookie": sessionCookie(session) });
          }
          const activeAccount = await cloudAccountFromSession(cookieValue(request, CLOUD_SESSION_COOKIE));
          if (body.action === "send_verification") {
            if (!activeAccount) return json({ error: "Sign in to verify your email." }, 401);
            const result = await sendCloudEmailVerification(activeAccount.id, origin);
            return json({ account: activeAccount, verificationEmailSent: !result.alreadyVerified });
          }
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
          let verificationEmailSent = false;
          if (isRegistration) {
            try {
              await sendCloudEmailVerification(account.id, origin);
              verificationEmailSent = true;
            } catch {
              // Registration succeeds even if the transactional provider is temporarily unavailable.
            }
          }
          return json({ account, verificationEmailSent }, 200, { "set-cookie": sessionCookie(token) });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Cloud sign-in failed." }, 400);
        }
      },
    },
  },
});
