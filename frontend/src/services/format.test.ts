import { describe, expect, it } from "vitest";
import { formatInr, formatInrWhole, formatInrWords, formatPercent } from "./format";

// Intl uses a non-breaking space in some locales; normalise for comparison.
const n = (s: string) => s.replace(/\u00a0/g, " ");

describe("Indian currency formatting", () => {
  it("groups digits as lakhs and crores", () => {
    expect(n(formatInr(125450))).toBe("₹1,25,450.00");
    expect(n(formatInr(12345678.9))).toBe("₹1,23,45,678.90");
    expect(n(formatInrWhole(1946583.4))).toBe("₹19,46,583");
  });
  it("writes large amounts in lakh / crore", () => {
    expect(formatInrWords(90685)).toBeNull();
    expect(formatInrWords(1507120)).toBe("₹15.07 lakh");
    expect(formatInrWords(25000000)).toBe("₹2.5 crore");
    expect(formatInrWords(10000000)).toBe("₹1 crore");
  });
  it("formats percentages", () => {
    expect(formatPercent(0.9811)).toBe("98.11%");
  });
});
