import { upload } from "@canva/asset";
import type { ImageRef } from "@canva/design";

/**
 * Upload an image from a URL and return its Canva ImageRef.
 * Awaits `whenUploaded()` before resolving, ensuring the ref is stable
 * before it is used in `addNativeElement`.
 */
export async function uploadImage(opts: {
  url: string;
  thumbnailUrl: string;
  widthPx: number;
  heightPx: number;
}): Promise<ImageRef> {
  const queued = await upload({
    type: "IMAGE",
    url: opts.url,
    thumbnailUrl: opts.thumbnailUrl,
    width: opts.widthPx,
    height: opts.heightPx,
    mimeType: "image/png",
  });

  await queued.whenUploaded();

  return queued.ref;
}
