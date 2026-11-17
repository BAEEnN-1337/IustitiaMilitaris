# Security review — 17 November 2026

Scope: Express HTTP API/static hosting, optional local accounts, WebSocket classroom, imported scenario JSON, external legal links and standalone SCORM exports. No packages added; scenario data, schema and assembler are unchanged.

## Findings and fixes

| Finding | Change | Verification |
|---|---|---|
| Login-name throttling could be bypassed by rotating aliases | Shared per-source-IP limit: 12 login/register POSTs per 15 minutes; other API requests: 600/minute | Real requests rotate aliases and receive 429; UI has UKR/ENG feedback |
| Browser security headers absent | CSP, nosniff, SAMEORIGIN, no-referrer and restrictive Permissions-Policy on all HTTP responses | Header assertions; production browser classroom tests |
| Session expiry only in storage; legacy token format unbounded | HMAC-authenticated token includes a seven-day expiry, bounded syntax and timing-safe signature comparison; storage expiry checked too | Cookie tampering rejected; local account integration tests |
| Password hashing could block the event loop | Bounded 6–128-character passwords, asynchronous Node scrypt | Oversize-password rejection; register/login integration |
| Origin-only CSRF check and unsafe JSON keys | Origin/Referer validation for state changes; reject prototype-related keys in HTTP/WS JSON, imports and stored JSON | Foreign Origin/Referer and pollution payload tests |
| Host role alone authorised controls | Each control message requires the host bearer secret and timing-safe verification; secret remains tab-local and absent from public room state | Real creator/participant attacks with omitted and wrong secrets; valid classroom progression |
| WS had no message rate limit | 16 KiB payload, 120 messages/socket/second, 1,000 concurrent sockets, 100 rooms, 500 connections/room, four-hour inactivity expiry; handshake Origin validation | Oversize/flood sockets close without killing HTTP server; wrong-origin upgrade rejected |
| SCORM interpolated content into HTML and inline handlers | Safe JSON script encoding and DOM creation using textContent, replaceChildren and event listeners | ZIP inspection, real browser injection test without CSP assistance and full localized SCORM playback |
| Import/link validation incomplete | 1 MiB import cap; reject unsafe JSON keys and invalid scenario structure; permit only absolute HTTP/HTTPS external legal URLs without embedded credentials | Parser and URL tests; constructor preview regression |

## LAN and deployment

HTTP LAN URLs remain supported. There is no HTTPS redirect, HSTS or CSP `upgrade-insecure-requests`. Cookie `Secure` is set only for `req.secure` or an exact `X-Forwarded-Proto: https`. A reverse proxy must overwrite forwarded headers rather than forwarding arbitrary client values. HTTP traffic is not encrypted; use a trusted local network or terminate TLS at a controlled proxy when required.

Only `dist/` is exposed by static middleware. Internal routes, dotfiles and project data paths are rejected. JSON bodies are capped at 64 KiB. HTTP header/request timeouts bound idle requests. API errors do not include stacks or disk paths. No credentials, tokens, password hashes or cookies are logged.

The file-backed account store retains its bounded 128-request promise queue and temporary-file/rename writes with mode 0600. The generated signing secret uses 48 random bytes, is kept in the data directory with mode 0600 and is not exposed to clients. Source IPs exist only in bounded, expiring rate-limit counters; they are not persisted or added to classroom state.

Existing accounts and progress remain intact. Legacy session cookies require login again because they lack signed expiry. Restarting the server still clears ephemeral classroom rooms. Host secrets must remain in sessionStorage and must never be placed in QR links.

Anonymous voting is not identity verification: a participant able to create a new anonymous token can act as another guest. In-memory limits apply per server process and reset at restart; multi-process public deployments need coordinated limits. These changes are targeted hardening backed by tests, not certification or a guarantee against every attack.

## Checks

`python3 zibraty.py`, `npx tsc --noEmit`, `npm test`, `npm run build` and `git diff --check`. `npm test` includes real security HTTP/WS tests. Browser suites cover active host/guest classroom sessions and malicious standalone SCORM content. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium` when using system Chromium.
