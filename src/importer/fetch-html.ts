const BASE_URL = "https://page.mint.surf";

/**
 * Fetches the HTML body for a PageMint share token.
 *
 * The share endpoint serves `Access-Control-Allow-Origin: *` per Intent 020
 * Phase A, so Canva's app iframe CSP (connect-src https:) allows this fetch.
 *
 * Local dev: pass `?api=http://localhost:5000` on the dev server URL to
 * override the base URL (undocumented; safe; stripped before any real traffic).
 */
export async function fetchHtml(token: string): Promise<string> {
  const apiOverride = new URL(window.location.href).searchParams.get("api");
  const base = apiOverride ?? BASE_URL;
  const url = `${base}/s/${token}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch PageMint design (HTTP ${response.status}). ` +
        `The token may have expired. Return to PageMint and try again.`
    );
  }

  return response.text();
}
