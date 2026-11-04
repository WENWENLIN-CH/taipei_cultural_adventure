# 台北島 pilot2026：第四、五關整合開發與驗收

## 已驗收的線上狀態
- `pilot2026/group01`：第一、二、三關已從學生手機成功提交，教師後台也完成全部驗收；**目前為 3／5**。
- TEST01／TEST02 同組匿名身分、既有 QR Code、教師後台、第一到第三關成果及照片皆不可重設或覆寫。
- 原本 GitHub Pages `main`、教師密碼備援、圓山／酒泉街謎題不修改。

## 第四關：🌍 環遊世界美食家
- 選取亞洲、歐洲、非洲、美洲、大洋洲其中**三個不同洲**。
- 每一間輸入洲別、國家及餐廳名稱：`c1_continent`／`c1_country`／`c1_restaurant`（類推 c2、c3），9 個文字欄位。
- 對應三張 JPEG：`c1_photo`、`c2_photo`、`c3_photo`，各 ≤1MiB。

## 第五關：🍬 揭秘南洋商店
- 在東南亞商店或異國食品店找出**三個不同國家**的零食或商品。
- 每項輸入國家與商品名稱：`p1_country`／`p1_name`（類推 p2、p3），6 個文字欄位。
- 對應三張 JPEG：`p1_photo`、`p2_photo`、`p3_photo`，各 ≤1MiB。
- 系統會檢查三個國家名稱不重複；商品是否真實產自該國由老師核對。

## 兩關一起開發，提交授權分離
- 第四關專用 `submitPilot2026Stage4`，僅 `pilot2026/group01/mission4`。
- 第五關專用 `submitPilot2026Stage5`，僅 `pilot2026/group01/mission5`。
- 各自獨立的 Functions codebase、Server authorization、Storage 規則候選，避免影響 Stage1–3。
- `pilot2026-stage4-review.html` 與 `pilot2026-stage5-review.html` 可同源預覽，但**均保持唯讀，不呼叫 Stage4/5 Callable**；LocalStorage 草稿完全分離。
- Firebase 完成印章只認 Firestore 已完成狀態；**4／5 最終圓山／酒泉街謎題仍鎖定，5／5 才解鎖**。
- **目前所有本輪改動僅在 `feature/firebase-sync` GitHub 分支，沒有部署 Firebase，線上仍為 3／5。**

