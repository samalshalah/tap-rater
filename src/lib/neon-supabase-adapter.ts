import { assertTable, assertColumns, jsonbColumns, textArrayColumns, defaultConflictTargets, type TableName } from "./neon-supabase-schema";
import { neon } from "@neondatabase/serverless";

export type NeonQueryExecutor = (sql: string, params: unknown[]) => Promise<unknown[]>;

type SupabaseResult<T = unknown[]> = {
  data: T | null;
  error: null | { message: string; code?: string };
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
        error: { message: error instanceof Error ? error.message : "Database query failed.",
          ...(error && typeof error === "object" && "code" in error && typeof error.code === "string" ? { code: error.code } : {}) }
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
      return `(${columns.map((column) => addParam(params, column, row[column], table)).join(", ")})`;
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
    const assignments = columns.map((column) => `${column} = ${addParam(params, column, values[column], table)}`);
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

      const placeholder = addParam(params, filter.column, filter.value, table);
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

function addParam(params: unknown[], column: string, value: unknown, table?: TableName) {
  const jsonb = jsonbColumns.has(column) && !(table === "commerce_email_outbox" && column === "payload");
  params.push(jsonb ? JSON.stringify(value ?? null) : value);
  const placeholder = `$${params.length}`;

  if (jsonb) {
    return `${placeholder}::jsonb`;
  }

  if (textArrayColumns.has(column)) {
    return `${placeholder}::text[]`;
  }

  return placeholder;
}

function qualifiedColumn(table: TableName, column: string) {
  assertColumns(table, [column]);
  return `${table}.${column}`;
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
