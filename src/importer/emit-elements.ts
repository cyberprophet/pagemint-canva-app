import { addNativeElement } from "@canva/design";
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
 * Emit a list of ElementDesc objects onto the current Canva page using
 * `addNativeElement`. Each element is emitted independently; a single
 * failure does not abort the run — it is collected into `errors` instead.
 *
 * @param elements - Flat list from `walkDom`.
 * @param onProgress - Called after each element with 0-100 percent.
 * @param signal - Optional AbortSignal; cancels the loop on abort.
 */
export async function emitElements(
  elements: ElementDesc[],
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

        await addNativeElement({
          type: "IMAGE",
          ref,
          top: el.top,
          left: el.left,
          width: el.widthPx,
          height: el.heightPx,
          altText: el.altText
            ? { text: el.altText, decorative: undefined }
            : undefined,
        });
      } else if (el.type === "text") {
        const { fontRef, isMiss } = await resolveFont(el.fontFamily);
        if (isMiss) missingFontSet.add(el.fontFamily);

        await addNativeElement({
          type: "TEXT",
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

        await addNativeElement({
          type: "SHAPE",
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
