# 共同成果提交：Firestore 模擬器整合測試

本階段新增的 `functions/submission-handler.js` 是 Cloud Function 使用的同一份提交核心，並透過相依性注入讓測試執行時：
- **Firestore** 使用真正的 Firebase Emulator（測試交易、create-only、提交者和時間）。
- **Storage** 使用明確的模擬物件，模擬檔案存在、MIME、大小和 JPEG 開頭。
- **Authentication** 以呼叫處理器的匿名 UID 參數測試，並非測試真的 callable token。

## Cloud Shell 指令
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:submission-emulator
```

預期所有測試通過，程式退出碼為 0。請貼終端機最後一段結果，不要貼學生憑證。

## 未驗證部分／不可立即部署
1. 尚未用真正 Functions Emulator 處理 callable 請求與 Auth token。
2. 尚未使用 Storage Emulator 的真實物件讀寫；目前照片存在與內容驗證由測試替身模擬。
3. 真實任務頁面的原始欄位與這份後端驗證尚未逐項核對。
4. 真實 `demo2026/group01/missions/1` 曾由教師手動建立一筆模擬 completed 紀錄；正式 create-only 測試前需要先由管理者清除這筆**確認為測試資料**的文件。
5. 上傳照片至 Storage 不代表完成任務。正式任務須待可信任後端確認全部照片並成功寫入 Firestore。
6. 目前 Cloud Functions 未部署；不要執行 `firebase deploy --only functions`。
7. 教師後台仍以四項既定需求為準，不額外加入行為監控。
