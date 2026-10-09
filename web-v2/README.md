# web-v2 — TabBeagle public landing + home (preview)

Static, dependency-free page. **Not deployed.** It does not replace `docs/` (which GitHub Pages serves from `website-launch`), and it does not touch `main`.

- Design rationale, source audit and open decisions: [DESIGN-PROPOSAL.md](./DESIGN-PROPOSAL.md)
- Single file: `index.html` (CSS and JS inline). Assets: `assets/tabbeagle-app-icon.png` (approved RC1 icon, identical to the live site's icon).

## Preview locally

```bash
cd web-v2
npm run serve        # http://127.0.0.1:4173
```

No build step. Any static server works.

## Tests

```bash
npm install          # installs playwright 1.56.0 (needed only for the browser suite)
npm test             # static checks, no browser needed
PLAYWRIGHT_BROWSERS_PATH=… npm run test:browser   # Chromium checks; writes screenshots to .screenshots/
```

The browser suite needs a Chromium that Playwright can launch. It does not run `playwright install`.

## Early-access form: connected to the leads project

- Destination: Supabase project `tabbeagle-test` (`gaileljkciseopfgwsbc`, us-east-1, free plan). Shared with the invoice TEST backend by a deliberate decision (2026-10-09, one free project). The leads table is `public.early_access_leads`, RLS on, no grants to anon/authenticated. Never the production project (`kbidusxzzuwmxsukqvpm`).
- Endpoint: `https://gaileljkciseopfgwsbc.supabase.co/functions/v1/join-early-access` (Edge Function v1, `verify_jwt=false`; source in `../supabase-leads/functions/join-early-access/index.ts`).
- Table: `public.early_access_leads` with RLS enabled and no policies. `anon` and `authenticated` have no grants. Only the function (service role) writes.
- Responses: `201` created, `409` duplicate, `429` rate limited, `400` invalid, `403` origin not allowed.
- The page sends no keys. The publishable key is not needed and is not in the page.

Manual check after deploy (run from your machine, because some sandboxes cannot reach `*.supabase.co`):

```bash
curl -i -X POST https://gaileljkciseopfgwsbc.supabase.co/functions/v1/join-early-access \
  -H "Origin: https://tabbeagle.com" -H "Content-Type: application/json" \
  -d '{"name":"QA Test","email":"qa-test-REPLACE@example.com","business_type":"Agency","invoice_volume":"21–50","pain_point":"","consent_marketing":true,"source":"manual-check","website":""}'
```

Expect `201`. Repeat the same command: expect `409`. Use a test address and delete the row afterwards with the Supabase SQL editor (`delete from early_access_leads where email_normalized like 'qa-test-%'`).

Known limits:
- The rate limit is per function instance. It stops floods, not determined abuse. Add an edge limit (Cloudflare or Supabase network restrictions) before a public launch.
- Free projects can pause after inactivity. Check the current threshold in Supabase docs; a paused project makes the form fail.
- Privacy policy and unsubscribe flow are still required before real addresses are collected in volume.

## Content rules (enforced by tests where possible)

- Every product capability is tagged *Available in test*, *In development*, *Designed* or *Planned*. Only "Track" is live in the test build.
- Sample numbers are invented and labelled as sample data.
- No prices, testimonials, customer logos, compliance badges or "dollars recovered" figures.
- No third-party scripts, fonts or trackers. Analytics stays off until approved and consent-based.

## Open items before public launch

- Privacy policy, terms of service (footer shows placeholders).
- Final brand mark decision (red/brown icon vs. navy/lime treatment).
- Real-device checks (iOS Safari, Android Chrome, Samsung Internet) and an accessibility pass with assistive technology.
- Canonical URL and `og:image` at 1200×630 once the cutover is decided. `robots` is `noindex` until then.
- Cutover from `website-launch/docs/` is a separate, approved change.
