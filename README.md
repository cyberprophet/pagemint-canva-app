# PageMint Canva content extension

Canva content-extension app that lets users browse their completed
[PageMint](https://page.mint.surf) designs from inside the Canva editor's
Apps sidebar and drop them into a design as images.

This repo ships **Intent 020 Phase C** of the PageMint roadmap. See
[`intents/020-design-tool-export.md`](https://github.com/cyberprophet/page-mint/blob/main/intents/020-design-tool-export.md)
in the PageMint monorepo for the intent spec and research notes.

## Architecture

```
Canva editor
     │
     │  POST /resources/find   (Canva content-extension contract)
     ▼
src/backend/find.ts            (this repo — forwarder)
     │
     │  POST {PAGEMINT_API_URL}/api/canva/resources/find
     │  Authorization: Bearer <pagemint-token>
     ▼
creative-server CanvaController
     │
     │  STUB (this PR): returns empty list
     │  Follow-up PR: OAuth link → ChatRepository → completed sessions
     ▼
Canva UI renders the list of user designs
```

The PageMint-side adapter endpoint is stubbed in
[`cyberprophet/creative-server`](https://github.com/cyberprophet/creative-server)
PR `feat/intent-020-phase-c-canva-adapter` — it returns an empty list until
the Canva ↔ PageMint OAuth flow lands.

## Local development

1. Install dependencies: `npm install`
2. Copy env: `cp .env.example .env` and set `PAGEMINT_API_URL` to your local
   creative-server (e.g. `http://localhost:15409`).
3. Run the dev server: `npm run start`
4. In the [Canva Developer Portal](https://www.canva.com/developers/apps),
   create a new content-extension app, point its "Development URL" at the
   webpack-dev-server, and install it into a test design.

## PageMint API adapter contract

`find.ts` forwards the Canva search request verbatim to the PageMint
server. Request shape:

```json
{
  "query": "cafe",
  "pagination": { "continuation": null, "limit": 20 },
  "locale": "en-US"
}
```

Response shape (returned to Canva):

```json
{
  "resources": [
    {
      "id": "session-123",
      "name": "Spring Cafe Promo",
      "url": "https://api-page.mint.surf/s/<token>.png",
      "contentType": "image/png",
      "thumbnail": { "url": "https://api-page.mint.surf/s/<token>.png?w=256" }
    }
  ],
  "continuation": null
}
```

## Submission checklist (Canva marketplace, free tier)

- [ ] Production `PAGEMINT_API_URL` deployed with CORS allowing `*.canva.com`
- [ ] Canva ↔ PageMint OAuth flow live (follow-up PR)
- [ ] App icon (512×512 PNG) added to `assets/icon.png`
- [ ] Privacy policy URL published on page.mint.surf
- [ ] Terms of service URL published on page.mint.surf
- [ ] Screenshots of the Apps sidebar experience (3-5 images)
- [ ] Review notes covering the OAuth consent flow + test account credentials
- [ ] Submit via the Canva Developer Portal "Submit for review" button

## License

See the PageMint monorepo for licensing terms.
