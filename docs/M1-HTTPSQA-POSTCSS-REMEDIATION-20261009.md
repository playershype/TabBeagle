# M1 HTTPS QA PostCSS Compatible Security Remediation — 2026-10-09

**Status: FIX COMMITTED TO ISOLATED TEST BRANCH ONLY.** TabBeagle M1 is **NOT** globally certified. Branch `codex/m1-https-qa-postcss-patch-20261009`; commit `7b83e40` (GitHub Actions bot). No merge to main, original `codex/m1-https-ondevice-probe-lab`, PR #1, production or stable user-installed Android.

## Reproducible evidence

Original source was branched directly from the last signed/user-installed M1 HTTPS QA app `codex/m1-https-ondevice-probe-lab` (it includes `TenantProbeScreen`, `expo-linking` and native authentication). Do not confuse this with previous `codex/m1-risk-triage-20261009`, which used older Android source.

**Before:** `npm audit --omit=dev` = 36 package advisories: 23 HIGH / 13 MODERATE / 0 CRITICAL. (Authenticated actual HTTPS QA app source-map inspection: [CI #37927889090](https://github.com/playershype/TabBeagle/actions/runs/37927889090).)

**Fix:** `mobile/package.json` scoped override `postcss=8.5.23` with independently resolved `mobile/package-lock.json` exact PostCSS version 8.5.23. No major Expo/React-Native version jumps.

**After:** `npm audit --omit=dev` = **35 package advisories: 22 HIGH / 13 MODERATE / 0 CRITICAL**. `postcss` no longer flagged, with zero additional advisory package names.

Independent verification:

1. [Native compatible patch validation run #37928133093 — SUCCESS](https://github.com/playershype/TabBeagle/actions/runs/37928133093): PostCSS version pinned, npm audit reduction, **23/23 mobile tests PASS**, TypeScript PASS, Metro Android export incl. `assets/brand.png` PASS, Expo native Android prebuild PASS, **Gradle signed Android release BUILD SUCCESSFUL**, signature and separate package ID `com.tabbeagle.user.httpspatchlab` verified. Result artifact #11614828876 includes proposed dependency files and report, not an APK. No user-installed APK changed.
2. [Isolated GitHub patch commit run #37928898638 — SUCCESS](https://github.com/playershype/TabBeagle/actions/runs/37928898638) was explicitly gated on #37928133093 native SUCCESS before execution; re-ran audited reduction, 23/23 tests, TS, Metro Android bundle PASS, and pushed only `mobile/package.json` and `mobile/package-lock.json` to isolated branch. Commit `7b83e40`.
3. `mobile/App.tsx` and every authored app screen remain byte-for-byte original to the HTTPS QA base; package changes only. User account/DB/tenant data were not touched.

A redundant earlier commit workflow attempt #37928785109 failed only at its initial Git staging path; it could not push and left the branch unchanged. Its corrected successor #37928898638 passed and committed the patch. Do not classify #37928785109 as a security regression.

## What this means and does not mean

- **One high-severity npm advisory package has been remediated on this isolated branch.** 35 other npm package findings remain open (22 HIGH, 13 MODERATE).
- The corrected code is ready for code review as a TEST candidate. It is **not** already installed on the phone, merged into PR #1 or deployed to production.
- Earlier source-map inspection showed 30 of 36 originally reported audited package names absent from Android JS sources, but this does not prove native APK risk is absent or justify waiving the alerts.
- M1's strict two-valid-Supabase-JWT real HTTPS A/B unauthorized cross-tenant test is still NOT independently executed, regardless of user-verified Android UI company separation and database RLS role simulations.
- Supabase TEST leaked-password protection is still disabled on the Free tier; Pro billing has not been authorized.

## Follow-up

Keep original TEST apps and `main` stable. Review patch scope, validate security constraints, then explicitly decide branch integration path only when release gates are met. Do not infer that a successful isolated native build approves commercial production release.
