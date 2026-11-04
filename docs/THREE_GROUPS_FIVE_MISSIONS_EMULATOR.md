# 第四階段｜三組 × 五關隔離式完整流程模擬驗收

建立日期：2026-11-04。上一階段使用者已回報五關唯讀手機驗收 7/7 全部通過：登入、五關介面、文字與拍照欄位、2/5 共享進度、尚未完成不能標記過關、最終任務保持鎖住、教師可讀第三關兩張照片。

## 階段目標與資料安全

**先做完整的本機 Firebase Emulator 驗證，不建立線上真實 group02/group03，也不移動或覆寫既有 group01 測試資料。**

- 正式資料保留：`activities/demo2026/groups/group01`、S02/S03 成員資料、第一關手動模擬完成紀錄、第三關實際照片、教師帳號。
- 原正式後端仍維持 `demo2026/group01/mission3` 唯一可提交的試辦白名單；不開放其他四關的真正線上寫入。
- 正式 GitHub Pages `main`、Firebase Hosting `auth-test`、Firestore／Storage 規則、Cloud Functions 都不部署。
- GitHub 穩定版 `stable/2026-11-04-firebase-milestone1` 不修改。

## 新增可執行測試

`functions/test/three-groups-five-missions.test.mjs`：運行在 `demo-taipei-callable` Firebase Auth、Functions、Firestore、Storage 模擬器。

1. 建立三組獨立測試組員與小組資料（僅模擬器）。
2. 每組五關都依原始表單要求提供文字資料及 1/4/2/3/3 張模擬 JPEG。
3. 每關缺少照片先拒絕建立成果，照片齊全後透過真實 HTTPS callable 模擬器建立一份 Firestore completed，然後驗證不可覆寫。
4. 每組驗證完成前 0/5，五關完成後 5/5；這是**資料條件**，並非實際瀏覽器已點擊最終謎題畫面。
5. 確認跨組無法以另一組學生身分提交；三組合計 15 份任務成果、39 個照片路徑。

本測試補足之前只驗證第一組、單一關卡的模擬器測試，但**沒有驗證 Firebase Console 真正建立三組邀請碼、跨手機同步時間、瀏覽器大照片中斷、教師審核流程**。

## 執行方式

```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:three-groups-emulator
```

成功應顯示 `fail 0`、結尾 `Script exited successfully (code 0)`，並預期 53 個子測試（每組 17 個，另 2 個跨組／照片總數檢查）。如果測試失敗，請提供關鍵錯誤與 `fail` 數字，不要改用正式 Firebase 專案測試。

## 下一個需要做的設計決策

模擬器通過之後，再決定是否建立**獨立的新活動 ID**（例如 `pilot2026`），由教師核准少量測試組使用：後端 `functions/submission-handler.js` 目前仍有 `demo2026` 限制，必須先設計明確白名單、安全規則、邀請碼分配、測試資料與費用上限。不得只在前端把提交按鈕開啟。真實學生測試前還要有匿名身分遺失／補拍的應變方案。
