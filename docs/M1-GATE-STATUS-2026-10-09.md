# M1 TEST-only gate checkpoint — 2026-10-09

M1 NOT CERTIFIED. PR #1 remains DRAFT; no production, main or landing changes.

- JJ SPA Android password login PASS, and cold reopen after force-stop PASS based on physical screenshots and Supabase/Railway HTTP evidence at 08:24–08:26 UTC.
- TEST database unchanged: PlayersHype 5 invoices, USD 1404.49 outstanding, 5 AR cases; JJ SPA 0 invoices. Both organizations have one member.
- All six core tables RLS enabled, and integrity checks (missing cases/audits, orphan cases, cross-tenant references) returned zero violations.
- Isolated dependency inventory [run 37915622154](https://github.com/playershype/TabBeagle/actions/runs/37915622154): SUCCESS, 16/16 tests, 35 advisories (22 high, 13 moderate, 0 critical). 3 direct dependency names, 32 transitive. No auto-fix or production APK promotion.
- Supabase Security Advisor: four SECURITY DEFINER callable-function notices and leaked-password protection disabled.
- TB-IT-001 live two-identity HTTPS isolation has **NOT RUN** because two separately authenticated TEST bearer sessions are unavailable via connected tools. Neither secrets nor user credentials may be shared in chat. No false PASS.
- Issue #3, #5, #6 stay OPEN; M2 on hold pending M1 acceptance.

## Additional live TEST database security check (read-only, 2026-10-09)

Executed against the existing isolated Supabase TEST database using three separately scoped PostgreSQL transactions: `BEGIN READ ONLY; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub=<authorized TEST member>; SELECT ...; COMMIT`. This is a **database-role/RLS simulation**, **not** a live Supabase Auth JWT or HTTP bearer test. No password, personal email, bearer JWT or real user identifier is kept in this report.

| Assertion | JJ SPA TEST session context | PlayersHype TEST session context |
|---|---:|---:|
| Exactly one visible authorized organization | PASS (1) | PASS (1) |
| Visible foreign organizations | PASS (0) | PASS (0) |
| Own invoice rows | 0 | 5 |
| Visible foreign invoices | PASS (0) | PASS (0) |
| Visible foreign customers | PASS (0) | PASS (0) |
| Visible foreign AR cases | PASS (0) | PASS (0) |
| Visible foreign audit events | PASS (0) | PASS (0) |
| Known PlayersHype invoice details visible | 0 (denied) | 1 (allowed) |
| Foreign write membership permission | false | false |
| Own write membership permission | true | true |

A third read-only transaction with role `authenticated` but no user identity yielded **0 organizations, 0 invoices, 0 customers and false write membership** (fail-closed). All contexts confirmed `current_user=authenticated` during the tests.

Current live role/ACL review: all six core public tables have RLS enabled; `anon` has no SELECT; `authenticated` has SELECT but no direct INSERT/UPDATE/DELETE on those tables. The four SECURITY DEFINER functions have explicit EXECUTE access for `authenticated` and no EXECUTE for `anon`; all four use an empty function `search_path`; the write RPCs check membership before inserts. Supabase Advisor still surfaces four SECURITY DEFINER-executable notices. The findings are **reviewed, not automatically waived or removed**.

The user's observed account switching in TabBeagle Android also showed each business's invoices remain separate. The server's requirement for **two genuine Supabase-signed JWTs over HTTPS** is still independently NOT EXECUTED, and this SQL role simulation must never be portrayed as satisfying it.

No migrations or mutable SQL were executed in this verification. No changes to production, main, PR #1, or existing TEST invoice records.
