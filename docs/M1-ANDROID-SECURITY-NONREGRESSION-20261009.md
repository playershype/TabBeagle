# M1 Android dependency security non-regression gate — 2026-10-09

**Owner:** TabBeagle TEST, Expo SDK54 / React Native 0.81.5. **Evidence status:** COMPATIBLE BUILD GUARD PASS; existing advisories remain OPEN. No Android APK installed or changed, no main/production/landing changes.

## Exact verified workflow evidence

[GitHub Actions run 37924406176 — SUCCESS](https://github.com/playershype/TabBeagle/actions/runs/37924406176)

- Isolated branch: `codex/m1-android-risk-guard-20261009`
- Workflow: `.github/workflows/m1-android-risk-guard-20261009.yml`
- Reproducible test code: `mobile/scripts/m1-security-risk-gate.mjs`
- Artifact: `M1-Android-Security-Baseline-Guard-TEST`, ID `11612933193`
- `npm ci --legacy-peer-deps`: PASS.
- `npm audit --omit=dev`: observed 35 notices, **0 CRITICAL, 22 HIGH, 13 MODERATE**, identical to 35-item signed-off inventory in risk-triage isolated baseline.
- Rejected regressions: new vulnerable package name; any additional total/high/critical alert; incompatible Expo/RN/PostCSS/Metro-image-size major version combinations. All four compatibility checks PASS.
- `npm test`: **16 / 16 PASS**.
- `npm run typecheck`: PASS.
- `npm run bundle:android`: PASS, including `assets/brand.png`.
- **No native Gradle APK build was performed during this new guard run.** Previous separate native build lab is independent evidence; do not claim this run certified a signed APK.

## Dependency chain facts from actual lockfile

| Package | Installed version | Direct parent (from exact lockfile) | Assessment |
|---|---|---|---|
| `image-size` | 1.2.1 | `metro@0.83.3`, requires `^1.0.2` | Metro processes app assets at build time. Forcing `image-size@2.0.4` broke `brand.png` bundle; not compatible. High alert remains open. |
| `node-forge` | 1.4.0 | `@expo/cli`, `@expo/code-signing-certificates` | CLI/signing tooling. No upstream patched version verified for current warning; high alert open. |
| `braces` | 3.0.3 | `micromatch@4.0.8` | Build dependency; attempted `braces@3.0.4` rejected by npm registry E404. High alert remains open. |
| `uuid` | 7.0.3 | `xcode@3.0.1` | iOS native project tooling dependency, not established as part of Android JS bundle; moderate alert open. |
| `sprintf-js` | 1.0.3 | `@istanbuljs/load-nyc-config -> argparse@1.0.10` | Test/coverage tooling. Current moderate advisory has no verified compatible fixed version; open. |
| `js-yaml` | 3.15.2 / 4.3.2 | `@istanbuljs/load-nyc-config` / `@expo/xcpretty` | Already recent compatible releases; its audit umbrella notice is linked to `argparse`, not evidence that all `js-yaml` releases are themselves vulnerable. |

No direct import or bundle-reachability claim is inferred from this transitive lockfile table. `npm audit --omit=dev` can flag transitive build dependencies even though many are not actually packaged into an Android APK; demonstration of inclusion or exclusion would require separate bundle/module-level evidence and runtime reachability.

## Rejected separate patch attempts — do not promote

1. [Braces trial 37922471741](https://github.com/playershype/TabBeagle/actions/runs/37922471741): scoped `3.0.4` not published (E404). No patch.
2. [Image-size trial 37922958582](https://github.com/playershype/TabBeagle/actions/runs/37922958582): audit dropped to 34 notices (21 high), tests 16/16 passed, but Expo Metro bundle failed on `assets/brand.png` due to image-size 2.x API incompatibility. No patch.
3. [JS-YAML trial 37923969372](https://github.com/playershype/TabBeagle/actions/runs/37923969372): upstream scoped overrides `3.15.2` and `4.3.1` replaced original 4.3.2 branch with older 4.3.1. Audit became 35 notices with **23 high and 12 moderate** (one worse high) and `js-yaml` still reported. Runner stopped before tests, JS bundle, native build. No patch.

All three were disposable CI-only trials. Re-running with `npm audit fix --force` is not permitted.

## Security disposition / next steps

- Baseline **nonregression** controls PASS. This does **not** mean Android vulnerabilities are fixed, and a guard installed only on an isolated GitHub branch is NOT automatically active on protected main.
- Keep accepting only trusted repository assets in Metro build; run CI with limited GitHub permissions; review npm packages before deliberate SDK / Metro upgrades.
- When compatible upstream fixes are available, develop a separate versioned upgrade candidate and require npm audit, 16 tests, typecheck, JS export, Gradle signing and user acceptance before release.
- Strict two genuine Supabase Auth JWT sessions over HTTPS gate remains not executed; separate prior Android UI business isolation and SQL RLS checks are positive but distinct. M1 not certified.
- Supabase password breach check requires plan Pro+; the current TEST tier is Free, no billing changes authorized.
- PR #1 remains DRAFT, original Android stable, main, production and landing untouched.
