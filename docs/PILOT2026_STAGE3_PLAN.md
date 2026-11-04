# 台北島第三關｜Halal 大搜查｜開發與驗收規劃

## 現況（2026-11）
- pilot2026/group01 已有兩筆真正完成的共同成果：mission1（TEST01）和 mission2（TEST02），總進度 2／5。
- TEST01/TEST02 的匿名身份、手機 QR 加入與恢復、教師後台都已驗收。
- 本次僅建立 Stage3 候選程式及模擬測試；**不修改**已部署 Functions、Storage Rules、Hosting、Firestore 或學生進度。

## 沿用原任務，不改內容
- 關卡 3：Halal大搜查
- 文字：`restaurant`（餐廳名稱）
- 圖片：`photo1`（餐廳招牌）、`photo2`（Halal／清真認證標示）
- 每張 JPEG 不超過 1 MiB；務必使用非個資測試照片。
- 注意：素食、沒有豬肉或販售中東料理，不等於具有清真認證。學生需辨識實際標示；圖片是否具備可信認證由老師人工判讀，程式只能檢查檔案及權限。

## 隔離與授權
- Stage3 callable 候選：`submitPilot2026Stage3`，僅 `pilot2026/group01/mission3`。
- 第三關獨立 Functions codebase 為 `pilot2026-stage3`；不覆蓋 Stage1/Stage2/legacy callable。
- 第三關 Storage 規則候選只在 Stage2 已核准條件上加入 mission3 的 `photo1.jpg` 和 `photo2.jpg`，其餘組別與 mission4/5 仍鎖定。
- `pilot2026-stage3-review.html` 是**唯讀的手機表單預覽**，透過現有 Firestore 同步組別進度，但不會上傳照片或建立關卡成果。
- 同組任務只允許建立一筆 completed 成果；先前兩關紀錄不可覆寫。
- 應避免對學生端重設身份或刪除 Storage 上傳物件。

## 第一階段：只跑本機測試（安全）
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:pilot2026-stage3-candidate
npm run test:pilot2026-storage-stage3
npm run test:pilot2026-stage3-emulator
npm run test:combined-five-preview
```
各套件測試通過後，再評估第三關專用 LIVE 預覽頁及正式 Function、Storage 規則發布。不要跳過這些步驟。

## 後續階段（目前還不能做）
1. 教師先在原有手機使用同一個 TEST02 瀏覽器確認 Stage3 唯讀表單有餐廳名稱及兩張照片欄位，原雲端進度為 2／5。
2. 另行審核**實際線上** Storage Rules，確保修改僅限新增 mission3；不可拿開發版 `storage.rules` 直接覆蓋。
3. 發布獨立 codebase Stage3 callable、僅限測試通道的 Stage3 LIVE 頁，再用非個資圖片提交一次。
4. 教師後台檢查從 2／5 變 3／5、餐廳名稱與兩張照片完整、第一二關仍可讀。
5. 不把臨時學生 QR token、UID 或私人學生資料公開張貼。

## 目前交付的候選檔案
- `functions/pilot2026-stage3-authorization.js`
- `functions/pilot2026-stage3-entry.js`
- `pilot2026-stage3-submission.js`
- `docs/storage-pilot2026-stage3-candidate.rules`
- `firebase.pilot2026-stage3-emulator.json`
- `firebase.pilot2026-stage3-functions.json`
- `scripts/build-pilot2026-stage3-functions.mjs`
- `scripts/build-pilot2026-stage3-review-preview.mjs`
- `tests/pilot2026-stage3-candidate.test.mjs`
- `tests/pilot2026-storage-stage3.test.mjs`
- `functions/test/pilot2026-stage3-emulator.test.mjs`

## 第二階段：第三關真實提交候選（尚未部署）
- 手機唯讀介面 4／4 成功：TEST02 同瀏覽器恢復 group01、顯示 2／5，餐廳名稱和兩張照片輸入正常，提交仍關閉。
- 第三關伺服器模擬測試已由教師確認通過 6／6；照片 Storage 權限模擬測試需在發布前再次確認。
- 新增 `scripts/build-pilot2026-stage3-live-preview.mjs`：以已驗收的 Stage3 表單與 Stage2 成功的按鈕同步設計，建立僅 `pilot2026/group01/mission3` 可提交的獨立候選頁 `pilot2026-stage3-live-quest.html`。
- 保留 Stage3 唯讀 `pilot2026-stage3-review.html`；不修改 Stage1/2、QR、教師後台、原始網站或 Firestore 成果。
- 同時新增部署前的獨立 `pilot2026-stage3` Functions 封裝與 Storage 單一新增權限比對測試，**只是候選，不表示已部署**。

### 在 Cloud Shell 僅建置及測試，不部署
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:pilot2026-stage3-live-preview
npm run test:pilot2026-stage3-release-preflight
npm run test:combined-five-preview
```
前兩項預期各 5 與 4 個測試、零失敗；若有失敗先停止，不得部署。

### 開放真實提交前的必要條件
1. Firebase Console 核對**線上啟用**的 Storage Rules，確認與第二關規則一致，且僅增加 `pilot2026/group01/mission3` 的 `photo1.jpg`、`photo2.jpg` 上傳權限；保留第一二關與 demo 的授權、覆寫/刪除限制。
2. 單獨部署 `pilot2026-stage3` Functions codebase，不能覆蓋 `pilot2026-stage1`、`pilot2026-stage2` 或原有 `pilot-submit`。部署前需獨立安裝套件並審查 Functions 清單，任何移除其他函式的提示都應中止。
3. Cloud Function 和 Storage 規則確認已上線後，才可以把 Stage3 live candidate 發布到 `auth-test` 預覽頻道，使用 TEST02 同一瀏覽器進行**一次**非個資照片提交。
4. 確認 Firestore 2／5→3／5，教師後台可看見餐廳名稱與兩張 JPEG；先前兩關仍完整，第四五關繼續未完成。
