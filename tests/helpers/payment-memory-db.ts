import { randomUUID } from "node:crypto";

type Row = Record<string, any>;
type Action = "select" | "insert" | "update" | "upsert";
export class PaymentMemoryDb {
  failures: Array<{ table: string; action: Action; message: string }> = [];
  beforeQuery?: (table: string, action: Action) => Promise<void>;
  constructor(readonly rows: Record<string, Row[]> = {}) {}
  table(name: string) { return this.rows[name] ??= []; }
  from(table: string) { return new Query(this, table); }
}

class Query {
  private action: Action = "select";
  private values: Row = {};
  private filters: Array<(row: Row) => boolean> = [];
  private selected = false;
  private conflict = "id";
  constructor(private db: PaymentMemoryDb, private table: string) {}
  select() { this.selected = true; return this; }
  eq(key: string, value: unknown) { this.filters.push(row => (row[key] ?? null) === (value ?? null)); return this; }
  in(key: string, values: unknown[]) { this.filters.push(row => values.includes(row[key])); return this; }
  order() { return this; }
  limit() { return this; }
  insert(values: Row) { this.action = "insert"; this.values = values; return this; }
  update(values: Row) { this.action = "update"; this.values = values; return this; }
  upsert(values: Row, options?: { onConflict?: string }) { this.action = "upsert"; this.values = values; this.conflict = options?.onConflict ?? "id"; return this; }
  async maybeSingle() { const result = await this.execute(); return { ...result, data: result.data?.[0] ?? null }; }
  then<T = any, U = never>(yes?: ((value: any) => T | PromiseLike<T>) | null, no?: ((reason: unknown) => U | PromiseLike<U>) | null) { return this.execute().then(yes, no); }
  private async execute(): Promise<{ data: Row[] | null; error: { message: string } | null }> {
    await this.db.beforeQuery?.(this.table, this.action);
    const index = this.db.failures.findIndex(f => f.table === this.table && f.action === this.action);
    if (index >= 0) return { data: null, error: { message: this.db.failures.splice(index, 1)[0].message } };
    const rows = this.db.table(this.table);
    let matches = rows.filter(row => this.filters.every(filter => filter(row)));
    if (this.action === "insert" || this.action === "upsert") {
      const key = this.table === "stripe_processing_locks" ? "resource_key" : this.table === "orders" ? "stripe_checkout_session_id" : this.conflict;
      const keys = key.split(",");
      const existing = rows.find(row => keys.every(column => this.values[column] != null && row[column] === this.values[column]));
      if (existing && this.action === "insert") return { data: null, error: { message: "duplicate key" } };
      const row = existing ?? { id: randomUUID() };
      Object.assign(row, structuredClone(this.values));
      if (!existing) rows.push(row);
      matches = [row];
    } else if (this.action === "update") matches.forEach(row => Object.assign(row, structuredClone(this.values)));
    return { data: this.selected || this.action === "select" ? structuredClone(matches) : null, error: null };
  }
}
