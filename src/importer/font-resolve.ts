import { findFonts } from "@canva/asset";
import type { FontRef } from "@canva/design";
import type { Font } from "@canva/asset";

type FontCache = Map<string, FontRef | null>;

// Module-level memoization cache: family name → resolved FontRef or null (miss)
const cache: FontCache = new Map();

// All fonts fetched from Canva (loaded once on first call)
let allFonts: Font[] | null = null;

/** Exposed for test assertions. */
export function getMissedFonts(): string[] {
  const misses: string[] = [];
  for (const [name, ref] of cache.entries()) {
    if (ref === null) misses.push(name);
  }
  return misses;
}

/** Reset cache — used in tests. */
export function resetFontCache(): void {
  cache.clear();
  allFonts = null;
}

/**
 * Resolve a CSS font-family name to a Canva FontRef.
 *
 * Strategy:
 * 1. On first call, load all available fonts via `findFonts()` (no options →
 *    returns Canva's curated selection). Results are memoized.
 * 2. Find a font whose `name` matches the requested family (case-insensitive
 *    prefix match to handle "Inter" vs "Inter Regular" etc.).
 * 3. On miss: cache as null, return null — caller falls back to Canva default.
 *
 * Note: `findFonts` in `@canva/asset` v1 accepts only `fontRefs` (no query
 * string), so we load the catalogue once and filter locally.
 */
export async function resolveFont(
  cssFamily: string
): Promise<{ fontRef: FontRef | null; isMiss: boolean }> {
  const key = cssFamily.toLowerCase().trim();

  if (cache.has(key)) {
    const cached = cache.get(key)!;
    return { fontRef: cached, isMiss: cached === null };
  }

  // Load font catalogue on first use
  if (allFonts === null) {
    try {
      const response = await findFonts();
      allFonts = Array.from(response.fonts);
    } catch {
      allFonts = [];
    }
  }

  // Try exact match first, then prefix match
  const normalised = key.replace(/['"]/g, "").trim();
  const match =
    allFonts.find(
      (f) => f.name.toLowerCase() === normalised
    ) ??
    allFonts.find((f) =>
      f.name.toLowerCase().startsWith(normalised)
    ) ??
    allFonts.find((f) =>
      normalised.startsWith(f.name.toLowerCase())
    );

  const result = match ? (match.ref as FontRef) : null;
  cache.set(key, result);

  return { fontRef: result, isMiss: result === null };
}
