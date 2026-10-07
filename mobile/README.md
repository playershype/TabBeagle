# TabBeagle Android client

Source extracted without changes from `tabbeagle-mobile.zip` at Android commit `c58f94b`, then developed in this branch. GitHub `mobile/` is the working source; the ZIP is historical.

Node 22. Install with `npm ci`, verify with `npm test` and `npm run typecheck`, export with `npm run bundle:android`.

For a configured build, supply the three public variables in `.env.example` before bundling; see `../docs/development/TEST-ENVIRONMENT.md`. `npm run check:env` rejects missing settings and private keys. A build without settings displays a setup-needed screen; it does not fabricate a session or save demo data.

`index.js` calls `registerRootComponent(App)`. Native generation resolves that entry automatically. The configured APK workflow builds the release variant with the Expo-generated **test/debug signing key**, and embeds JS through the native build. This is a test artifact, not a production signing/distribution setup. Package: `com.tabbeagle.user.preview`; version 1.1.0 / code 3. Preserve any installed data before changing certificate; do not uninstall as an automatic fix.

Brand image is copied byte-for-byte from `website-launch` commit `70cd616`, `docs/assets/file_00000000a82881f6978d6886de2de7df.png`. It replaces the one-pixel icon/splash placeholders. No new brand design is introduced.

Sessions use AsyncStorage as in the baseline, with PKCE/S256 and foreground refresh. Production device-storage review remains required. The mobile SDK remains Expo 51/RN 0.74.5; dependency modernization and native-device acceptance are release gates.
