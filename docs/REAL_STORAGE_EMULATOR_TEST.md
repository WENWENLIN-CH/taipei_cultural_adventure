# 真實 Storage + Firestore 模擬器整合測試

本階段以 **同一份** `functions/submission-handler.js` 提交處理器，連接 Firestore Emulator 和 Storage Emulator 的**真實模擬器物件**。不連正式 Firebase、不上傳真實學生照片。

## 測試方式
在 Cloud Shell 專案目錄：
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:submission-real-storage
```

Firebase CLI 啟動兩個模擬器，會自動設定 `FIRESTORE_EMULATOR_HOST` 和 `FIREBASE_STORAGE_EMULATOR_HOST`。程式嚴格要求這兩個環境變數存在，並使用 `demo-taipei-storage-submit` 測試專案。不要手動改成真實 Firebase 專案 ID。

## 預期檢查
1. 圖片不存在 → 拒絕
2. 真實模擬 Storage 物件存在且是 JPEG → Firestore 建立一份 completed
3. 重複提交 → 拒絕
4. 跨組路徑 → 拒絕
5. 非組員 → 拒絕
6. MIME 錯誤 → 拒絕
7. JPEG 魔術位元不符 → 拒絕
8. 同組兩人同時提交 → 只有一筆成功

## 還不能宣稱的事項
- 本測試直接呼叫後端處理器，尚未走真正的 HTTPS callable 和 Auth emulator 認證協定，也沒有驗證手機 UI。
- 儲存模擬器與正式 Google Cloud Storage 的實作不完全相同；正式環境應另做受控測試。
- 儲存物件的 JPEG 開頭檢查仍不等於完整的影像解碼或內容審核。
- 之前手動建立的 `demo2026/group01/missions/1` 測試完成文件，在真正的線上正式測試前需先移除；本測試只操作 `demo-` 測試專案。
- 教師後台與正式五關仍未整合，`functions/index.js` 仍不可部署。
