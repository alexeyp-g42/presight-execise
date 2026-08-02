import { describe, expect, it } from 'vitest';
import { fetchUsersPage } from '../src/users/users.query.js';
import { createFixtureDb, FIXTURE_USERS } from './fixtures.js';
import type { UsersQuery } from '../src/common/params.js';
import { SORT_FIELDS, SORT_ORDERS } from '../src/shared/contract.js';

const db = createFixtureDb();

const base: UsersQuery = {
  q: '',
  nationalities: [],
  hobbies: [],
  sort: 'first_name',
  order: 'asc',
  limit: 50,
  cursor: undefined,
};

const ALL_IDS = FIXTURE_USERS.map((user) => user.id).sort((a, b) => a - b);

/** Follows `next_cursor` to exhaustion, collecting ids in page order. */
function walk(query: Partial<UsersQuery>): number[] {
  const ids: number[] = [];
  let cursor: string | undefined;

  for (let guard = 0; guard < 100; guard += 1) {
    const page = fetchUsersPage(db, { ...base, limit: 7, ...query, cursor });
    ids.push(...page.data.map((user) => user.id));
    if (!page.page_info.has_more) return ids;
    cursor = page.page_info.next_cursor ?? undefined;
  }
  throw new Error('page walk did not terminate');
}

const SORT_COMBINATIONS = SORT_FIELDS.flatMap((sort) => SORT_ORDERS.map((order) => ({ sort, order })));

describe('fetchUsersPage pagination', () => {
  it.each(SORT_COMBINATIONS)(
    'walks every page under sort=$sort order=$order with no duplicates and no gaps',
    ({ sort, order }) => {
      const ids = walk({ sort, order });
      expect(new Set(ids).size).toBe(ids.length);
      expect([...ids].sort((a, b) => a - b)).toEqual(ALL_IDS);
    },
  );

  it.each(SORT_COMBINATIONS)(
    'paginated order matches unpaginated order for sort=$sort order=$order',
    ({ sort, order }) => {
      const paged = walk({ sort, order });
      const single = fetchUsersPage(db, { ...base, sort, order, limit: 100 }).data.map((u) => u.id);
      expect(paged).toEqual(single);
    },
  );

  it('reports the full matched total on every page', () => {
    const first = fetchUsersPage(db, { ...base, limit: 7 });
    expect(first.page_info.total).toBe(40);
    expect(first.page_info.returned).toBe(7);

    const second = fetchUsersPage(db, { ...base, limit: 7, cursor: first.page_info.next_cursor! });
    expect(second.page_info.total).toBe(40);
  });

  it('ends cleanly on the final page', () => {
    const page = fetchUsersPage(db, { ...base, limit: 100 });
    expect(page.page_info.has_more).toBe(false);
    expect(page.page_info.next_cursor).toBeNull();
    expect(page.page_info.returned).toBe(40);
  });

  it('paginates correctly under an active filter', () => {
    const ids = walk({ nationalities: ['Nation01', 'Nation02'] });
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(1);
    expect(ids).toContain(4);
  });
});

describe('fetchUsersPage ordering', () => {
  // Users 1-3 are age 30 explicitly; user 18 lands there via 20 + (k % 25).
  // The id order must stay ascending in BOTH directions — that is what makes
  // `id` a final tie-breaker rather than part of the sort.
  it('breaks ties by ascending id when sorting ascending', () => {
    const page = fetchUsersPage(db, { ...base, sort: 'age', order: 'asc', limit: 100 });
    expect(page.data.filter((user) => user.age === 30).map((user) => user.id)).toEqual([1, 2, 3, 18]);
  });

  it('breaks ties by ascending id when sorting descending', () => {
    const page = fetchUsersPage(db, { ...base, sort: 'age', order: 'desc', limit: 100 });
    expect(page.data.filter((user) => user.age === 30).map((user) => user.id)).toEqual([1, 2, 3, 18]);
  });

  it('sorts case-insensitively', () => {
    const page = fetchUsersPage(db, { ...base, q: 'ada', sort: 'first_name', order: 'asc', limit: 100 });
    // 'Ada', 'Ada', 'ada' collate equally, so id decides.
    expect(page.data.map((user) => user.id)).toEqual([1, 2, 3]);
  });

  it('sorts by age descending', () => {
    const ages = fetchUsersPage(db, { ...base, sort: 'age', order: 'desc', limit: 100 }).data.map((u) => u.age);
    expect(ages).toEqual([...ages].sort((a, b) => b - a));
  });

  it('sorts by nationality ascending', () => {
    const values = fetchUsersPage(db, { ...base, sort: 'nationality', order: 'asc', limit: 100 }).data
      .map((user) => user.nationality);
    expect(values).toEqual([...values].sort());
  });
});

describe('fetchUsersPage payload', () => {
  it('returns an empty page for a filter that matches nothing', () => {
    const page = fetchUsersPage(db, { ...base, q: 'zzzznobody' });
    expect(page.data).toEqual([]);
    expect(page.page_info).toEqual({ total: 0, returned: 0, has_more: false, next_cursor: null });
  });

  it('attaches alphabetically ordered hobbies', () => {
    const page = fetchUsersPage(db, { ...base, q: 'Walsh', limit: 50 });
    const bo = page.data.find((user) => user.id === 4)!;
    expect(bo.hobbies).toHaveLength(10);
    expect(bo.hobbies).toEqual([...bo.hobbies].sort());
  });

  it('returns an empty hobby array for users with none', () => {
    const page = fetchUsersPage(db, { ...base, q: 'Xavier', limit: 50 });
    expect(page.data[0]!.hobbies).toEqual([]);
  });

  it('returns every contract field', () => {
    const user = fetchUsersPage(db, { ...base, limit: 1 }).data[0]!;
    expect(Object.keys(user).sort()).toEqual(
      ['age', 'avatar', 'first_name', 'hobbies', 'id', 'last_name', 'nationality'],
    );
  });
});
