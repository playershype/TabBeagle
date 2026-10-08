# Milestone 1 — implementation record, 2026-10-07

## Why
The chosen Android source was only available in a ZIP. Its build entry skipped root registration, its PKCE callback and auth configuration disagreed, required environment values were absent, and referenced invoice API/server code was not in any of the three inspected GitHub branches.

## What changed
- Versioned client source, separate API project, lockfiles and verification workflow.
- Registered native entry, explicit missing-configuration screen, PKCE/S256, exact callback validation, cold/warm link handlers, session restoration/foreground refresh and error recovery.
- Existing website brand image used for launcher/splash; no replacement brand designed.
- Organization onboarding and selection, reusable customer creation, invoice entry/list/detail, API response validation, reload on screen focus and timeouts.
- Exact cents, real calendar dates, organization-timezone aging and outstanding totals separated by currency.
- Canonical database subset: organizations, memberships, customers, invoices, AR cases, audit events. Invoice/case/audit creation is atomic and idempotent. Composite foreign keys enforce tenant relationships.
- Server verifies the bearer token; RLS and SQL functions re-check membership; client cannot self-assign permissions, mark paid, rewrite audit or send reminders through this API.
- Configured APK workflow uses a release variant, test signing and native embedded bundle; no silent placeholder configuration.

## Verification scope
Local checks: 6 mobile tests (including SDK auth flow with a simulated transport), 12 backend tests (including PostgreSQL/PGlite RLS and disk-reopen persistence), TypeScript, production API build, native project generation and Android JS/Hermes bundle export. See the attached execution evidence for final results.

These do not certify a deployed Supabase project, actual email delivery, an APK installed on a phone, native PKCE crypto behavior on that phone, or production readiness. The acceptance gate in TEST-ENVIRONMENT.md remains open until those checks run.

## Deliberate boundaries
This is the first persistent-data milestone, not the full agent. Agent reasoning, Action Firewall/approval-bound email, promises/disputes, verified partial/full payments, CSV and complete product navigation remain planned. Legacy unprotected Paid/Remind buttons are not wired to pretend implementations. Product Contract V1 and PD-001 are unchanged.

New API uses current Next.js 16.4.0 and React 19.2.0, isolated from the existing mobile dependency tree. Next.js 14 was the earlier architectural proposal, not recovered server source. Mobile keeps Expo 51/RN 0.74.5 to make the first correction reviewable; its dependency findings block production and need a separate compatibility upgrade.

Dependency scan after clean lockfile install (`npm audit --omit=dev`): mobile 67 findings (1 critical, 41 high); backend 0. Mobile includes inherited Expo/Metro build-tool dependencies, so this count is not a measured count of exploitable APK vulnerabilities. Production is blocked pending triage and a compatible SDK upgrade. A trial automatic audit fix introduced an incompatible nested React Native version and was discarded; the submitted lockfile was regenerated cleanly against the intended SDK.
