import { describe, expect, it } from "vitest";
import type { DirectoryState } from "@/types/user";
import { DEFAULT_STATE, parseState, toSearchParams, toggleValue } from "./urlState";

describe("urlState", () => {
  it("falls back to defaults for missing or invalid values", () => {
    expect(parseState(new URLSearchParams())).toEqual(DEFAULT_STATE);
    expect(parseState(new URLSearchParams("sort=id&order=sideways"))).toEqual(DEFAULT_STATE);
  });

  it("round-trips a full state", () => {
    const state: DirectoryState = {
      search: "ann lee",
      nationalities: ["German", "South African"],
      hobbies: ["Board Games", "Chess"],
      sort: "age",
      order: "desc",
    };
    const params = toSearchParams(state);

    expect(params.toString()).toBe(
      "q=ann+lee&nationality=German&nationality=South+African&hobby=Board+Games&hobby=Chess&sort=age&order=desc",
    );
    expect(parseState(params)).toEqual(state);
  });

  it("omits defaults and drops duplicates", () => {
    expect(toSearchParams(DEFAULT_STATE).toString()).toBe("");
    expect(parseState(new URLSearchParams("hobby=Chess&hobby=Chess&hobby=")).hobbies).toEqual(["Chess"]);
  });

  it("toggles values", () => {
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
  });
});
