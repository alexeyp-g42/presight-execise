export interface FilterParams {
  q: string;
  hobbies: string[];
  nationalities: string[];
}

export interface FilterFragment {
  whereSql: string;
  joinSql: string;
  havingSql: string;
  params: unknown[];
  hobbyCount: number;
}

export function buildFilter(p: FilterParams): FilterFragment {
  const where: string[] = [];
  const params: unknown[] = [];
  let joinSql = '';
  let havingSql = '';
  const hobbyCount = p.hobbies.length;

  if (p.q.trim() !== '') {
    where.push('u.full_name_lc LIKE ?');
    params.push(`%${p.q.trim().toLowerCase()}%`);
  }

  if (p.nationalities.length > 0) {
    where.push(`u.nationality IN (${p.nationalities.map(() => '?').join(', ')})`);
    params.push(...p.nationalities);
  }

  if (hobbyCount > 0) {
    joinSql = ' JOIN user_hobbies uh ON uh.user_id = u.id JOIN hobbies h ON h.id = uh.hobby_id ';
    where.push(`h.name IN (${p.hobbies.map(() => '?').join(', ')})`);
    params.push(...p.hobbies);
    havingSql = 'HAVING COUNT(DISTINCT h.id) = ?';
    params.push(hobbyCount);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  return { whereSql, joinSql, havingSql, params, hobbyCount };
}
