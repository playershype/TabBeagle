# TabBeagle — first persistent Android flow

Implementation branch: `codex/android-first-persistent-flow`, based on the founder-selected Android baseline `c58f94bf380711eee4f350890d276ad00e732079`.

- `mobile/`: extracted and versioned Expo/React Native Android client.
- `backend/`: new Next.js API and Supabase migration for organization → customer → invoice → AR case → audit.
- `docs/development/MILESTONE-1.md`: changes, acceptance evidence and remaining gates.
- `docs/development/TEST-ENVIRONMENT.md`: exact isolated-environment setup and phone acceptance test.

Historical source ZIPs remain as provenance. Development and workflows now use the unpacked source. `main` and `website-launch` are not modified by this branch.

This milestone implements invoice entry and persistence. Governed outbound email, agent execution, promises/disputes and verified payments remain later milestones. Their unprotected legacy buttons are not exposed in this build. The locked product contract and PD-001 remain authoritative.
