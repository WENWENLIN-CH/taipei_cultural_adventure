# Phase 2 — two-hour field activity fast track

This candidate is **not deployed**. Work only on `feature/firebase-sync`.

## Already done
- Multi-group submission core and sequential transaction check: emulator tests passed (user reported 9/9 integrated, 6/6 submission, 4/4 preflight).
- Existing `pilot2026` callables and `functions/index.js` remain untouched.

## New independent Phase 2 backend candidate
- `functions/phase2-live-entry.js` exports only `submitPhase2Mission`.
- Explicit server-side `PHASE2_ACTIVITY_ID` and comma-separated `PHASE2_GROUP_IDS` required; disabled if missing.
- Rejects `demo2026`, `pilot2026`, and `phase2sandbox` as live activity IDs.
- Reuses verified JPEG and membership checks; previous mission is checked inside the Firestore transaction.
- `firebase.phase2-live-functions.json` defines a separate Functions codebase; builder does not deploy.

## Safe Cloud Shell check (no deploy)
```bash
git pull origin feature/firebase-sync
node scripts/build-phase2-live-functions.mjs
npm run test:phase2-integrated
npm run test:phase2-three-groups-submission
npm run test:pilot2026-stage45-release-preflight
```

## Required before any release
1. Pick the real event ID and exact group list, and define secured server environment for these values.
2. Review the live Firestore/Storage rules in Firebase Console, provision group/invitation records with create-only semantics, and check teacher authorizations.
3. Add real callable-invocation emulator tests and verify student mobile front end, snapshots, photo upload, 5/5 unlock, teacher dashboard activity selection and four requested fields.
4. Perform negative security tests (other group, revoked student, unauthenticated, duplicate, ordered progression) and two-device manual check.
5. Deploy individually reviewed Functions and rules, not `firebase deploy` without `--only`; preserve pilot2026.

This document is a checkpoint, **not** a claim that the activity website is ready.
