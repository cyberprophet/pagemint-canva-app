import { appProcess } from "@canva/platform";

/**
 * Reads the PageMint session token.
 *
 * Primary path: `window.location.hash` — the deep-link assembles
 *   https://www.canva.com/login/?redirect=...#t=<TOKEN>
 * and the hash fragment is preserved across the login redirect, never
 * sent to Canva's servers.
 *
 * Fallback: `appProcess.current.getInfo<{ token?: string }>()` in case
 * Canva later documents launchParams passthrough via deep-link.
 */
export function readToken(): string | null {
  const raw = window.location.hash;
  const hash = raw.startsWith("#") ? raw.slice(1) : raw;
  const params = new URLSearchParams(hash);
  const t = params.get("t");
  if (t) return t;

  // Fallback for any future launchParams pathway
  try {
    const info = appProcess.current.getInfo<{ token?: string }>();
    return (info as { launchParams?: { token?: string } }).launchParams?.token ?? null;
  } catch {
    return null;
  }
}
