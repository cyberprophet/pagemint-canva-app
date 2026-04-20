import React from "react";
import { Alert, Rows, Text, Title } from "@canva/app-ui-kit";

/**
 * Shown when no `#t=<token>` hash fragment is present.
 * Instructs the user to launch the app from PageMint rather than opening
 * it manually from inside the Canva editor.
 */
export function NoTokenNotice(): JSX.Element {
  return (
    <Rows spacing="2u">
      <Title size="medium">PageMint</Title>
      <Alert tone="info" title="Start from PageMint">
        <Text>
          Open this app by clicking "Canva에서 편집" on a completed PageMint
          design. Canva will launch automatically with the design token.
        </Text>
      </Alert>
    </Rows>
  );
}
