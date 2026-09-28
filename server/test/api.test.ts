import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { openDatabase, type Db } from "../src/db.js";
import { seedDatabase } from "../src/seeder.js";
import { SORT_FIELDS, type User } from "../src/users.js";

let db: Db;
let app: ReturnType<typeof createApp>;
let everyone: User[];

async function fetchAll(query: Record<string, string | string[]>) {
  const users: User[] = [];
  let cursor: string | null = null;
  do {
    const res: request.Response = await request(app)
      .get("/api/users")
      .query({ ...query, limit: "37", ...(cursor ? { cursor } : {}) })
      .expect(200);
    users.push(...res.body.data);
    cursor = res.body.nextCursor;
    expect(res.body.hasMore).toBe(cursor !== null);
  } while (cursor);
  return users;
}

function compare(a: User, b: User, sort: keyof User, order: "asc" | "desc") {
  const x = a[sort] as string | number;
  const y = b[sort] as string | number;
  const result = x < y ? -1 : x > y ? 1 : a.id - b.id;
  return order === "asc" ? result : -result;
}

beforeAll(async () => {
  db = openDatabase(":memory:");
  seedDatabase(db, 600, 7);
  app = createApp(db);
  everyone = await fetchAll({});
});

describe("GET /api/users", () => {
  it("returns every user exactly once", () => {
    expect(everyone).toHaveLength(600);
    expect(new Set(everyone.map((u) => u.id)).size).toBe(600);
  });

  it("returns the primary nationality first", () => {
    for (const user of everyone) {
      expect(user.nationalities[0]).toBe(user.nationality);
    }
    expect(everyone.some((u) => u.nationalities.length === 2)).toBe(true);
  });

  it("seeds a wide spread of ages", () => {
    const ages = everyone.map((u) => u.age);
    expect(Math.min(...ages)).toBeLessThan(18);
    expect(Math.max(...ages)).toBeGreaterThan(85);
  });

  it.each(
    SORT_FIELDS.flatMap(
      (sort) =>
        [
          [sort, "asc"],
          [sort, "desc"],
        ] as const,
    ),
  )("paginates by %s %s without gaps or duplicates", async (sort, order) => {
    const users = await fetchAll({ sort, order });
    const expected = [...everyone].sort((a, b) => compare(a, b, sort, order));
    expect(users.map((u) => u.id)).toEqual(expected.map((u) => u.id));
  });

  it("searches across first and last name", async () => {
    const target = everyone[10];
    const users = await fetchAll({ search: `${target.first_name.slice(0, 3)} ${target.last_name}` });
    expect(users.map((u) => u.id)).toContain(target.id);
    for (const user of users) {
      expect(`${user.first_name} ${user.last_name}`.toLowerCase()).toContain(target.last_name.toLowerCase());
    }
  });

  it("treats LIKE wildcards literally", async () => {
    const res: request.Response = await request(app).get("/api/users").query({ search: "%" }).expect(200);
    expect(res.body.total).toBe(0);
  });

  it("matches any of the selected nationalities", async () => {
    const [a, b] = [...new Set(everyone.map((u) => u.nationality))];
    const users = await fetchAll({ nationality: [a, b] });
    const expected = everyone.filter((u) => u.nationalities.includes(a) || u.nationalities.includes(b));
    expect(users.map((u) => u.id).sort()).toEqual(expected.map((u) => u.id).sort());
  });

  it("matches users by any of their nationalities", async () => {
    const dual = everyone.find((u) => u.nationalities.length === 2)!;
    const users = await fetchAll({ nationality: dual.nationalities[1] });
    expect(users.map((u) => u.id)).toContain(dual.id);
  });

  it("matches all of the selected hobbies", async () => {
    const hobbies = everyone.find((u) => u.hobbies.length >= 2)!.hobbies.slice(0, 2);
    const users = await fetchAll({ hobby: hobbies });
    const expected = everyone.filter((u) => hobbies.every((h) => u.hobbies.includes(h)));
    expect(users.map((u) => u.id).sort()).toEqual(expected.map((u) => u.id).sort());
  });

  it("combines text, nationality and hobby filters", async () => {
    const target = everyone.find((u) => u.hobbies.length > 0)!;
    const query = { search: target.last_name, nationality: target.nationality, hobby: target.hobbies[0] };
    const users = await fetchAll(query);
    expect(users.map((u) => u.id)).toContain(target.id);
    for (const user of users) {
      expect(user.nationalities).toContain(target.nationality);
      expect(user.hobbies).toContain(target.hobbies[0]);
    }
  });

  it("rejects invalid parameters", async () => {
    await request(app).get("/api/users").query({ sort: "id; DROP TABLE users" }).expect(400);
    await request(app).get("/api/users").query({ order: "up" }).expect(400);
    await request(app).get("/api/users").query({ limit: "1000" }).expect(400);
    await request(app).get("/api/users").query({ cursor: "nope" }).expect(400);
  });
});

describe("GET /api/users/facets", () => {
  it("counts hobbies and nationalities for the whole directory", async () => {
    const res: request.Response = await request(app).get("/api/users/facets").expect(200);
    expect(res.body.hobbies.length).toBeLessThanOrEqual(20);
    expect(res.body.nationalities.length).toBeLessThanOrEqual(20);

    const top = res.body.nationalities[0];
    expect(top.count).toBe(everyone.filter((u) => u.nationalities.includes(top.value)).length);
    const counts = res.body.nationalities.map((n: { count: number }) => n.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("reflects the active search and hobby filters", async () => {
    const hobby = everyone.find((u) => u.hobbies.length > 0)!.hobbies[0];
    const res: request.Response = await request(app)
      .get("/api/users/facets")
      .query({ search: "a", hobby })
      .expect(200);
    const matching = everyone.filter(
      (u) => u.hobbies.includes(hobby) && /a/i.test(`${u.first_name}\n${u.last_name}`),
    );

    const selected = res.body.hobbies.find((h: { value: string }) => h.value === hobby);
    expect(selected.count).toBe(matching.length);
    for (const { value, count } of res.body.nationalities) {
      expect(count).toBe(matching.filter((u) => u.nationalities.includes(value)).length);
    }
  });

  it("reflects the selected nationalities", async () => {
    const [a, b] = [...new Set(everyone.map((u) => u.nationality))];
    const res = await request(app)
      .get("/api/users/facets")
      .query({ nationality: [a, b] })
      .expect(200);
    const matching = everyone.filter((u) => u.nationalities.includes(a) || u.nationalities.includes(b));

    expect(res.body.nationalities.map((n: { value: string }) => n.value)).toEqual(
      expect.arrayContaining([a, b]),
    );
    for (const { value, count } of res.body.nationalities) {
      expect(count).toBe(matching.filter((u) => u.nationalities.includes(value)).length);
    }
    for (const { value, count } of res.body.hobbies) {
      expect(count).toBe(matching.filter((u) => u.hobbies.includes(value)).length);
    }
  });
});
