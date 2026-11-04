# pilot2026｜第一組第一關：真實雲端試辦準備／部署前檢查

日期：2026-11-04。本次只提交 GitHub 開發分支，**沒有執行真實 Firestore 寫入、邀請碼建立、Cloud Functions／Hosting／Rules 部署**。

## 本次新增與隔離

1. `functions/scripts/prepare-pilot2026-stage1.mjs`：預設 **DRY_RUN_NO_WRITES**，顯示 `pilot2026/group01` 與一次性邀請碼的預計建立位置，不產生實際邀請碼、不呼叫 Firebase Admin。
   - 受控建立模式留給下一階段個別審核，**本次不可執行** `--apply`。真正啟用需要指定 project、環境確認與安全審查。
   - 實際建立時（未執行）預計只新建群組文件和一份 48 位不可預測邀請碼；如果已存在，交易拒絕覆寫。代碼只出現在操作人員私人終端，不得貼到 GitHub／公開對話。
   - 尚未建立 `pilot2026` 的任何真實雲端資料，教師活動切換後未必看到小組。
2. `functions/pilot2026-stage1-entry.js`：**獨立候選 Callable** `submitPilot2026Stage1`，使用 `PILOT2026_STAGE1` 白名單；它**沒有從 `functions/index.js` 匯出，因此不會在既有部署時自動啟用**。正式部署前需要另外審查新 Function 的部署方式、權限、API 和費用。
3. `functions/submission-handler.js`：新增**必須明確注入**的 `approvedLiveScope`，並核對 Firebase 專案與非 Emulator 條件；原 `functions/index.js` 不傳入新參數，因此原 `demo2026/group01/mission3` 的白名單不變。
4. `pilot2026-stage1-submission.js`：獨立學生 Callable 客戶端，只對 `pilot2026/group01/mission1` 建構資料，不會誤呼叫既有的 `submitGroupMission`。
5. `mission-cloud-flow.js`：保留既有預設 Callable，同時讓新試辦頁能注入專屬的 Callable；舊頁不用改。
6. `pilot2026-cloud-bootstrap.js`：已預備接上專屬 Callable，但 **`SUBMISSIONS_ENABLED=false` 不變**，只在 group01／mission1 才可能進行下一輪核准後的測試。
7. `docs/storage-pilot2026-stage1-candidate.rules`：未部署的 Storage 候選規則。保留現有 demo 使用方式，新增 pilot2026 **只有 group01 的任務1可建立照片** 的限制。線上 `storage.rules` 沒有修改。
8. `firebase.pilot2026-stage1-emulator.json` 與 `tests/pilot2026-storage-stage1.test.mjs`：測試 Storage 隔離與舊第三關回歸。
9. `tests/pilot2026-live-preflight.test.mjs` 及 `functions/test/pilot2026-seed-plan.test.mjs`：確認未意外啟用新 Callable、學生頁保持禁用，以及群組準備工具預設不寫入。

## 建議 Cloud Shell 安全驗證順序

```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run pilot2026:dry-run
npm run test:pilot2026-seed-plan
npm run test:pilot2026-live-preflight
npm run test:pilot2026-storage-stage1
npm run test:pilot2026-integration
npm run test:pilot2026-stage1-emulator
npm run test:pilot-nondeployment
```

所有指令僅顯示規劃、執行靜態檢查或 Firebase Emulators。**沒有任何 Cloud Shell 線上部署或 Firestore 建立指令**。遇到 FAIL 不要改用真實專案測試。

## 尚未完成的真實試辦工作

- 使用經審核的教師／管理者身分安全建立 pilot2026 第一組與私密邀請碼，確認寫入位置、費用與讀取權限。
- 檢查 Firestore 和 Storage 線上的規則與候選規則差異，模擬器測試再部署；這是全專案安全規則變更，不能只部署局部。
- 建立可安全部署的獨立 Function 匯出／codebase 程序。**候選 Callable 目前不在已部署入口，無法被真正的瀏覽器呼叫**。
- 先部署唯讀學生頁及活動切換的教師後台到測試 Hosting，並用獨立 Chrome 設定檔驗證。
- 確定候選 API、規則、加入碼與教師驗收都通過，**另經使用者明確核准**才開放第一關真實提交。
- 確認 CORS 允許實際的 Hosting 試辦來源；避免使用 `* `。
- 第一次真實提交僅測試一張不含個資 JPEG，驗證 Storage 一份物件、Firestore 一份完成紀錄、教師可看、學生進度 1/5；其他關仍保持關閉。
- 測試後不要直接刪除原 `demo2026`、S02/S03、教師權限或舊照片。

## 安全底線
- 本次**沒有實際邀請碼**，也沒有成功的真實雲端 pilot2026 提交紀錄。
- GitHub 稳定快照與 `main` 均保持不動，正式 `auth-test` 及 live channel 不部署。
- 不要將邀請碼、Firebase 學生照片或登入 token 上傳到公開 GitHub。
- 維持教師換手機管理為低優先，先完成學生五關提交及必要補拍。
