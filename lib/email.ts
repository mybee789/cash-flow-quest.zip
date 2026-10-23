/**
 * Email notifications — stubbed transport.
 *
 * This logs what WOULD be sent so the rest of the app (webhooks, streak
 * jobs) can call a stable interface today. Swap the body of `sendEmail`
 * for a real provider when ready — all three below are free-tier friendly:
 *
 *   Resend (recommended, 3k emails/mo free):
 *     npm install resend
 *     const resend = new Resend(process.env.RESEND_API_KEY);
 *     await resend.emails.send({ from, to, subject, html });
 *
 *   Postmark (100 emails/mo free):
 *     npm install postmark
 *     const client = new postmark.ServerClient(process.env.POSTMARK_TOKEN!);
 *     await client.sendEmail({ From: from, To: to, Subject: subject, HtmlBody: html });
 *
 *   AWS SES (62k emails/mo free from an EC2/Lambda origin):
 *     use @aws-sdk/client-sesv2's SendEmailCommand.
 *
 * No provider call is made here, so this file has zero external
 * dependencies and compiles with no API keys configured.
 */

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<void> {
  if (!process.env.EMAIL_PROVIDER_API_KEY) {
    console.log(`[email:stub] would send to=${to} subject="${subject}"`);
    return;
  }

  // Real provider call goes here once EMAIL_PROVIDER_API_KEY is set.
  console.log(`[email] to=${to} subject="${subject}" (provider call not wired yet)`);
  void html;
}

export function welcomeEmail(email: string) {
  return sendEmail({
    to: email,
    subject: "Welcome to Cash Flow Quest",
    html: `<p>Log your first transaction today to start your streak.</p>`,
  });
}

export function subscriptionActivatedEmail(email: string) {
  return sendEmail({
    to: email,
    subject: "You're on Cash Flow Quest Pro",
    html: `<p>Pro is active — full history, trend charts, and alerts are unlocked.</p>`,
  });
}

export function subscriptionPastDueEmail(email: string) {
  return sendEmail({
    to: email,
    subject: "Payment issue with your Cash Flow Quest subscription",
    html: `<p>We couldn't process your last payment. Update your card to keep Pro active.</p>`,
  });
}

export function subscriptionCanceledEmail(email: string) {
  return sendEmail({
    to: email,
    subject: "Your Cash Flow Quest Pro plan has ended",
    html: `<p>You're back on the Free plan. You can resubscribe anytime from Pricing.</p>`,
  });
}

export function streakRiskEmail(email: string, currentStreak: number) {
  return sendEmail({
    to: email,
    subject: `Don't lose your ${currentStreak}-day streak`,
    html: `<p>You haven't logged anything today. Log one transaction to keep your streak alive.</p>`,
  });
}
