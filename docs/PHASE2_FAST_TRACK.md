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

## Three-group real event setup (2026-11-05)
- Provisional real activity ID: `taipei2026` (must confirm BEFORE creating any live data).
- Groups: `group01`, `group02`, `group03`; no assumption that a group contains only two students.
- `phase2-event-config.js` contains the ID and groups, but keeps `enabled:false` until live rules, backend and data are verified.
- `teacher-dashboard.html` / `teacher-dashboard.js` allow an authorized teacher to select `taipei2026`. This doesn't grant data access.
- `functions/scripts/create-phase2-three-groups.mjs` prepares one invitation per actual student with unique 48-character one-time codes; the default is dry-run. No secrets are stored in Git.
- The first live creation is intentionally **not** executed. The provisioning command aborts if any of the three group documents already exists; do not blindly retry. Invites are saved in `.phase2-private-invites.txt` (ignored by Git; local owner-only permissions) only on the explicit guarded apply path.
- The isolated Cloud Function requires server-side `PHASE2_ACTIVITY_ID` and `PHASE2_GROUP_IDS`; it stays disabled without those settings, and is not deployed.

### Run this first (NO cloud writes, NO deploy)
```bash
cd ~/taipei_cultural_adventure
git pull --ff-only origin feature/firebase-sync
node --test tests/phase2-three-groups-provision.test.mjs
node --test tests/phase2-fast-track-smoke.test.mjs
# Replace these sample student numbers with actual per-group counts:
node functions/scripts/create-phase2-three-groups.mjs --group01=5 --group02=5 --group03=5
```

### Do not run the live apply command yet
Before creating live records, confirm the final event ID, actual per-group student counts, Console's CURRENT Firestore/Storage rules, anonymous Auth, and the Cloud Functions deployment/configuration. In particular, live Storage rules must grant only authorized group members access to their own activity's photo slots, deny overrides and cross-group reads, and enforce revoked members. The existing Firestore draft is not proof that those rules are live. Do not run `firebase deploy` as a blanket command.

After the dry run, provision the actual event only with explicit permission, a reviewed create-only transaction, and a private list of invitation codes. Then enable the frontend only after an actual two-phone, two-group test and teacher dashboard verification.
