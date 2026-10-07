# Configure and accept the first persistent flow

## Required external configuration
No deployed invoice backend or associated credentials were found in the inspected repository. The landing's early-access database is not assumed to be the invoice backend. No Supabase project, database, SMTP service or hosting deployment was modified during this implementation.

1. Select/create an isolated Supabase **test** project. Do not apply this migration to a production or early-access database.
2. Apply `backend/supabase/migrations/202610070001_first_persistent_flow.sql` using the test project's SQL editor or controlled migration runner. It creates new tables and rejects collisions.
3. Enable email sign-in. Add the exact redirect `tabbeagle://auth/callback` to Auth URL Configuration. Use an authorized test email and configure delivery for the test project's current mail limits. The PKCE link must open on the device that requested it. Never send real customer reminders for this test.
4. Deploy `backend/` as a Node 22 Next.js service with HTTPS. Build `npm ci && npm run build`, start `npm start`. Set `SUPABASE_URL` and the **public anon/publishable key** for that same test project. No `service_role` key is required. A static GitHub Pages site cannot host this API.
5. In GitHub create/select environment `tabbeagle-test`. Set variables `EXPO_PUBLIC_API_URL` (the deployed API), `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the same project/public key). Public keys are bundled into Android; never use private keys here.
6. On the implementation branch, run **Build configured TabBeagle User APK**. The workflow validates configuration before compiling. Download `TabBeagle-User-Milestone1-TEST.apk`. Check the certificate against an installed preview before replacing it. No production signing key is included.

## Phone acceptance — still pending
- Install with the existing app's data preserved; record device, Android version, APK SHA and certificate.
- Turn off Metro/development server. Launch cold; verify brand icon/splash and login.
- Request the email link and open it on that same device. Verify login. Repeat once with the app closed; expired/wrong links must show an error and allow retry.
- Create a test business with its actual timezone. Create a test customer with an authorized email. Create invoice `TEST-001`, USD 1250.09, valid issue/due dates.
- Open detail, then force-stop/reopen the app. Verify session restoration and USD 1250.09 from the backend.
- Sign out, sign in again and confirm the same customer/invoice. Test a second business owner: the first invoice must be invisible, including direct API requests.
- Interrupt the network during save and retry without changing the form. Confirm exactly one invoice, one AR case and one creation audit event.
- Check the actual PostgREST JSON relationships used by `invoiceSchema` (`customer` and one-to-one `ar_case`). Fail the gate if shape or database configuration differs.
- Record evidence in the Second Brain. A green build, a mock auth transport or a local database test does not close this phone acceptance gate.

## Later release gates
Upgrade the inherited Expo/RN/dependency stack and address the audit findings; review secure session storage, native networking/backups and production signing; implement governed agent/email/payments per the locked contracts. Add rate limiting, monitoring, backups/restore and rollout controls before real customer use.
