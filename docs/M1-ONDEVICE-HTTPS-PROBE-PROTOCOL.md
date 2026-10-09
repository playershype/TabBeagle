# M1 Secure On-device HTTPS Probe — TEST LAB

**Scope:** TabBeagle TEST only, no PlayersHype horse-racing application, no production, no main, no landing, no invoice creation.

## Lab purpose and provenance

This isolated diagnostic Android APK is built by `.github/workflows/m1-https-ondevice-probe-lab.yml` on branch `codex/m1-https-ondevice-probe-lab`. Unique package `com.tabbeagle.user.httpslab`. It installs alongside existing Android builds and MUST NOT replace/overwrite the currently accepted app.

The native screen `M1 · Test company isolation (HTTPS)` is only visible for Supabase TEST. It receives the logged-in TEST identity's access token directly through Supabase AsyncStorage (local app session) and sends it as an Authorization header ONLY to the pinned Railway TEST API. It never shows, records, copies or asks the user to paste this token. It writes no report to GitHub, Supabase or local storage. No external callback required when signing in with an existing TEST password.

## Genuine on-device acceptance

1. Install the QA APK as a separate app from GitHub Actions. Do not uninstall original.
2. Sign in with JJ SPA's **existing TEST password** within the QA app. No password or JWT should ever appear in chat, screenshots or GitHub.
3. Open the bottom Dashboard action `M1 · Test company isolation (HTTPS)`, press `Run isolated HTTPS security check`; all tests should say PASS, with header `ONE ACCOUNT: PASS` and name JJ SPA. Save timestamped screenshot, no secret fields.
4. Sign out of QA lab and, **only if a separate authorized existing TEST PlayersHype SaaS account can be authenticated**, sign in to that account and run the same test. It should return `ONE ACCOUNT: PASS` for PlayersHype TEST.
5. Correlate time window to Railway HTTP and Supabase Auth logs and re-check database integrity (five original invoices, five cases, zero cross-tenant links). Do not mark a gate PASS on the basis of a screenshot alone.

## Exact HTTPS assertions

- GET /api/organizations: exactly one expected authorized organization.
- GET /api/invoices?organizationId=<own>: 200 and 0 (JJ SPA) / 5 (PlayersHype).
- GET /api/customers?organizationId=<own>: 200 and array.
- GET /api/invoices?organizationId=<foreign>: 200 and [].
- GET /api/customers?organizationId=<foreign>: 200 and [].
- GET /api/invoices/<known PlayersHype TEST invoice ID>: JJ SPA must get 404, PlayersHype should get 200.
- POST /api/invoices for foreign tenant: 403. Body uses a guaranteed-nonexistent customer UUID so even if membership validation were broken, no record could be inserted.

The probe reports only labels/status/counts, never JWT, password, invoice/customer content, or user emails. Expected snapshot is fixed for current TEST data; any deliberate later TEST invoice changes require a new formal baseline before running.

## Limitations

One-side PASS means only ONE authentic JWT was tested, not both. A full cross-tenant manual acceptance needs two separate authenticated TEST sessions plus corroborating live logs. The existing GitHub two-bearer automated harness `m1-two-users-live-https.yml` remains independently BLOCKED until authorized short-lived secrets are provisioned securely to environment `tabbeagle-test`. Do not mislabel local mock unit tests as live HTTPS success. M1 and TB-IT-001 remain uncertified pending both identities and remaining dependency advisories.
