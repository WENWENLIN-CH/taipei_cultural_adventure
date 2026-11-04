# pilot2026｜真實雲端提交整合第一階段（**僅 GitHub 開發版，未部署**）

日期：2026-11-04。使用者已完成五關本機手機操作 5/5，已有 49/49 隔離三組五關資料模擬器測試與 5/5 正式隔離檢查。這次開始前端與後端的分階段整合，**沒有啟用線上提交**。

## 已建立的三大部分

### 1. 學生：獨立 pilot2026 雲端預備頁
- `pilot2026-cloud-bootstrap.js` 是獨立 Firebase Authentication、Firestore 五關同步及受控提交流程的入口；限定 `pilot2026` 及三個 group IDs。
- `scripts/build-pilot2026-cloud-preview.mjs` 建立 `.firebase-preview/pilot2026-cloud-quest.html`、`pilot2026-cloud-quest.js`、`pilot2026-cloud-bootstrap.js`。
- 五關繼承原本台北島 UI 與必填驗證，擁有獨立 `taipeiCulturalQuestPilot2026CloudV1` 草稿 key。
- `SUBMISSIONS_ENABLED=false` **必須保留**。目前雖已接上提交函式的程式路徑，但呼叫前的功能開關仍然關閉；**不會上傳照片到 Firebase**。
- 新頁面預先檢查邀請碼所屬活動才領取，避免誤消耗 `demo2026` 邀請碼；如同一匿名登入已有其他活動的小組快取，也拒絕直接加入。
- 真正進度僅來自 `pilot2026` 的 Firestore 五份任務文件，維持 5/5 才解鎖最後謎題。現階段尚無真實 `pilot2026` 組別與邀請碼。

### 2. 伺服器：候選、未啟用的受控白名單
- `functions/pilot2026-authorization.js` 兩階段白名單：
  - `PILOT2026_STAGE1`：僅 `pilot2026/group01/mission1`。
  - `PILOT2026_FIVE_QUESTS`：未來才考慮開放的三組五關。
- `functions/test/pilot2026-authorization.test.mjs` 驗證階段邊界與正式白名單未變。
- `functions/test/pilot2026-stage1-emulator.test.mjs` 透過先前的 `createSubmissionHandler({emulatorPilotScope:PILOT2026_STAGE1})` 在**固定 demo 專案 ID** 的 Firestore / Storage 模擬器執行一關完整照片提交與拒絕覆寫。
- `functions/index.js` **完全沒有引用新白名單**；線上仍僅允許 `demo2026/group01/mission3`。本階段新增的是「可驗證的候選授權」，**不是可直接部署的 pilot2026 正式 Function**。正式啟用需要額外代碼審核和部署授權。

### 3. 教師：讀取活動切換
- `teacher-dashboard.html` 新增 `activitySelector`，固定只有 `demo2026`、`pilot2026`。
- `teacher-dashboard.js` 根據選擇讀取不同活動的 Groups/Missions，仍須教師帳號及 Firestore `teacherAccess/{uid}.authorized` 核准。
- 切換時清理舊照片 URL、丟棄過期查詢結果，不可寫入或刪除成果；目前 `pilot2026` 若無活動資料應顯示「沒有小組資料」。
- 現有 `demo2026` 教師照片讀取仍保留 JPEG 位元組驗證。

## 安全建置與測試（**不部署**）

```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:pilot2026-integration
npm run test:pilot2026-authorization
npm run test:pilot2026-stage1-emulator
npm run test:teacher-preview
npm run test:pilot-nondeployment
npm run test:combined-five-preview
```

重要：上述測試為**本次新增程式的待執行驗證**，不能因 GitHub 成功寫入就宣稱已通過。遇到任何 FAIL 應停止並先修正；不執行 `firebase hosting:channel:deploy` 或 `firebase deploy`。

## 下一階段真實雲端啟用前的檢查
1. 由教師核准獨立、非個資的測試小組／一次性加入碼，且不要把邀請碼放進 GitHub。
2. 正式 Function 以**伺服器**單獨審核的受控白名單開始，第一輪先開 `pilot2026/group01/mission1`，確認測試通過後才擴充；不能依賴前端的 `SUBMISSIONS_ENABLED` 防護當作權限。
3. 對 `pilot2026` 進行 Firestore／Storage 安全規則的三組隔離與真實部署前審查。
4. 將提交頁與教師後台保留在 Firebase Hosting **非正式預覽頻道**，確認部署組合不會移除舊版 `pilot-quest.html`、`teacher-dashboard.html` 與 `five-quest.html`。
5. 先用獨立 Chrome 設定檔／測試手機登入，不破壞目前 S02/S03 的匿名 UID 或本機組別快取。
6. 使用非學生影像的測試照片，留意 Storage 單張 1 MiB 上限、費用、離線重試、照片補拍（仍待開發）及最後 5/5 解鎖。
7. 需確認教師後台切換活動後新舊兩組照片都可顯示，並確定 CORS 已允許實際使用的測試來源。

## 不可做的事情
- 不要直接把 `pilot2026-cloud-bootstrap.js` 的 `SUBMISSIONS_ENABLED=false` 改成 true。
- 不要在本階段更動 `functions/index.js` 正式提交門檻、合併到 `main`、部署 Hosting／Functions／Rules，或修改 `demo2026` 與 S02/S03 資料。
- 教師換手機管理已依教學情境暫緩，下一步仍以五關提交與補拍為主。
