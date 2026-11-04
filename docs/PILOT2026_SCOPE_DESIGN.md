# 台北島下一階段｜獨立試辦活動安全邊界（僅程式與測試）

日期：2026-11-04。三組五關 Firebase Emulator 測試 **53/53 已通過**；五關學生預覽與教師後台手機驗收 **7/7 已通過**。這不代表已完成真實五關提交。

## 本階段完成
- 規劃另一個活動 ID：`pilot2026`，組別限定 `group01`、`group02`、`group03`，任務限定 1～5。
- 新增 `functions/pilot-scope.js` 定義唯讀的 **提案** 清單 `PROPOSED_ISOLATED_PILOT`；包含純函式檢查活動、組別和關卡。
- 新增 `functions/test/pilot-scope.test.mjs`，驗證僅提案中的活動組別關卡允許、錯誤輸入被拒絕，且非模擬模式必須維持既有的單關限制。
- 新增 `tests/pilot-nondeployment.test.mjs`，保護正式 `functions/index.js` 和 `functions/submission-handler.js` 沒有接上提案白名單；舊的學生預覽仍然唯讀。
- **沒有修改、部署或啟用正式 Firebase 函式／規則／資料**。這份安全白名單目前只是未連接正式後端的設計與測試基礎。

## 執行（不會碰正式 Firebase）
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:pilot-scope
npm run test:pilot-nondeployment
npm run check:functions-pilot
```

執行成功後，才進入「隔離活動的邀請碼加入與提交模擬」及「匿名身分遺失、照片補拍的安全設計」。**不要**在 Firebase Console 真正建立 `pilot2026` 活動，也不要執行任何部署指令。僅有新清單檔案不表示 Firestore Security Rules 已能支援正式試辦。

## 未來真正開放試辦前的必要審查
1. **學生加入**：必須先驗證三組各自的邀請碼領取交易與跨組隔離，且不可發布加入碼於公開 GitHub。
2. **後端**：受控 Callable 的活動 ID、組別、任務都需伺服器驗證；現在 `submission-handler.js` 仍硬性限制 `demo2026`，後續必須在模擬器測試完整授權，並由教師明確核准後才能變更部署。
3. **照片**：一個固定欄位只能寫一次、照片大小 1 MiB、JPEG 標頭及 SHA-256 重試；不同照片補拍不能直接覆蓋，需教師授權方案。
4. **身分**：匿名帳號換手機或清除瀏覽器會遺失 UID，需可撤銷的重入機制；不可在網頁或檔案放教師密碼／邀請憑證。
5. **費用與風險**：先確定每組測試人數、上傳量、預算提醒及資料保存期限，並選用非可辨識學生的測試照片。
6. **部署隔離**：新預覽頁與原 `auth-test` 頻道共存時必須回歸測試；禁止發布至 GitHub Pages `main` 或 Firebase Hosting live channel。
7. **最終任務**：目前瀏覽器只是依 Firestore 5/5 顯示入口，真正防作弊需另外設計伺服器端解鎖策略。

## 目前不可執行的操作
- 不能因為 `pilot2026` 出現在 GitHub 就認定已可線上提交。
- 不要更動 `demo2026` 的既有 S02/S03、第一關種子紀錄、第三關照片或教師後台權限。
- 不要放寬 Functions 正式白名單或 Storage/Firestore 規則。
- 不要將學生資料或私密邀請碼上傳公開儲存庫。
