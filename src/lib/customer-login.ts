import { createCustomerLoginToken } from "@/lib/customer-auth";
import { sendCustomerLoginLinkEmail } from "@/lib/email";

export function createCustomerLoginUrl(token: string) {
  const siteUrl = process.env.NEXT_PUBLIC_ACCOUNT_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${siteUrl.replace(/\/$/, "")}/account/login?token=${encodeURIComponent(token)}`;
}

export function isDevelopmentAdminLoginAllowed(email: string, nodeEnv = process.env.NODE_ENV) {
  return nodeEnv !== "production" && Boolean(process.env.ADMIN_EMAIL) && email.trim().toLowerCase() === process.env.ADMIN_EMAIL?.trim().toLowerCase();
}

export async function sendCustomerLoginEmail(email: string) {
  const token = createCustomerLoginToken(email);
  const loginUrl = createCustomerLoginUrl(token);
  const result = await sendCustomerLoginLinkEmail({ to: email, loginUrl });

  if (!result.sent) {
    return { sent: false, loginUrl: isDevelopmentAdminLoginAllowed(email) ? loginUrl : undefined };
  }

  return { sent: true };
}
