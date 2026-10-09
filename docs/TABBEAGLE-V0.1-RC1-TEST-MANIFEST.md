# TabBeagle v0.1 — Release Candidate 1 (TEST ONLY)

**Status:** CANDIDATE; NOT certified M1, NOT approved for production or customers.

**Isolated GitHub branch:** `codex/tabbeagle-v0.1-rc1-test`  
**Approved source lineage:** `codex/m1-https-ondevice-probe-lab` → `codex/m1-https-qa-postcss-patch-20261009` → RC1.  
**Original user-tested HTTPS lab:** `com.tabbeagle.user.httpslab` remains untouched.  
**New RC TEST-only package:** `com.tabbeagle.user.v01rc1test`, separate Android installation; label `TabBeagle RC TEST`, version `0.1.0`, `allowBackup=false`.  
**Brand:** original `mobile/assets/brand.png` used as launcher icon and splash image, original styling/nav preserved.  
**Backend:** existing Railway TEST only, `https://tabbeagle-api-test-test.up.railway.app`.  
**Auth and data:** Supabase TEST project only, `gaileljkciseopfgwsbc`, no changes to database/schema/passwords.

## Consolidated approved product functions

- TabBeagle-branded Welcome/login and current **existing-account** password sign-in, TEST email-link and in-app proof handling; session refresh/reopen.
- Multi-organization entry and correct user-scoped Dashboard.
- Customers: create and list.
- Invoices: create, list, open details and display USD amounts.
- Due date/aging and statuses, persisted idempotent request IDs/retry on network failures.
- Individual user sign-out / session separation.
- Two-tenant TEST data model (JJ SPA and the **TabBeagle SaaS test tenant** PlayersHype; this is NOT the equestrian app).
- In-app `Account security · Create TEST password` restricted to the exact Supabase TEST project.
- PostCSS exact fixed version `8.5.23` verified with **23 tests, TypeScript, Expo JS export, native Gradle signed release** on isolated QA patch branch before integration.

## User-facing cleanup in RC1

`TenantProbeScreen` and related test harness remain as source/tests, but **the internal 'M1 company isolation HTTPS' button and debug navigation route are not visible** in this release candidate. The separate previously signed QA lab and its verification source remain available for security testing. Existing account/login and invoice/customer functionality are not deliberately changed.

The old TEST Dashboard banner `TEST Build 5` is replaced with `TabBeagle v0.1 RC1 · TEST`. Original product screens, account flow, and brand/icon remain.

## TEST-only app identity / special limitation

RC1 deliberately has the unique deep-link scheme `tabbeaglerc01://` so installation does not interfere with the signed HTTPS QA app. **Supabase TEST Auth Allowed Redirect URLs for `tabbeaglerc01://auth/callback` are not yet verified or changed by GitHub CI**, and email magic-link login for this *new* package must **not** be marked PASS until that allowlist and native callback are validated. Existing verified TEST password access is the default. Do not alter Supabase Auth config without review.

## Gate / release requirements

| Check | Expected | Status |
|---|---|---|
| Signed RC APK CI, exact package + icon + unique scheme | PASS | **PASS — run 37931083943; signed APK + 65MB file verified** |
| JS tests incl. auth, idempotent invoice creation/retry, tenant probe contract | 23/23 | **PASS — 23/23** |
| Next backend tests + production dependency audit | 12/12, 0 alerts | **PASS — 12/12; 0 npm advisories** |
| TypeScript and Metro JS bundle | PASS | **PASS** |
| Expo native prebuild, signed Gradle assembleRelease | PASS | **PASS — native APK signed and verified** |
| No increase vs isolated 35 remaining Android npm advisories | 0 critical; ≤22 high; ≤35 total | **PASS baseline control: 35 total, 22 high, 13 moderate, 0 critical** |
| No direct anonymous invoices, customers, org access via live TEST HTTPS | 401 | **PASS — all six unauthorized calls returned 401; TEST health 200** |
| User-observed separation of company invoices (in prior signed HTTPS app) | Functional PASS | Prior user attested; NOT an RC1 phone retest |
| Signed JWT A/B direct HTTPS cross-tenant reads/writes | Strict PASS | **BLOCKED; NOT executed** |
| 35 Android dependency advisories | Remediated or accepted | **OPEN**; only PostCSS fix validated |
| Supabase TEST leaked-password protection | Enabled or formally accepted | **OPEN**; Free tier lacks Pro feature |
| RC1 magic-link redirect allowlist | Confirmed | **UNVERIFIED** |
| Production promotion / PR #1 merge | Only after M1 acceptance | **PROHIBITED** |

