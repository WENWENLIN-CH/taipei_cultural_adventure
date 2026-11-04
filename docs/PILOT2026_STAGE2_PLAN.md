# 台北島 pilot2026 第二關開發候選版

## 已完成的實機驗收
- 第一關 `pilot2026/group01/mission1` 已完成 1／5 並可於教師後台看到照片。
- TEST02 用手機掃 QR Code、加入 group01、同步 1／5、重新整理與關閉重開自動恢復都成功。

## 第二關資料格式
- 任務：異國文字解密，`missionId:2`
- 答案：`lang1_lang`、`lang2_lang`、`lang3_lang`、`lang4_lang`，需為四種不同語言。
- 照片：`lang1_photo`、`lang2_photo`、`lang3_photo`、`lang4_photo`，每張獨立上傳 JPEG 且不超過 1 MiB。
- 保持每組任務只能提交一次，真正完成狀態必須來自 Firestore。
- 繼續限制活動 `pilot2026`、組別 `group01`、關卡 `2`。
- 本階段不重新提交第一關、不清理任何 TEST01/TEST02 成員或共用任務資料。

## 安全分段
1. 新增 `pilot2026-stage2-submission.js`、`functions/pilot2026-stage2-authorization.js` 和獨立後端候選入口。**尚未引用到已部署的 Functions index**。
2. 先執行候選規則、驗證、整合測試；第二關提交按鈕**不應透過既有第一關頁面開放**。
3. 另行審核 Storage 規則中僅增加 pilot2026/group01/mission2 的四個 photo slots；保留 demo2026 與第一關的既有授權。
4. 第二關 callable 與 Storage 規則均通過模擬測試後，才產生獨立 Stage2 Hosting 預覽頁與明確的部署說明。
5. 用非學生個資照片實測；第二關成功後才繼續關卡 3、4、5。

## 本次交付
僅程式碼候選、權限限制、單元測試和規劃文件，不會新增雲端資源、發布網站或修改第一關成果。
