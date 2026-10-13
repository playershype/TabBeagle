# M1 phone acceptance — record

Status: **Reported as passed by the product owner on 2026-10-13. Detailed evidence not yet attached.** Not independently verified by the engineering assistant.

Reference gate: `docs/development/TEST-ENVIRONMENT.md` → "Phone acceptance".

## Checklist

| # | Gate item | Reported result | Evidence still needed |
|---|---|---|---|
| 1 | Install over existing app data; record device, Android version, APK SHA and certificate | Reported done. Device: Samsung Galaxy S26 Ultra (model SM-S948U), shown in device info screen 2026-10-13 | Android version, APK SHA-256, certificate fingerprint |
| 2 | Cold launch with Metro off; brand icon/splash and login | Reported done | Screenshot |
| 3 | Email link opened on the same device logs in; repeat after app closed; expired/wrong link shows error and allows retry | Reported done (login by password used for reset flow) | Note which login method was used |
| 4 | Create business with its timezone, customer, invoice `TEST-001` USD 1250.09 with valid dates | Reported done, **but screenshot does not match**: shows invoice `T-01`, customer Test1, USD 1,250.50, issued and due 2026-08-01, status UNPAID, 2026-10-13 08:09 | Screenshot of `TEST-001` USD 1250.09 detail, or explanation of why `T-01` was used |
| 5 | Open detail, force-stop, reopen; session restored and USD 1250.09 read from backend | Reported done | Note |
| 6 | Sign out, sign in again; same customer and invoice. Second business owner cannot see first invoice | Reported done | Note which second account was used |
| 7 | Interrupt network during save, retry without changing form; exactly one invoice, one AR case, one creation audit event | Reported done | Count in Supabase TEST (`invoices`, `ar_cases`, `audit_events`) for that invoice |
| 8 | PostgREST JSON shape for `customer` and one-to-one `ar_case` matches `invoiceSchema` | Not reported | Result of opening the invoice list without app errors (or SQL check) |

## Identifiers policy

Serial number, IMEI and phone number are deliberately not stored in this repository.

## Open items outside this record

- Supabase TEST redirect allowlist for the RC1 scheme `tabbeaglerc01://auth/callback`: **unverified**. Required before any magic-link PASS on the RC1 package.
- Password reset link opened inside the browser: **blank page reported** on 2026-10-12; in-app verification path added afterwards. Re-test pending.
- Supabase TEST leaked-password protection: **open** (Free tier).
- Android dependency advisories: **open**.
- Expo upgrade path: current code is Expo 54; `MILESTONE-1.md` still states Expo 51. Documentation must be reconciled.
- Production promotion, PR #1 merge, `main` changes: **prohibited** until M1 is formally accepted and approved.

## Decision

M1 phone gate is accepted **as reported**, pending items 1, 2, 4 and 7 above getting written evidence in this file. Acceptance is not a production or security certification.
