import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Alert,
  AppUiProvider,
  Button,
  FormField,
  ProgressBar,
  Rows,
  Text,
  TextInput,
  Title,
} from "@canva/app-ui-kit";
import { upload } from "@canva/asset";
import {
  addElementAtCursor,
  addElementAtPoint,
  type TextElement,
} from "@canva/design";
import { useFeatureSupport } from "@canva/app-hooks";
import { requestOpenExternalUrl } from "@canva/platform";

const DEFAULT_ORIGIN = "https://page.mint.surf";
const PAGEMINT_URL = "https://page.mint.surf";

type Phase =
  | { kind: "idle" }
  | { kind: "importing"; current: number; total: number; message: string }
  | { kind: "success"; count: number; warnings: string[] }
  | { kind: "error"; message: string };

type AddElementFn =
  | typeof addElementAtPoint
  | typeof addElementAtCursor;

function extractTokenAndOrigin(
  input: string,
): { token: string; origin: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const m = u.pathname.match(/^\/s\/([^/]+)/);
    if (m) return { token: m[1], origin: u.origin };
  } catch {
    // not a URL — fall through to bare-token handling
  }
  if (/^[a-zA-Z0-9_-]{8,}$/.test(trimmed)) {
    return { token: trimmed, origin: DEFAULT_ORIGIN };
  }
  return null;
}

function inferImageMimeType(
  url: string,
): "image/jpeg" | "image/png" | "image/svg+xml" | "image/webp" | "image/heic" | "image/tiff" {
  const ext = url.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "heic":
      return "image/heic";
    case "tif":
    case "tiff":
      return "image/tiff";
    default:
      return "image/png";
  }
}

function headingFontSize(tag: string): number {
  switch (tag) {
    case "h1": return 48;
    case "h2": return 36;
    case "h3": return 28;
    case "h4": return 22;
    case "h5": return 18;
    default: return 16;
  }
}

function headingFontWeight(tag: string): "normal" | "bold" {
  return tag.startsWith("h") ? "bold" : "normal";
}

async function importTextElement(
  el: Element,
  addElement: AddElementFn,
): Promise<void> {
  const tag = el.tagName.toLowerCase();
  const text = (el.textContent ?? "").trim();
  if (!text) return;
  const spec: TextElement = {
    type: "text",
    children: [text],
    fontSize: headingFontSize(tag),
    fontWeight: headingFontWeight(tag),
  };
  await addElement(spec);
}

async function importImageElement(
  el: HTMLImageElement,
  addElement: AddElementFn,
): Promise<void> {
  const src = el.currentSrc || el.src || el.getAttribute("src") || "";
  if (!src) throw new Error("image has no src");
  const asset = await upload({
    type: "image",
    mimeType: inferImageMimeType(src),
    url: src,
    thumbnailUrl: src,
    aiDisclosure: "none",
  });
  await addElement({
    type: "image",
    ref: asset.ref,
    altText: el.alt ? { text: el.alt, decorative: false } : undefined,
  });
}

function collectImportables(root: Element, acc: Element[]): void {
  const tag = root.tagName.toLowerCase();
  if (tag === "img") {
    acc.push(root);
    return;
  }
  if (["h1", "h2", "h3", "h4", "h5", "h6", "p"].includes(tag)) {
    acc.push(root);
    return;
  }
  for (const child of Array.from(root.children)) {
    collectImportables(child, acc);
  }
}

