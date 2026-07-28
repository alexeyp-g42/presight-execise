import { describe, it, expect } from 'vitest';
import { parseUsersQuery, parseFacetsQuery, ValidationError } from '../../src/validation/params.js';

describe('parseUsersQuery', () => {
  it('applies defaults', () => {
    const r = parseUsersQuery({});
    expect(r).toEqual({
      q: '', hobbies: [], nationalities: [],
      sort: 'last_name', dir: 'asc', cursor: null, limit: 50,
    });
  });

  it('splits comma-separated lists', () => {
    const r = parseUsersQuery({ hobbies: 'chess,go', nationalities: 'US,UK' });
    expect(r.hobbies).toEqual(['chess', 'go']);
    expect(r.nationalities).toEqual(['US', 'UK']);
  });

  it('trims empty entries', () => {
    const r = parseUsersQuery({ hobbies: 'chess,,go,' });
    expect(r.hobbies).toEqual(['chess', 'go']);
  });

  it('clamps limit to [1, 200]', () => {
    expect(parseUsersQuery({ limit: '0' }).limit).toBe(1);
    expect(parseUsersQuery({ limit: '9999' }).limit).toBe(200);
  });

  it('rejects invalid sort field', () => {
    expect(() => parseUsersQuery({ sort: 'password' })).toThrow(ValidationError);
  });

  it('rejects invalid direction', () => {
    expect(() => parseUsersQuery({ dir: 'sideways' })).toThrow(ValidationError);
  });
});

describe('parseFacetsQuery', () => {
  it('accepts only filter params', () => {
    const r = parseFacetsQuery({ q: 'ada', hobbies: 'chess' });
    expect(r).toEqual({ q: 'ada', hobbies: ['chess'], nationalities: [] });
  });
});
