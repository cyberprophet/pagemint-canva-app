/**
 * PageMint Canva app — entry component for the design_editor intent.
 *
 * Reads the session token from the URL hash fragment (#t=<TOKEN>) that the
 * PageMint deep-link places there. If a token is present, renders the full
 * import panel. If not, shows a friendly notice directing the user to launch
 * from PageMint instead of opening the app manually.
 *
 * The scaffold's hello_world app.tsx has been replaced entirely. The original
 * scaffold code is preserved in git history.
 */
import { readToken } from "../../importer/token";
import { ImportPanel } from "../../ui/ImportPanel";
import { NoTokenNotice } from "../../ui/NoTokenNotice";

export const App = () => {
  const token = readToken();
  return token ? <ImportPanel token={token} /> : <NoTokenNotice />;
};
