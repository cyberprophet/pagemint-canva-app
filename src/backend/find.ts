/**
 * Canva content-extension `find` handler.
 *
 * Canva's editor POSTs a search request to this handler. We forward it to
 * the PageMint server adapter `POST {PAGEMINT_API_URL}/api/canva/resources/find`
 * with the authenticated Canva-app user's bearer token in the Authorization
 * header, and return Canva's standard content-resource envelope unchanged.
 *
 * The PageMint side is currently a STUB that returns an empty list; once the
 * follow-up PR adds the Canva↔PageMint OAuth flow + session listing, this
 * handler does not need to change.
 */

export type CanvaFindResourcesRequest = {
  query?: string;
  pagination?: {
    continuation?: string | null;
    limit?: number | null;
  };
  locale?: string;
};

export type CanvaResource = {
  id: string;
  name: string;
  url: string;
  contentType: "image/png";
  thumbnail: { url: string };
};

export type CanvaFindResourcesResponse = {
  resources: CanvaResource[];
  continuation: string | null;
};

export type FindHandlerContext = {
  /**
   * Bearer token issued by PageMint's Identity server for the Canva-app
   * user, after the OAuth flow completes. When the upstream adapter stub
   * is called without a token it still returns an empty list, but in
   * production this header is required.
   */
  authToken?: string;
  /**
   * Override for tests — defaults to `process.env.PAGEMINT_API_URL`.
   */
  apiBaseUrl?: string;
  /**
   * Injected for tests. Defaults to global `fetch`.
   */
  fetchImpl?: typeof fetch;
};

export async function findResources(
  request: CanvaFindResourcesRequest,
  ctx: FindHandlerContext = {}
): Promise<CanvaFindResourcesResponse> {
  const baseUrl = ctx.apiBaseUrl ?? process.env.PAGEMINT_API_URL;
  if (!baseUrl) {
    throw new Error(
      "PAGEMINT_API_URL is not configured. Copy .env.example to .env and set it."
    );
  }

  const fetchImpl = ctx.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (ctx.authToken) {
    headers["Authorization"] = `Bearer ${ctx.authToken}`;
  }

  const res = await fetchImpl(`${baseUrl}/api/canva/resources/find`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    // Surface as an empty result — Canva handles this gracefully as
    // "no matches" rather than a hard error in the sidebar.
    return { resources: [], continuation: null };
  }

  const body = (await res.json()) as CanvaFindResourcesResponse;
  return {
    resources: body.resources ?? [],
    continuation: body.continuation ?? null,
  };
}
