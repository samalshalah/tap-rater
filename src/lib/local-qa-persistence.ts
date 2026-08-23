import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type SupabaseResult<T = unknown[]> = {
  data: T | null;
  error: null | { message: string };
};

type OrderRow = Record<string, unknown>;

export function getLocalQaOrdersFileFromEnv(env: Record<string, string | undefined> = process.env) {
  if (env.NODE_ENV === "production") return undefined;

  const value = env.TAP_RATER_LOCAL_ORDERS_FILE?.trim();
  return value ? resolve(value) : undefined;
}

export function createLocalQaOrdersAdapter(filePath: string) {
  return {
    from(table: string) {
      return new LocalQaQueryBuilder(table, filePath);
    }
  };
}

class LocalQaQueryBuilder implements PromiseLike<SupabaseResult> {
  private action: "select" | "update" | "upsert" | "delete" = "select";
  private filters: { column: string; value: unknown }[] = [];
  private rowLimit?: number;
  private values?: OrderRow | OrderRow[];

  constructor(
    private readonly table: string,
    private readonly filePath: string
  ) {}

  select(_columns = "*") {
    this.action = "select";
    return this;
  }

  update(values: OrderRow) {
    this.action = "update";
    this.values = values;
    return this;
  }

  upsert(values: OrderRow | OrderRow[]) {
    this.action = "upsert";
    this.values = values;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  order() {
    return this;
  }

  limit(limit: number) {
    this.rowLimit = limit;
    return this;
  }

  async maybeSingle<T = unknown>(): Promise<SupabaseResult<T>> {
    const result = await this.execute();
    if (result.error) return { data: null, error: result.error };
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
    if (this.table !== "orders") {
      return { data: null, error: { message: "Local QA persistence only supports orders." } };
    }

    try {
      if (this.action === "select") {
        return { data: this.applyLimit(this.applyFilters(await readOrders(this.filePath))), error: null };
      }

      if (this.action === "update") {
        const rows = await readOrders(this.filePath);
        const patch = asSingleRow(this.values);
        const next = rows.map((row) => (this.matches(row) ? { ...row, ...patch } : row));
        await writeOrders(this.filePath, next);
        return { data: null, error: null };
      }

      if (this.action === "upsert") {
        const rows = await readOrders(this.filePath);
        const upsertRows = Array.isArray(this.values) ? this.values : this.values ? [this.values] : [];
        const next = [...rows];
        for (const row of upsertRows) {
          const existingIndex = next.findIndex((existing) => {
            if (row.id && existing.id === row.id) return true;
            if (row.stripe_checkout_session_id && existing.stripe_checkout_session_id === row.stripe_checkout_session_id) return true;
            return false;
          });
          if (existingIndex === -1) next.push(row);
          else next[existingIndex] = { ...next[existingIndex], ...row };
        }
        await writeOrders(this.filePath, next);
        return { data: null, error: null };
      }

      if (this.action === "delete") {
        const rows = await readOrders(this.filePath);
        await writeOrders(this.filePath, rows.filter((row) => !this.matches(row)));
        return { data: null, error: null };
      }

      return { data: null, error: { message: "Unsupported local QA persistence action." } };
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : "Local QA persistence failed." } };
    }
  }

  private applyFilters(rows: OrderRow[]) {
    return rows.filter((row) => this.matches(row));
  }

  private applyLimit(rows: OrderRow[]) {
    return typeof this.rowLimit === "number" ? rows.slice(0, this.rowLimit) : rows;
  }

  private matches(row: OrderRow) {
    return this.filters.every((filter) => row[filter.column] === filter.value);
  }
}

async function readOrders(filePath: string): Promise<OrderRow[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((row): row is OrderRow => Boolean(row) && typeof row === "object") : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeOrders(filePath: string, rows: OrderRow[]) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

function asSingleRow(value: OrderRow | OrderRow[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? {};
  return value ?? {};
}
