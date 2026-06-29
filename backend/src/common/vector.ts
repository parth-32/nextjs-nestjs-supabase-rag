/**
 * Format a numeric vector as a pgvector literal (e.g. "[0.1,0.2,0.3]").
 * Both INSERTs into a `vector` column and `match_chunks` RPC args accept this
 * text form, which avoids ambiguity in how PostgREST coerces JSON arrays.
 */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}
