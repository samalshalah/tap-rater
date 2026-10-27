import { sendCustomerAccountSetupEmail, sendHostedAccountReadyEmail, sendPaidCustomerAccountSetupEmail, type HostedSetupEmailInput } from "@/lib/hosted-setup-email";
import { type HostedPageTextStorage } from "@/lib/hosted-pages/repository";
import type { EmailResult } from "@/lib/email";
import type { OrderRecord, OrdersDbClient, StripeCheckoutSessionLike } from "@/lib/orders";


export type HostedSubscriptionStatus = "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "trialing" | "unknown";

export type HostedSubscriptionProvisioningStatus = "ready_for_customer_setup" | "provisioning_failed";

export type HostedSubscriptionProvisioningResult =
  | {
    ok: true;
    provisioned: boolean;
    code?: string;
    hostedPageUrl?: string;
    reason?: "not_hosted_checkout" | "duplicate_event" | "unpaid_checkout";
  }
  | {
    ok: false;
    error: string;
  };

export type HostedSubscriptionProvisioningInput = {
  session: StripeCheckoutSessionLike;
  order: OrderRecord;
  eventId?: string;
  eventType?: string;
  now?: Date;
  siteUrl?: string;
};

export type ManualCustomerAccountProvisioningInput = {
  order: OrderRecord;
  now?: Date;
  siteUrl?: string;
};

export type ManualCustomerAccountProvisioningResult =
  | {
    ok: true;
    accountProvisioned: boolean;
    hostedProvisioned: boolean;
    code?: string;
    hostedPageUrl?: string;
    reason?: "missing_customer_email";
  }
  | {
    ok: false;
    error: string;
  };

export type PaidCustomerAccountProvisioningResult =
  | {
    ok: true;
    accountProvisioned: boolean;
    reason?: "missing_customer_email" | "account_not_requested" | "hosted_order" | "account_already_active";
  }
  | {
    ok: false;
    error: string;
  };

export type HostedSubscriptionProvisioningDependencies = {
  client: OrdersDbClient;
  storage: HostedPageTextStorage;
  generateCode?: () => string;
  sendHostedSetupEmailFn?: (input: HostedSetupEmailInput) => Promise<EmailResult>;
  sendHostedAccountReadyEmailFn?: typeof sendHostedAccountReadyEmail;
  sendCustomerAccountSetupEmailFn?: typeof sendCustomerAccountSetupEmail;
  sendPaidCustomerAccountSetupEmailFn?: typeof sendPaidCustomerAccountSetupEmail;
  retrieveSubscription?: (id: string) => Promise<StripeSubscriptionLike>;
};

export type StripeSubscriptionLike = {
  id?: string | null;
  status?: string | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  items?: { data?: Array<{ current_period_end?: number | null }> };
};

export type ExistingHostedSubscription = {
  id: string;
  business_id: string;
  hosted_page_id: string;
  permanent_code: string;
  hosted_page_url: string;
  updated_at?: string;
  lifecycle_status?: string;
  past_due_since?: string;
  current_period_end?: string;
};

export type ExistingHostedSubscriptionMatch = {
  subscription: ExistingHostedSubscription;
  reason: "checkout_session" | "expired_customer_page";
};
