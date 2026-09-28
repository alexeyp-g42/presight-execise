import { describe, expect, it } from "vitest";
import { hueFromString } from "./color";
import { getFlag } from "./flags";

describe("getFlag", () => {
  it("builds the flag emoji for a nationality", () => {
    expect(getFlag("German")).toBe("🇩🇪");
    expect(getFlag("South African")).toBe("🇿🇦");
  });

  it("falls back to a neutral flag", () => {
    expect(getFlag("Atlantean")).toBe("🏳️");
  });
});

describe("hueFromString", () => {
  it("is stable and within the colour wheel", () => {
    expect(hueFromString("Chess")).toBe(hueFromString("Chess"));
    for (const value of ["", "Chess", "Board Games", "Ünïcødé"]) {
      const hue = hueFromString(value);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });
});
