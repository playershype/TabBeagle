# TabBeagle M1 — real TEST backend negative-authentication audit

Date: 2026-10-09. Environment: Railway tabbeagle-api-test, pinned to https://tabbeagle-api-test-test.up.railway.app. Branch: `codex/m1-backend-security-audit-20261009` isolated from accepted application and PR #1.

## CI evidence

[GitHub Actions run 37923205789](https://github.com/playershype/TabBeagle/actions/runs/37923205789) completed SUCCESS.

- Locked backend dependency install `npm ci --ignore-scripts` PASS.
- `npm audit --omit=dev`: **0 vulnerabilities** (0 critical, high, moderate, low).
- `npm test`: **12/12 PASS**, includes persistence/RLS and error handling business-rule tests.
- `npm run build`: Next.js backend build PASS.
- `npm run typecheck`: PASS.
- Live HTTPS negative-authentication checks: all **7/7 PASS**, including health 200 and six unauthorized/malformed-token cases returning 401. The probes are read-only except for **one unauthenticated invoice POST**, intentionally rejected 401 before any body parsing, database writes or authorized RPC execution.

| TEST API method and route | Expected | Observed |
|---|---:|---:|
| GET /api/health | 200 | 200 |
| GET /api/organizations, no bearer | 401 | 401 |
| GET /api/customers?organizationId=<TEST>, no bearer | 401 | 401 |
| GET /api/invoices?organizationId=<TEST>, no bearer | 401 | 401 |
| GET /api/invoices/<existing TEST ID>, no bearer | 401 | 401 |
| POST /api/invoices with empty JSON and no bearer | 401 | 401 |
| GET /api/invoices?organizationId=<TEST>, invalid bearer | 401 | 401 |

Evidence artifact `M1-Backend-TEST-Security-Audit-NoCredentials` (#11613041024). No JWTs, passwords or personal email addresses were used or logged. This is **real HTTPS negative-authentication evidence**, not a valid-JWT A/B cross-tenant probe.

## Open gates and safeguards

- Full two-signed-identity HTTPS authorization still BLOCKED; do not label two-tenant TB-IT-001 PASS from this negative-only result.
- Supabase DB restricted-role simulation already proves foreign rows are hidden under RLS, but is not JWT proof.
- Android Expo54 security has **35 unresolved findings** baseline. Discarded scoped candidate `image-size@2.0.4`: npm audit reduced to 34 in disposable CI but Android JS bundle failed parsing `assets/brand.png`. Do not promote the patch.
- Supabase leaked-password protection requires a paid plan and remains disabled in TEST Free. No upgrade authorized.
- No modifications to stable Android, original invoices, production, main, or landing; PR #1 remains DRAFT.
