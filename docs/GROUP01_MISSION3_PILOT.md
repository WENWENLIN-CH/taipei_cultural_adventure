# Controlled student submission pilot: group01 / mission 3

## Scope
- Production callable will reject all activity/group/mission combinations except `demo2026/group01/3`.
- Cloud island preview keeps `SUBMISSIONS_ENABLED=false` so no browser can submit yet.
- Stage 1 is preparing the pilot; do **not** deploy Cloud Functions or enable the button until the existing checks have been rerun and a deployment/billing review is completed.
- Mission 1 was manually marked complete; mission 2 already contains a legacy uploaded S02 image without SHA-256 metadata. Do not overwrite or automatically delete either.
- For pilot use M3 (Halal 大搜查): `restaurant` text + `photo1`, `photo2`. Upload two genuine non-sensitive test photos only at the authorized stage.

## Next testing commands
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:cloud-preview
npm run test:callable-emulator
```

Expected: original `index.html` unchanged; preview submit gate disabled; callable tests still cover the simulated end-to-end path. No live Firebase data changes.

## Gates before actual upload/submit
1. Review GCP billing budget/alerts and function deployment billing. Blaze is active, but a budget does NOT cap spending.
2. Ensure Firestore rules still prohibit student direct mission writes.
3. Deploy and verify the callable (not yet done) using an isolated, explicit deploy config.
4. Run targeted unauthorized call against callable (other group, other mission, unauthenticated), and confirm authorization cannot be bypassed.
5. Only then enable the cloud preview pilot button and host it in an isolated preview channel.
6. Confirm S02 mission 3 submission writes `submittedByUid`, `submittedByCode`, `submittedAt`, `answers`, `photoPaths`; S01 shared progress reflects completion.
7. Remove confirmed mock data separately before a real activity. Do not erase actual results or old Storage files without auditing.

## Caveats
- One-member-one-slot images remain immutable; retake/cross-device recovery and truly strict 13-photos-per-group limits remain to be finished before student rollout.
- Cloud Function implementation currently validates only a small JPEG file signature and metadata, not full decoding.
- This staging change is not teacher dashboard delivery.
