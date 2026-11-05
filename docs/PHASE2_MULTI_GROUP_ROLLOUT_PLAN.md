# 台北島第二階段：多組學生正式上線開發與驗收計畫

狀態：**規劃完成，尚未實作或部署**  
原則：既有 `pilot2026/group01` 五關、TEST01/TEST02、照片、QR、教師後台及圓山／酒泉街最終謎題**全部保留**。所有工作先在獨立開發分支與 Firebase Emulator 完成；不得清除 Firestore/Storage 既有資料或以 `firebase deploy` 全量部署。

## 現有程式查核（2026-11-05）
- `functions/pilot-scope.js` 保留 `pilot2026` 的三組未來提案，但實際 Stage1–5 Cloud Functions 的獨立 allowlist 仍只允許 `pilot2026/group01`；不能假設 group02/group03 已可提交。
- `group-service.js` 的邀請碼是 48 字元一次性 token，匿名帳號加入後，本機快取含 UID、活動、組別；`resumeGroup` 必須與同一匿名 UID 對應。換手機/換瀏覽器**無法自動恢復原匿名 UID**，應提供教師可審核的復原流程。
- `teacher-dashboard.js` 活動白名單目前只有 `demo2026` 與 `pilot2026`，正式新活動須明確加入。
- `firestore.rules` 根目錄檔案是 deny-all 安全起點；**不是**已部署的實際 Firestore 規則。調整前必須從 Firebase Console 匯出並核對線上規則，禁止以根目錄的 deny-all 檔案直接覆蓋。
- `mission-upload-recovery.js` 已具備失敗重試編排、照片固定不可覆寫與同內容再利用策略，但仍需實際斷網、重新整理、跨裝置、半數照片已上傳的測試。
- `firebase.json` 的 Hosting 指向 `.firebase-preview`；既有 `auth-test` preview channel 有效期限，不應作為正式發給全班的永久網址。
- Stage5 伺服器已獨立檢查 Stage4 完成；正式版還須檢查每組的各關順序、跨組讀寫禁止與重複提交競態。

## 架構決策（建議，尚未啟用）
1. 建立獨立正式活動 ID，例如 `taipei2027`，勿複用或改名 `pilot2026`。當活動日期確定後才固定 ID。
2. 正式活動資料走 `activities/{activityId}/groups/{groupId}/missions/{missionId}`；照片走 `activities/{activityId}/groups/{groupId}/missions/{missionId}/{uploaderUid}/{photoKey}.jpg`，維持既有 5 關欄位契約。
3. 將五個獨立 Callable 的授權範圍擴充為「正式活動已核准的 group 清單」，優先以伺服器持有的 manifest/活動設定控制，**不得信任客戶端提供任意 groupId 或活動 ID**；單組試辦 Callables 保持原樣。
4. 正式活動的使用者、邀請碼、角色與進度必須完全隔離；教師後台增加活動切換及每組狀態，不顯示多餘的學生個資。
5. 授權條件需排除 revoked=true 成員；教師角色需經權限核實。從不同組 UID、跨活動 UID、未登入者不能讀寫不屬於自己的內容。

## 六個工作包與驗收

### A. 凍結試辦、建立正式活動設定
- 記錄已驗收 Git commit/tag、部署版號及 Firebase Rules 備份；核對 `pilot2026/group01` 五關與每關照片數。
- 新增正式活動配置、建立活動與小組的 dry-run；任何實際寫入需雙重明確確認、create-only、不得覆寫舊活動。
- **通過：** sandbox 建立新活動後，pilot2026 每個任務 doc、物件路徑與教師權限維持不變。

### B. 三組六支手機：多組加入、同步與隔離
- 先在 Emulator 建立 A/B/C 三組各兩名匿名學生，總共 6 個 UID，讓各組獨立提交五關。
- 測試同組一人提交另一人進度同步；A 組完成不能替 B 組加印章；不同組不得上傳、讀取、覆寫對方照片；任務不可重複提交；關卡完成順序受後端檢查。
- 邀請碼只用一次、不同活動不能跨用、成員撤銷後立即失去存取權限。
- **通過：** 6 支手機／三組互不污染，5/5 僅解鎖完成組別；跨組與未授權攻擊全拒絕。

### C. 教師後台正式活動管理
- 教師可在試辦/正式活動間切換，顯示每組 0–5/5、完成狀態、提交時間、照片與錯誤提示。
- 設計教師安全補救流程（補發邀請、撤銷身分、遇到裝置遺失時復原）；任何重設或補交須稽核，不提供學生自行覆寫成果。
- **通過：** 三組同時提交時後台各組獨立、五關與照片準確、無學生跨組敏感資料外洩。

### D. 戶外異常復原
- Wi-Fi/行動網路切換、離線、第三張照片失敗、上傳後 Callable 超時、頁面重新整理、照片重新選取、重複點擊提交。
- 不可宣稱跨裝置自動恢復匿名身分。要另外設計「教師審核的轉移/復原」或明確採用原裝置復原策略。
- **通過：** 已提交的任務永不重複，3 張照片完整驗證，未完成任務提供清楚提示；本機草稿丟失不影響已完成的雲端資料。

### E. 行動平台與現場測試
- iPhone Safari、Android Chrome：QR 登入、相機/相簿、JPEG 壓縮、各欄位、大小、斷網、返回、鎖屏、教師後台。
- 在真實走讀區域至少演練訊號弱的狀況，確認網路流量與 Firebase 使用量/配額是否足夠；預估同時寫入尖峰及儲存量。
- **通過：** 兩平台全部能完成、照片清晰、不需要退出重登或清除網站資料。

