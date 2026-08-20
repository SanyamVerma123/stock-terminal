import { describe, expect, it } from "vitest";

describe("Resend transactional email credentials", () => {
  it("authenticates against the lightweight sender-domain endpoint", async () => {
    const key = process.env["RESEND_API_KEY"];
    expect(key, "RESEND_API_KEY must be configured").toBeTruthy();

    const response = await fetch("https://api.resend.com/domains", {
      headers: { authorization: `Bearer ${key}` },
    });

    const body = await response.text();
    // Send-only Resend keys intentionally cannot list domains. Their restricted
    // response still proves the supplied credential authenticated successfully.
    const authenticatedSendOnlyKey =
      response.status === 401 && body.includes("restricted_api_key") && body.includes("only send emails");
    expect(response.status === 200 || authenticatedSendOnlyKey, body).toBe(true);
  }, 20_000);
});
