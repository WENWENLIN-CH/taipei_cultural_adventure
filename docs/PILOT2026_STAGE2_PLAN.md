# 台北島 pilot2026 第二關開發候選版

## 已完成的實機驗收
- 第一關 `pilot2026/group01/mission1` 已完成 1／5 並可於教師後台看到照片。
- TEST02 用手機掃 QR Code、加入 group01、同步 1／5、重新整理與關閉重開自動恢復都成功。

## 第二關資料格式
- 任務：異國文字解密，`missionId:2`
- 答案：`lang1_lang`、`lang2_lang`、`lang3_lang`、`lang4_lang`，需為四種不同語言。
- 照片：`lang1_photo`、`lang2_photo`、`lang3_photo`、`lang4_photo`，每張獨立上傳 JPEG 且不超過 1 MiB。
- 保持每組任務只能提交一次，真正完成狀態必須來自 Firestore。
- 繼續限制活動 `pilot2026`、組別 `group01`、關卡 `2`。
- 本階段不重新提交第一關、不清理任何 TEST01/TEST02 成員或共用任務資料。

## 安全分段
1. 新增 `pilot2026-stage2-submission.js`、`functions/pilot2026-stage2-authorization.js` 和獨立後端候選入口。**尚未引用到已部署的 Functions index**。
2. 先執行候選規則、驗證、整合測試；第二關提交按鈕**不應透過既有第一關頁面開放**。
3. 另行審核 Storage 規則中僅增加 pilot2026/group01/mission2 的四個 photo slots；保留 demo2026 與第一關的既有授權。
4. 第二關 callable 與 Storage 規則均通過模擬測試後，才產生獨立 Stage2 Hosting 預覽頁與明確的部署說明。
5. 用非學生個資照片實測；第二關成功後才繼續關卡 3、4、5。

## 本次交付
僅程式碼候選、權限限制、單元測試和規劃文件，不會新增雲端資源、發布網站或修改第一關成果。


## Stage2 真實提交候選頁（建置完成，尚未發布）
- 新增 `scripts/build-pilot2026-stage2-live-preview.mjs`，從第二關唯讀版產生獨立 `pilot2026-stage2-live-quest.html`。
- 第二關候選頁獨立使用 `pilot2026-stage2-live-bootstrap.js`、`pilot2026-stage2-live-quest.js` 與 `pilot2026-stage2-submission.js`，只允許 `pilot2026/group01/mission2`，且確認五關快照同步後才開放按鈕。
- 現有 `pilot2026-stage2-review.html` 仍停用提交；原 QR、第一關頁、教師頁、GitHub Pages `main` 不變。
- 此候選版即使在 Hosting 上發布，**在 Stage2 Callable Function 與 Storage live rules 上線前也不能提交成功**。務必按順序完成以下安全檢查。

### 第一步：只在 Cloud Shell 本機建置和測試，不部署
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:pilot2026-stage2-live-preview
npm run test:pilot2026-stage2-review-preview
npm run test:pilot2026-stage2-emulator
npm run test:pilot2026-storage-stage2
npm run test:combined-five-preview
```
測試任一項失敗，停止。不得直接使用 `firebase deploy` 更新所有資源。

### 第二步：正式發布前的個別審核
1. 確認線上 Storage 規則與候選規則的差異**只有**新增 group01 mission2 四張 JPEG 的 create 權限；保留原有所有拒絕條件、原 demo2026 與 Stage1 權限。
2. 確認獨立 Functions 部署程式碼只匯出 `submitPilot2026Stage2`，不覆寫現有 `submitPilot2026Stage1` 或 `submitGroupMission`。使用獨立 codebase 和 `--only functions:<codebase>` 限定部署。
3. Functions、Storage 都經明確審核通過且已部署後，才更新既有 `auth-test` Hosting 預覽頻道，且只給 TEST02 測試。
4. **只用非個資的四張測試照片**。提交一次後查看 Firestore 小組進度從 1／5 到 2／5，教師後台確認四種語言和四張照片。不得刪除重置關卡來重試。
5. 不要在任何文件、GitHub 或對話中張貼學生 QR 的私人邀請碼。
