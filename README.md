# Tervory Browser

Our own browser for Tervory AI.

Not Browserbase. Not a sixth worker.
Many workers can use it at the same time.
Each worker has its own session. They never share a tab, skills, or memory.

On the box the container is `tervory-browser` on `127.0.0.1:8796`.

- `GET /health`
- `POST /open` `{ "url": "https://..." }` plus header `X-Tervory-Worker: tisan`
- `GET /tab`
- `POST /reset` closes that worker only
