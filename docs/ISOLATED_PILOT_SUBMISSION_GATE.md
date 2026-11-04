# 台北島｜三組五關線上試辦前置驗證（不部署）

日期：2026-11-04

## 教學方向調整
依照實際場域：學生一般用自己的手機，組員共享五關進度，換手機管理暫緩；若某人手機故障，可由同組其他組員繼續共同任務。下一個優先目標是三組五關的真正雲端提交及教師後台檢視，而不是新增大型帳號管理系統。

## 這次已修改的檔案
- `functions/submission-handler.js`：允許測試程式透過 `emulatorPilotScope` 注入活動範圍，但**必須同時具備 Firestore、Storage 模擬器環境以及固定 `GCLOUD_PROJECT=demo-taipei-isolated-pilot`**。若未注入，仍保持 `demo2026` 預設限制。
- `functions/test/isolated-pilot-flow.test.mjs`：在模擬器建立 `pilot2026` 的三個小組，提交五關成果；檢查無照片拒絕、實際 JPEG 完成、重複提交拒絕、跨活動／跨組拒絕，以及 39 張照片路徑。
- `tests/pilot-nondeployment.test.mjs`：檢查已部署函式的入口 `functions/index.js` 沒有注入試辦活動範圍，並確保模擬器限定條件仍存在。
- `package.json` 與 `functions/package.json`：提供測試指令。

## 在 Cloud Shell 逐步執行（無正式 Firebase 寫入）
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:isolated-pilot-emulator
npm run test:pilot-nondeployment
npm run test:three-groups-emulator
```

第一項是新增的隔離測試，預期共 49 項子測試（15 關 × 3 + 4 個總體／跨組測試）。若有任何失敗，請回報完整錯誤，**不要部署**。第三項是已通過 53 項的既有回歸測試，再次確認 `demo2026` 不受這次後端改動影響。

## 真實學生提交前仍要處理
1. **學生新活動加入碼**：目前未建立線上 `pilot2026` 小組或邀請碼，且邀請碼不得加入公開 GitHub。
2. **真正的線上後端授權**：正式 `functions/index.js` 仍僅限 `demo2026/group01/mission3`；正式 `functions/submission-handler.js` 未部署新版。需另外設計經審核的明確試辦開關，不能直接取消限制。
3. **前端隔離**：五關預覽 `five-quest.html` 仍為唯讀。日後要單獨新增測試提交入口，而不是改掉已驗證的學生唯讀頁和第三關頁。
4. **教師後台**：目前固定讀取 `demo2026`，未支援切換 `pilot2026`。需要讓授權教師查看不同活動而不對學生開放。
5. **上傳與失敗處理**：必要照片數目 1／4／2／3／3，單檔 1 MiB，重新上傳的同一張照片須具備相同 SHA-256；照片不同則需教師補交流程。
6. **最終謎題**：必須進行手機瀏覽器實際 5/5 解鎖驗收；現在只測試資料狀態。
7. **現場使用**：只用非學生個資的假照片，先驗證全程與費用風險；保留既有 S02、S03 資料及已成功的教師照片檢視。

## 不做的事
本次不建立線上活動、不更新 Firestore／Storage Security Rules、不部署 Functions／Hosting、不改 GitHub Pages `main`，不啟用教師換手機管理。之前的候選恢復規則與測試可以保留作為未來備援設計，但無須投入下一階段開發。

## 注意
這次提供的是**雲端資料服務模擬器的完整整合流程**，不是已發布可供手機實測的正式學生版。
