import React from "react";
import { Alert, Rows, Text } from "@canva/app-ui-kit";
import type { EmitError } from "../importer/emit-elements";

type Props = {
  errors: EmitError[];
  onDismiss?: () => void;
};

/**
 * Summarises per-element emission errors after the import run completes.
 * A non-empty error list means some elements failed; the rest were still
 * imported (emit loop does not abort on individual failures).
 */
export function ErrorAlert({ errors, onDismiss }: Props): React.JSX.Element | null {
  if (errors.length === 0) return null;

  return (
    <Alert
      tone="critical"
      title={`${errors.length} element${errors.length === 1 ? "" : "s"} failed`}
      onDismiss={onDismiss}
    >
      <Rows spacing="1u">
        {errors.slice(0, 5).map((e) => (
          <Text key={e.index} size="small">
            #{e.index + 1} ({e.type}): {e.message}
          </Text>
        ))}
        {errors.length > 5 && (
          <Text size="small" tone="tertiary">
            …and {errors.length - 5} more
          </Text>
        )}
      </Rows>
    </Alert>
  );
}
