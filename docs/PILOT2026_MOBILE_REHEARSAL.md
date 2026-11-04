# pilot2026 五關手機「提交演練頁」：第一步（完全不連 Firebase）

日期：2026-11-04。此階段以課堂操作體驗為優先，暫緩教師換手機管理。已完成的三組五關 Emulator 整合 49/49、正式隔離 5/5 保持不變。

## 本次成果
- `pilot2026-rehearsal-bootstrap.js`：不匯入 Firebase SDK；只使用 `mission-form-adapter.js` 在瀏覽器本機檢查五關表單的必填文字與照片欄位，並回報文字欄位及照片數量。**不寫入 Firestore、不上傳 Storage、不呼叫 Functions、不建立完成狀態。**
- `scripts/build-pilot2026-rehearsal.mjs`：生成獨立 `.firebase-preview/pilot2026-rehearsal.html`、`.js`，五關都可練習按下「提交」，但實際只是本機檢查。獨立 localStorage key，不覆寫正式網站或先前學生測試草稿。
- `scripts/build-combined-five-preview.mjs`：打包演練頁時同時保留原有五關唯讀頁、第三關受控頁及教師後台。
- `tests/pilot2026-rehearsal.test.mjs`：確認原始網站、原有試辦開關與教師後台未變動，演練端沒有 Firebase 依賴，且不會本機偽造 completed。

## Cloud Shell 驗證（僅在本機建置，不部署）
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:pilot2026-rehearsal
npm run test:combined-five-preview
npm run test:pilot-nondeployment
```

成功後產物在 `.firebase-preview/pilot2026-rehearsal.html`。目前**沒有新的公開網址**。若稍後要從手機測試，必須先審核產物並部署到隔離的 Hosting 測試頻道，不能直接改正式 GitHub Pages 或 Hosting live；如果使用既有 `auth-test`，必須合併建置以保留既有 teacher/pilot 頁。

## 演練與正式提交的差別
- 演練：可以看五關、填文字、選測試照片、檢查是否有漏填、看到檢查訊息；所有已完成印章維持 0/5，中央終極任務維持鎖定。
- 真正雲端試辦：須先建立 `pilot2026` 的私密邀請碼、實際後端的**最小權限**活動白名單與 Firestore／Storage 規則、教師後台活動切換；經隔離環境及測試人員驗證，再由教師明確同意部署。
- 演練使用原來的本機草稿／圖片處理流程，測試照片可能保存在裝置 localStorage，因此請只使用測試圖片，勿拍到學生正臉或可辨識個資；不代表手機照片容量、儲存權限及弱網均已通過實測。

## 本階段的限制
此頁面**完全不建立或使用 Firebase 匿名身分**，也不模擬小組真實同步進度。它的目的是讓教師先驗收五關完整的提交操作體驗，避免為了趕上線而提前打開雲端寫入。此前的 `demo2026/group01`、S02/S03、教師資料不變。
