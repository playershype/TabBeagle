# M1 Dependency and Password Protection Remediation Decision — 2026-10-09

**Project:** TabBeagle v0.1; all evidence from isolated TEST. This is NOT a production-readiness approval.

## Verified status
- Expo SDK 54; React Native 0.81.5; Expo Linking ~8.0.12; PostCSS isolated override 8.5.23.
- [GitHub audit CI #37915622154](https://github.com/playershype/TabBeagle/actions/runs/37915622154): 35 npm audit --omit=dev notices, 0 critical, 22 high, 13 moderate; 16/16 tests PASS, TypeScript PASS.
- Dependency inventory archive: artifact 11609672878. Of the 35 package-level alerts, 3 dependency roots are direct (expo HIGH, react-native HIGH, expo-linking MODERATE) and 32 are transitive. These are NOT 35 individually proven exploited APK vulnerabilities.
- The npm audit suggestion to downgrade expo to v44 or upgrade React Native to v0.87.1 is NOT an automatic compatible remediation for the tested Expo 54 / RN 0.81.5 app. Do NOT use npm audit fix --force.

## Verified high-priority advisory findings

1. `braces` (HIGH), GHSA-vfj7-8cjw-p6xm, <=3.0.3 vulnerable. Official GitHub advisory had no patched version listed at audit time. Attempted a scoped `braces@3.0.4` override in **disposable GitHub CI only**, isolated branch `codex/m1-braces-compatible-patch-lab`, [run #37922471741](https://github.com/playershype/TabBeagle/actions/runs/37922471741). **Candidate REJECTED**: `npm view braces@3.0.4 version` -> npm registry E404, version not found. CI stopped before package-lock modification, tests or native build. Do not claim this vulnerability fixed.
2. `node-forge` (HIGH), GHSA-86w9-cpqp-85rv, affected through v1.4.0, official GitHub advisory currently lists no patched version. Transitive via Expo code-signing tooling. Potential certificate/signature verification risk; deployment reachability not proved. No unsupported override.
3. `image-size` (HIGH), GHSA-5p2g-fcmc-qvqq and GHSA-w3rx-r6r6-pgpr, parsing denial-of-service advisories. `npm audit` claims some fixes possible, but no staged-compatible version or Android native build was validated. Keep open.
4. `sprintf-js` (MODERATE), GHSA-hp3w-g68c-fv3c; `uuid` (MODERATE), GHSA-w5hq-g745-h8pq; no compatible patch test yet.
5. Expo, Metro and Jest umbrella/transitive findings cannot be retired simply because they are mainly used at build time: produce a reproducible module reachability analysis and verify supported SDK versions before classifying risk.

Risk mitigation until upstream fixes: pinned lockfile and isolated CI; no untrusted package/archive/image inputs in builds; protect GitHub Actions secrets; use user-approved dependency upgrades only, with npm ci, tests, typecheck, JS bundle, Expo prebuild, native Gradle release/signature and subsequent physical Android acceptance. This is a mitigation plan, not proof that critical or high alerts are harmless.

## Supabase leaked password protection finding

- Connected Supabase project `gaileljkciseopfgwsbc` belongs to organization `Tab Beagle` on **tier_free** (verified by Supabase organization lookup).
- Supabase Security Advisor: `auth_leaked_password_protection` WARN. Official Supabase documentation: leaked-password check against Have I Been Pwned is available only **Pro or above**.
- Enabling requires a user-approved plan/billing upgrade or a decision to accept/reduce this risk during TEST. No plan upgrade is authorized; current connected Supabase operations do not expose hosted Auth settings modification.
- Existing Android TEST-only password-enrollment policy checks length 12–128 and confirmation before `auth.updateUser({password})`; this is client-side and **NOT** an adequate server-side replacement for a leaked-password database check.
- New user signup remains disabled in TEST. Never weaken authentication, change passwords, alter auth.users via direct SQL, or claim protection enabled.
- Before public commercial launch: configure strong minimum password length and leaked-password protection server-side after authorized tier approval; require secure operator reauthentication as appropriate; rerun Security Advisor.

## Other Supabase security findings

Four `authenticated_security_definer_function_executable` WARNs correspond to deliberately callable `public.create_organization`, `public.create_customer`, `public.create_invoice`, `public.is_organization_member`. Their empty search_path, no anonymous EXECUTE, authenticated-only grants and membership checks were verified with read-only SQL. Prior RLS read-only simulated-user tests pass, but do not replace JWT HTTPS checks. Never arbitrarily revoke these RPCs: it would break the current product flow. Mitigate through documented privilege boundary review, narrowly scoped grants and full live two-identity HTTPS acceptance.

## Decisions and remaining gate

- **No tested APK or dependency graph promoted; no Production or main changes.**
- Issues #3 / #5 / #6 remain open. PR #1 remains DRAFT.
- Strict TB-IT-001 signed-JWT HTTPS tenant isolation still not independently executed; manual UI tenant isolation and SQL simulated identity checks are different evidence.
- After confirmed upstream compatible patches, open separate clean branch and run a fresh, signed build; do not make unsafe version jumps.

## image-size 2.0.4 TEST-only trial — REJECTED

Separate disposable CI branch `codex/m1-image-size-compatible-20261009`, [GitHub run #37922958582](https://github.com/playershype/TabBeagle/actions/runs/37922958582). Confirmed `image-size@2.0.4` exists on npm and pinned this version inside the runner only. `npm audit --omit=dev` showed 35 -> **34 advisories** (22 high -> **21 high**; 13 moderate unchanged; zero critical); the `image-size` advisory was no longer listed. **16/16 unit tests passed**, TypeScript passed, but `npm run bundle:android` FAILED with exact output `SyntaxError: assets/brand.png: The "list" argument must be an instance of SharedArrayBuffer, ArrayBuffer or ArrayBufferView.` Expo Metro failed while processing the brand icon. Native prebuild and signed APK were skipped; no source or lockfile in the existing branch was changed by the trial. **DO NOT PROMOTE image-size 2.0.4 as a global override:** dependency API compatibility is broken, despite favorable vulnerability counts. Keep 35 remaining baseline alerts until a targeted, Expo-compatible package update can pass JS bundle + native build.
