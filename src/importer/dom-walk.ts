/** Vertical gap between top-level sections (px). */
const SECTION_GAP = 16;
/** Vertical gap between elements inside a section (px). */
const ELEMENT_GAP = 8;
/** Default element width on the canvas (px). */
const DEFAULT_WIDTH = 800;
/** Default image size when none is specified (px). */
const DEFAULT_IMAGE_SIZE = 512;
/** Default left margin (px). */
const DEFAULT_LEFT = 40;

export type TextElementDesc = {
  type: "text";
  text: string;
  fontSizePx: number;
  fontWeight: "normal" | "bold";
  colorHex: string;
  fontFamily: string;
  alignment: "start" | "center" | "end" | "justify";
  top: number;
  left: number;
  widthPx: number;
};

export type ImageElementDesc = {
  type: "image";
  url: string;
  thumbUrl: string;
  widthPx: number;
  heightPx: number;
  altText: string;
  top: number;
  left: number;
};

export type ShapeElementDesc = {
  type: "shape";
  fillHex: string;
  widthPx: number;
  heightPx: number;
  top: number;
  left: number;
};

export type ElementDesc = TextElementDesc | ImageElementDesc | ShapeElementDesc;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseInlineStyle(style: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const decl of style.split(";")) {
    const colon = decl.indexOf(":");
    if (colon < 0) continue;
    const prop = decl.slice(0, colon).trim().toLowerCase();
    const value = decl.slice(colon + 1).trim();
    if (prop) map[prop] = value;
  }
  return map;
}

/** Extract a #rrggbb hex from a CSS color value (rgb/rgba/hex). Falls back to #000000. */
function colorToHex(value: string): string {
  if (!value) return "#000000";
  value = value.trim();

  // Already a hex
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
    if (value.length === 4) {
      // #rgb → #rrggbb
      return (
        "#" +
        value[1] +
        value[1] +
        value[2] +
        value[2] +
        value[3] +
        value[3]
      );
    }
    return value.slice(0, 7); // strip alpha if present
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const m = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    return (
      "#" +
      [m[1], m[2], m[3]]
        .map((n) => parseInt(n, 10).toString(16).padStart(2, "0"))
        .join("")
    );
  }

  // Named colours we care about
  const named: Record<string, string> = {
    white: "#ffffff",
    black: "#000000",
    red: "#ff0000",
    green: "#008000",
    blue: "#0000ff",
    gray: "#808080",
    grey: "#808080",
    transparent: "#ffffff",
  };
  return named[value.toLowerCase()] ?? "#000000";
}

function parsePx(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseFloat(value);
  return isNaN(n) ? fallback : Math.round(n);
}

/**
 * Extract CSS properties from inline `style=""` attribute on an element.
 * We intentionally do NOT call `getComputedStyle` — the document is
 * detached, so computed styles are unavailable.
 */
function styleOf(el: Element): Record<string, string> {
  return parseInlineStyle(el.getAttribute("style") ?? "");
}

function headingFontSize(tag: string): number {
  const sizes: Record<string, number> = {
    h1: 48,
    h2: 36,
    h3: 28,
    h4: 22,
    h5: 18,
    h6: 16,
  };
  return sizes[tag.toLowerCase()] ?? 16;
}

/** Detect a solid fill hex from inline style (background-color / background). */
function extractFillHex(style: Record<string, string>): string | null {
  const bg = style["background-color"] ?? style["background"] ?? "";
  if (!bg || bg === "transparent" || bg === "none") return null;
  // Skip gradients
  if (bg.includes("gradient")) return null;
  return colorToHex(bg);
}

// ---------------------------------------------------------------------------
// DOM walk
// ---------------------------------------------------------------------------

/**
 * Parse an HTML string (from PageMint's DesignHtmlBundleService) into a flat
 * list of ElementDesc objects with pre-computed top/left positioning based on
 * a simple top-to-bottom vertical flow.
 *
 * Layout strategy: accumulate heights as sections and their child elements are
 * walked, with fixed gaps between sections and between elements inside a
 * section. This produces "stacked top-to-bottom" placement rather than
 * pixel-perfect CSS layout — which is acceptable per Intent 048 spec.
 */
