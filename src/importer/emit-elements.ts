import { addElementAtPoint, addElementAtCursor } from "@canva/design";
import { useFeatureSupport } from "@canva/app-hooks";
import type { ElementDesc } from "./dom-walk";
import { uploadImage } from "./image-upload";
import { resolveFont } from "./font-resolve";

export type EmitError = {
  index: number;
  type: ElementDesc["type"];
  message: string;
};

export type EmitResult = {
  errors: EmitError[];
  missingFonts: string[];
};

/**
 * Pick the best available element-add function at the call site.
 *
 * `addElementAtPoint` is preferred (fixed-size documents — Presentations,
 * Whiteboards). `addElementAtCursor` is the fallback for responsive/web
 * documents. `useFeatureSupport()` gates availability at runtime.
 *
 * Call this inside a React component (hook rules apply) and pass the
 * resulting `addElement` function into `emitElements`. If neither is
 * supported (e.g. the user is in a responsive document that does not
 * support positional placement), returns `undefined` — the caller should
 * display a warning rather than attempting the import.
 */
export function useAddElement():
  | typeof addElementAtPoint
  | typeof addElementAtCursor
  | undefined {
  const isSupported = useFeatureSupport();
  return (
    [addElementAtPoint, addElementAtCursor] as Array<
      typeof addElementAtPoint | typeof addElementAtCursor
    >
  ).find((fn) => isSupported(fn));
}

/**
 * Emit a list of ElementDesc objects onto the current Canva page using
 * `addElementAtPoint` (v2 SDK). Each element is emitted independently; a
 * single failure does not abort the run — it is collected into `errors`
 * instead.
 *
 * @param elements   - Flat list from `walkDom`.
 * @param addElement - The function returned by `useAddElement()`.
 * @param onProgress - Called after each element with 0-100 percent.
 * @param signal     - Optional AbortSignal; cancels the loop on abort.
 *
 * Migration notes (v1 → v2):
 * - `addNativeElement` (v1) replaced by `addElementAtPoint` / `addElementAtCursor` (v2).
 * - Element type strings are now lowercase ("text", "image", "shape") — v1 used "TEXT" etc.
 * - Image upload now requires `aiDisclosure: "none"` (set in image-upload.ts).
 * - `useFeatureSupport()` must gate element-add calls; see `useAddElement` above.
 * - `altText.decorative` changed from `undefined` (v1) to `false` (v2 requires boolean).
 */
export async function emitElements(
  elements: ElementDesc[],
  addElement: typeof addElementAtPoint | typeof addElementAtCursor,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<EmitResult> {
  const errors: EmitError[] = [];
  const missingFontSet = new Set<string>();

  for (let i = 0; i < elements.length; i++) {
    if (signal?.aborted) break;

    const el = elements[i];

    try {
      if (el.type === "image") {
        const ref = await uploadImage({
          url: el.url,
          thumbnailUrl: el.thumbUrl,
          widthPx: el.widthPx,
          heightPx: el.heightPx,
        });

        await addElement({
          type: "image",
          ref,
          top: el.top,
          left: el.left,
          width: el.widthPx,
          height: el.heightPx,
          altText: el.altText
            ? { text: el.altText, decorative: false }
            : undefined,
        });
      } else if (el.type === "text") {
        const { fontRef, isMiss } = await resolveFont(el.fontFamily);
        if (isMiss) missingFontSet.add(el.fontFamily);

        await addElement({
          type: "text",
          children: [el.text],
          top: el.top,
          left: el.left,
          width: el.widthPx,
          fontSize: el.fontSizePx,
          fontWeight: el.fontWeight,
          color: el.colorHex,
          textAlign: el.alignment,
          ...(fontRef ? { fontRef } : {}),
        });
      } else if (el.type === "shape") {
        const w = el.widthPx;
        const h = el.heightPx;

        await addElement({
          type: "shape",
          viewBox: { top: 0, left: 0, width: w, height: h },
          paths: [
            {
              d: `M0,0 L${w},0 L${w},${h} L0,${h} Z`,
              fill: { color: el.fillHex },
            },
          ],
          top: el.top,
          left: el.left,
          width: w,
          height: h,
        });
      }
    } catch (err) {
      errors.push({
        index: i,
        type: el.type,
        message: err instanceof Error ? err.message : String(err),
      });
      // Continue — do not abort the whole run
    }

    onProgress(Math.round(((i + 1) / elements.length) * 100));
  }

  return { errors, missingFonts: Array.from(missingFontSet) };
}
