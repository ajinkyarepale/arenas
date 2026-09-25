/**
 * Outbound email. Resend when configured, server console otherwise.
 *
 * No new dependencies: Resend has a plain HTTPS API, so `fetch` is enough.
 * Without RESEND_API_KEY the code is logged — good enough for local
 * development (the operator watches the server log), never for production.
 */

export class EmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailError';
  }
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'Arenas <no-reply@arenas.dev>';

  if (!apiKey) {
    console.log(`[otp] sign-in code for ${email}: ${code} (RESEND_API_KEY unset — dev delivery via log)`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: `${code} is your Arenas sign-in code`,
      text:
        `Your Arenas sign-in code is ${code}.\n\n` +
        `It expires in 10 minutes. If you did not request it, ignore this email.`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new EmailError(`Email provider rejected the send (${res.status}): ${body.slice(0, 200)}`);
  }
}
