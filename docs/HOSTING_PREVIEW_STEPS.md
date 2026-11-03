# Firebase 匿名登入預覽測試（不影響正式網站）

目標：只發布三個 Firebase 登入測試檔案，採用 Firebase Hosting **預覽頻道**，不修改 GitHub Pages 的正式網站、不部署 Firestore 規則。

## 適用條件
- Firebase 專案 `taipei-cultural-adventure` 已建立且啟用 Email/Password、Anonymous。
- Firestore 保持 `allow read, write: if false`。
- 本專案 Firebase 設定只含公開 Web SDK 設定，沒有管理員憑證。
- 預覽網址是公開的，不要在公用電腦輸入教師密碼。

## 建議用 Google Cloud Shell（瀏覽器內執行，不必先裝 Node）
1. 開啟 https://console.cloud.google.com/ 並使用與 Firebase 專案相同的 Google 帳號。
2. 選擇 project: `taipei-cultural-adventure`。開啟右上角 Cloud Shell。
3. 依序執行：

```bash
git clone --branch feature/firebase-sync --single-branch https://github.com/WENWENLIN-CH/taipei_cultural_adventure.git
cd taipei_cultural_adventure
node scripts/build-preview.mjs
firebase hosting:channel:deploy auth-test --project taipei-cultural-adventure --expires 7d
```

4. 若 CLI 要求授權，按照介面操作。成功部署後才會顯示**實際預覽網址**。未部署前不能猜測網址。
5. 打開預覽網址，先點「學生匿名登入」。若成功，頁面會顯示匿名 UID。重新整理時登入狀態應保留。
6. 若顯示 `auth/unauthorized-domain`，到 Firebase Authentication → 設定 → 已授權網域，新增**預覽網址的主機名稱**（不要貼整個 https URL），再重試。
7. 測試完可執行 `firebase hosting:channel:delete auth-test --project taipei-cultural-adventure` 清掉預覽頻道。

注意：這個流程不會測試教師權限，也不會開通學生加入小組。匿名 UID 只是登入身分，仍不能讀寫 Firestore。預覽頻道服務的前端連接的是**真實 Firebase Authentication**；預覽網址雖不容易猜到，但並非私密。不要拿真實學生資料測試。
