# 五關學生預覽版（Firebase 唯讀，尚未部署）

**開發日期**：2026-11-04。這是 GitHub `feature/firebase-sync` 的獨立建置產物，不會修改 GitHub Pages `main`，不會觸碰線上 Firebase Storage／Firestore，不會部署任何 Hosting 頻道。

## 可供檢視的功能
- `five-quest.html` 保留 Q 版台北島、五關表單、島中央最後集合謎題。
- 使用 Firebase 匿名登入和學生個人邀請碼加入小組，或恢復原本的匿名登入小組。
- 同步顯示五關進度：`activities/demo2026/groups/{groupId}/missions/{1..5}`，僅 Firestore `status=completed` 才算完成；本機儲存的答案、照片和教師密碼不得解鎖最後謎題。
- 五關都可打開查看題目並練習填表，但**全部雲端提交按鈕停用**。
- 本機草稿 key `taipeiCulturalQuestFiveReadOnlyV1` 與原版、舊預覽、第三關受控提交版隔離。
- `mission-upload-recovery.js` 已被加入預覽產物，避免其他讀取此共用預覽模組的頁面出現 import 404。
- 使用者可清除本機草稿，不能藉此刪除雲端進度。

## 建置與驗證（不部署）
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:five-quest-preview
npm run test:cloud-preview
npm run test:pilot-preview
npm run test:same-origin-pilot
```
成功後 `.firebase-preview/five-quest.html` 與 `.firebase-preview/five-quest.js` 在 Cloud Shell 本機產生，沒有永久網站網址；如果要提供手機預覽，應額外檢查 Firebase Hosting 的**非正式測試頻道**設定、內容及到期日，並再次授權部署。不可直接部署正式 Hosting live 或 GitHub Pages。

## 重要限制
1. 本版五關只讀、不能正式提交；其餘四關目前只有後端 Emulator 完成 24 項受控測試。正式 Functions 仍只開放第一組第三關。
2. 第一組第一關的 `completed` 是手動建立的測試紀錄；預覽會忠實顯示它，並非學生真的完成。
3. 預覽包含原有謎題答案判斷程式；在五關全部取得 Firestore 完成狀態之前，入口保持鎖定。這是 UI 存取控制而不是伺服器級秘密謎題存取控制，不應把原本題目的 JS 視為防作弊保護。
4. 若學生已在第三關受控測試頁登入，最好維持同一網域並避免切換 Chrome 設定檔或清除網站資料；Firebase 匿名帳號無法直接跨裝置復原。
5. 學生的照片在此版若填入表單，僅保留本機草稿；可能占用 localStorage 容量，且未經教師同意不應使用真實可辨識學生的照片。
6. 仍需驗證實際手機上的版面、網路中斷、權限限制、教師補拍、三組與全部五關完整流程後，才可考慮正式上線。
