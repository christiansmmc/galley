import { describe, it, expect } from "vitest";
import { formatAge } from "../util/time";

const NOW = new Date("2026-05-23T12:00:00Z");

describe("formatAge", () => {
  it("returns em-dash for empty / invalid", () => {
    expect(formatAge("", NOW)).toBe("—");
    expect(formatAge("not-a-date", NOW)).toBe("—");
  });

  it("seconds", () => {
    expect(formatAge("2026-05-23T11:59:30Z", NOW)).toBe("30s");
  });

  it("minutes / hours / days / weeks / months / years", () => {
    expect(formatAge("2026-05-23T11:50:00Z", NOW)).toBe("10m");
    expect(formatAge("2026-05-23T09:00:00Z", NOW)).toBe("3h");
    expect(formatAge("2026-05-21T12:00:00Z", NOW)).toBe("2d");
    expect(formatAge("2026-05-09T12:00:00Z", NOW)).toBe("2w");
    expect(formatAge("2026-02-15T12:00:00Z", NOW)).toBe("3mo");
    expect(formatAge("2024-05-23T12:00:00Z", NOW)).toBe("2y");
  });

  it("future timestamp clamps to 0s", () => {
    expect(formatAge("2026-05-23T13:00:00Z", NOW)).toBe("0s");
  });
});
