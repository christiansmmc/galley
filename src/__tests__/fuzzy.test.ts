import { describe, it, expect } from "vitest";
import { fuzzyScore, fuzzyFilter } from "../util/fuzzy";

describe("fuzzyScore", () => {
  it("empty query matches with score 0", () => {
    expect(fuzzyScore("anything", "")).toBe(0);
  });

  it("subsequence match returns a finite score", () => {
    const s = fuzzyScore("Fix login bug", "fxlb");
    expect(s).not.toBeNull();
    expect(typeof s).toBe("number");
  });

  it("non-match returns null", () => {
    expect(fuzzyScore("Fix login bug", "xyz")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(fuzzyScore("README.md", "rdm")).not.toBeNull();
  });

  it("rewards earlier + tighter matches with lower scores", () => {
    const tight = fuzzyScore("loginpage", "login")!;
    const loose = fuzzyScore("xxxxxxxxxxxlogin", "login")!;
    expect(tight).toBeLessThan(loose);
  });
});

describe("fuzzyFilter", () => {
  it("ranks closer matches first", () => {
    const items = ["xyz-payments", "payments", "payments-service"];
    const out = fuzzyFilter(items, "pay", x => x);
    expect(out[0]).toBe("payments");
  });

  it("drops non-matches", () => {
    const items = ["alpha", "beta", "gamma"];
    const out = fuzzyFilter(items, "z", x => x);
    expect(out).toHaveLength(0);
  });
});
