import { describe, expect, it } from "vitest";
import { buildListUsersParams, buildUserFilterParams } from "./userDirectoryApi";
import type { UserListRequest } from "./userDirectoryApi";

/* Client seam 4: the query-string builders, as pure functions — no network, no
   mock call arguments. They earn their own tests because this is the one place
   the client can break the API contract without a type error catching it. The
   server rejects unknown keys outright, so `hobbies[]=chess` — what axios's
   default array serializer produces from an object with array values — is a
   hard 400 rather than a degraded result. Handing axios a pre-built
   `URLSearchParams` bypasses that serializer entirely, and these tests pin the
   string it produces. */

const noSelection = { hobbies: [], nationalities: [] };

const listRequest: UserListRequest = {
  ...noSelection,
  sort: "last_name",
  dir: "asc",
  limit: 50,
};

describe("user filter params", () => {
  it("emits one repeated key per selected hobby, never a bracketed key", () => {
    const params = buildUserFilterParams({
      ...noSelection,
      hobbies: ["chess", "judo"],
    });

    expect(params.getAll("hobbies")).toEqual(["chess", "judo"]);
    expect(params.toString()).toBe("hobbies=chess&hobbies=judo");
    /* The regression this file exists for: `hobbies[]` percent-encodes to
       `hobbies%5B%5D`, which the server's strict schema rejects by name. */
    expect(params.toString()).not.toContain("%5B%5D");
  });

  it("emits one repeated key per selected nationality", () => {
    const params = buildUserFilterParams({
      ...noSelection,
      nationalities: ["Germany", "Türkiye"],
    });

    expect(params.getAll("nationalities")).toEqual(["Germany", "Türkiye"]);
  });

  it("carries a value containing a comma through intact", () => {
    /* Why repeated keys rather than a comma-joined value: nationality display
       names genuinely contain commas, and joining would split one selection
       into two that match nothing. */
    const params = buildUserFilterParams({
      ...noSelection,
      nationalities: ["Korea, Republic of", "Germany"],
    });

    expect(new URLSearchParams(params.toString()).getAll("nationalities")).toEqual([
      "Korea, Republic of",
      "Germany",
    ]);
  });

  it("carries values containing spaces through intact", () => {
    const params = buildUserFilterParams({
      ...noSelection,
      q: "van der Berg",
      hobbies: ["board games"],
    });

    const decoded = new URLSearchParams(params.toString());

    expect(decoded.get("q")).toBe("van der Berg");
    expect(decoded.getAll("hobbies")).toEqual(["board games"]);
  });

  it("omits search text the viewer has cleared", () => {
    expect(buildUserFilterParams(noSelection).has("q")).toBe(false);
    expect(buildUserFilterParams({ ...noSelection, q: "   " }).has("q")).toBe(false);
  });

  it("omits a dimension with nothing selected", () => {
    expect(buildUserFilterParams(noSelection).toString()).toBe("");
  });

  it("carries none of the page params, even handed a whole list request", () => {
    /* The composition rule, asserted rather than assumed: a `UserListRequest`
       is structurally a filter, so this call type-checks — and the facets
       endpoint parses the filter schema strictly, so a leaked `sort` there
       would be a 400. */
    const deepInAPage: UserListRequest = { ...listRequest, cursor: "abc" };
    const params = buildUserFilterParams(deepInAPage);

    expect([...params.keys()]).toEqual([]);
  });
});

describe("list users params", () => {
  it("carries sort, dir and limit alongside the filter", () => {
    const params = buildListUsersParams({
      ...listRequest,
      q: "müller",
      hobbies: ["chess"],
      sort: "age",
      dir: "desc",
      limit: 25,
    });

    expect(params.get("q")).toBe("müller");
    expect(params.getAll("hobbies")).toEqual(["chess"]);
    expect(params.get("sort")).toBe("age");
    expect(params.get("dir")).toBe("desc");
    expect(params.get("limit")).toBe("25");
  });

  it("carries the cursor once a page has minted one", () => {
    const params = buildListUsersParams({ ...listRequest, cursor: "eyJzb3J0IjoiYWdlIn0" });

    expect(params.get("cursor")).toBe("eyJzb3J0IjoiYWdlIn0");
  });

  it("omits the cursor on the first page", () => {
    /* Not `cursor=`: the server reads an empty cursor as a malformed one, not
       as an absent one, so an unconditional `set` would 400 the first page. */
    expect(buildListUsersParams(listRequest).has("cursor")).toBe(false);
    expect(buildListUsersParams({ ...listRequest, cursor: null }).has("cursor")).toBe(false);
  });

  it("still emits repeated keys for selections", () => {
    const params = buildListUsersParams({
      ...listRequest,
      hobbies: ["chess", "judo"],
    });

    expect(params.getAll("hobbies")).toEqual(["chess", "judo"]);
    expect(params.toString()).not.toContain("%5B%5D");
  });
});
