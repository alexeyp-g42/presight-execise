import { describe, expect, it } from 'vitest';
import { buildMatchedCte, escapeLike } from '../src/users/filters.js';
import { createFixtureDb } from './fixtures.js';
import type { FacetsQuery } from '../src/common/params.js';

const db = createFixtureDb();

function matchedIds(filters: Partial<FacetsQuery>): number[] {
  const full: FacetsQuery = { q: '', nationalities: [], hobbies: [], ...filters };
  const { sql, params } = buildMatchedCte(full);
  return db
    .prepare(`WITH ${sql} SELECT id FROM matched ORDER BY id`)
    .all(params)
    .map((row) => row.id as number);
}

describe('escapeLike', () => {
  it('escapes the LIKE metacharacters', () => {
    expect(escapeLike('50%_\\x')).toBe('50\\%\\_\\\\x');
  });
});

describe('buildMatchedCte', () => {
  it('returns everyone when no filter is applied', () => {
    expect(matchedIds({})).toHaveLength(40);
  });

  it('ANDs multiple hobbies', () => {
    expect(matchedIds({ hobbies: ['Hobby01', 'Hobby02'] })).toEqual([1, 4]);
  });

  it('matches a single hobby', () => {
    // 1 and 4 hold it explicitly; 9, 27, and 34 pick it up from the generated
    // range, where user 8+k takes HOBBY_POOL[k % 25] and HOBBY_POOL[(k+7) % 25].
    expect(matchedIds({ hobbies: ['Hobby02'] })).toEqual([1, 4, 9, 27, 34]);
  });

  it('returns nothing when one selected hobby does not exist', () => {
    expect(matchedIds({ hobbies: ['Hobby01', 'Nope'] })).toEqual([]);
  });

  it('ORs multiple nationalities', () => {
    const ids = matchedIds({ nationalities: ['Nation03', 'Nation04'] });
    expect(ids).toContain(5);
    expect(ids).toContain(6);
    expect(ids).toContain(7);
  });

  it('matches text against first or last name', () => {
    expect(matchedIds({ q: 'smith' })).toEqual([5, 6]);
  });

  it('matches multi-token text across both name fields', () => {
    expect(matchedIds({ q: 'john smith' })).toEqual([5, 6]);
  });

  it('matches multi-token text regardless of token order', () => {
    expect(matchedIds({ q: 'smith john' })).toEqual([5, 6]);
  });

  it('is case-insensitive', () => {
    expect(matchedIds({ q: 'ADA' })).toEqual([1, 2, 3]);
  });

  it('treats a literal percent sign literally', () => {
    expect(matchedIds({ q: '50%' })).toEqual([7]);
  });

  it('does not let an underscore act as a wildcard', () => {
    expect(matchedIds({ q: '5_%' })).toEqual([]);
  });

  it('composes text, hobby, and nationality filters', () => {
    expect(matchedIds({ q: 'ada', nationalities: ['Nation01'], hobbies: ['Hobby01'] })).toEqual([1, 2]);
  });

  it('returns nothing when the filters cannot be satisfied together', () => {
    expect(matchedIds({ q: 'ada', nationalities: ['Nation03'] })).toEqual([]);
  });
});
