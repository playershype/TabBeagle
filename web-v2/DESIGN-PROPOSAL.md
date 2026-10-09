# TabBeagle public site v2 — analysis and design proposal

Branch: `codex/tabbeagle-landing-home-v01-test` (based on `origin/website-launch` @ `70cd616`).
Scope of this change: public landing + public home only. Nothing outside `web-v2/` is modified.

## 1. What exists in GitHub today (verified 2026-10-09)

| Item | Location | Facts |
|---|---|---|
| Live-site source (inferred) | `website-launch` → `docs/` | Commit on `main` (2026-10-05) says: "Remove unused GitHub Pages workflow; site deploys from website-launch/docs". `docs/CNAME` = `tabbeagle.com`. Pages settings were not visible to me; treat as *likely*, confirm in repo Settings → Pages. |
| Landing A | `main` → `docs/index.html` (15 KB) | Dark navy, "bB" text mark, agentic loop sections, "Live case" example card. No form. Not referenced by any Pages workflow on `main`. |
| Landing B | `website-launch` → `docs/index.html` (14 KB) + `docs/assets/` + `docs/CNAME` | Light theme, approved PNG icon, Early Access form that POSTs to Supabase REST `early_access` on **`kbidusxzzuwmxsukqvpm`** (the protected production project). |
| RC1 app branch | `codex/tabbeagle-v0.1-rc1-test` @ `b3cbb64` | Mobile + backend. Contains no landing page. Its archive folder holds copies of both landings. |
| Brand icon | `mobile/assets/brand.png` (RC1) = `docs/assets/file_…png` (website-launch) | Byte-identical (sha256 `d174f7ed…`). Red/brown beagle with "TabBeagle" wordmark. |

### Findings that change the plan

1. **The live form writes to production.** `website-launch/docs/index.html` sends leads to `kbidusxzzuwmxsukqvpm`, which the brain marks as never-touch. This is a risk to raise with the founder regardless of this work. The new page does **not** carry that key and has no endpoint configured.
2. **Landing A shows an invented sample** ("Invoice #TB-1042 · $3,200", "Live case") without a label. The new page labels every number as sample data.
3. **Both current landings say "Automate" / "Recommend → Approve → Automate"** and describe the agent in present tense. The brain says the agent runtime is M2 and not built. The new page marks each stage with its real status.
4. **The brand icon is red/brown; the palette is navy/cyan/lime.** The site has to choose one. I used the approved icon at small size and let the navy/lime palette carry the page. This is a decision for the founder (see §5).
5. Neither landing has an OG image, a favicon that matches the icon, a privacy policy, or a sign-in state. Both have a `Sign in`-style gap the brain asks us to label honestly.

## 2. Two visual directions

**A — "Night Desk" (dark, product-forward).** Navy canvas, cyan glow, large product mock in the hero. Closest to the app and to Landing A.
- For: immediate brand recognition, matches the mobile app's navy.
- Against: this is the default "AI SaaS" look. Long copy is harder to read on dark. Easy to slide into AI-slop.

**B — "Ledger" (light, editorial, finance-grade). Chosen.** Off-white paper, navy ink, cyan used for text only at the darker `#0A6F80`, lime reserved for the primary CTA and the single highlight in the headline. Sample receivables panel in the hero reads like a real ledger. A navy band is used once, for the sample panel and footer.
- For: finance buyers read "trust" in calm, legible layouts. Copy is easy to scan. Status labels ("Available in test / In development / Planned") fit naturally.
- Against: needs discipline with color. Cyan on white fails at 2.1:1, so it's not used for body text.

**Why B:** the brief's risk is over-promising. A light, ruled, status-labelled layout makes the honest distinction visible without extra copy. It also separates the public site from the dark app.

Contrast checked (WCAG 2.x): navy on lime 15.2:1; ink on paper 16.4:1; muted `#4A5A6E` on paper 6.6:1; cyan-ink `#0A6F80` on paper 5.5:1; cyan on white 2.1:1 (**not used for text**).

## 3. What the new page contains

Sections, in order: hero (with labelled sample receivables panel) · the problem · five-stage loop with honest status · reminders vs. controlled agent · human control · who it's for · pricing "being finalized" (no numbers) · FAQ · early-access form · footer.

Deliberately absent: prices, testimonials, customer logos, counts of invoices or dollars recovered, SOC 2 or any compliance badge, "AI collects your cash", third-party trackers, external fonts or scripts, and any sign-in link (the Sign-in control is disabled and says it is invite-only).

Early-access form:
- Validation on blur and submit, per-field messages, focus moves to the first error, `aria-invalid` and `aria-describedby` set.
- Consent checkbox required.
- Honeypot field, minimum 2.5 s before a valid submit, 30 s cooldown after an attempt, duplicate detection per browser.
- **No endpoint.** In this build the form validates and then says plainly that nothing was sent. It never shows a fake success.

## 4. Verification run in this session

- `node --test tests/site.test.mjs`: 15/15 static checks (anchors, aria references, local assets, no external scripts or trackers, no production or invoice-DB identifiers, no unverified claims, status vocabulary, honest sample labels, form structure, reduced-motion and focus styles, inactive sign-in).
- `node tests/browser.smoke.mjs`: 12/12 Chromium checks (no horizontal overflow at 320, 390, 768 and 1280 px; no console errors; anchor navigation; disabled sign-in; empty submit errors and focus; malformed email; preview submit sends nothing; zero external requests).
- Screenshots reviewed at 1280 and 390 px. Header wrap issue on phones was fixed (Sign-in hidden under 600 px, CTA shortened).

Not verified: Pages deployment behaviour, real-device Safari/Firefox, Lighthouse scores, screen-reader passes with a real assistive technology, and the SEO/OG preview on social platforms.

## 5. Decisions needed from the founder

1. **Early-access destination.** Options: (a) a new Supabase project dedicated to lead capture, (b) a Pages-compatible form service with its own data processing terms, (c) keep the current production `early_access` table but with an explicit owner sign-off. Recommendation: (a) or (b). Do not use the invoice TEST project. Do not keep sending to production without review.
2. **Brand mark.** Keep the red/brown beagle icon, or approve a navy/lime treatment. I did not create a new logo.
3. **Pricing copy.** Current page says "being finalized". Confirm before any number appears.
4. **Privacy policy and terms.** Required before early access opens. Page links are placeholders until these exist.
5. **Cutover.** Whether `web-v2/` replaces `website-launch/docs/` later. That is a separate, approved step. It is not part of this branch.

## 6. Still open (not done in this change)

- **Track B — authenticated home/dashboard** (`codex/tabbeagle-dashboard-home-v01-test`, from RC1). Not started. Needs the same design tokens, the existing RLS-scoped endpoints, and tests for org switching and zero states. Plan: design in a separate branch, no new metrics, no invented activity.
- **Track C — forgot / reset password** (`codex/tabbeagle-password-recovery-test`, from RC1). Not started. Blocked for end-to-end proof by two things: the RC1 `tabbeaglerc01://auth/reset-password` redirect is not yet in Supabase TEST's allowlist (needs an administrator), and a real recovery email can only be exercised with an authorized TEST identity. Until both exist, reset stays UNVERIFIED.
- M1 remains **not certified**. The two-JWT HTTPS gate (Issue #6), the 35 Android advisories (Issue #5) and the leaked-password check are unchanged by this work.
