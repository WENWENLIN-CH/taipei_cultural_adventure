# 第二階段｜多張照片中斷後安全重試（尚未部署）

日期：2026-11-04。僅修改 GitHub `feature/firebase-sync`；未修改正式 GitHub Pages、Firebase Hosting、Functions、Firestore 或 Storage。穩定快照 `stable/2026-11-04-firebase-milestone1` 保持原樣。

## 本次完成（程式）
- 新增 `mission-upload-recovery.js`：先驗證整份原始表單，逐張讀取、確認、上傳；只有全部照片取得雲端路徑，才呼叫受控 Callable；顯示第幾張與可理解錯誤。
- `mission-cloud-flow.js` 改由新流程呼叫原本 `photo-upload.js` 的 `uploadGroupPhoto` 和 `mission-submission.js` 的 Callable。正式單關提交白名單未修改。
- 既有 `photo-upload.js` 使用不可覆寫的照片欄位路徑，讀取 Storage 中繼資料並核對 SHA-256 與檔案大小；完全相同的檔案可重用，其他檔案拒絕覆寫。讀取錯誤不會盲目重傳。
- 新增 `tests/mission-upload-recovery.test.mjs`：四關完整照片、輸入驗證、網路中斷後重試、拒絕不同照片、第二關第三張失敗後中止、錯誤 MIME／空檔／過大檔案。測試以注入的模擬上傳器為基礎，**並不等於真實瀏覽器網路斷線 E2E**。

## 預期使用者流程
1. 學生在原本登入的手機與瀏覽器中完成照片、文字欄位。
2. 提交時如果第 3/4 張上傳或確認失敗，不寫入過關紀錄，介面顯示失敗照片欄位。
3. 學生保留原本照片，網路恢復後重新提交相同內容：已存在的照片須經 Storage metadata 的 SHA-256、大小、MIME 比對；相同照片可直接沿用，尚未存在的照片再上傳。
4. 所有照片齊備後才發出一次完成提交；過關狀態仍以 Firestore 小組同步為準。

## 操作限制與已知問題
- **不是換手機恢復**：匿名 UID 消失、換裝置或清除網頁資料都不保證能恢復既有照片欄位。
- **不是補拍功能**：已存在的照片不同時，系統應提示聯絡教師，不能直接改寫不可變照片。
- 已上傳照片沒有 SHA-256 的早期測試檔案（例如先前第二關測試）不能安全視為相同照片。
- 若瀏覽器重新整理後 localStorage 的原始 JPEG data URL 不存在，必須要求學生重新提供**原照片**；同一張照片重新壓縮可能導致位元組不同，因此不能保證重用。
- 檔案已上傳但 Callable 回應逾時，是否其實已成功建立成果仍要以 Firestore 同步查核；不能自動重複建立。
- 同組兩人同時提交，後端 Firestore transaction 只允許一筆成果；但另一人的照片可能先上傳成未使用的物件，未來須規劃有權限的清理流程。
- 恢復過程需要原始來源照片，未加入 IndexedDB 持久化；不應為方便恢復將學生照片或憑證存入公開網址。
- 需要在隔離測試活動中用實際手機驗證弱網、四張連拍、重新整理、空間不足、拒絕權限等案例，才可認定適合現場使用。

## 本次驗證指令（無部署）

```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:upload-recovery
npm run test:photo-retry
npm run test:form-contract
npm run test:four-missions-emulator
```

這些指令只執行 Node 單元測試或 Firebase Emulators。**最後一項曾在上一版本通過 24/24，但本次改動後仍應回歸重跑。** 所有測試通過後，再安排獨立學生預覽頁（不發布至正式 GitHub Pages）。
