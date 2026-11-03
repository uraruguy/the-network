/** Most people one bulk request may touch; bigger selections go in several requests. */
export const BULK_MAX = 500;

/** Splits ids into request-sized batches, dropping duplicates. Pure. */
export function bulkBatches(ids: readonly string[], size = BULK_MAX): string[][] {
  const unique = [...new Set(ids)];
  const out: string[][] = [];
  for (let i = 0; i < unique.length; i += size) out.push(unique.slice(i, i + size));
  return out;
}
