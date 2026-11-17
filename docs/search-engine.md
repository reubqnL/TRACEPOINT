# Search engine

`engine/` finds public profiles matching a username. It runs in the Electron main
process (the UI never makes these network requests itself).

```
SearchManager.search(request)
  ├─ validate request (shared/validation.ts)             → SearchRequestError
  └─ for each provider, in parallel (different hosts):
       RequestScheduler  → refuses during back-off, spaces requests
       ProviderHttp      → https + host allow-list, timeout, size cap, redirect check,
                           rate-limit header parsing, error classification
       provider.search() → RawProfile[]            (platform-specific, ~50 lines)
       normaliseProfiles → validate URLs, exact/similar, clean text, dedupe, sort, cap
     → ProviderResult { status, matches, message }   (never throws)
```

A failing platform never affects the others: every outcome — success, rate limit,
timeout, outage, bad credentials, bug — becomes a `ProviderResult` with a `status`.

## Supported platforms

| Platform | Method | Exact | Similar | Credentials |
|---|---|---|---|---|
| GitHub | official REST API | ✓ | ✓ (`search/users`) | optional token (`TRACEPOINT_GITHUB_TOKEN`) raises 60 → 5,000 req/hr |
| GitLab | official REST API | ✓ | ✓ | none |
| Hacker News | official Firebase API | ✓ (case-sensitive) | – | none |
| Reddit | official OAuth Data API | ✓ | – | **required**: `TRACEPOINT_REDDIT_CLIENT_ID` (+ optional `TRACEPOINT_REDDIT_CLIENT_SECRET`); off until set |

### Deliberately not included

Discord, Instagram, TikTok, X/Twitter and similar have **no public username lookup that
their terms permit** for third-party tools, and scraping their pages or probing profile
URLs would break those terms. They can be chosen as an investigation's *origin* platform
but are never searched. Adding one should only happen via an official, permitted API.

## Matching

`engine/similarity.ts` compares the query with each returned username:

- **exact** – identical, or identical ignoring case (flagged `caseDiffers`)
- **similar** – equal once `.` `_` `-` are removed (`john_doe` ≈ `johndoe`), or
  edit-distance similarity ≥ 0.8
- anything else is dropped

`engine/confidence.ts` turns that into a 0–1 **username match strength** (exact 1.0 /
0.95 if case differs / similar capped below 0.9). It is *not* the probability that two
accounts belong to the same person, and the UI labels it "Name match" accordingly.

## Rate limits & terms

- Per-platform minimum spacing between requests (`minRequestIntervalMs`), enforced across searches.
- On HTTP 429, or 403 with `x-ratelimit-remaining: 0`, the platform enters a cooldown
  (from `Retry-After` / reset headers, max 1 hour). **No request is sent** until it ends;
  results show `rate_limited` with the wait. If a *successful* response uses up the quota,
  the cooldown starts immediately.
- Every request identifies itself (`Tracepoint/1.0 (+repo URL)`).
- Only `https`, only each provider's declared hosts; redirects off-list are blocked.
- Only active/public data: GitLab blocked users are hidden, Reddit suspended accounts show no detail.
- **Email addresses are never collected**, even where a platform publishes them.
- Profile text is treated as untrusted: control characters stripped, lengths capped, websites must be http(s).

## Adding a platform

1. Create `engine/providers/<name>.ts` exporting a `SearchProvider`
   (`id` from `shared/platforms.ts`, `apiHosts`, `profileHosts`, `minRequestIntervalMs`,
   optional `parseRateLimit`, and `search()`).
2. In `search()` use only `ctx.http.getJson/postForm`. Return `RawProfile[]`. Throw nothing
   for "not found" — return `[]`. Wrap optional extra calls in `optionalStep()` so a failure
   there keeps the main result.
3. Register it in `engine/providers/index.ts`.
4. Add tests in `tests/search-manager.test.ts` with the fake `fetch` helper (no network needed).

Read the platform's API terms first; link them in `docsUrl`.

## Credentials

Read in the main process only (`electron/security/credentials.ts`, currently environment
variables). They are never sent to the UI — it only learns whether a platform is
`configured` — and never logged or stored in the investigation database. A Settings
screen backed by Electron `safeStorage` can implement the same `CredentialStore` interface.
