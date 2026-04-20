import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Button,
  Rows,
  Text,
  Title,
} from "@canva/app-ui-kit";
import { fetchHtml } from "../importer/fetch-html";
import { walkDom } from "../importer/dom-walk";
import { emitElements, type EmitError } from "../importer/emit-elements";
import { ProgressView } from "./ProgressView";
import { ErrorAlert } from "./ErrorAlert";
import { MissingFontsNotice } from "./MissingFontsNotice";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "progress";
      percent: number;
      current: number;
      total: number;
    }
  | {
      status: "done";
      errors: EmitError[];
      missingFonts: string[];
    }
  | { status: "error"; message: string };

type Props = {
  token: string;
};

/**
 * Main import panel — drives the full import flow for a given token:
 * idle → loading (fetch HTML) → progress (emit elements) → done | error.
 *
 * The panel auto-starts the import on mount so the user gets immediate
 * feedback after the deep-link opens the Canva editor.
 */
export function ImportPanel({ token }: Props): JSX.Element {
  const [state, setState] = useState<State>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const startImport = useCallback(async () => {
    // Cancel any existing run
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setState({ status: "loading" });

    let html: string;
    try {
      html = await fetchHtml(token);
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    const elements = walkDom(html);

    if (elements.length === 0) {
      setState({
        status: "error",
        message:
          "No importable elements were found in this PageMint design. " +
          "The design may be empty or use an unsupported layout.",
      });
      return;
    }

    setState({
      status: "progress",
      percent: 0,
      current: 0,
      total: elements.length,
    });

    const result = await emitElements(
      elements,
      (percent) => {
        if (ac.signal.aborted) return;
        const current = Math.round((percent / 100) * elements.length);
        setState({
          status: "progress",
          percent,
          current,
          total: elements.length,
        });
      },
      ac.signal
    );

    if (ac.signal.aborted) {
      setState({ status: "idle" });
      return;
    }

    setState({
      status: "done",
      errors: result.errors,
      missingFonts: result.missingFonts,
    });
  }, [token]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: "idle" });
  }, []);

  // Auto-start on first render
  const started = useRef(false);
  if (!started.current) {
    started.current = true;
    void startImport();
  }

  if (state.status === "loading") {
    return (
      <Rows spacing="2u">
        <Title size="medium">PageMint</Title>
        <Text>Fetching design from PageMint…</Text>
      </Rows>
    );
  }

  if (state.status === "progress") {
    return (
      <ProgressView
        percent={state.percent}
        current={state.current}
        total={state.total}
        onCancel={handleCancel}
      />
    );
  }

  if (state.status === "error") {
    return (
      <Rows spacing="2u">
        <Title size="medium">PageMint</Title>
        <Alert tone="critical" title="Import failed">
          <Text size="small">{state.message}</Text>
        </Alert>
        <Button variant="primary" onClick={startImport} stretch>
          Retry
        </Button>
      </Rows>
    );
  }

  if (state.status === "done") {
    return (
      <Rows spacing="2u">
        <Title size="medium">PageMint</Title>
        <Alert tone="positive" title="Import complete">
          <Text size="small">Your design has been added to the page.</Text>
        </Alert>
        <MissingFontsNotice fonts={state.missingFonts} />
        <ErrorAlert errors={state.errors} />
        <Button variant="secondary" onClick={startImport} stretch>
          Re-import
        </Button>
      </Rows>
    );
  }

  // idle — waiting for auto-start (should be near-instant)
  return (
    <Rows spacing="2u">
      <Title size="medium">PageMint</Title>
      <Text>Starting import…</Text>
    </Rows>
  );
}
