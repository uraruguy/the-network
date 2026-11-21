import { getTableName, sql, type Column } from "drizzle-orm";

/**
 * Table-qualified column reference (`"notes"."id"`) for correlated subqueries in a select list.
 * Drizzle renders select-list columns unqualified in single-table queries, so `${notes.id}` inside
 * `(select … from note_mentions m join people p … where m.note_id = ${notes.id})` would silently
 * bind to `p.id`. Use `qcol(notes.id)` there instead.
 */
export function qcol(column: Column) {
  return sql.raw(`"${getTableName(column.table)}"."${column.name}"`);
}

type PgError = { code?: unknown; constraint_name?: unknown; cause?: unknown };

/** The Postgres error with SQLSTATE `code` in `err` or its causes (drizzle wraps driver errors in `DrizzleQueryError`). */
export function pgError(err: unknown, code: string): PgError | null {
  for (let e = err as PgError | undefined, depth = 0; e && depth < 4; e = e.cause as PgError | undefined, depth++) {
    if (e.code === code) return e;
  }
  return null;
}
