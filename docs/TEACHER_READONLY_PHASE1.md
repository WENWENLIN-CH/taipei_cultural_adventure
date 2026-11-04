# 台北島教師後台｜第一版（獨立唯讀預覽）

本階段新增 `teacher-dashboard.html` 和 `teacher-dashboard.js`，**未部署**，正式 GitHub Pages 和原本 S02、S03 學生預覽網頁均未修改。

## 第一版功能（後續仍要核對教師端最終四項需求）
1. 教師使用 Firebase Authentication 電子郵件密碼登入。
2. 透過 Firestore `teacherAccess/{uid}.authorized == true` 驗證角色；一般登入不代表教師授權。
3. 讀取 `demo2026` 的小組清單與每組五關完成數。
4. 讀取各組各關文字答案、提交者代碼／時間、授權可讀的 Storage 照片。不顯示加入碼或完整 UID，也無任何資料修改／刪除功能。

**提醒：** 這是唯讀檢視第一版，並不等於四項正式教師功能都已完成。需要後續確認、測試和補齊。

## 部署之前請先執行（只建置，不部署）
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:teacher-preview
```

通過後仍不可直接宣稱教師登入成功。要先在 Firebase Authentication 建立獨立教師帳號（避免使用匿名測試者 S02／S03），並由具有管理權限者在 Firestore `teacherAccess/{teacher UID}` 設定 `authorized: true`。此動作需要現場明確確認身分與角色，切勿以電子郵件或密碼本身判定是否授權。不要在對話、GitHub 或截圖透露密碼。

### 實際環境注意
- 瀏覽器使用另一個 Chrome 設定檔操作教師後台，不要在 S02 或 S03 的登入工作階段使用教師登入功能，以免登出匿名帳號。
- Firestore 已部署規則需允許 **授權教師** list groups/get missions，以及 teacherAccess 個人文件讀取；不要放寬學生權限。
- 照片使用 Storage SDK 的 `getBlob` 讀取受權限控制的檔案，**不產生公開 downloadToken URL**。跨來源讀取可能需設定 Cloud Storage CORS；若圖片讀不到，要先確認安全規則與 CORS，而不是設成公開。
- 照片以暫時 object URL 顯示，換小組或離開頁面時釋放。
- 第三關示例使用 S02 已經完成的 `demo2026/group01/missions/3` 測試資料；第一關是管理員手動建立的模擬記錄。
- 學生匿名身分遺失問題及教師補拍核准仍需後續設計。
- 本頁目前沒有教師新增邀請碼、變更關卡、重設進度等操作，避免無意中更動已完成資料。
