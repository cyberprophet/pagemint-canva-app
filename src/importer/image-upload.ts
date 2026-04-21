import { upload } from "@canva/asset";
import type { ImageRef } from "@canva/asset";

/**
 * Upload an image from a URL and return its Canva ImageRef.
 * Awaits `whenUploaded()` before resolving, ensuring the ref is stable
 * before it is used in `addElementAtPoint`.
 *
 * Migration note (v1 → v2):
 * - `type` changed from uppercase `"IMAGE"` to lowercase `"image"`.
 * - `aiDisclosure: "none"` is now required by the v2 @canva/asset SDK.
 *   PageMint images are fetched from the PageMint asset pipeline and are
 *   not AI-generated, so "none" is the correct value.
 * - `ImageRef` is now imported from `@canva/asset` (not `@canva/design`).
 */
export async function uploadImage(opts: {
  url: string;
  thumbnailUrl: string;
  widthPx: number;
  heightPx: number;
}): Promise<ImageRef> {
  const queued = await upload({
    type: "image",
    url: opts.url,
    thumbnailUrl: opts.thumbnailUrl,
    width: opts.widthPx,
    height: opts.heightPx,
    mimeType: "image/png",
    // v2 SDK requires explicit AI disclosure. These images come from PageMint's
    // asset pipeline — not AI-generated — so the correct value is "none".
    aiDisclosure: "none",
  });

  await queued.whenUploaded();

  return queued.ref;
}
