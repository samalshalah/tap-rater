import { neon } from "@neondatabase/serverless";

export type NeonQueryExecutor = (sql: string, params: unknown[]) => Promise<unknown[]>;

type SupabaseResult<T = unknown[]> = {
  data: T | null;
  error: null | { message: string };
};

type FilterOperator = "eq" | "gte" | "in";

type QueryFilter = {
  column: string;
  operator: FilterOperator;
  value: unknown;
};

type QueryAction = "select" | "insert" | "update" | "upsert" | "delete";

type QueryOptions = {
  onConflict?: string;
};

const tableColumns = {
  contact_requests: ["id", "name", "email", "message", "status", "created_at"],
  setup_requests: ["id", "name", "email", "business_name", "review_url", "notes", "status", "created_at"],
  change_link_requests: ["id", "name", "email", "taprater_id", "new_review_url", "notes", "status", "created_at"],
  customers: [
    "id",
    "email",
    "name",
    "phone",
    "role",
    "password_hash",
    "account_status",
    "activation_token_hash",
    "activation_expires_at",
    "activated_at",
    "email_verified_at",
    "created_at",
    "updated_at"
  ],
  businesses: [
    "id",
    "customer_id",
    "business_name",
    "logo_url",
    "website_url",
    "phone",
    "address",
    "google_place_id",
    "google_review_url",
    "facebook_url",
    "yelp_url",
    "instagram_url",
    "booking_url",
    "status",
    "created_at",
    "updated_at"
  ],
  devices: [
    "id",
    "device_code",
    "activation_code_hash",
    "product_type",
    "service_mode",
    "status",
    "customer_id",
    "business_id",
    "destination_type",
    "destination_url",
    "landing_page_id",
    "label",
    "activated_at",
    "created_at",
    "updated_at"
  ],
  landing_pages: [
    "id",
    "business_id",
    "template_type",
    "slug",
    "title",
    "headline",
    "description",
    "logo_url",
    "buttons_json",
    "form_config_json",
    "status",
    "created_at",
    "updated_at"
  ],
  tap_events: [
    "id",
    "device_id",
    "business_id",
    "landing_page_id",
    "event_type",
    "destination_type",
    "ip_hash",
    "user_agent",
    "referrer",
    "created_at"
  ],
  form_submissions: ["id", "landing_page_id", "business_id", "device_id", "name", "email", "phone", "message", "payload_json", "created_at"],
  hosted_page_editor_pages: [
    "id",
    "customer_id",
    "business_id",
    "code",
    "lifecycle_status",
    "draft_json",
    "published_version",
    "published_at",
    "created_at",
    "updated_at"
  ],
  hosted_page_codes: [
    "code",
    "physical_product_ref",
    "assigned_by",
    "assigned_at",
    "retired_at"
  ],
  hosted_subscriptions: [
    "id",
    "customer_id",
    "business_id",
    "hosted_page_id",
    "order_id",
    "stripe_checkout_session_id",
    "stripe_customer_id",
    "stripe_subscription_id",
    "permanent_code",
    "hosted_page_url",
    "status",
    "lifecycle_status",
    "current_period_end",
    "cancel_at_period_end",
    "past_due_since",
    "grace_ends_at",
    "provisioning_status",
    "provisioning_error",
    "created_at",
    "updated_at"
  ],
  billing_invoices: [
    "id",
    "customer_id",
    "order_id",
    "hosted_subscription_id",
    "email",
    "stripe_customer_id",
    "stripe_invoice_id",
    "stripe_checkout_session_id",
    "stripe_subscription_id",
    "stripe_payment_intent_id",
    "invoice_number",
    "status",
    "payment_status",
    "payment_method_label",
    "hosted_invoice_url",
    "invoice_pdf_url",
    "receipt_url",
    "subtotal_cents",
    "tax_cents",
    "shipping_cents",
    "total_cents",
    "amount_paid_cents",
    "currency",
    "issued_at",
    "paid_at",
    "period_start",
    "period_end",
    "metadata_json",
    "created_at",
    "updated_at"
  ],
  billing_invoice_items: [
    "id",
    "billing_invoice_id",
    "order_id",
    "hosted_subscription_id",
    "line_item_index",
    "title",
    "option_label",
    "quantity",
    "amount_cents",
    "recurring_amount_cents",
    "hosted_page_url",
    "metadata_json",
    "created_at",
    "updated_at"
  ],
  stripe_events: ["id", "type", "processed_at", "created_at"],
  device_activation_attempts: ["id", "device_code", "email", "ip_hash", "success", "reason", "created_at"],
  auth_login_attempts: ["id", "scope", "identifier_hash", "ip_hash", "success", "created_at"],
  email_deliveries: [
    "id",
    "message_type",
    "audience",
    "recipient",
    "subject",
    "status",
    "provider_message_id",
    "idempotency_key",
    "failure_reason",
    "entity_type",
    "entity_id",
    "retryable",
    "attempt_number",
    "retry_of_id",
    "accepted_at",
    "delivered_at",
    "last_event_at",
    "created_at",
    "updated_at"
  ],
  products: [
    "id",
    "slug",
    "title",
    "sku",
    "category_slug",
    "stand_type_slug",
    "primary_platform_slug",
    "destination_type",
    "is_special_solution",
    "product_kind",
    "status",
    "sort_order",
    "base_price_cents",
    "sale_price_cents",
    "stock_status",
    "short_description",
    "description",
    "product_type",
    "service_mode",
    "checkout_mode",
    "requires_account",
    "requires_subscription",
    "requires_landing_page",
    "supports_multilink",
    "supported_destinations",
    "activation_type",
    "included_service_label",
    "format",
    "customization_options",
    "allows_logo_upload",
    "allows_custom_design",
    "design_mode",
    "display_text",
    "images",
    "standard_angled_image_url",
    "branded_angled_image_url",
    "multilink_angled_image_url",
    "standard_front_template_url",
    "branded_front_template_url",
    "multilink_front_template_url",
    "center_asset_url",
    "default_cta_text",
    "cta_editable",
    "landing_page_preview_config",
    "asset_readiness_status",
    "seo_title",
    "seo_description",
    "search_keywords",
    "size_options",
    "color_options",
    "key_features",
    "how_it_works",
    "specifications",
    "included_items",
    "product_faqs",
    "is_active",
    "created_at",
    "updated_at"
  ],
  product_images: ["id", "product_id", "src", "alt", "sort_order"],
  product_variants: ["id", "product_id", "label", "sku", "stock_status"],
  stand_types: [
    "id",
    "slug",
    "title",
    "description",
    "short_description",
    "long_content",
    "buyer_intent",
    "seo_title",
    "seo_description",
    "image_url",
    "banner_image_url",
    "sort_order",
    "is_active",
    "created_at",
    "updated_at"
  ],
  business_uses: [
    "id",
    "slug",
    "title",
    "description",
    "short_description",
    "long_content",
    "seo_title",
    "seo_description",
    "image_url",
    "banner_image_url",
    "sort_order",
    "is_active",
    "created_at",
    "updated_at"
  ],
  platforms: [
    "id",
    "slug",
    "title",
    "destination_type",
    "icon_url",
    "google_places_enabled",
    "manual_url_allowed",
    "is_active",
    "created_at",
    "updated_at"
  ],
  product_business_uses: ["product_slug", "business_use_slug", "sort_order", "created_at"],
  product_options: [
    "id",
    "product_slug",
    "option_code",
    "title",
    "description",
    "price_cents",
    "monthly_price_cents",
    "max_links",
    "requires_destination_url",
    "has_qr",
    "requires_logo",
    "requires_business_name",
    "requires_design_step",
    "requires_front_proof",
    "requires_subscription",
    "account_required",
    "supports_reorderable_links",
    "supports_link_visibility",
    "landing_page_url_pattern",
    "footer_label",
    "is_active",
    "sort_order",
    "created_at",
    "updated_at"
  ],
  product_option_templates: [
    "option_code",
    "title",
    "description",
    "price_cents",
    "monthly_price_cents",
    "max_links",
    "requires_destination_url",
    "has_qr",
    "requires_logo",
    "requires_business_name",
    "requires_design_step",
    "requires_front_proof",
    "requires_subscription",
    "account_required",
    "supports_reorderable_links",
    "supports_link_visibility",
    "landing_page_url_pattern",
    "footer_label",
    "sort_order",
    "is_active",
    "created_at",
    "updated_at"
  ],
  orders: [
    "id",
    "stripe_checkout_session_id",
    "stripe_payment_intent_id",
    "stripe_refund_id",
    "refunded_at",
    "status",
    "payment_status",
    "email",
    "customer_name",
    "subtotal_cents",
    "total_cents",
    "currency",
    "line_items_json",
    "customer_details_json",
    "shipping_address_json",
    "shipping_amount_cents",
    "shipping_mode",
    "production_status",
    "shipping_status",
    "shipping_method",
    "shipping_carrier",
    "tracking_number",
    "tracking_url",
    "shipped_at",
    "internal_notes",
    "admin_fulfillment_notes",
    "created_at",
    "updated_at"
  ],
  site_content: ["key", "type", "status", "payload", "created_at", "updated_at"],
  media_assets: ["id", "title", "src", "alt", "asset_type", "created_at"]
} as const;