### F. 備份、隱私、正式 Hosting 與上線
- 在正式學生資料產生前訂出資料保存期限、可拍攝內容與肖像/個資告知、緊急聯繫/求助方式；教學結束後有權限受控的刪除/匯出方案。
- GitHub 不存正式邀請碼、Auth UID、學生照片或私密資料。Firestore/Storage 要有獨立備份、復原驗證及存取權限分離。
- 現有 `auth-test` 仍保留試辦；正式 Hosting 使用明確且穩定的網址、檢查 Firebase Authorized Domains、CORS、Auth、Storage/Firestore Rules；不可使用未設限的全量部署。
- 上線前在 Emulator、獨立預覽與小規模現場演練分層驗收。
- **通過：** 完整備份可還原、正式活動權限通過負面測試、多組現場演練、沒有影響 pilot2026。

## 建議分批實作與發布閘門
- **Gate 0：** 試辦快照及線上 Rules 備份、確認原版不受改動。
- **Gate 1：** 新活動配置、3 組模擬與 Cross-group 權限測試，全部在 Emulator。
- **Gate 2：** 教師後台與手機介面在僅供測試的 Hosting preview；不得寫入 pilot2026。
- **Gate 3：** 異常復原與 iPhone/Android、六裝置壓力演練。
- **Gate 4：** 隱私/備份審核、正式域名與明確指定資源的發布。
- **Gate 5：** 先一組小範圍正式試營運，後擴至全班；若異常停止新提交、保留資料、可回退 UI/Functions 版本而不刪除紀錄。

## 第一批優先工作（尚未執行）
1. 將已驗收的第一階段 commit/tag 凍結。
2. 備份並比對 Firebase Console 的 Firestore 和 Storage **實際發布** Rules。
3. 製作正式活動 manifest、乾跑建立資料腳本、3 組權限與提交 emulator test。
4. 不修改既有 `pilot2026` Functions，不新增線上學生/活動資料，不部署。

## 驗收總原則
每項結果需同時有：自動化 emulator 測試（包含拒絕未授權）、學生手機驗收、教師後台驗收、既有 pilot2026 回歸檢查。任何一步失敗，**不進入下一個部署閘門**。

## 第二階段 A — 第一批實作紀錄（僅 GitHub，未部署）

已新增：
- `phase2-rehearsal-manifest.js`：`phase2sandbox`、`group01`–`group03`、每組 2 人、五關；**projectId 強制 demo 開頭**，禁止把 `pilot2026`／`demo2026` 當作新演練活動。
- `scripts/phase2-three-groups-dry-run.mjs`：只列出群組和六位模擬學生的預定路徑，**完全不產生雲端寫入**。
- `docs/storage-phase2-rehearsal-emulator.rules`：只用於本機模擬器，繼承 Stage5 已驗收的照片欄位限制，同時讓 `phase2sandbox` 的三組通過；**不得發布到線上**。
- `firebase.phase2-rehearsal-emulator.json`：只啟動本機 Firestore／Storage。
- `tests/phase2-manifest.test.mjs`：活動隔離與 dry-run 內容。
- `tests/phase2-three-groups-rules.test.mjs`：三組六位模擬學生的讀取、各組照片上傳、拒絕跨組、不可自行建立任務完成紀錄、保護原 `pilot2026` 的權限測試。

### 第一批 Cloud Shell 指令（不部署）
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run phase2:dry-run
npm run test:phase2-manifest
npm run test:phase2-three-groups-rules
```

預期 manifest 測試通過 4 項，Storage/Firestore 模擬器測試通過 6 項；實際結果以 Cloud Shell 為準。本批僅測試**規則與資料隔離**，尚未完成真正的「三組各自五關 Cloud Function 提交」整合測試，也未建立正式活動或可供學生連入的正式網站。

### 下一批仍需開發
1. 可設定正式活動 ID 與群組清單的**正式版 Callable**，仍須伺服器授權與各關順序驗證，原 `pilot2026` Functions 不得修改。
2. 六位匿名學生的邀請碼交易／同組進度同步、五關端到端模擬器測試。
3. 教師後台活動切換與多組實機驗收、現場網路異常復原、資料保護與正式發布。

此批只修改 `feature/firebase-sync` 開發分支，**絕不可使用 `firebase deploy` 或替換線上 Firestore/Storage 規則**。

## 第二階段 A — 第二批：三組五關提交整合測試（待 Cloud Shell 驗證）
- 新增 `functions/test/phase2-three-groups-submission.test.mjs`，使用 **demo-taipei-isolated-pilot** 模擬專案，透過伺服器既有 `createSubmissionHandler` 的 emulator-only 注入 scope 測試 `phase2sandbox`。
- 三組各兩人；預期測試：缺照片不能完成、同組不同成員分別提交任務、跨組拒絕、匿名身分限制、相同關卡不得重複、三組各自五關、原 `pilot2026` 不被建立或修改。此測試**不代表已經完成正式版 Callable 部署**；它只驗證可複用的後端提交核心。
- 此批沒有修改線上任何 Cloud Function 或 Firebase Rules。
- 驗證指令：
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:phase2-three-groups-submission
```
- 預期 6 項測試通過；未於 Cloud Shell 執行前**不得宣稱已通過**。

**尚未完成：** 兩名成員真實 Auth 邀請交易、跨手機即時同步、正式活動專用 Function 與順序約束及更完整的 3 組 6 手機端到端測試。必須先在模擬環境中逐項完成才可進入正式部署。
