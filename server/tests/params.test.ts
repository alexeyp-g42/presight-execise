import { describe, expect, it } from 'vitest';
import { parseFacetsQuery, parseUsersQuery } from '../src/common/params.js';
import { ApiError } from '../src/common/errors.js';

describe('parseUsersQuery', () => {
  it('applies defaults', () => {
    expect(parseUsersQuery({})).toEqual({
      q: '',
      nationalities: [],
      hobbies: [],
      sort: 'first_name',
      order: 'asc',
      limit: 50,
      cursor: undefined,
    });
  });

  it('reads every parameter', () => {
    expect(parseUsersQuery({
      q: ' jo ', nationalities: 'Danish,Thai', hobbies: 'Chess',
      sort: 'age', order: 'desc', limit: '25', cursor: 'abc',
    })).toEqual({
      q: 'jo', nationalities: ['Danish', 'Thai'], hobbies: ['Chess'],
      sort: 'age', order: 'desc', limit: 25, cursor: 'abc',
    });
  });

  it('splits, trims, and de-duplicates csv values', () => {
    expect(parseUsersQuery({ hobbies: 'Chess, Hiking ,Chess,' }).hobbies).toEqual(['Chess', 'Hiking']);
  });

  it('rejects an unknown sort field', () => {
    expect(() => parseUsersQuery({ sort: 'email' })).toThrow(ApiError);
  });

  it('rejects an unknown order', () => {
    expect(() => parseUsersQuery({ order: 'sideways' })).toThrow(ApiError);
  });

  it('rejects a limit above the maximum', () => {
    expect(() => parseUsersQuery({ limit: '500' })).toThrow(ApiError);
  });

  it('rejects a limit below one', () => {
    expect(() => parseUsersQuery({ limit: '0' })).toThrow(ApiError);
  });

  it('rejects a non-numeric limit', () => {
    expect(() => parseUsersQuery({ limit: 'lots' })).toThrow(ApiError);
  });

  it('rejects unknown parameters', () => {
    expect(() => parseUsersQuery({ page: '2' })).toThrow(ApiError);
  });

  it('reports INVALID_QUERY as the error code', () => {
    try {
      parseUsersQuery({ sort: 'email' });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe('INVALID_QUERY');
      expect((error as ApiError).status).toBe(400);
    }
  });
});

describe('parseFacetsQuery', () => {
  it('accepts the filter parameters', () => {
    expect(parseFacetsQuery({ q: 'jo', nationalities: 'Danish' })).toEqual({
      q: 'jo',
      nationalities: ['Danish'],
      hobbies: [],
    });
  });

  it('rejects sort, which does not affect facets', () => {
    expect(() => parseFacetsQuery({ sort: 'age' })).toThrow(ApiError);
  });

  it('rejects cursor and limit', () => {
    expect(() => parseFacetsQuery({ cursor: 'abc' })).toThrow(ApiError);
    expect(() => parseFacetsQuery({ limit: '10' })).toThrow(ApiError);
  });
});