type TableName = keyof typeof tableColumns;

const jsonbColumns = new Set([
  "payload",
  "buttons_json",
  "form_config_json",
  "payload_json",
  "draft_json",
  "line_items_json",
  "customer_details_json",
  "shipping_address_json",
  "metadata_json",
  "images",
  "landing_page_preview_config"
]);
const textArrayColumns = new Set(["supported_destinations", "customization_options"]);
const defaultConflictTargets: Partial<Record<TableName, string>> = {
  business_uses: "slug",
  hosted_page_editor_pages: "code",
  hosted_subscriptions: "stripe_checkout_session_id",
  billing_invoices: "stripe_invoice_id",
  orders: "stripe_checkout_session_id",
  products: "slug",
  site_content: "key",
  stand_types: "slug"
};

export function getDatabaseUrlFromEnv(env: Record<string, string | undefined> = process.env) {
  return env.DATABASE_URL || env.NEON_DATABASE_URL;
}

export function createNeonSupabaseAdapterFromUrl(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return createNeonSupabaseAdapter((query, params) => sql.query(query, params) as Promise<unknown[]>);
}

export function createNeonSupabaseAdapter(executor: NeonQueryExecutor) {
  return {
    from(table: string) {
      return new NeonQueryBuilder(table, executor);
    }
  };
}

