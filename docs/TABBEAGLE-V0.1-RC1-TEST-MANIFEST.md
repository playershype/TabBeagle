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
| Signed RC APK CI, exact package + icon + unique scheme | PASS | Pending RC1 GitHub run |
| JS tests incl. auth, idempotent invoice creation/retry, tenant probe contract | 23/23 | Pending RC1 GitHub run |
| Next backend tests + production dependency audit | 12/12, 0 alerts | Pending RC1 GitHub run |
| TypeScript and Metro JS bundle | PASS | Pending RC1 GitHub run |
| Expo native prebuild, signed Gradle assembleRelease | PASS | Pending RC1 GitHub run |
| No increase vs isolated 35 remaining Android npm advisories | 0 critical; ≤22 high; ≤35 total | Pending RC1 GitHub run |
| No direct anonymous invoices, customers, org access via live TEST HTTPS | 401 | Pending RC1 GitHub run |
| User-observed separation of company invoices (in prior signed HTTPS app) | Functional PASS | Prior user attested; NOT an RC1 phone retest |
| Signed JWT A/B direct HTTPS cross-tenant reads/writes | Strict PASS | **BLOCKED; NOT executed** |
| 35 Android dependency advisories | Remediated or accepted | **OPEN**; only PostCSS fix validated |
| Supabase TEST leaked-password protection | Enabled or formally accepted | **OPEN**; Free tier lacks Pro feature |
| RC1 magic-link redirect allowlist | Confirmed | **UNVERIFIED** |
| Production promotion / PR #1 merge | Only after M1 acceptance | **PROHIBITED** |

**Invariants:** No `main` change, production Supabase, live Stripe/Resend, real invoices, original TEST dataset, existing signed APK, or landing changes. GitHub PR #1 remains DRAFT. The RC is neither a production app nor a certified M1 security attestation. GitHub Actions may publish a separate signed TEST installer, never an automatic deploy/merge.
