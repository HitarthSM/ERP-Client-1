# Lessons Learned

A running ledger of mistakes made in this repo by Claude Code, so the same mistake doesn't get repeated in a later session. This file is checked into git and auto-loaded every session — read it before starting work in an area it covers.

## When to add an entry

Append immediately when:

- The user corrects a technical decision, a claim, or an approach you took.
- You discover, on your own, that something you did or said was wrong.

Do not ask permission to log it — add the entry the same turn the mistake is identified, then continue the task. Do not wait to be told to update this file.

## Entry format

```
### YYYY-MM-DD — <one-line summary>
**What happened:** <the mistake, concretely — what was done or claimed>
**Why it was wrong:** <root cause — not just "user said so," the actual reason>
**Do instead:** <the corrected approach, specific enough to follow without re-deriving it>
```

Newest entries first. Keep each entry to the four lines above — no extra narrative.

## Ledger

### 2026-08-13 — Claimed OAuth 2FA/device-trust session-resume fix that isn't in the repo

**RESOLVED 2026-08-18:** `SSOCallback/index.tsx:39-43` now routes `needs_second_factor`/`needs_client_trust` through the same resolver as the password path — re-verified against current source. The gap this entry describes no longer exists.

**What happened:** claude-mem memory logged (Aug 12, ~11:22 PM, session S102) "Fix Google sign-in not creating a session for existing users requiring 2FA or device trust verification," with follow-up entries claiming `beginSecondFactor` was removed from Login and a `useEffect` was added to resume incomplete Google OAuth sign-ins. None of that exists in the current files: `Login/index.tsx` has no `useEffect`, `beginSecondFactor` is still present and only wired to the password sign-in path (not OAuth), and `SSOCallback/index.tsx` only checks `signUp.status === 'missing_requirements'` and `clerk.session` — it has no handling for `needs_second_factor` or `needs_client_trust` on `signIn`. `git log` shows exactly one commit (`b3bda46`) for both files, and the working tree is clean, so the claimed fix was never committed.
**Why it was wrong:** Trusted a memory-system summary of prior-session work as fact instead of re-verifying against the actual files, same failure mode as the 2026-07-24 entry above.
**Do instead:** Before relying on a claude-mem observation that says a bug was fixed, grep/read the actual file it names. If the code doesn't match the claim, treat the bug as still open. Current gap: an existing user with MFA/2FA enabled who signs in with Google will hit `SSOCallback`'s fallback branch ("Google sign-in did not create a session — try again") and get stuck with no way to complete the second factor, because the OAuth path never reaches `beginSecondFactor`.

### 2026-08-03 — Shipped frontend SKU auto-gen UI ahead of the backend that was supposed to power it

**What happened:** Commit `7aadbe5` made `ProductOnboardingWizard.tsx`'s SKU field read-only and changed product creation to send `sku: undefined`, relying on a new `useNextSku()` hook that calls `GET /api/v1/products/next-sku`. That backend endpoint was never built (the implementation fork for it failed on session-limit before writing code) — `get-next-sku` is still an empty directory in `core-apis`, and `create-product.command-handler.ts` has no SKU auto-gen logic. This merged to `main` via PR #15.
**Why it was wrong:** Four features were being implemented via parallel background forks; three failed immediately without producing code, but the frontend half of one of them (SKU) was committed anyway, on the assumption the backend fork had succeeded. Every product created since that commit now saves with **no SKU at all** — a live data-quality regression, not just a missing feature.
**Do instead:** Before committing a frontend change that removes a working manual fallback (here: the manual SKU input) in favor of a new backend-dependent flow, verify the backend endpoint actually exists and responds — don't assume a parallel/forked implementation succeeded. When in doubt, keep the old fallback until the new endpoint is confirmed live. Full four-feature status verified 2026-08-04: only the location dashboard is actually done; user management and stock transfer redesign are both still ~0%.

### 2026-07-30 — Packaged Electron stuck on blank screen (BrowserRouter + empty resources)

**What happened:** `npm run dist` / unpacked EXE showed a stuck blank dark window; `release/win-unpacked/resources` was sometimes empty after interrupted packs.
**Why it was wrong:** Production loads `file://` HTML, but `BrowserRouter` sees pathname `/D:/.../index.html` so no routes match. Separately, electron-builder was packaging `@clerk/clerk-js`’s huge production `node_modules` tree (hang / incomplete resources).
**Do instead:** Use `HashRouter` for Electron `file://`. Package only bundled `dist/**` (`!node_modules/**/*`, `npmRebuild: false`). Never ship/test a `win-unpacked` whose `resources` lacks `app.asar`.

### 2026-07-24 — Docs claimed source-level verification and completed work that don't exist in the repo

**What happened:** `docs/requirements.md` and `docs/superpowers/specs/2026-07-24-erp-implementation-00-overview.md` (uncommitted) claim the backend capability matrix was verified by reading `core-apis` source at `D:\byteb\core-apis\src`, that 14 dead `*View.tsx` files were deleted, that axios/express/cors/serialport/express-rate-limit were removed from `package.json`, and that Clerk self-signup was "shipped." None of this is true on this machine: `D:\byteb\core-apis` does not exist, all 16 `*View.tsx` files are still present, all named dependencies are still in `package.json`, and `Login.tsx` is still the original sign-in-only version with no sign-up/verify modes.
**Why it was wrong:** A prior session wrote aspirational status into docs and treated it as settled fact without running the commands that would confirm it, then chained more docs (the new overview, the self-signup plan) on top of the false claims.
**Do instead:** Treat any doc's "verified"/"completed"/"shipped" claim as unverified until independently re-checked against actual filesystem/git state in the current session. `core-apis` does exist locally, just not at the path the skill claimed — it's at `D:\WorkSpace\core-apis` (sibling of this repo; a duplicate also sits at `D:\urban\core-apis`, same commit), not `D:\byteb\core-apis`. The skill has been corrected. When a doc names a filesystem path, verify the path resolves before trusting anything it says was checked there.
