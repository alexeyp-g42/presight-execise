import { describe, expect, it } from 'vitest';
import { fetchFacets } from '../src/users/facets.query.js';
import { createFixtureDb, FIXTURE_USERS } from './fixtures.js';
import type { FacetsQuery } from '../src/common/params.js';

const db = createFixtureDb();
const none: FacetsQuery = { q: '', nationalities: [], hobbies: [] };

describe('fetchFacets fast path', () => {
  it('agrees with the filtered path when the filter matches everyone', () => {
    // fetchFacets skips the CTE entirely when no filter is active. Selecting
    // every nationality matches all 40 users but still goes through the
    // filtered path, so the two must produce identical output.
    const everyNationality = [...new Set(FIXTURE_USERS.map((user) => user.nationality))];
    expect(everyNationality.length).toBeGreaterThan(1);

    expect(fetchFacets(db, { ...none, nationalities: everyNationality })).toEqual(
      fetchFacets(db, none),
    );
  });
});

describe('fetchFacets', () => {
  it('caps both lists at twenty', () => {
    const facets = fetchFacets(db, none);
    expect(facets.hobbies).toHaveLength(20);
    expect(facets.nationalities).toHaveLength(20);
  });

  it('orders by count descending then value ascending', () => {
    const { hobbies } = fetchFacets(db, none);
    for (let i = 1; i < hobbies.length; i += 1) {
      const previous = hobbies[i - 1]!;
      const current = hobbies[i]!;
      const ordered =
        previous.count > current.count ||
        (previous.count === current.count && previous.value < current.value);
      expect(ordered).toBe(true);
    }
  });

  it('narrows to the text filter rather than the global dataset', () => {
    const facets = fetchFacets(db, { ...none, q: 'ada' });
    expect(facets.nationalities).toEqual([
      { value: 'Nation01', count: 2 },
      { value: 'Nation02', count: 1 },
    ]);
  });

  it('reflects a nationality selection', () => {
    const facets = fetchFacets(db, { ...none, nationalities: ['Nation01'] });
    // Users 1 and 2 explicitly, plus 8 and 30 from the generated range where
    // NATIONALITY_POOL[k % 22] lands on Nation01.
    expect(facets.nationalities).toEqual([{ value: 'Nation01', count: 4 }]);
  });

  it('gives a selected hobby a count equal to the matched user total', () => {
    const facets = fetchFacets(db, { ...none, hobbies: ['Hobby02'] });
    const selected = facets.hobbies.find((hobby) => hobby.value === 'Hobby02')!;
    // Every matched user holds the selected hobby, so it ties for first place.
    expect(selected.count).toBe(5);
    expect(facets.hobbies[0]!.count).toBe(5);
  });

  it('shows co-occurring hobbies alongside the selected one', () => {
    const facets = fetchFacets(db, { ...none, hobbies: ['Hobby01'] });
    expect(facets.hobbies.map((hobby) => hobby.value)).toContain('Hobby02');
  });

  it('returns empty lists when nothing matches', () => {
    expect(fetchFacets(db, { ...none, q: 'zzzznobody' })).toEqual({ hobbies: [], nationalities: [] });
  });

  it('counts hobby assignments but nationality users', () => {
    const facets = fetchFacets(db, { ...none, q: 'ada' });
    // Users 1 (2 hobbies), 2 (1 hobby), 3 (none) match.
    expect(facets.hobbies.reduce((sum, hobby) => sum + hobby.count, 0)).toBe(3);
    // All three are still counted by nationality.
    expect(facets.nationalities.reduce((sum, nation) => sum + nation.count, 0)).toBe(3);
  });

  it('composes every filter when counting', () => {
    const facets = fetchFacets(db, { ...none, q: 'ada', nationalities: ['Nation01'], hobbies: ['Hobby01'] });
    expect(facets.nationalities).toEqual([{ value: 'Nation01', count: 2 }]);
    expect(facets.hobbies.find((hobby) => hobby.value === 'Hobby01')!.count).toBe(2);
  });
});