export function walkDom(html: string): ElementDesc[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const elements: ElementDesc[] = [];
  let cursor = 0; // running Y position

  const sections = Array.from(doc.querySelectorAll("section"));

  // If no <section> elements, fall back to treating <body> as one section
  const roots: Element[] =
    sections.length > 0 ? sections : [doc.body];

  for (let si = 0; si < roots.length; si++) {
    const section = roots[si];
    if (si > 0) cursor += SECTION_GAP;

    const sectionStyle = styleOf(section);
    const sectionBg = extractFillHex(sectionStyle);
    const sectionWidth = parsePx(
      sectionStyle["width"],
      DEFAULT_WIDTH
    );
    const sectionHeight = parsePx(sectionStyle["height"], 0);

    // Emit a background shape for the section if it has a background color
    if (sectionBg && sectionHeight > 0) {
      elements.push({
        type: "shape",
        fillHex: sectionBg,
        widthPx: sectionWidth,
        heightPx: sectionHeight,
        top: cursor,
        left: DEFAULT_LEFT,
      });
    }

    let sectionTop = cursor;
    let firstInSection = true;

    const children = Array.from(section.children);
    for (const child of children) {
      if (!firstInSection) cursor += ELEMENT_GAP;
      firstInSection = false;

      const tag = child.tagName.toLowerCase();
      const cs = styleOf(child);

      if (/^h[1-6]$/.test(tag) || tag === "p") {
        // Text element
        const text = (child.textContent ?? "").trim();
        if (!text) continue;

        const fontSize = parsePx(
          cs["font-size"],
          headingFontSize(tag)
        );
        const rawColor = cs["color"] ?? "#000000";
        const colorHex = colorToHex(rawColor);
        const fontFamily =
          cs["font-family"]?.replace(/['"]/g, "").split(",")[0].trim() ??
          "sans-serif";
        const rawWeight = cs["font-weight"] ?? "normal";
        const fontWeight: "normal" | "bold" =
          rawWeight === "bold" ||
          rawWeight === "700" ||
          parseInt(rawWeight, 10) >= 700
            ? "bold"
            : "normal";

        const rawAlign = cs["text-align"] ?? "start";
        const alignMap: Record<string, TextElementDesc["alignment"]> = {
          left: "start",
          start: "start",
          right: "end",
          end: "end",
          center: "center",
          justify: "justify",
        };
        const alignment: TextElementDesc["alignment"] =
          alignMap[rawAlign] ?? "start";

        const height = fontSize + 4; // approximate line height

        elements.push({
          type: "text",
          text,
          fontSizePx: fontSize,
          fontWeight,
          colorHex,
          fontFamily,
          alignment,
          top: cursor,
          left: DEFAULT_LEFT,
          widthPx: parsePx(cs["width"], DEFAULT_WIDTH),
        });

        cursor += height;
      } else if (tag === "img") {
        const imgEl = child as HTMLImageElement;
        const src = imgEl.getAttribute("src") ?? "";
        if (!src) continue;

        // Resolve relative URLs against the document base
        let resolvedUrl = src;
        try {
          resolvedUrl = new URL(src, "https://page.mint.surf").href;
        } catch {
          // keep src as-is
        }

        const width = parsePx(
          imgEl.getAttribute("width") ?? cs["width"],
          DEFAULT_IMAGE_SIZE
        );
        const height = parsePx(
          imgEl.getAttribute("height") ?? cs["height"],
          DEFAULT_IMAGE_SIZE
        );

        elements.push({
          type: "image",
          url: resolvedUrl,
          thumbUrl: resolvedUrl,
          widthPx: width,
          heightPx: height,
          altText: imgEl.getAttribute("alt") ?? "",
          top: cursor,
          left: DEFAULT_LEFT,
        });

        cursor += height;
      } else {
        // Check for background-color or background (excluding gradients) → shape
        const fillHex = extractFillHex(cs);
        if (fillHex) {
          const w = parsePx(cs["width"], DEFAULT_WIDTH);
          const h = parsePx(cs["height"], 80);
          if (h > 0) {
            elements.push({
              type: "shape",
              fillHex,
              widthPx: w,
              heightPx: h,
              top: cursor,
              left: DEFAULT_LEFT,
            });
            cursor += h;
          }
        }
        // Recurse into child elements (look for nested text/images)
        const nested = walkNestedElements(child, cursor);
        for (const el of nested) {
          elements.push(el);
          cursor += elementHeight(el) + ELEMENT_GAP;
        }
      }
    }

    // If the section has a defined height, advance cursor to end of section
    if (sectionHeight > 0) {
      cursor = Math.max(cursor, sectionTop + sectionHeight);
    }
  }

  return elements;
}

function elementHeight(el: ElementDesc): number {
  if (el.type === "text") return el.fontSizePx + 4;
  if (el.type === "image") return el.heightPx;
  return el.heightPx;
}

/** Shallow recursive pass for text and image elements nested inside non-section containers. */
function walkNestedElements(parent: Element, startTop: number): ElementDesc[] {
  const results: ElementDesc[] = [];
  let cursor = startTop;

  for (const child of Array.from(parent.children)) {
    const tag = child.tagName.toLowerCase();
    const cs = styleOf(child);

    if (/^h[1-6]$/.test(tag) || tag === "p") {
      const text = (child.textContent ?? "").trim();
      if (!text) continue;
      const fontSize = parsePx(cs["font-size"], headingFontSize(tag));
      results.push({
        type: "text",
        text,
        fontSizePx: fontSize,
        fontWeight:
          parseInt(cs["font-weight"] ?? "400", 10) >= 700 ? "bold" : "normal",
        colorHex: colorToHex(cs["color"] ?? "#000000"),
        fontFamily:
          cs["font-family"]?.replace(/['"]/g, "").split(",")[0].trim() ??
          "sans-serif",
        alignment: "start",
        top: cursor,
        left: DEFAULT_LEFT,
        widthPx: DEFAULT_WIDTH,
      });
      cursor += fontSize + 4 + ELEMENT_GAP;
    } else if (tag === "img") {
      const imgEl = child as HTMLImageElement;
      const src = imgEl.getAttribute("src") ?? "";
      if (!src) continue;
      let resolvedUrl = src;
      try {
        resolvedUrl = new URL(src, "https://page.mint.surf").href;
      } catch {
        // keep
      }
      const w = parsePx(imgEl.getAttribute("width") ?? cs["width"], DEFAULT_IMAGE_SIZE);
      const h = parsePx(imgEl.getAttribute("height") ?? cs["height"], DEFAULT_IMAGE_SIZE);
      results.push({
        type: "image",
        url: resolvedUrl,
        thumbUrl: resolvedUrl,
        widthPx: w,
        heightPx: h,
        altText: imgEl.getAttribute("alt") ?? "",
        top: cursor,
        left: DEFAULT_LEFT,
      });
      cursor += h + ELEMENT_GAP;
    }
  }

  return results;
}
