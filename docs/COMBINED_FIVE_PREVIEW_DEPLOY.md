# 五關唯讀手機測試｜合併建置與安全部署

2026-11-04。前一階段 `npm run test:five-quest-preview` 和 `npm run test:same-origin-pilot` 均已在 Cloud Shell 通過，但這兩條指令各自建置預覽產物，不是部署用的完整集合。

## 安全合併建置
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:combined-five-preview
```

這個指令先產生 `.firebase-preview/five-quest.html`、`five-quest.js`（五關唯讀），再建置 `cloud-quest.html`（唯讀）、`pilot-quest.html`（只有 group01 的第三關可以提交）、`teacher-dashboard.html`（授權教師唯讀）及相依模組。測試確認原始 `index.html`、`script.js` 沒有修改。**這個指令不會連線操作 Firebase 正式資料，也不會部署。**

## 手機預覽（先驗收建置結果才執行）
現有 S02 匿名登入、教師驗證已在 `auth-test` 預覽頻道實測，因此只有在需要保留相同來源下的匿名身分時，才用**原本的 `auth-test` 預覽頻道**；不要改用新的來源並誤以為原學生匿名 UID 會自動共用。

```bash
firebase hosting:channel:deploy auth-test --config firebase.json --project taipei-cultural-adventure --expires 7d
```

這只更新 Firebase Hosting 的 `auth-test` 預覽頻道，不會修改 GitHub Pages 或 Hosting live，但會**替換 auth-test 頻道網站檔案**，因此必須使用上述合併建置，而非單一 five-quest 建置。教師後台及 pilot 頁必須再次確認正常。

網址由 CLI 輸出為準；預期同個網域下有 `/five-quest.html`、`/pilot-quest.html`、`/teacher-dashboard.html`。若渠道到期或 CLI 產生不同網域，需確認 Firebase Authentication 授權網域及測試身份影響。

## 注意事項
- **五關預覽不能正式提交**；按鈕鎖定，小組五關進度只讀取既有 Firestore 資料。
- 模擬用的第一關完成紀錄仍會顯示 2/5（原第一關手動 seed + 已完成的第三關），不是剛完成新任務。
- 原第三關已完成，不需也不能再提交；請勿清除 S02/S03 瀏覽器資料。
- 本機草稿的照片不是雲端已完成成果；如果要檢查手機表單，請使用不涉及學生隱私的測試圖片。
- auth-test 是測試頻道，不是永久連結；預覽到期需重新部署。
- 學生多機、重試、全部五關真正的 Cloud Function 提交及教師補拍，仍須另外驗收。
