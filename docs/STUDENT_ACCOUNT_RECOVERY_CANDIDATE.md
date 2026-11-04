# 台北島｜匿名學生換手機後的教師核准恢復（候選版，尚未部署）

日期：2026-11-04。本階段只修改 GitHub `feature/firebase-sync`，保留正式 `main`、穩定快照、S02/S03、Firebase 線上規則、資料與 Hosting。

## 問題與設計邊界
Firebase 匿名登入不是永久可跨裝置的學生身分。清除瀏覽器資料或換手機後，新裝置會得到另一個 UID；**不能**透過「重設密碼」找回舊 UID。本設計採用**教師核准新裝置重新加入原小組**，不是登入原本的匿名帳號。

操作原則：
1. 學生向老師報告舊裝置無法使用。老師在線下核對是哪位組員（不要只憑網頁裡的學生自述或代碼），記錄原活動、組別、studentCode 及舊 UID。
2. 老師透過具有 Admin 權限的**獨立、受保護管理流程**（未開發，也不對學生開放）先把舊的 `activities/{activityId}/groups/{groupId}/members/{oldUid}.revoked` 設成 `true`，同時為**相同組別與代碼**建立全新隨機 48 位一次性邀請碼。這兩步應以可信任後端操作完成並留下審核紀錄，不能讓學生自己修改。
3. 新手機使用新匿名 UID，輸入只交付本人的新邀請碼；原有 `group-service.js` 加入交易會建立新 `members/{newUid}`，不更改原本的小組完成成果。
4. 預覽頁從 Firestore 讀取共享完成狀態。舊 UID 被撤銷後應立即失去該組關卡與 Storage 照片存取；舊 UID 在本機仍存在也不能重新取得組員資格。
5. 原本的任務成果與照片保持不變、提交者欄位保留舊 UID 作為歷史紀錄；不刪除整組資料、不清除其他組員。
6. 若新舊裝置同時還在使用，請先核對老師的撤銷紀錄，不要產生第二個仍有效的學生身分。

## 本次已在 GitHub 加入的程式（未執行完測試／未部署）
- `docs/firestore-recovery-candidate.rules`：**候選** Firestore 規則，將舊的「只要組員文件存在就可讀」調整為「存在且 `revoked !== true` 才能讀取小組內容」。正式 `docs/firestore-group-draft.rules` 未修改。
- `docs/storage-recovery-candidate.rules`：**候選** Storage 規則，同步拒絕已撤銷組員讀取與上傳照片。正式 `storage.rules` 未修改。
- `functions/submission-handler.js`：先檢查會員是否撤銷，交易內再查一次，防止登入中的舊身分提交。仍保留正式 `demo2026` 限制；此次**沒有部署新版 Function**。
- `group-service.js`：恢復本機小組狀態時不接受 `revoked: true` 的成員文件；正式網頁沒有部署。
- `firebase.recovery-emulator.json`：只用候選規則啟動獨立模擬器。
- `tests/recovery-rules.test.mjs`：模擬撤銷舊 UID、拒絕偷改權限、重新領取新邀請碼、舊照片仍可供原小組新成員讀取、舊身分不可再讀取。
- `functions/test/submission-emulator.test.mjs`：加入已撤銷舊 UID 禁止提交、未撤銷組員仍可提交的回歸測試。

## 執行 Cloud Shell 測試（只用 Emulator）
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:recovery-rules
npm run test:submission-emulator
npm run test:rules
npm run test:storage
```
建議分別執行。這些測試都在 `demo-...` 模擬專案上，不會對真實 Firebase 寫入，若發生失敗請停止部署並回報錯誤。舊規則測試必須維持成功，避免不小心破壞現行版本。

## **不能直接上線的原因**
1. 目前尚未實作受權限控管的教師「核准換機／撤銷舊身分／產生邀請碼」管理介面及審核紀錄。透過 Firebase Console 手動編輯測試文件不是最終方案。
2. 目前 Firestore 和 Storage 線上部署的仍是**舊規則**。**只部署 Function 或前端無法真正撤銷舊 UID 的照片讀取權限**；必須把三層檢查一起測試、審查後協調部署。若舊規則尚未改，設定 revoked 並不會自動封鎖舊裝置。
3. 現有 Firestore `invites` 沒有「邀請碼已失效、有效期限、授權老師、用途」等結構化欄位；往後正式設計需考慮可撤銷性與到期時間。
4. 不要把邀請碼、UID 清單、老師帳密、學生個資或照片加入公開 GitHub。
5. 這只能讓學生恢復**小組已完成的共同進度**。舊手機尚未正式提交的本機草稿，及不同照片補拍，仍需獨立處理。

## 下一個工作
測試候選規則通過後，補上**可信任教師管理後端**：安全建立恢復請求、老師核准、原 UID 撤銷、一次性邀請碼重新核發，以及可查核的操作紀錄。再用 Emulator 測試多人同時換機、重複申請、錯誤組別與舊照片遺留情況。

**禁止在這一階段執行 `firebase deploy`，禁止直接改動線上 S02/S03 的成員文件。**
