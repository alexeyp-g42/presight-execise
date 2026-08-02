import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  DEFAULT_PARAMS,
  parseDirectoryParams,
  serializeDirectoryParams,
  toggleValue,
  type DirectoryParams,
} from '../src/state/directoryParams.js';

const parse = (queryString: string) => parseDirectoryParams(new URLSearchParams(queryString));
const serialize = (params: DirectoryParams) => serializeDirectoryParams(params).toString();

describe('parseDirectoryParams', () => {
  it('returns defaults for an empty query string', () => {
    expect(parse('')).toEqual(DEFAULT_PARAMS);
  });

  it('reads every field', () => {
    expect(parse('q=jo&nationalities=Danish,Thai&hobbies=Chess&sort=age&order=desc')).toEqual({
      q: 'jo',
      nationalities: ['Danish', 'Thai'],
      hobbies: ['Chess'],
      sort: 'age',
      order: 'desc',
    });
  });

  it('trims and de-duplicates csv values', () => {
    expect(parse('hobbies=Chess, Hiking ,Chess,').hobbies).toEqual(['Chess', 'Hiking']);
  });

  it('falls back to the default for an invalid sort rather than throwing', () => {
    expect(parse('sort=email').sort).toBe('first_name');
  });

  it('falls back to the default for an invalid order', () => {
    expect(parse('order=sideways').order).toBe('asc');
  });

  it('handles values needing encoding', () => {
    expect(parse('nationalities=South%20African').nationalities).toEqual(['South African']);
  });
});

describe('serializeDirectoryParams', () => {
  it('omits every default', () => {
    expect(serialize(DEFAULT_PARAMS)).toBe('');
  });

  it('omits an all-whitespace query', () => {
    expect(serialize({ ...DEFAULT_PARAMS, q: '   ' })).toBe('');
  });

  it('emits only non-default fields', () => {
    expect(serialize({ ...DEFAULT_PARAMS, sort: 'age' })).toBe('sort=age');
  });

  it('round-trips a full state', () => {
    const state: DirectoryParams = {
      q: 'jo',
      nationalities: ['Danish', 'Thai'],
      hobbies: ['Chess'],
      sort: 'age',
      order: 'desc',
    };
    expect(parseDirectoryParams(serializeDirectoryParams(state))).toEqual(state);
  });

  it('round-trips a value containing a space', () => {
    const state: DirectoryParams = { ...DEFAULT_PARAMS, nationalities: ['South African'] };
    expect(parseDirectoryParams(serializeDirectoryParams(state))).toEqual(state);
  });
});

describe('toggleValue', () => {
  it('adds a missing value', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes a present value', () => {
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('activeFilterCount', () => {
  it('counts hobbies and nationalities but not text or sort', () => {
    expect(
      activeFilterCount({ ...DEFAULT_PARAMS, q: 'jo', sort: 'age', hobbies: ['a'], nationalities: ['b', 'c'] }),
    ).toBe(3);
  });
});
