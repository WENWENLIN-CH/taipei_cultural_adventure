# 原本 S02 身分與第三關測試頁放在同一個 Hosting 網域

已確認在既有 `auth-test` 網域，S02 的匿名 Firebase 登入及 `group01` 成員紀錄仍正常。新 `auth-pilot` 網域不共用該網域的瀏覽器儲存空間，因此不能直接恢復 S02，也不應複製 Auth token 或修改 UID。

## 解法
`scripts/build-same-origin-pilot.mjs` 在 `.firebase-preview` 產生：
- `cloud-quest.html`：原本唯讀台北島，提交維持關閉。
- `pilot-quest.html`：同一網域下的第一組第三關受控測試頁。
- `cloud-quest-pilot-bootstrap.js`：只對 `demo2026/group01/3` 啟用提交，其餘關卡仍關閉。

同網域使用既有 Firebase Auth/localStorage，不需重發一次性邀請碼。這不會讀取或輸出學生的 Auth token。

## 先做建置測試
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:same-origin-pilot
```
成功後才考慮更新現有 `auth-test` Hosting 預覽頻道（切勿更新 GitHub Pages 或正式 live Hosting）：
```bash
firebase hosting:channel:deploy auth-test --config firebase.json --project taipei-cultural-adventure --expires 7d
```

發布後，使用**原本顯示 S02 的同一個 Chrome 設定檔**打開該網域的 `/pilot-quest.html`。不需要輸入新加入碼。務必先確認頂端 `group01/S02` 與第一關 `1/5`，再進入第三關。不要在尚未查驗畫面與上傳流程前按提交，也不要上傳有個資的照片。

### 風險
- 受控測試頁不需要知道秘密網址才能開啟，因此安全性不能依賴 URL；後端限定活動／小組／關卡及會員驗證才是權限依據。
- 這次新增的是測試頁，不保證全部 UI/Storage 上傳流程都已真正線上通過。
- 從一個 Chrome 設定檔、無痕視窗或不同裝置開啟，都不能假設能恢復 S02。
- 假如先前 `auth-test` 匿名身分遺失，這個方案無法復原，需另走正式加入新帳號流程。
- Firestore 第三關完成文件不存在已人工檢查；正式提交前仍應再確認。
