import { describe, it, expect } from 'vitest';
import { buildFilter } from '../../src/queries/filter';

describe('buildFilter', () => {
  it('returns no-op fragments when nothing is set', () => {
    const f = buildFilter({ q: '', hobbies: [], nationalities: [] });
    expect(f.whereSql).toBe('');
    expect(f.joinSql).toBe('');
    expect(f.havingSql).toBe('');
    expect(f.params).toEqual([]);
    expect(f.hobbyCount).toBe(0);
  });

  it('adds a LIKE clause for text', () => {
    const f = buildFilter({ q: 'Ada', hobbies: [], nationalities: [] });
    expect(f.whereSql).toContain('u.full_name_lc LIKE ?');
    expect(f.params).toEqual(['%ada%']);
  });

  it('adds IN clause for nationalities (OR)', () => {
    const f = buildFilter({ q: '', hobbies: [], nationalities: ['US', 'UK'] });
    expect(f.whereSql).toContain('u.nationality IN (?, ?)');
    expect(f.params).toEqual(['US', 'UK']);
  });

  it('adds join + HAVING for hobbies (AND)', () => {
    const f = buildFilter({ q: '', hobbies: ['chess', 'go'], nationalities: [] });
    expect(f.joinSql).toContain('JOIN user_hobbies uh');
    expect(f.joinSql).toContain('JOIN hobbies h');
    expect(f.whereSql).toContain('h.name IN (?, ?)');
    expect(f.havingSql).toContain('COUNT(DISTINCT h.id) = ?');
    expect(f.params).toEqual(['chess', 'go', 2]);
    expect(f.hobbyCount).toBe(2);
  });

  it('combines all three with AND', () => {
    const f = buildFilter({ q: 'lo', hobbies: ['chess'], nationalities: ['US'] });
    expect(f.whereSql).toMatch(/full_name_lc LIKE \?/);
    expect(f.whereSql).toMatch(/nationality IN \(\?\)/);
    expect(f.whereSql).toMatch(/h\.name IN \(\?\)/);
    expect(f.params).toEqual(['%lo%', 'US', 'chess', 1]);
  });
});