function App(): React.ReactElement {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [manualInput, setManualInput] = useState("");

  const isSupported = useFeatureSupport();
  const addElement = [addElementAtPoint, addElementAtCursor].find((fn) =>
    isSupported(fn),
  );

  const runImport = useCallback(
    async (token: string, origin: string) => {
      if (!addElement) {
        setPhase({
          kind: "error",
          message:
            "This design doesn't support importing elements. Open a fixed-size design (Presentation, Social Media, Poster) and try again.",
        });
        return;
      }

      setPhase({
        kind: "importing",
        current: 0,
        total: 1,
        message: "Fetching PageMint design…",
      });

      let html: string;
      try {
        const res = await fetch(`${origin}/s/${token}`);
        if (!res.ok) {
          setPhase({
            kind: "error",
            message: `Fetch failed (HTTP ${res.status}). The share link may have expired.`,
          });
          return;
        }
        html = await res.text();
      } catch (err) {
        setPhase({
          kind: "error",
          message: `Fetch failed: ${(err as Error).message}`,
        });
        return;
      }

      const doc = new DOMParser().parseFromString(html, "text/html");
      const rootCandidates = doc.querySelectorAll("body > section, main > section");
      const roots: Element[] =
        rootCandidates.length > 0
          ? Array.from(rootCandidates)
          : Array.from(doc.body.children);
      const flat: Element[] = [];
      for (const r of roots) collectImportables(r, flat);

      const total = flat.length;
      if (total === 0) {
        setPhase({
          kind: "error",
          message: "No importable content found in the PageMint design.",
        });
        return;
      }

      let done = 0;
      const warnings: string[] = [];
      for (const el of flat) {
        done += 1;
        setPhase({
          kind: "importing",
          current: done,
          total,
          message: `Importing ${done} of ${total}…`,
        });
        try {
          if (el.tagName.toLowerCase() === "img") {
            await importImageElement(el as HTMLImageElement, addElement);
          } else {
            await importTextElement(el, addElement);
          }
        } catch (err) {
          warnings.push(
            `${el.tagName.toLowerCase()}: ${(err as Error).message}`,
          );
        }
      }
      setPhase({ kind: "success", count: done, warnings });
    },
    [addElement],
  );

  // Deep-link auto-import on mount.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.slice(1));
    const token = params.get("t");
    if (!token) return;
    // Scrub token from URL so it doesn't persist in history.
    try {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    } catch {
      // ignore; token in history is a minor risk since it's one-shot
    }
    runImport(token, DEFAULT_ORIGIN);
  }, [runImport]);

  const onManualImport = useCallback(() => {
    const parsed = extractTokenAndOrigin(manualInput);
    if (!parsed) {
      setPhase({
        kind: "error",
        message:
          "Enter a PageMint share URL (https://page.mint.surf/s/ABC123) or paste a share token.",
      });
      return;
    }
    runImport(parsed.token, parsed.origin);
  }, [manualInput, runImport]);

  const onReset = useCallback(() => {
    setPhase({ kind: "idle" });
    setManualInput("");
  }, []);

  return (
    <AppUiProvider>
      <Rows spacing="2u">
        <Title size="medium">PageMint</Title>

        {phase.kind === "idle" && (
          <>
            <Text>
              Import a PageMint design into this Canva page as editable text
              and image elements.
            </Text>
            <FormField
              label="PageMint share URL or token"
              value={manualInput}
              control={(props) => (
                <TextInput
                  {...props}
                  placeholder="https://page.mint.surf/s/..."
                  value={manualInput}
                  onChange={setManualInput}
                />
              )}
            />
            <Button
              variant="primary"
              onClick={onManualImport}
              disabled={!addElement}
              stretch
            >
              Import
            </Button>
            <Text size="small" tone="tertiary">
              {"Don't have a design yet? Visit PageMint to design something, then click \"Canva에서 편집\" for one-click import."}
            </Text>
            <Button
              variant="tertiary"
              onClick={() => {
                void requestOpenExternalUrl({ url: PAGEMINT_URL });
              }}
              stretch
            >
              Visit PageMint
            </Button>
            {!addElement && (
              <Alert tone="warn">
                This design type doesn't support imports. Open a fixed-size
                design (Presentation, Social Media, Poster) and try again.
              </Alert>
            )}
          </>
        )}

        {phase.kind === "importing" && (
          <>
            <Text>{phase.message}</Text>
            <ProgressBar
              value={Math.round((phase.current / phase.total) * 100)}
            />
          </>
        )}

        {phase.kind === "success" && (
          <>
            <Alert tone="positive">
              Imported {phase.count} element{phase.count === 1 ? "" : "s"} from
              PageMint.
            </Alert>
            {phase.warnings.length > 0 && (
              <Alert tone="warn">
                {phase.warnings.length} element{phase.warnings.length === 1 ? "" : "s"}{" "}
                had issues: {phase.warnings.slice(0, 3).join("; ")}
                {phase.warnings.length > 3 ? " …" : ""}
              </Alert>
            )}
            <Button variant="secondary" onClick={onReset} stretch>
              Import another
            </Button>
          </>
        )}

        {phase.kind === "error" && (
          <>
            <Alert tone="critical">{phase.message}</Alert>
            <Button variant="secondary" onClick={onReset} stretch>
              Try again
            </Button>
          </>
        )}
      </Rows>
    </AppUiProvider>
  );
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}
