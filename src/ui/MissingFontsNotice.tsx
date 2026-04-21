import React from "react";
import { Alert, Text } from "@canva/app-ui-kit";

type Props = {
  fonts: string[];
  onDismiss?: () => void;
};

/**
 * Warns the user that some font families from the PageMint HTML could not
 * be resolved to a Canva FontRef. Those elements fall back to Canva's
 * default sans-serif font.
 */
export function MissingFontsNotice({ fonts, onDismiss }: Props): React.JSX.Element | null {
  if (fonts.length === 0) return null;

  return (
    <Alert
      tone="warn"
      title="Some fonts were not available in Canva"
      onDismiss={onDismiss}
    >
      <Text size="small">
        Canva default font was used for:{" "}
        {fonts.slice(0, 5).join(", ")}
        {fonts.length > 5 ? `, +${fonts.length - 5} more` : "."}
      </Text>
    </Alert>
  );
}
