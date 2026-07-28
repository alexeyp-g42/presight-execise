import type { UserRepository, UserRow } from '../repositories/user.js';
import { decodeCursor, encodeCursor, type CursorPayload } from '../queries/cursor.js';
import type { SortField, SortDir, UsersResponse, UserDTO } from '@shared/types.js';

export interface UserListRequest {
  q: string;
  hobbies: string[];
  nationalities: string[];
  sort: SortField;
  dir: SortDir;
  cursor: string | null;
  limit: number;
}

export class UserService {
  constructor(private readonly repo: UserRepository) {}

  list(req: UserListRequest): UsersResponse {
    const cursor: CursorPayload | null = req.cursor ? decodeCursor(req.cursor) : null;
    const rows = this.repo.listPage({
      filter: { q: req.q, hobbies: req.hobbies, nationalities: req.nationalities },
      sort: req.sort,
      dir: req.dir,
      cursor,
      limit: req.limit + 1,
    });

    const hasMore = rows.length > req.limit;
    const items = (hasMore ? rows.slice(0, req.limit) : rows).map(toDTO);
    const last = items[items.length - 1];
    const nextCursor = hasMore && last
      ? encodeCursor({ v: sortValue(last, req.sort), id: last.id })
      : null;

    return { items, nextCursor, hasMore };
  }
}

function toDTO(r: UserRow): UserDTO {
  return {
    id: r.id,
    avatar: r.avatar,
    first_name: r.first_name,
    last_name: r.last_name,
    age: r.age,
    nationality: r.nationality,
    hobbies: r.hobbies === '' ? [] : r.hobbies.split(','),
  };
}

function sortValue(u: UserDTO, sort: SortField): string | number {
  return u[sort];
}
