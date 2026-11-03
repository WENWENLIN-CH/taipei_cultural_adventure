# 台北島 Firebase 小組同步預覽（尚未開放提交）

這次完全不修改正式 `index.html`、`script.js` 或 GitHub Pages。
為避免混淆，原本的台北島版面使用 `scripts/build-cloud-quest-preview.mjs` 產生隔離版：
- `.firebase-preview/cloud-quest.html`
- `.firebase-preview/cloud-quest.js`

## 已完成
- 保留原本 Q 版台北島、五關題目與圓山／酒泉街最終謎題。
- 學生使用原 Firebase 匿名身分登入、專屬加入碼加入小組，或恢復既有小組。
- 使用五份 Firestore 任務文件的即時監聽顯示各組共同完成狀態。
- 小組進度與最終解鎖依據 Firestore；不再使用本機 `completed` 或本機教師備援密碼決定雲端完成。
- 本機重設清楚標示為「清除本機草稿」，不影響共享進度。
- **完成共同成果提交按鈕刻意停用，還沒有部署正式 Cloud Function。**

## 必須先執行
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:cloud-preview
```
只有在 `Cloud Taipei Island preview build checks passed` 出現後才可評估部署獨立 Firebase Hosting 預覽頻道。不要部署到正式 Hosting live channel，也不要將這個功能合併進 GitHub Pages main。

## 後續仍需處理
- 本機照片的安全暫存、部分照片已上傳時的恢復、同組多人競爭提交及補拍。
- 對照真實資料：`demo2026/group01/missions/1` 曾由管理者建立假 completed，同組預覽會照 Firestore 如實顯示完成，不表示真實過關。
- 教師密碼只能是原本離線版的備援 UI；雲端模式不能繞過資料庫授權。
- Cloud Function 需要在測試通過、費用評估與資料清理後才部署。
- 後續獨立加入教師後台四項功能。
