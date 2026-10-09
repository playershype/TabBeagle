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

## Early-access form: connection plan (not active)

The form validates and then reports that nothing was sent. `CONFIG.earlyAccessEndpoint` is empty.

To connect it, after founder approval:

1. Choose the destination (see DESIGN-PROPOSAL §5). **Never** use the production project `kbidusxzzuwmxsukqvpm` or the invoice TEST project `gaileljkciseopfgwsbc` for leads without written approval.
2. Expose a single write-only endpoint (a Supabase Edge Function or a small serverless handler) that:
   - accepts only the fields in the payload: `name`, `email`, `business_type`, `invoice_volume`, `pain_point`, `consent_marketing`, `source`;
   - validates again on the server, rate-limits by IP, and rejects a honeypot value;
   - returns `201` on create, `409` on duplicate email, `429` when rate-limited;
   - never returns stored records and never uses a service key in the browser.
3. Set `earlyAccessEndpoint` to that URL, add the origin to CORS, and update `tests/site.test.mjs` to expect it.
4. Add a privacy notice and an unsubscribe path before collecting real addresses.

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
