# PageMint Canva app

Canva app that imports a PageMint design into the active Canva page via a
**hash-fragment deep-link + HTML fetch** flow. This is **Intent 048** of the
PageMint roadmap — supersedes Intent 020 Phase C (paste-URL + PNG scaffold)
and Intent 023 (paste-URL + structured addNativeElement).

See
[`intents/048-canva-apps-sdk-html-deeplink.md`](https://github.com/Creative-deliverables/page-mint/blob/main/intents/048-canva-apps-sdk-html-deeplink.md)
for the full spec.

## Flow

```
PageMint (page.mint.surf)
    │
    │  User clicks "Canva에서 편집"
    │  POST /api/design/export/canva/token → { token, expires_at, share_url }
    │  Assembles deep-link:
    │    https://www.canva.com/login/?redirect=
    │      /design?create&type=Presentation&ui=<CANVA_APP_UI>
    │    #t=<TOKEN>
    │  window.open(deepLink)
    ▼
Canva editor (new Presentation design)
    │
    │  App auto-launches (ui= identifier)
    │  Token arrives via URL hash fragment (not sent over the wire)
    ▼
src/app.tsx
    │
    │  1. readToken() — reads window.location.hash → #t=<TOKEN>
    │  2. fetchHtml(token) — GET https://page.mint.surf/s/{token}
    │     (CORS: Access-Control-Allow-Origin: * per Intent 020 Phase A)
    │  3. walkDom(html) — DOMParser → ElementDesc[]
    │     - h1/h2/.../p → TextElementDesc
    │     - img          → ImageElementDesc
    │     - styled div   → ShapeElementDesc
    │  4. emitElements(elements) — loop:
    │     - image: upload() → ref → addNativeElement({ type: 'IMAGE', ref })
    │     - text:  resolveFont() → fontRef? → addNativeElement({ type: 'TEXT' })
    │     - shape: addNativeElement({ type: 'SHAPE', paths })
    │     Progress: ProgressBar driven by per-element callback
    ▼
Elements stacked top-to-bottom on the active Canva page
```

No OAuth required — the token authorises a single `/s/{token}` fetch.
A future v2 intent will add OAuth session browsing ("Browse my PageMint
sessions from inside Canva"). The Enterprise-vs-Marketplace distribution
decision is deferred; v1 ships plan-neutral code.

## Hash-fragment token

The token travels in the URL hash fragment (`#t=…`), not in query params.
Hash fragments are:
- Not sent to Canva's servers (no token leakage in server logs)
- Preserved across the `login/?redirect=…` wrapper
- Read via `window.location.hash` inside the app iframe

Fallback: `appProcess.current.getInfo<{ token?: string }>().launchParams?.token`
is checked if the hash has no `t` param (for future Canva launchParams support).

## SDK version note

This app uses `addNativeElement` from `@canva/design` v1.10.x (the current
pinned version). The Intent 048 spec referenced `addElementAtPoint`, which
appears in a later SDK version and requires `useFeatureSupport()`. When upgrading
to a version that ships `addElementAtPoint`, swap the call site in
`src/importer/emit-elements.ts` accordingly.

## Source layout

```
src/
  app.tsx                      thin entry point; reads token + routes to panel
  importer/
    token.ts                   hash-fragment reader + appProcess fallback
    fetch-html.ts              fetch https://page.mint.surf/s/{token}
    dom-walk.ts                DOMParser → ElementDesc[] (text/image/shape)
    emit-elements.ts           addNativeElement loop + progress + error collect
    image-upload.ts            upload() + whenUploaded() wrapper
    font-resolve.ts            findFonts() memoized catalogue lookup
  ui/
    ImportPanel.tsx            main panel (idle/loading/progress/done/error)
    ProgressView.tsx           ProgressBar + counter + cancel
    ErrorAlert.tsx             per-element error summary
    MissingFontsNotice.tsx     unresolved font family alert
    NoTokenNotice.tsx          shown when no token in hash
  __tests__/
    token.test.ts
    dom-walk.test.ts
    font-resolve.test.ts
```

## Local development

1. `npm install`
2. `npm test` — typecheck + jest (27 unit tests)
3. `npm run start` — webpack-dev-server on http://localhost:8080

For local testing with a real token:

```
http://localhost:8080/#t=<YOUR_TOKEN>
```

For a local PageMint server override:

```
http://localhost:8080/?api=http://localhost:5000#t=<YOUR_TOKEN>
```

## Registration (deferred)

The `CANVA_APP_UI` identifier (needed to assemble the deep-link) is obtained
after registering in the Canva Developer Portal. Two paths:

| Path | Requirement | Timeline |
|------|-------------|----------|
| Team App | Canva Enterprise plan | Deploy immediately after plan confirmed |
| Public Marketplace | 1–2 week review | Submit after v1 QA passes |

Both paths use the same codebase. The decision is deferred until the team
plan tier is confirmed (see Intent 048 open questions).

## License

See the PageMint monorepo for licensing terms.
