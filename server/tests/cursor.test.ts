import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor, queryFingerprint } from '../src/users/cursor.js';
import { ApiError } from '../src/common/errors.js';
import type { UsersQuery } from '../src/common/params.js';

const base: UsersQuery = {
  q: '',
  nationalities: [],
  hobbies: [],
  sort: 'first_name',
  order: 'asc',
  limit: 50,
  cursor: undefined,
};

describe('cursor', () => {
  it('round-trips a payload', () => {
    const fingerprint = queryFingerprint(base);
    expect(decodeCursor(encodeCursor({ v: 'Ada', i: 7 }, fingerprint), fingerprint)).toEqual({
      v: 'Ada',
      i: 7,
      f: fingerprint,
    });
  });

  it('round-trips a numeric sort value', () => {
    const fingerprint = queryFingerprint({ ...base, sort: 'age' });
    expect(decodeCursor(encodeCursor({ v: 34, i: 7 }, fingerprint), fingerprint).v).toBe(34);
  });

  it('ignores cursor and limit when fingerprinting', () => {
    expect(queryFingerprint({ ...base, cursor: 'abc', limit: 10 })).toBe(queryFingerprint(base));
  });

  it('ignores filter ordering when fingerprinting', () => {
    expect(queryFingerprint({ ...base, hobbies: ['Chess', 'Hiking'] })).toBe(
      queryFingerprint({ ...base, hobbies: ['Hiking', 'Chess'] }),
    );
  });

  it('changes when a filter changes', () => {
    expect(queryFingerprint({ ...base, q: 'jo' })).not.toBe(queryFingerprint(base));
  });

  it('changes when the sort field changes', () => {
    expect(queryFingerprint({ ...base, sort: 'age' })).not.toBe(queryFingerprint(base));
  });

  it('changes when the sort direction changes', () => {
    expect(queryFingerprint({ ...base, order: 'desc' })).not.toBe(queryFingerprint(base));
  });

  it('rejects a cursor issued for different filters', () => {
    const cursor = encodeCursor({ v: 'Ada', i: 7 }, queryFingerprint(base));
    expect(() => decodeCursor(cursor, queryFingerprint({ ...base, q: 'jo' }))).toThrow(ApiError);
  });

  it('rejects malformed base64', () => {
    expect(() => decodeCursor('!!!not-base64!!!', queryFingerprint(base))).toThrow(ApiError);
  });

  it('rejects valid base64 that is not a cursor', () => {
    const junk = Buffer.from(JSON.stringify({ hello: 'world' })).toString('base64url');
    expect(() => decodeCursor(junk, queryFingerprint(base))).toThrow(ApiError);
  });

  it('reports INVALID_CURSOR as the error code', () => {
    try {
      decodeCursor('garbage', queryFingerprint(base));
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as ApiError).code).toBe('INVALID_CURSOR');
      expect((error as ApiError).status).toBe(400);
    }
  });
});
