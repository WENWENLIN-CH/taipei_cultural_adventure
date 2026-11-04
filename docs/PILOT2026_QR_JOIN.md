# 台北島｜學生專屬 QR Code 加入（開發測試版）

## 已確認方向
- 主要用於校外教學**當天**。
- 首次掃描各自專屬 QR Code，使用 Firebase 匿名登入及一次性邀請交易加入指定小組。
- 同一支手機開關網頁、重新整理時沿用匿名身分和本機小組快取，同步讀取 Firestore 小組共同進度。
- 不實作換機恢復後台、停用舊裝置、學生密碼或 Google 登入。
- pilot2026/group01 第一關已通過正式雲端提交 1／5；**不可重新提交第一關，也不可清除成果**。

## 本次只建置，尚未部署
- `pilot2026-qr-join.html` 由獨立 build 產生，啟用掃碼後自動加入的功能。
- QR 連結格式：`https://taipei-cultural-adventure--auth-test-h1vdhpta.web.app/pilot2026-qr-join.html#join=<48-hex>`。
- `#join=...` 是 URL fragment，不會隨 HTTP 網頁請求送給伺服器；頁面執行時立即從網址列移除。仍需把整張 QR 圖當作私密邀請碼，不應傳送到公開群組、網址短縮或 QR 網站。
- 既有 Firestore rules 及 `joinByInvitation()` 的原子一次性兌領機制沒有改動。
- 已加入過的小組優先恢復原本身分，不重複兌領 QR；原本獨立測試頁不變。
- QR 圖用本機 `qrcode` Node 套件生成，不呼叫第三方 QR 網站，存在 Git 忽略的 `.private-qrcodes/`。
- 獨立 QR 頁沿用目前 pilot2026 第一組第一關的服務端權限；其餘四關依然不得提交。

## 請先在 Cloud Shell 執行（不發布、不寫入 Firebase）
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm install
npm run test:pilot2026-qr-preview
npm run test:pilot2026-stage1-live-preview
npm run test:pilot2026-integration
npm run test:combined-five-preview
```

注意：`npm install` 用於安裝本機 QR 圖產生工具的套件；不會建立邀請或修改 Firestore。若失敗先回報，不要部署。

## 下一階段
1. 先驗證前述測試全通過。
2. 在測試環境用**全新、未使用、單人專屬的一次性邀請碼**製作 QR；不要重用已被 TEST01 領取的任何私人邀請碼。
3. 檢查掃碼登入、首次加入，以及重新整理自動恢復。同組新成員應看到既有 **1／5**。
4. 此 QR 預覽頁目前也帶有 pilot2026 stage1 提交 UI，但因 mission1 已完成，**不能再提交**；驗收重點是加入和進度讀取。
5. 之後再做獨立 Hosting 預覽發布，且保持 `main`、demo2026、teacherAccess、原 Function、Storage 規則不變。

**不得**在 GitHub 原始碼、issue、對話、截圖或公開網頁放入邀請 token。老師私下分發 QR，首次領取後該 token 不能重複兌領。