class NeonQueryBuilder implements PromiseLike<SupabaseResult> {
  private action?: QueryAction;
  private filters: QueryFilter[] = [];
  private orderBy?: { column: string; ascending: boolean };
  private rowLimit?: number;
  private selectedColumns?: string;
  private values?: Record<string, unknown> | Record<string, unknown>[];
  private options?: QueryOptions;

  constructor(
    private readonly table: string,
    private readonly executor: NeonQueryExecutor
  ) {}

  select(columns = "*") {
    if (!this.action) {
      this.action = "select";
    }
    this.selectedColumns = columns;
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.action = "insert";
    this.values = values;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.action = "update";
    this.values = values;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  upsert(values: Record<string, unknown> | Record<string, unknown>[], options?: QueryOptions) {
    this.action = "upsert";
    this.values = values;
    this.options = options;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: "eq", value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, operator: "gte", value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ column, operator: "in", value });
    return this;
  }

  order(column: string, options: { ascending: boolean }) {
    this.orderBy = { column, ascending: options.ascending };
    return this;
  }

  limit(limit: number) {
    this.rowLimit = limit;
    return this;
  }

  async maybeSingle<T = unknown>(): Promise<SupabaseResult<T>> {
    const result = await this.execute();
    if (result.error) {
      return { data: null, error: result.error };
    }

    const rows = Array.isArray(result.data) ? result.data : [];
    return { data: (rows[0] as T | undefined) ?? null, error: null };
  }

  then<TResult1 = SupabaseResult, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<SupabaseResult> {
    try {
      const table = assertTable(this.table);
      const sql = this.buildSql(table);
      const rows = await this.executor(sql.query, sql.params);

      return {
        data: sql.returnsRows ? rows.map(normalizeDatabaseValue) : null,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : "Database query failed." }
      };
    }
  }

  private buildSql(table: TableName) {
    switch (this.action ?? "select") {
      case "select":
        return this.buildSelectSql(table);
      case "insert":
        return this.buildInsertSql(table, false);
      case "update":
        return this.buildUpdateSql(table);
      case "upsert":
        return this.buildInsertSql(table, true);
      case "delete":
        return this.buildDeleteSql(table);
    }
  }

  private buildSelectSql(table: TableName) {
    const params: unknown[] = [];
    const select = buildSelectClause(table, this.selectedColumns ?? "*");
    const joins = buildJoinClauses(table, this.selectedColumns ?? "*");
    const where = this.buildWhereClause(table, params);
    const order = this.orderBy ? ` order by ${qualifiedColumn(table, this.orderBy.column)} ${this.orderBy.ascending ? "asc" : "desc"}` : "";
    const limit = this.rowLimit ? ` limit ${addParam(params, "limit", this.rowLimit)}` : "";

    return {
      query: `select ${select} from ${table}${joins}${where}${order}${limit}`,
      params,
      returnsRows: true
    };
  }

  private buildInsertSql(table: TableName, isUpsert: boolean) {
    const rows = Array.isArray(this.values) ? this.values : this.values ? [this.values] : [];
    if (rows.length === 0) {
      throw new Error("Insert requires at least one row.");
    }

    const columns = Object.keys(rows[0]);
    assertColumns(table, columns);

    const params: unknown[] = [];
    const valueGroups = rows.map((row) => {
      return `(${columns.map((column) => addParam(params, column, row[column])).join(", ")})`;
    });
    const returning = this.selectedColumns ? ` returning ${buildSelectClause(table, this.selectedColumns, { forReturning: true })}` : "";
    const conflict = isUpsert ? this.buildUpsertConflict(table, columns) : "";

    return {
      query: `insert into ${table} (${columns.join(", ")}) values ${valueGroups.join(", ")}${conflict}${returning}`,
      params,
      returnsRows: Boolean(returning)
    };
  }

  private buildUpdateSql(table: TableName) {
    const values = Array.isArray(this.values) ? this.values[0] : this.values;
    if (!values || Object.keys(values).length === 0) {
      throw new Error("Update requires values.");
    }
    if (this.filters.length === 0) {
      throw new Error("Update requires at least one filter.");
    }

    const columns = Object.keys(values);
    assertColumns(table, columns);
    const params: unknown[] = [];
    const assignments = columns.map((column) => `${column} = ${addParam(params, column, values[column])}`);
    const where = this.buildWhereClause(table, params);
    const returning = this.selectedColumns ? ` returning ${buildSelectClause(table, this.selectedColumns, { forReturning: true })}` : "";

    return {
      query: `update ${table} set ${assignments.join(", ")}${where}${returning}`,
      params,
      returnsRows: Boolean(returning)
    };
  }

  private buildDeleteSql(table: TableName) {
    if (this.filters.length === 0) {
      throw new Error("Delete requires at least one filter.");
    }

    const params: unknown[] = [];
    const where = this.buildWhereClause(table, params);
    const returning = this.selectedColumns ? ` returning ${buildSelectClause(table, this.selectedColumns, { forReturning: true })}` : "";

    return {
      query: `delete from ${table}${where}${returning}`,
      params,
      returnsRows: Boolean(returning)
    };
  }

  private buildUpsertConflict(table: TableName, columns: string[]) {
    const conflictTarget = this.options?.onConflict ?? defaultConflictTargets[table];
    if (!conflictTarget) {
      throw new Error(`No upsert conflict target configured for ${table}.`);
    }

    const conflictColumns = conflictTarget.split(",").map((column) => column.trim()).filter(Boolean);
    if (conflictColumns.length === 0) {
      throw new Error(`Invalid upsert conflict target configured for ${table}.`);
    }

    assertColumns(table, conflictColumns);
    const updateColumns = columns.filter((column) => !conflictColumns.includes(column));
    if (updateColumns.length === 0) {
      return ` on conflict (${conflictColumns.join(", ")}) do nothing`;
    }

    return ` on conflict (${conflictColumns.join(", ")}) do update set ${updateColumns.map((column) => `${column} = excluded.${column}`).join(", ")}`;
  }

  private buildWhereClause(table: TableName, params: unknown[]) {
    if (this.filters.length === 0) {
      return "";
    }

    const clauses = this.filters.map((filter) => {
      assertColumns(table, [filter.column]);
      const column = qualifiedColumn(table, filter.column);

      if (filter.operator === "eq" && filter.value === null) {
        return `${column} is null`;
      }

      if (filter.operator === "in") {
        if (!Array.isArray(filter.value) || filter.value.length === 0) {
          throw new Error("In filter requires at least one value.");
        }

        params.push(filter.value);
        return `${column} = any($${params.length}::text[])`;
      }

      const placeholder = addParam(params, filter.column, filter.value);
      return `${column} ${filter.operator === "eq" ? "=" : ">="} ${placeholder}`;
    });

    return ` where ${clauses.join(" and ")}`;
  }
}

