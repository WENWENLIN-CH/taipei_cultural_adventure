# Existing quest → Firebase field contract (2026-11-03)

Original `index.html` + `script.js` still runs as the existing localStorage-only quest. This milestone makes **no changes** to the original script or deployed GitHub Pages.

## Verified by inspection and executable contract test
- M1 星月偵查員: text `location`; photo `photo1`
- M2 異國文字解密: four `lang1_lang ... lang4_lang`; photos `lang1_photo ... lang4_photo`
- M3 Halal 大搜查: text `restaurant`; photos `photo1, photo2`
- M4 環遊世界美食家: each `c1,c2,c3` has `_continent,_country,_restaurant,_photo`
- M5 揭秘南洋商店: each `p1,p2,p3` has `_country,_name,_photo`
- Total: 13 mandatory photos per group; 3 groups: 39 final photos (before retakes).

`mission-form-adapter.js` converts the original form values into the server submission schema. `mission-cloud-flow.js` is a **not yet wired** network bridge for uploading local JPEG data URLs and invoking the callable backend. It does not manipulate progress or mark the mission complete.

## Run contract tests
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:form-contract
```
The test extracts the actual mission definitions directly from `script.js` and compares the field names to browser/server schemas. It verifies valid completed sample payloads and rejects missing photos or unchecked shooting safety acknowledgement.

## Important remaining gates
1. The original `script.js` currently marks `ms.completed = true` immediately on local validation; for cloud-mode preview, route this through a server submission and derive completion **only from** `watchGroupMissions`. Never trust localStorage for unlocking final task in cloud mode.
2. `mission-cloud-flow.js` uploads sequentially. If a later photo fails, earlier create-only uploads remain. Students need retry/recovery without corrupting group progress.
3. The original form's base64 photos in localStorage are not private cloud evidence; images need the returned Storage paths, uploaded by authenticated members.
4. M1's manually created `demo2026/group01/missions/1` test completion must be removed from the live test environment only after identifying it as mock data.
5. Confirm group data input and nickname: the original homepage asks for arbitrary team name and member names, whereas cloud mode must use invitation-derived group membership. Avoid collecting unnecessary real student names.
6. The old teacher password backup unlock exists in the original website; in cloud mode it must not grant a teacher's database privileges nor override server-derived completion.
7. Teacher dashboard is still limited to 4 user-requested items.
8. Never deploy Cloud Functions or release formal student UI until cloud preview is integrated and tested.
