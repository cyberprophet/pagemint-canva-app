/**
 * Unit tests for resolveFont() memoization and miss-collection.
 *
 * Mocks @canva/asset at the module level so findFonts() is under test control.
 */

jest.mock("@canva/asset", () => ({
  findFonts: jest.fn(),
}));

import { findFonts } from "@canva/asset";
import { resolveFont, getMissedFonts, resetFontCache } from "../importer/font-resolve";
import type { FontRef } from "@canva/design";

const mockFindFonts = findFonts as jest.MockedFunction<typeof findFonts>;

// Helpers
function makeFont(name: string): { ref: FontRef; name: string; weights: [] } {
  return { ref: `ref:${name}` as FontRef, name, weights: [] };
}

beforeEach(() => {
  resetFontCache();
  mockFindFonts.mockReset();
});

describe("resolveFont", () => {
  it("returns a FontRef for an exact match", async () => {
    mockFindFonts.mockResolvedValue({
      fonts: [makeFont("Inter"), makeFont("Roboto")],
    });

    const result = await resolveFont("Inter");
    expect(result.fontRef).toBe("ref:Inter");
    expect(result.isMiss).toBe(false);
  });

  it("returns null and marks a miss when font is not found", async () => {
    mockFindFonts.mockResolvedValue({
      fonts: [makeFont("Roboto")],
    });

    const result = await resolveFont("Helvetica Neue");
    expect(result.fontRef).toBeNull();
    expect(result.isMiss).toBe(true);
  });

  it("memoizes — findFonts is only called once for multiple resolveFont calls", async () => {
    mockFindFonts.mockResolvedValue({
      fonts: [makeFont("Inter"), makeFont("Roboto")],
    });

    await resolveFont("Inter");
    await resolveFont("Roboto");
    await resolveFont("Inter"); // cache hit

    expect(mockFindFonts).toHaveBeenCalledTimes(1);
  });

  it("returns cached value on second call for same family", async () => {
    mockFindFonts.mockResolvedValue({
      fonts: [makeFont("Inter")],
    });

    const first = await resolveFont("inter"); // lowercase
    const second = await resolveFont("inter");
    expect(first.fontRef).toBe(second.fontRef);
    expect(mockFindFonts).toHaveBeenCalledTimes(1);
  });

  it("is case-insensitive for family matching", async () => {
    mockFindFonts.mockResolvedValue({
      fonts: [makeFont("Lato")],
    });

    const result = await resolveFont("lato");
    expect(result.fontRef).toBe("ref:Lato");
    expect(result.isMiss).toBe(false);
  });

  it("getMissedFonts returns all families that resolved to null", async () => {
    mockFindFonts.mockResolvedValue({
      fonts: [makeFont("Roboto")],
    });

    await resolveFont("Roboto");        // hit
    await resolveFont("CustomFont");    // miss
    await resolveFont("AnotherMiss");   // miss

    const misses = getMissedFonts();
    expect(misses).toContain("customfont");
    expect(misses).toContain("anothermiss");
    expect(misses).not.toContain("roboto");
  });

  it("falls back to an empty catalogue if findFonts throws", async () => {
    mockFindFonts.mockRejectedValue(new Error("SDK error"));

    const result = await resolveFont("Inter");
    expect(result.fontRef).toBeNull();
    expect(result.isMiss).toBe(true);
  });

  it("handles prefix match (e.g. 'Inter' matches 'Inter Regular')", async () => {
    mockFindFonts.mockResolvedValue({
      fonts: [makeFont("Inter Regular")],
    });

    const result = await resolveFont("Inter");
    expect(result.fontRef).toBe("ref:Inter Regular");
    expect(result.isMiss).toBe(false);
  });
});
