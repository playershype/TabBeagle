# M1 TEST — JJ SPA Android magic-link recovery playbook

**Incident:** 2026-10-08. On Samsung, JJ SPA sign-in email is received, but opening the magic link showed a dark blank browser page with `google.com` instead of returning to TabBeagle. **No login URLs, OTPs or bearer tokens should be pasted in tickets or chats.**

## Proven code defect
The physically tested Navigation7 LAB Android APK registers `tabbeaglenavlab` as its URI scheme, while the shared source still used `AUTH_REDIRECT = 'tabbeagle://auth/callback'`. These are different targets, and exchanging a PKCE one-time code requires the same installed APK to retain the original `code_verifier`.

The standalone fix branch `codex/m1-nav7-magiclink-deeplink-fix` uses an APK-specific `EXPO_PUBLIC_AUTH_SCHEME` both for outgoing `emailRedirectTo` and callback parsing. It registers a distinct Android package `com.tabbeagle.user.authlinklab` and exact custom scheme `tabbeagleauthlab`. Independent tests cover wrong scheme rejection, PKCE, and optional in-app email OTP via `verifyOtp({ email, token, type:'email' })`. See [build run 37851418557](https://github.com/playershype/TabBeagle/actions/runs/37851418557). **Build and device login must PASS before closure.**

## Supabase TEST settings — owner action, not automated
Project: `gaileljkciseopfgwsbc`, and *only* that TEST project.

1. Visit [Authentication → URL Configuration](https://supabase.com/dashboard/project/gaileljkciseopfgwsbc/auth/url-configuration) and add **exact** allowed redirect `tabbeagleauthlab://auth/callback`. Keep existing URLs; don't introduce broad wildcards.
2. Inspect **Site URL**. If `google.com` or any unrelated host is configured, this could explain the observed fallback; do not claim it was proven without actual settings. Change only with an owner-approved TEST website URL. The login URL from the email may include one-time auth tokens; never disclose it.
3. Visit [Authentication → Email Templates](https://supabase.com/dashboard/project/gaileljkciseopfgwsbc/auth/templates) → **Magic Link**. The sign-in button must use `{{ .ConfirmationURL }}` (not bare `{{ .SiteURL }}`). For a backup code path add text like: `Your one-time code: {{ .Token }}` while preserving the legitimate ConfirmationURL. Do not write the actual issued code into logs.
4. Newest email only, initiate within **TabBeagle Auth Link Lab** and open on the same Samsung. Old one-time emails may be expired or bound to another APK's PKCE verifier.
5. If the email contains a numeric code, use the in-app **Email verification code** field instead of the Gmail link. This removes browser dependency.
6. Success requires signed-in **JJ SPA** dashboard, no black screen; re-open the app after Android **Force stop** to verify session persistence; validate no unintended invoice changes in read-only SQL.

## Safety
- No public signup: `shouldCreateUser:false` and prior Supabase TEST `disable_signup:true` remain enforced.
- Do not change `main`, the protected landing, production, existing Build5 or installed Navigation7 LAB.
- Do not create unauthorized accounts or ask users for raw JWTs/passwords; only test with existing authorized JJ SPA and PlayersHype identities.
- M1 two-authenticated-tenant HTTPS access-control gate [#6](https://github.com/playershype/TabBeagle/issues/6) remains OPEN until independently checked with real sessions.
- Official references: https://supabase.com/docs/guides/auth/redirect-urls and https://supabase.com/docs/guides/auth/auth-email-templates
