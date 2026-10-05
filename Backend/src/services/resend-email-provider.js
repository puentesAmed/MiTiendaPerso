import { env } from "../config/env.js";

export class ResendEmailProvider {
  constructor({ config = env.TRANSACTIONAL_EMAIL, fetchImpl = fetch } = {}) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async send({ to, subject, html, text, replyTo, tags, idempotencyKey }) {
    const { enabled, apiKey, fromEmail, fromName } = this.config;
    if (!enabled) throw new Error("email_disabled");
    if (!apiKey || !fromEmail) throw new Error("email_not_configured");
    const response = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: `${fromName.replace(/[<>\r\n]/g, "")} <${fromEmail}>`,
        to: [to], subject, html, text,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(tags ? { tags } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`resend_http_${response.status}`);
    const data = await response.json();
    if (typeof data?.id !== "string" || !data.id) throw new Error("resend_missing_message_id");
    return { id: data.id };
  }
}

export const transactionalEmailProvider = new ResendEmailProvider();