## 第一批：只在 Cloud Shell 本機執行
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:pilot2026-stage45-candidates
```
這支指令會先後執行：Stage4 資料／介面測試、Stage5 資料／介面測試、兩關獨立部署封裝及 Storage 差異檢查、最終謎題 3／5・4／5・5／5 邏輯檢查，以及全部預覽整合建置。

## 第二批：兩關 Storage 與伺服器模擬器測試
```bash
npm run test:pilot2026-storage-stage4
npm run test:pilot2026-storage-stage5
npm run test:pilot2026-stage4-emulator
npm run test:pilot2026-stage5-emulator
```
模擬器專案使用 `demo-` 開頭，不會寫入已部署的台北島資料。

## 第三批：同一次手機唯讀驗收（需先讓測試全通過）
- 僅重新部署既有 `auth-test` Hosting **預覽**，不能用無範圍的 `firebase deploy`。
- TEST02 保持原手機同瀏覽器與原匿名身分；打開 `pilot2026-stage4-review.html`、`pilot2026-stage5-review.html`，預期共同進度仍 3／5。
- 第四關測試三組洲別／國家／餐廳與照片；第五關測試三組不同國家／商品名稱與照片。
- 兩個預覽的提交按鈕都必須鎖定；前三關、教師端照片、QR 不受影響。

## 第四批：正式提交的未來審核（**目前不進行**）
1. 只有在兩關候選與手機唯讀驗收成功後，才分別建置真實提交候選頁；不得提前啟用。
2. 核對 Firebase Console **實際已發布** Storage Rules 與 Stage3 相同，再僅加入 Stage4 的 `c[1-3]_photo.jpg` 與 Stage5 的 `p[1-3]_photo.jpg` 權限，其他活動及組別禁止擴權。勿直接發布開發用途的 `storage.rules`。
3. 獨立部署 `pilot2026-stage4`、`pilot2026-stage5` codebase，部署前需安全檢查及安裝 runtime dependencies，不能覆蓋前三關 Function。
4. 只在 `auth-test` 預覽頻道依序提交第四、五關各一次，非個資照片，依序檢查 3／5→4／5（終極謎題鎖定）→5／5（解鎖）。
5. 教師後台檢查第四關九個文字欄位與三張照片、第五關六個文字欄位與三張照片；前三關依然完整且禁止重複提交。

## 重要安全事項
- 預覽頁不等於成功提交；真正進度以 Firestore 小組五關紀錄為準。
- 不要將實際學生加入碼、身分憑證、學生照片貼入公開 GitHub。
- 候選規則的文件開頭 `NOT DEPLOYED` 是 GitHub 候選檔案的狀態，不代表線上規則未部署其他已通過的 Stage1–3。

## 第四、五關真實提交候選頁（已建立，但未部署）
2026-11-05：使用者確認兩關唯讀手機驗收 5／5 成功：TEST02/group01 持續顯示 3／5、第四關三組餐廳與三張照片可操作、第五關三組商品與三張照片可操作、兩個預覽提交按鈕仍鎖定、前三關及終極謎題均不變。

- 新增 `scripts/build-pilot2026-stage45-live-preview.mjs`，從已通過的 Stage4/5 唯讀頁與已實測的 Stage3 live 按鈕/Firestore 機制產生：
  - `pilot2026-stage4-live-quest.html`、對應 JS/bootstrap、`pilot2026-stage4-submission.js`
  - `pilot2026-stage5-live-quest.html`、對應 JS/bootstrap、`pilot2026-stage5-submission.js`
- 各頁本機草稿獨立；僅可提交 `pilot2026/group01` 自己的關卡；第四關須先確認第三關已完成，第五關須先確認第四關已完成；全程等候五關 Firestore 快照就緒並在快照更新後刷新提交按鈕。
- 前三關來源與已發布的 Function、QR、教師後台、Firestore、Storage、終極謎題**均未修改**。
- 新增 `tests/pilot2026-stage45-live-preview.test.mjs`。
- **注意：候選建置中的 SUBMISSIONS_ENABLED=true 是供未來審核後發布的專用頁使用；目前線上 auth-test 尚未更新這些檔案，且 Stage4、Stage5 Functions/Storage 仍未部署。禁止直接跳過後端安全審核發布這兩個 live 頁。**

### 下一步：僅在 Cloud Shell 本機執行，不部署
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:pilot2026-stage45-live-preview
npm run test:pilot2026-stage45-release-preflight
npm run test:pilot2026-stage45-final-gate
npm run test:combined-five-preview
```
預期 Node live preview 測試為 4 項零失敗；確認所有測試無誤後再討論 Storage 已發布規則的精確增量與獨立 Functions 部署。若測試有任何失敗，立即停止，不部署。

### 本階段未進行
- Firebase Storage 線上規則發布
- `pilot2026-stage4`、`pilot2026-stage5` Functions 部署
- auth-test Hosting 重新發布
- 第四、五關任何正式照片提交

## 部署前強化：第五關伺服器順序檢查
- 網頁端已限制第四關完成後，才可點擊第五關；另外新增 `functions/pilot2026-stage5-prerequisite.js`，由 Stage5 Callable **在伺服器直接讀取 Firestore 的 `activities/pilot2026/groups/group01/missions/4`**，確認文件存在且 `status==="completed"`，否則回傳 `failed-precondition`。
- Stage5 Callable 先核實專案／活動／小組／關卡與匿名登入，再檢查第四關，最後才沿用安全照片驗證與單次提交處理。未修改原 Stage1–4 Callables 或 shared handler。
- Stage5 獨立封裝新增必要 helper；更新模擬器整合測試，分別檢驗第四關不存在、第四關非 completed、以及完成第四關後正常提交。
- 這項修正需要重新驗證：
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:pilot2026-stage45-release-preflight
npm run test:pilot2026-stage5-emulator
npm run test:pilot2026-stage45-live-preview
```
- **發布閘門：上述測試未全數通過前不得部署 Stage4/5 Functions、Storage Rules 或 Hosting live 頁。**
