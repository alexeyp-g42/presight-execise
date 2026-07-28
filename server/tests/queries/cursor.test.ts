import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, InvalidCursorError } from '../../src/queries/cursor.js';

describe('cursor codec', () => {
  it('round-trips string sort values', () => {
    const c = encodeCursor({ v: 'Lovelace', id: 42 });
    expect(decodeCursor(c)).toEqual({ v: 'Lovelace', id: 42 });
  });

  it('round-trips number sort values', () => {
    const c = encodeCursor({ v: 36, id: 7 });
    expect(decodeCursor(c)).toEqual({ v: 36, id: 7 });
  });

  it('rejects garbage', () => {
    expect(() => decodeCursor('not-base64!!!')).toThrow(InvalidCursorError);
    expect(() => decodeCursor(Buffer.from('{"nope":1}').toString('base64url'))).toThrow(InvalidCursorError);
  });

  it('produces url-safe output', () => {
    const c = encodeCursor({ v: 'a b/c+d=e', id: 1 });
    expect(c).not.toMatch(/[+/=]/);
    expect(decodeCursor(c).v).toBe('a b/c+d=e');
  });
});
