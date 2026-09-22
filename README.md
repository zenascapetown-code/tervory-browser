# Tervory Browser

Owned browser for Tervory AI. Not Browserbase. Not a sixth brain.

The five workers never share skills or memory. They borrow this plug for a job.

## On the box

- Container name: `tervory-browser`
- Listen: `http://127.0.0.1:8796`
- Token lives in `/srv/tervory/secrets/browser_token`. Not in this repo.

## Door

- `GET /health` — no token
- `POST /open` `{ "url": "https://..." }` — token
- `GET /tab` — token

This first cut records the tab. Chromium drive is the next cut in this same repo.
