import React from "react";
import { Box, Button, ProgressBar, Rows, Text, Title } from "@canva/app-ui-kit";

type Props = {
  /** 0-100 */
  percent: number;
  current: number;
  total: number;
  onCancel: () => void;
};

/**
 * Displays a progress bar + counter while elements are being emitted.
 */
export function ProgressView({ percent, current, total, onCancel }: Props): React.JSX.Element {
  return (
    <Rows spacing="2u">
      <Title size="medium">Importing…</Title>
      <Box display="flex" alignItems="center">
        <Rows spacing="1u">
          <ProgressBar
            value={percent}
            ariaLabel="Importing PageMint design"
          />
          <Text size="small" tone="tertiary">
            {current} / {total} elements
          </Text>
        </Rows>
      </Box>
      <Button variant="secondary" onClick={onCancel} stretch>
        Cancel
      </Button>
    </Rows>
  );
}
