/**
 * Keyset ("seek") pagination. A cursor is an opaque base64url-encoded JSON
 * array of the ORDER BY column values for the last row of the previous page
 * (always ending in a unique tiebreaker, usually `id`), so pages stay correct
 * even while rows are being inserted concurrently — unlike OFFSET, which
 * skips or repeats rows under concurrent writes.
 */
export function encodeCursor(values: readonly (string | number)[]): string {
  return Buffer.from(JSON.stringify(values), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string | undefined): (string | number)[] | null {
  if (!cursor) return null;
  try {
    const v: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    return Array.isArray(v) ? (v as (string | number)[]) : null;
  } catch {
    return null;
  }
}

/**
 * Build the `(col1, col2, ...) < ($n, $n+1, ...)` (or `>` for ascending) row-comparison
 * predicate for a keyset page. `columns` must be SQL-safe identifiers you control (never
 * user input) — they are interpolated directly since Postgres has no placeholder syntax
 * for column names in a row-comparison.
 */
export function keysetWhere(
  columns: readonly string[],
  cursor: (string | number)[] | null,
  direction: 'asc' | 'desc',
  startParamIndex: number,
): { sql: string; params: (string | number)[] } {
  if (!cursor || cursor.length !== columns.length) return { sql: '', params: [] };
  const op = direction === 'desc' ? '<' : '>';
  const placeholders = columns.map((_, i) => `$${startParamIndex + i}`);
  return { sql: `and (${columns.join(', ')}) ${op} (${placeholders.join(', ')})`, params: cursor };
}

/** Slice a `limit + 1`-row fetch into a page + next cursor, reading the cursor columns off the last kept row. */
export function buildPage<T extends Record<string, unknown>>(
  rows: T[],
  limit: number,
  cursorColumns: readonly (keyof T)[],
): { items: T[]; next_cursor: string | null } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const next = hasMore && last ? encodeCursor(cursorColumns.map((c) => last[c] as string | number)) : null;
  return { items, next_cursor: next };
}

export const PageQuery = { limit: 'limit', cursor: 'cursor' } as const;
