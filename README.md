# PageMint Canva app

Canva app that imports a PageMint design into the active Canva page via a
pasted share link. This is **Intent 020 Phase C** of the PageMint
roadmap — see
[`intents/020-design-tool-export.md`](https://github.com/cyberprophet/page-mint/blob/main/intents/020-design-tool-export.md)
in the PageMint monorepo for the intent spec.

## Flow

```
PageMint (page.mint.surf)
    │
    │  User clicks "Share" → gets a share link
    │  (e.g. https://page.mint.surf/s/ABC123)
    ▼
User copies the link

Canva editor
    │
    │  Apps → PageMint → paste link → Import
    ▼
src/app.tsx
    │
    │  1. Normalize link → {origin}/s/{token}/image
    │  2. fetch(imageUrl)           ← CORS-friendly PNG proxy on PageMint
    │  3. upload({ type: "IMAGE", … })  ← Canva asset SDK
    │  4. addNativeElement({ type: "IMAGE", ref })
    ▼
Design dropped onto the active Canva page
```

No OAuth server required on the PageMint side — the share link is public
by design, and the `/s/{token}/image` endpoint is served with
`Access-Control-Allow-Origin: *` so the fetch works from the Canva app
origin. A future Phase C.2 PR may add authenticated "Browse my sessions"
via OAuth2, but v1 ships the paste-URL flow because it is shippable today
without any external review coupling.

## Local development

1. `npm install`
2. `npm run start` — webpack-dev-server
3. In the [Canva Developer Portal](https://www.canva.com/developers/apps),
   create a new App, point its "Development URL" at
   `http://localhost:8080` (or whatever webpack-dev-server is using), and
   install it into a test Canva design.
4. In the test design, open **Apps → PageMint**, paste a PageMint share
   link, click **Import**.

## Submission checklist (Canva marketplace, free tier)

- [ ] App icon (512×512 PNG) added to `assets/icon.png`
- [ ] Privacy policy URL published on page.mint.surf
- [ ] Terms of service URL published on page.mint.surf
- [ ] Screenshots (3-5) of the paste-link experience
- [ ] Test PageMint share link that reviewers can use to verify import
- [ ] Submit via the Canva Developer Portal "Submit for review" button

## License

See the PageMint monorepo for licensing terms.
