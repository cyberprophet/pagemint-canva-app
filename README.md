# PageMint Canva app

Imports a [PageMint](https://page.mint.surf) design into the active Canva
page as editable native elements — text and images — via the Apps SDK
(`addElementAtPoint` / `addElementAtCursor` + `@canva/asset` `upload`).

## Two entry modes

### 1. Deep-link (one-click from PageMint)

PageMint's "Canva에서 편집" button opens Canva with this app already
launched and a short-lived share token in the URL hash:

```
https://www.canva.com/login/?redirect=%2Fdesign%3Fcreate%26type%3DPresentation%26ui%3D<CANVA_APP_UI>#t=<TOKEN>
```

On mount, the app reads `window.location.hash` for `t=<token>`, scrubs
the token from the browser history, fetches
`https://page.mint.surf/s/<token>`, parses the HTML, and inserts each
importable element into the current Canva design.

### 2. Standalone (manual share URL / token)

Opening this app directly from inside Canva (no deep-link hash) shows a
text input where users paste a PageMint share URL or bare token, plus a
link out to PageMint for designing something new. Same import pipeline
as the deep-link path — only the token source differs.

## Flow

```
PageMint (https://page.mint.surf)
    │  "Canva에서 편집" → /api/design/export/canva/token
    │  response { token, expires_at, share_url }
    ▼
window.open(
  'https://www.canva.com/login/?redirect=…&ui=<CANVA_APP_UI>#t=<TOKEN>'
)

Canva editor
    │  new Presentation design
    │  PageMint app auto-launches via ui=<CANVA_APP_UI>
    ▼
src/app.tsx
    │  1. Read token from window.location.hash
    │  2. fetch(`${origin}/s/${token}`)   ← CORS-friendly `*` origin
    │  3. DOMParser → body > section > children
    │  4. Walk: h1-h6/p → addElementAtPoint({ type:'text', … })
    │            img     → upload({ type:'image', … }) → addElementAtPoint({ type:'image', ref })
    ▼
Editable native Canva elements on the active page
```

No OAuth, no session browsing, no backend changes. The PageMint
`/s/{token}` endpoint is public by token possession and CORS-wildcarded
so the Canva iframe can fetch it directly.

## Build

```
npm install
npm run typecheck
npm run build    # → dist/app.js
```

`dist/app.js` is the single JS bundle uploaded to the Canva Developer
Portal for the app entry.

## Local development

```
npm run start    # webpack-dev-server on http://localhost:8080
```

In the [Canva Developer Portal](https://www.canva.com/developers/apps),
point the app's Development URL at `http://localhost:8080`, install it
into a test design, and iterate. Ship the production bundle via the
Portal's app upload page once tested.

## Marketplace submission

First submission (2026-04-21) was rejected because the app was
exclusively a deep-link entry point — opening it directly showed only
an "empty state" telling users to return to PageMint. Canva required
meaningful standalone functionality accessible from within Canva,
"even if additional features are only available via the deep-link
launch context" (full feedback reproduced in
[ADR-016](https://github.com/Creative-deliverables/page-mint/blob/main/decisions/016-canva-marketplace-resubmission-standalone.md)
of the PageMint meta repo).

v0.2.0 adds the manual share-URL import form for the no-deep-link case,
satisfying that bar while leaving the deep-link flow unchanged.

## License

See the PageMint monorepo for licensing terms.