**Invariants:** No `main` change, production Supabase, live Stripe/Resend, real invoices, original TEST dataset, existing signed APK, or landing changes. GitHub PR #1 remains DRAFT. The RC is neither a production app nor a certified M1 security attestation. GitHub Actions may publish a separate signed TEST installer, never an automatic deploy/merge.

## Signed RC1 artifact, complete GitHub acceptance, and integrity

**Final verified result**: [GitHub Actions run 37931083943](https://github.com/playershype/TabBeagle/actions/runs/37931083943) **SUCCESS** for BOTH jobs. Exact tested source commit `7a1439a7cc8d9faa83b4356476584909d566575a` (unchanged application code/locks after that run). APK Android package `com.tabbeagle.user.v01rc1test`, name `TabBeagle RC TEST`, Android display version `0.1.0`, custom isolated URI scheme `tabbeaglerc01://`, with an `application-icon` resource confirmed by aapt. Signed and verified with Android apksigner. This is a CI TEST signature, not a Play Store production signing claim.

- Valid GitHub artifact **#11617335024**: `TabBeagle-v0.1-RC1-TEST-SIGNED-APK` (contains both the **signed 65 MB APK** and audit JSON; compressed artifact approximately 30 MB).
- **Canonical exact artifact filename:** `TabBeagle-v0.1-RC1-TEST-SIGNED-NOT-PRODUCTION.apk`.
- Verified SHA-256: `f2ad40751d1a7c185ebfd8c2d92a4ca7ea2ab6b2cf834ab5fb2cb95495af354a`. SHA matched both the GitHub Actions build output and independently extracted APK file in the working container.
- Android: **23/23 tests PASS**, `npm run check:env` PASS, typecheck PASS, Android JS export PASS, Gradle native release build PASS, package/version/label/icon/scheme/signature PASS.
- Backend: **12/12 tests PASS**, npm audit **0 production advisories**, Next.js build/typecheck PASS, TEST Railway 7/7 anonymous/bogus auth negative HTTPS checks PASS.
- Android advisory inventory: **35 findings still remain**, 22 high, 13 moderate, no critical. Only PostCSS was corrected compared with exact original HTTPS QA app (36→35).
- Railway TEST verified **online**, no reported incidents. Supabase TEST SQL recheck: PlayersHype SaaS test tenant **5 invoices / 5 cases / USD $1,404.49 outstanding**; JJ SPA **0 invoices / $0.00**. No DB writes done.
- GitHub PR #1 remains **DRAFT and unmerged**; `main`, production, landing, original user-installed Android and source branch remain unchanged.
- GitHub CI has two runs: older #37930619177 was green but its 385-byte artifact contained only the security report because of an APK output-path error; **it must NOT be distributed as an installer**. Corrected run **#37931083943** includes the real APK, independently inspected/hashed. Fix is committed in RC1 workflow and this final report is based only on the corrected run.

**Decision:** v0.1 RC1 Android installer and backend acceptance = BUILD/SMOKE PASS on isolated TEST candidate. **Formal M1 security certification = NOT YET**, with two genuine authorized JWT cross-tenant HTTPS sessions still pending, plus residual Android risk disposition and new RC1 magic-link redirect allowlist still unverified. Do not treat RC1 as a production release, and do not require a repeat Samsung install just to complete documentation.
