import { getStripeMode } from './checkout-stripe';
import { liveDb } from './google-business/live-review-core';

export async function getCustomerReviewSubscription(email: string) {
  const sql = liveDb();
  const [subscription] = await sql`SELECT m.status,m.cadence,m.locations,m.current_period_end,m.cancel_at_period_end,m.stripe_customer_id
    FROM marketing_subscriptions m JOIN customers c ON c.id=m.customer_id
    WHERE lower(c.email)=${email.toLowerCase()} AND c.account_status='active' AND m.stripe_mode=${getStripeMode()}`;
  if (!subscription) return null;

  return {
    status: String(subscription.status),
    cadence: subscription.cadence,
    locations: Number(subscription.locations),
    current_period_end: subscription.current_period_end,
    cancel_at_period_end: subscription.cancel_at_period_end === true,
    billingAvailable: Boolean(subscription.stripe_customer_id && ['active', 'trialing', 'past_due', 'unpaid'].includes(String(subscription.status)))
  };
}
