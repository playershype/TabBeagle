# M1 security — Expo54 / React Navigation7 package-audit assessment

**Date:** 2026-10-08 (PR)  
**Scope:** `codex/m1-expo54-nav7-security-trial`, isolated TEST and **NOT production**.  
**Baseline:** Build5 remains on Expo SDK51; physically tested Security Lab remains Expo SDK54 with React Navigation6. Neither installed Android app has been replaced.

## Verified npm audit package-node counts

| Dependency graph | Critical | High | Moderate | Low | Total |
|---|---:|---:|---:|---:|---:|
| Expo51 Build5 | 1 | 41 | 24 | 1 | 67 |
| Expo54 Security Lab | 0 | 23 | 19 | 0 | 42 |
| Expo54 + React Navigation7 (separate candidate) | 0 | 23 | 13 | 0 | 36 |

Audit command `npm audit --omit=dev --json`. **These are 36 affected package nodes, not 36 distinct vulnerabilities.** The fresh Navigation7 report exposes **10 distinct underlying GHSA advisories**; advisory and dependency counts should never be confused.

**Automatically remediated graph nodes (6, all moderate):** `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/core`, `@react-navigation/elements`, `query-string` and `decode-uri-component`. There were no newly introduced affected package nodes.

**Live CI evidence:** [Navigation7 trial run 37823431827](https://github.com/playershype/TabBeagle/actions/runs/37823431827) PASS — 16/16 tests, TypeScript, Android JS bundle, `expo prebuild`, comparison audit and commit of package.json / package-lock.json only to isolated branch. Separate full native Gradle/APK verification: [run 37823717786](https://github.com/playershype/TabBeagle/actions/runs/37823717786) (consult current status; no device acceptance until verified).

## Remaining upstream base advisories

- `braces`: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) — high, glob parsing denial of service.
- `image-size`: [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq), [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) — high, crafted JXL/HEIF/ICNS infinite loop.
- `node-forge`: [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) — high, RSA signature verification.
- `postcss`: [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q), [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp), [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93), [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) — high/moderate, source-map file disclosure and CSS output XSS.
- `sprintf-js`: [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) — moderate, formatter denial of service.
- `uuid`: [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) — moderate, v3/v5/v6 buffer bounds.

## Interpretation and release constraints

Several affected packages appear under Expo CLI, Metro, Jest, code-signing, native build and asset preparation, but `npm audit --omit=dev` includes transitive tooling dependencies. **Do not assume** that every alert represents an Android runtime vulnerability, or that build-tool exposures are harmless: actual vulnerable code reachability and acceptance of untrusted inputs require verification. In particular, security-impacting build tools should process only reviewed source/assets and trusted CI jobs.

No `npm audit fix --force`, no unsupported forced tar major override, no merge to `main`, no deployment to production, and no promotion over the physically tested Security Lab until regression checks pass. The remaining 36 package warnings still need remediation or reviewed mitigations. Both M1 Issue #3 and security Issue #5 remain OPEN.

Two authenticated JWTs are also **not yet available** for the real PlayersHype vs JJ SPA HTTPS two-account test; the manual workflow `.github/workflows/m1-two-users-live-https.yml` and `backend/scripts/m1-tenant-auth-http.mjs` require two distinct **approved, short-lived** TEST session secrets; never supply passwords/tokens in chat or logs.
