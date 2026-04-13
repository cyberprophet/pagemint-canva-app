import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AppUiProvider,
  Button,
  FormField,
  Rows,
  Text,
  TextInput,
  Title,
} from "@canva/app-ui-kit";
import { upload } from "@canva/asset";
import { addNativeElement } from "@canva/design";

/**
 * PageMint Canva app — paste-URL flow.
 *
 * The user pastes a PageMint share link (the `url` or `image_url` returned
 * by `POST /api/design/share` on the PageMint server), the app normalizes
 * it to the CORS-friendly `/s/{token}/image` endpoint, uploads the PNG
 * bytes through Canva's `upload` SDK, and drops the image on the current
 * page via `addNativeElement`.
 *
 * Why this shape (vs. a Content Extension that lists the user's sessions):
 * the listing path requires a full OAuth2 authorization server between
 * Canva and PageMint Identity, which is a multi-day project on its own.
 * The paste-URL flow works today with no Canva-side auth, mirrors the
 * Figma plugin's pattern, and is what Intent 020 ships as v1.
 */
function App(): JSX.Element {
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function onImport() {
    const trimmed = link.trim();
    if (!trimmed) {
      setStatus("Paste a PageMint share link first.");
      return;
    }

    const imageUrl = normalizeToImageUrl(trimmed);
    if (!imageUrl) {
      setStatus("That doesn't look like a PageMint share link.");
      return;
    }

    setBusy(true);
    setStatus("Fetching PageMint design…");
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        setStatus(`Fetch failed (${response.status}). Check the link hasn't expired.`);
        setBusy(false);
        return;
      }

      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);

      setStatus("Uploading to Canva…");
      const asset = await upload({
        type: "IMAGE",
        mimeType: "image/png",
        url: dataUrl,
        thumbnailUrl: dataUrl,
        parentRef: undefined,
      });

      setStatus("Placing on canvas…");
      await addNativeElement({
        type: "IMAGE",
        ref: asset.ref,
      });

      setStatus("Imported.");
      setLink("");
    } catch (err) {
      setStatus(`Import failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppUiProvider>
      <Rows spacing="2u">
        <Title size="medium">PageMint</Title>
        <Text>Paste a PageMint share link to drop the design onto your page.</Text>
        <FormField
          label="PageMint share link"
          value={link}
          control={(props) => (
            <TextInput
              {...props}
              placeholder="https://page.mint.surf/s/…"
              value={link}
              onChange={setLink}
            />
          )}
        />
        <Button variant="primary" onClick={onImport} disabled={busy} stretch>
          {busy ? "Importing…" : "Import"}
        </Button>
        {status && (
          <Text size="small" tone="tertiary">
            {status}
          </Text>
        )}
      </Rows>
    </AppUiProvider>
  );
}

/**
 * Accepts any of:
 *   https://page.mint.surf/s/ABC123
 *   https://page.mint.surf/s/ABC123/image
 *   https://page.mint.surf/s/ABC123/preview.png
 * and returns the CORS-friendly `/s/{token}/image` URL.
 */
function normalizeToImageUrl(input: string): string | null {
  try {
    const u = new URL(input);
    const match = u.pathname.match(/^\/s\/([^/]+)/);
    if (!match) return null;
    const token = match[1];
    return `${u.origin}/s/${token}/image`;
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}
