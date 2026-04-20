import React from "react";
import { createRoot } from "react-dom/client";
import { AppUiProvider } from "@canva/app-ui-kit";
import { readToken } from "./importer/token";
import { ImportPanel } from "./ui/ImportPanel";
import { NoTokenNotice } from "./ui/NoTokenNotice";

/**
 * PageMint Canva app — Intent 048
 *
 * Entry point. Reads the session token from the URL hash fragment:
 *   #t=<TOKEN>
 *
 * Launched via deep-link from PageMint's "Canva에서 편집" button:
 *   https://www.canva.com/login/?redirect=...#t=<TOKEN>
 *
 * If no token is present (e.g. user opened the app manually from inside
 * the Canva editor), a friendly notice is shown directing them to start
 * from PageMint.
 *
 * Note: `addNativeElement` is used (not the sketched `addElementAtPoint`)
 * because `@canva/design` v1 ships only `addNativeElement`.
 * `addElementAtPoint` / `addElementAtCursor` appear in a later SDK version.
 * The architecture is otherwise identical; swap the call site when upgrading.
 */
function App(): JSX.Element {
  const token = readToken();

  return (
    <AppUiProvider>
      {token ? <ImportPanel token={token} /> : <NoTokenNotice />}
    </AppUiProvider>
  );
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}
