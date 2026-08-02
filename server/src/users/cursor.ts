import { createHash } from 'node:crypto';
import { ApiError } from '../common/errors.js';
import type { UsersQuery } from '../common/params.js';

export interface CursorPayload {
  /** The sort column's value on the last row of the previous page. */
  v: string | number;
  /** That row's id — the tie-breaker half of the keyset. */
  i: number;
  /** Fingerprint of the result set this cursor belongs to. */
  f: string;
}

/**
 * Identifies the result set a cursor belongs to.
 *
 * Filters are sorted so that selection order never changes the fingerprint.
 * `limit` and `cursor` are excluded because paging deeper, or with a different
 * page size, is still the same result set.
 */
export function queryFingerprint(query: UsersQuery): string {
  const normalized = JSON.stringify([
    query.q,
    [...query.nationalities].sort(),
    [...query.hobbies].sort(),
    query.sort,
    query.order,
  ]);
  return createHash('sha1').update(normalized).digest('base64url').slice(0, 12);
}

export function encodeCursor(payload: Omit<CursorPayload, 'f'>, fingerprint: string): string {
  return Buffer.from(JSON.stringify({ ...payload, f: fingerprint }), 'utf8').toString('base64url');
}

/**
 * The cursor is opaque but not secret — it holds a sort value and an id the
 * client can already see. The fingerprint exists to catch client bugs loudly
 * rather than to resist tampering; a forged cursor can only reach data the
 * caller is already entitled to.
 */
export function decodeCursor(raw: string, fingerprint: string): CursorPayload {
  const invalid = (message: string) => new ApiError('INVALID_CURSOR', 400, message);

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw invalid('Cursor is malformed');
  }

  if (typeof parsed !== 'object' || parsed === null) throw invalid('Cursor is malformed');

  const payload = parsed as Record<string, unknown>;
  const hasValue = typeof payload.v === 'string' || typeof payload.v === 'number';
  if (!hasValue || typeof payload.i !== 'number' || typeof payload.f !== 'string') {
    throw invalid('Cursor is malformed');
  }

  if (payload.f !== fingerprint) {
    throw invalid('Cursor does not match the current filters or sort');
  }

  return { v: payload.v as string | number, i: payload.i, f: payload.f };
}
