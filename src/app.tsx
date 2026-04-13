import React from "react";
import { createRoot } from "react-dom/client";
import { AppUiProvider, Rows, Text, Title } from "@canva/app-ui-kit";

/**
 * PageMint Canva content extension — app entry.
 *
 * Canva loads this bundle inside the editor's Apps sidebar. The content-
 * extension search itself is driven by Canva (it invokes our backend
 * `find` handler directly — see `src/backend/find.ts`), so this UI only
 * needs to render a short "connect your PageMint account" prompt and a
 * lightweight status strip while the OAuth follow-up PR lands.
 */
function App(): JSX.Element {
  return (
    <AppUiProvider>
      <Rows spacing="2u">
        <Title size="medium">PageMint</Title>
        <Text>
          Browse your completed PageMint designs and drag them into your
          Canva project.
        </Text>
        <Text tone="tertiary" size="small">
          First time? Sign in with your PageMint account — Canva will open a
          secure consent prompt.
        </Text>
      </Rows>
    </AppUiProvider>
  );
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}