function buildSelectClause(table: TableName, columns: string, options: { forReturning?: boolean } = {}) {
  const parts = splitSelectColumns(columns);
  return parts
    .map((part) => {
      if (part === "*") {
        return `${table}.*`;
      }

      if (!options.forReturning) {
        const relation = buildRelationSelect(table, part);
        if (relation) {
          return relation;
        }
      }

      assertColumns(table, [part]);
      return `${table}.${part}`;
    })
    .join(", ");
}

function buildRelationSelect(table: TableName, part: string) {
  if (table !== "devices") {
    return null;
  }

  if (part === "customers(email)") {
    return "case when customers.id is null then null else jsonb_build_object('email', customers.email) end as customers";
  }

  if (part === "businesses(business_name)") {
    return "case when businesses.id is null then null else jsonb_build_object('business_name', businesses.business_name) end as businesses";
  }

  return null;
}

function buildJoinClauses(table: TableName, columns: string) {
  if (table !== "devices") {
    return "";
  }

  const parts = splitSelectColumns(columns);
  const joins = [];
  if (parts.includes("customers(email)")) {
    joins.push(" left join customers on customers.id = devices.customer_id");
  }
  if (parts.includes("businesses(business_name)")) {
    joins.push(" left join businesses on businesses.id = devices.business_id");
  }

  return joins.join("");
}

