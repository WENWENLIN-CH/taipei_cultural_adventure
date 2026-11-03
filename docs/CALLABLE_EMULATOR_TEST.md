# Firebase Callable 端對端模擬器測試（2026-11-03）

## 目的
讓真實 Firebase Auth Emulator 建立匿名學生身分，透過 **HTTP callable** 呼叫 `submitGroupMission`，經過 Cloud Functions Emulator、Storage Emulator 的真實物件與 Firestore Emulator 的 create-only 交易。這比僅呼叫後端處理器更接近學生瀏覽器的實際路徑。

## 指令（只執行模擬器；不部署正式後端）
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:callable-emulator
```

專用設定：`firebase.callable-emulator.json`，專案 ID 僅使用 `demo-taipei-callable`。務必保留 `--project demo-taipei-callable`，不可更換成正式 Firebase 專案名稱。

## 五個測試
- 非小組組員拒絕提交
- 缺少真實 Storage 照片不能過關
- 匿名 S01 以真實 HTTPS callable 提交一張照片後，Firestore 僅產生一筆完成成果並包含提交者、伺服器時間
- 重複提交不能覆蓋
- 跨組照片路徑被拒絕

若顯示 FAIL，請保留完整錯誤訊息；不要部署 Cloud Functions。模擬器首次啟動可能需要下載必要套件。

## 限制與後續
- 測試用簡短 JPEG 簽章位元組。此驗證不是完整圖片解碼。
- 使用模擬器 Anonymous Auth 身分，不是實際學生身分。
- Cloud Functions 尚未部署到正式專案，正式 Storage 不受本測試影響。
- 下一階段要逐關核對現有 `script.js` 的 13 張照片與文字欄位，完成正式操作介面的流程、補拍與失敗復原。
- 最終任務應依五關完整狀態在讀取時判斷，不信任前端單獨標記。
- 正式 `demo2026/group01/missions/1` 的教師手動測試 `completed` 紀錄須在真實提交測試前確認並清除。
