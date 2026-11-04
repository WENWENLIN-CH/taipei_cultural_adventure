# pilot2026 第一關：獨立 Function codebase 部署前檢查（尚未部署）

更新：2026-11-04。使用者已驗收新活動私人邀請碼登入、學生 0/5 唯讀、教師切換活動 0/5；測試小組已存在，不可重新執行 seed --apply。

## 本次 GitHub 已新增
- `scripts/build-pilot2026-functions.mjs` 以 `functions/pilot2026-stage1-entry.js` 產生 **單一 Function 專用** `.firebase-pilot2026-functions/index.js`，同時複製經檢查的 `submission-handler.js`、`submission-core.js`、`pilot-scope.js`、`pilot2026-authorization.js`，以及部署需要的 Node 22 package.json。**建置不部署**，不包含既有 `submitGroupMission` 的入口。
- `firebase.pilot2026-functions.json` 指向 **新 codebase `pilot2026-stage1`**，不沿用既有 `pilot-submit`。
- `tests/pilot2026-functions-packaging.test.mjs` 驗證新包只匯出 `submitPilot2026Stage1`，而舊版 callable / 學生提交開關保持不動。
- `docs/storage-pilot2026-stage1-candidate.rules` 收緊為只有 **既有 demo2026** 或 **pilot2026/group01/mission1** 可以建立照片。其他新活動均禁止任意上傳。正式線上 Storage 規則**尚未修改**。
- `tests/pilot2026-storage-stage1.test.mjs` 增加「未知活動也不能上傳」的回歸測試。

## 下一輪 Cloud Shell（只執行安全測試，不執行 deploy）

```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:pilot2026-functions-packaging
npm run test:pilot2026-storage-stage1
npm run test:pilot2026-live-preflight
npm run test:pilot2026-integration
npm run test:pilot-nondeployment
```

請留意這是**新增加、尚待執行的測試**。有 FAIL 不要繼續。

## 進一步正式部署前的必要流程

1. 確認 `pilot2026/group01` 一次性邀請碼已由測試身分使用，且學生仍可正常登入；**不要再產生新邀請碼或改動 demo2026**。
2. 確認線上 Storage 現行 rules 與本次候選規則的差異；Storage rules 是整個 bucket 的全域安全控制，不能以為僅更新 pilot 路徑，不影響其他學生。應先再跑原有 demo Storage regression。
3. 另行核對 Firestore rules：學生只能讀取自己的小組、任務成果須由 Callable 寫入、教師仍可唯讀選活動。
4. 下一次要部署新 codebase 時，**單獨**使用 `firebase.pilot2026-functions.json`，不要使用舊 `firebase.functions-pilot.json`，更不要直接部署 `functions/index.js` 的所有函式。
5. **學生頁 `SUBMISSIONS_ENABLED=false` 不可提前解除**。只有新 Callable 與 Storage rules 都實際驗證通過之後，才另行產生「第一組第一關啟用」的獨立學生頁；其他關維持關閉。
6. 所有新的線上測試仍只使用非個資 JPEG 及第一關一張照片；正式提交只能有一筆且不可覆寫。教師後台應驗證 1/5 和實際照片。
7. `pilot2026` 第一關完成後，若要重新測試，需要使用全新授權活動或教師設計的補交流程，不可為了測試而刪除既有成果。

**明確不執行**：刪除 S02/S03、重建 pilot2026/group01、修改 main/穩定版、執行 Firebase Hosting live 部署。正式 Function／Storage 線上部署是下一階段、需要逐項檢查後的操作。

