/**
 * Cloudflare Worker entry — rewrites `/` → `/app.js` so Canva's iframe can
 * point at the bare origin and receive the JS bundle, matching the dev
 * server's rewrite (webpack.config.ts: `rewrites: [{ from: /^\/$/, to: "/app.js" }]`).
 * All other paths pass through to static assets unchanged.
 */
interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      url.pathname = "/app.js";
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }
    return env.ASSETS.fetch(request);
  },
};