function splitSelectColumns(columns: string) {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (const character of columns) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function addParam(params: unknown[], column: string, value: unknown) {
  params.push(prepareParam(column, value));
  const placeholder = `$${params.length}`;

  if (jsonbColumns.has(column)) {
    return `${placeholder}::jsonb`;
  }

  if (textArrayColumns.has(column)) {
    return `${placeholder}::text[]`;
  }

  return placeholder;
}

function prepareParam(column: string, value: unknown) {
  if (jsonbColumns.has(column)) {
    return JSON.stringify(value ?? null);
  }

  return value;
}

function qualifiedColumn(table: TableName, column: string) {
  assertColumns(table, [column]);
  return `${table}.${column}`;
}

function assertTable(table: string): TableName {
  if (Object.prototype.hasOwnProperty.call(tableColumns, table)) {
    return table as TableName;
  }

  throw new Error(`Unsupported table: ${table}`);
}

function assertColumns(table: TableName, columns: string[]) {
  const allowedColumns = tableColumns[table] as readonly string[];
  for (const column of columns) {
    if (!allowedColumns.includes(column)) {
      throw new Error(`Unsupported column for ${table}: ${column}`);
    }
  }
}

function normalizeDatabaseValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeDatabaseValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [key, normalizeDatabaseValue(nestedValue)]));
  }

  return value;
}
