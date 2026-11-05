type CustomerDbClient = {
  from: (table: string) => any;
};

type OrderCustomerSource = {
  email?: string | null;
  customer_name?: string | null;
  customer_details_json?: Record<string, unknown> | null;
};

/**
 * Keeps the internal customer directory complete without granting account
 * access or sending an activation email.  Access is still explicitly enabled
 * by an administrator when the customer needs the review-service portal.
 */
export async function ensureOrderCustomerRecord(client: CustomerDbClient, order: OrderCustomerSource) {
  const email = normalizeEmail(order.email);
  if (!email) return { created: false as const, skipped: true as const };

  const existing = await client.from("customers").select("id").eq("email", email).maybeSingle();
  if (existing.error) throw new Error(existing.error.message || "Customer lookup failed.");
  if (existing.data?.id) return { created: false as const, skipped: false as const };

  const details = isRecord(order.customer_details_json) ? order.customer_details_json : {};
  const name = readText(order.customer_name) ?? readText(details.name);
  const phone = readText(details.phone);
  const { error } = await client.from("customers").insert({
    email,
    name: name ?? null,
    phone: phone ?? null,
    role: "customer",
    account_status: "pending_activation"
  });

  // A concurrent order for the same buyer may create their directory record
  // first. That is a successful outcome, not an order failure.
  if (error && error.code !== "23505") throw new Error(error.message || "Customer record could not be saved.");
  return { created: !error, skipped: false as const };
}

function normalizeEmail(value: unknown) {
  const email = readText(value)?.toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
