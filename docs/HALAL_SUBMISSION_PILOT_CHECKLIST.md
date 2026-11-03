# 第三關「Halal 大搜查」實際提交：隔離預覽版

## 目前已新增
- `scripts/build-pilot-preview.mjs`：建立 `.firebase-pilot-preview`，只在該輸出版本啟用小組提交。一般 `.firebase-preview` 仍停用提交。
- `firebase.hosting-pilot.json`：單獨 Hosting 預覽設定，絕不使用正式 Hosting live channel 或 GitHub Pages。
- `tests/pilot-preview.test.mjs`：確認原首頁未被更動、一般預覽停用、測試版只允許 `demo2026/group01/mission3`，並要求提交確認及防連點。

## 下一步：只做本機建置驗證
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:cloud-preview
npm run test:pilot-preview
```

**請勿直接部署或開始學生提交。** 待測試輸出通過後，再於單獨的 `auth-pilot` Hosting 預覽頻道部署，確保原 `auth-test` 預覽版與正式 GitHub Pages 維持不變。

## 已知風險與使用條件
- 只限授權的第一組 S01、S02 測試，不要發送公開連結給學生。
- 只使用非個資、不含可辨識人臉與學生資訊的兩張照片。
- 真正提交會在 `activities/demo2026/groups/group01/missions/3` 建立不可自行覆寫的正式測試資料。提交前請再次確認文件 `3` 不存在。
- 目前圖片先經本機壓縮並存於 localStorage。若重新整理/清除網站資料或跨裝置，更換手機不保證恢復原照片。也有 localStorage 空間限制造成儲存失敗的風險。
- 若上傳成功、返回前斷線，可能留下照片物件，請先觀察雲端狀態，不要擅自清除或更換照片。
- Cloud Functions 已部署但尚未以有效學生身分測試；客戶端只能作為操作入口，最終權限仍須由後端驗證。
- `Storage` 規則仍限制檔案欄位不可覆蓋。只有相同 SHA-256/大小/MIME 可重用舊檔案。
- 同組另一位手機的共享進度應在 Firestore 記錄變為 completed 後才改變；不可因本機上傳成功就亮章。
