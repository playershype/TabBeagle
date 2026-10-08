# TabBeagle API — milestone 1

Node 22.13+. `npm ci`, `npm test`, `npm run build`, `npm start`.

Apply the versioned SQL migration only to a **new isolated Supabase test project**. It intentionally fails if existing canonical tables conflict. It is not a retrofit to the landing-page database. Supply `SUPABASE_URL` and `SUPABASE_ANON_KEY` to this server; no service-role credential is used.

Every business route validates the bearer token with Supabase Auth. The same user token is forwarded to PostgreSQL, where membership-based RLS restricts reads. Writes execute narrow SQL functions that re-check active membership, validate tenant-aware relationships, and create audit records in the same transaction. Anonymous users cannot execute these functions; direct authenticated INSERT/UPDATE/DELETE is revoked even when Supabase default privileges would grant it.

API:
- GET/POST `/api/organizations`
- GET/POST `/api/customers` (GET requires `organizationId`)
- GET/POST `/api/invoices` (GET requires `organizationId`)
- GET `/api/invoices/:id`
- GET `/api/health` (process health, not database readiness)

Request schemas are in `src/lib/validation.ts`. Responses use the canonical `organization_id`, integer minor units and separate invoice payment status / AR-case state. Do not point an old 1.0.0 client at this new schema/API.

Scope: one organization created per owner in onboarding; explicitly select from existing memberships when more than one exists. This milestone accepts USD invoices only; dashboard calculations keep currencies separate. Pilot invoice list fails explicitly above 500 rows instead of showing a misleading partial total. Server-side pagination is a prerequisite to raising that pilot size.

Tests run the actual migration on PostgreSQL through PGlite with an `auth.uid()`/roles shim. They exercise actual RLS, grants, foreign keys, audited RPCs and disk persistence. The shim does not verify Supabase Auth HTTP delivery or PostgREST relationship serialization. Those remain in the deployed acceptance test.

Rollback for this isolated test environment: roll back the application branch and discard/reset only the disposable test database after export if necessary. There is intentionally no destructive automated down migration for a populated environment.
