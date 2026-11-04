# 台北島｜第一階段已驗證里程碑保全紀錄

**記錄日期**：2026-11-04（台灣時間）  
**專案**：`WENWENLIN-CH/taipei_cultural_adventure`  
**固定快照分支**：`stable/2026-11-04-firebase-milestone1`（由本文件提交後的開發分支 commit 建立，不在此分支繼續開發）
**用途**：保存程式碼、測試、公開設定與手動復原清單，不是線上 Firebase 資料庫備份，也不是正式上線。

## 已由操作紀錄實際驗證
- Firebase Authentication：教師電子郵件登入、學生匿名加入 S02/S03。
- Firestore：`activities/demo2026/groups/group01`，`missions/1`（模擬完成資料）、`missions/3`（S02 已提交的實際測試成果）、`teacherAccess/{教師 UID}`。
- Firebase Storage：第三關 photo1、photo2 已成功上傳，且教師後台成功顯示兩張測試照片。
- 後端：第二代 Cloud Function `submitGroupMission`、`asia-east1`，正式僅開放 `demo2026/group01/mission3` 受控提交。
- 小組進度：S02、後加入的 S03 都顯示 2/5；教師後台可讀取文字答案、提交時間與照片。
- 安全規則：Firestore 模擬器 24 項測試通過，正式安全規則已部署；Storage 模擬器安全規則測試曾通過並部署。
- Hosting：獨立 Firebase Hosting 測試頻道 `auth-test`（原本學生預覽、受控提交頁、教師後台）；`auth-pilot` 是先前測試頻道。此類預覽頻道有到期時間，不應把 URL 當作永久備份。

## 版本庫應保留／可重建的內容

| 類別 | 檔案 |
|---|---|
| 原始網站 | `index.html`, `script.js`, `style.css` |
| 身分與小組 | `firebase-auth.js`, `firebase-config.js`, `group-service.js` |
| 闖關、照片與提交 | `cloud-quest-bootstrap.js`, `mission-*.js`, `photo-*.js` |
| 教師後台 | `teacher-dashboard.html`, `teacher-dashboard.js` |
| Cloud Function | `functions/index.js`, `functions/submission-*.js`, `functions/package.json` |
| Firebase 規則 | `docs/firestore-group-draft.rules`（**已部署的實際規則內容，但檔頭仍帶舊 DRAFT 註記**）、`storage.rules` |
| 部署／模擬器設定 | `firebase*.json`, `config/storage-cors-auth-test.json` |
| 建置與測試 | `scripts/*.mjs`, `tests/*.mjs`, `functions/test/*.mjs` |
| 文字記錄 | `docs/*.md` 與本清單 |

**注意**：`firestore.rules` 是倉庫中另一份舊規則檔，**不能**把它誤當正式已部署的版本。正式規則之前透過 `firebase.emulator.json` 指向 `docs/firestore-group-draft.rules` 發布；未來要發布前必須核對實際目標檔案。

`config/storage-cors-auth-test.json` 保存的是使用者已確認套用的公開來源設定。CORS 是 bucket 設定，不等於 Storage 安全規則；快照紀錄不能證明未來雲端狀態一直不變。

## 絕不加入 GitHub 的資料
- `test-invite-codes.txt`、`s03-test-invite-code.txt`、任何一次性邀請碼及其他存取憑證。
- Firebase Authentication 密碼、登入 token、Cloud Shell 身分認證資料、服務帳號私鑰。
- 可辨識學生資料、私人照片、Firestore 實際內容匯出、Storage 物件檔案。
- `.firebase-preview/`、`.firebase-pilot-preview/` 等建置產物和本地 `cors.json` 臨時副本。
- Firebase Web config 中的 `apiKey` 是 Firebase 用戶端應用程式設定，**不是**管理員金鑰；資料安全仍依賴 Auth 與 Rules，不能只靠隱藏此設定。

## 雲端資料保全（本次**未執行匯出**，資料保持原狀）
1. **Firestore**：應於受限制的備份儲存位置進行管理員匯出，記錄來源專案、資料庫、匯出時間、位置及還原驗證結果。匯出需檢查權限與可能費用，切勿放入公開 GitHub。
2. **Storage**：照片存在 bucket `gs://taipei-cultural-adventure.firebasestorage.app`，需另行建立存取受限的物件備份，保留路徑及中繼資料；不要把它設為公開。
3. **Authentication**：匿名 UID 仍可能因瀏覽器資料清除而無法在原裝置恢復；保存成員資料並不等於恢復匿名登入。教師帳號密碼及認證憑證不得放入 GitHub。
4. **環境狀態**：記錄 Firebase Hosting 預覽頻道版本／到期時間、實際部署的 Function 版本、Firestore／Storage 規則、Bucket CORS 設定、計費預算提醒及必要 API；它們不會自動隨 Git 分支還原。
5. 若要真正具備災難復原能力，**必須有一次離線或獨立位置的受控匯出與還原演練**。本次建立的快照只能復原 GitHub 原始碼。

## 重建與驗證指令（請先在獨立工作區操作）
```bash
git fetch origin
git switch --detach origin/stable/2026-11-04-firebase-milestone1
npm run test:teacher-preview
npm run test:rules
npm run test:storage
npm run test:callable-emulator
```

以上只應在已安裝 Node/npm/Firebase CLI、並具有模擬器依賴的環境執行；測試成功才代表當下的程式環境通過。**不可把本段當作自動還原正式服務的指令。**

## 絕不隨意操作的正式線上資源
- `activities/demo2026/groups/group01`、`missions/1`、`missions/3`、`members/*`、`invites/*`、`teacherAccess/*`。
- 第三關實際 Storage 照片（沿用原有物件路徑）。
- `submitGroupMission` 正式 Callable、既有安全規則與 Hosting 正式 live channel。
- S02、S03 的測試會話，避免登出或清除瀏覽器儲存。

## 未完成與下一階段風險
- 第三關受控提交並非三組五關正式上線版本。
- 尚未驗證同時在線即時更新、全部五關提交／最終任務、學生換手機恢復、照片補拍與審核。
- Storage 下載的 JPEG 標頭檢查已修正並由使用者實際證明教師可以看到兩張照片。
- **不建議立即對正式學生部署**。先複製測試環境或規劃隔離活動與資料，再進行完整測試。
