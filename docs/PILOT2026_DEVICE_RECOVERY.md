# 台北島 pilot2026 裝置恢復：第一版（教師管理指令）

## 使用情境
pilot2026/group01 的測試學生 TEST01 已在學校電腦透過一次性邀請碼加入。
如果改用家裡電腦或另一個瀏覽器設定檔，Firebase Anonymous Authentication 會產生**新的 UID**，已使用的舊加入碼不可重新使用。

**本方案不是移轉原 UID 或帳號憑證。** 管理者確認原有成員存在後，為**相同 studentCode、相同 group**建立新的高熵、一次性邀請碼，新 UID 透過既有 joinByInvitation() 加入原小組；五關成果仍儲存在小組層級，不會遺失。

本階段只限 pilot2026/group01/TEST01。沒有開放一般學生自行申請；不得拿它作其他組別的恢復。舊 UID 暫時保留（未撤銷），日後可另設教師審核與撤銷流程。

## 開發安全措施
- 腳本：`functions/scripts/issue-pilot2026-recovery.mjs`
- 預設 `--dry-run`：不載入 Firebase Admin SDK、不讀寫資料。
- 真正建立需 exact `--apply --project=... --confirm=...`，以及 `ALLOW_PILOT2026_RECOVERY=YES`、`GCLOUD_PROJECT=taipei-cultural-adventure`；偵測 Emulator 環境則拒絕。
- 先用 Admin SDK 確認原 group 文件存在並為 pilot，且原 studentCode 至少一個有效成員；只有 `invites/{random 48-hex}` 被建立。
- 不修改 `activities/pilot2026/groups/group01`、原 member、missions、`demo2026` 或 `teacherAccess`。
- 新 token 僅輸出到管理者私人 Cloud Shell，**不要貼進聊天室、截圖或 GitHub**。
- 現有 Firestore 規則與學生加入頁已具備單次兌領能力；無需調整 Storage、Functions 或 Hosting。

## 先跑安全測試（無雲端寫入）
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:pilot2026-recovery-issue
npm run pilot2026:recovery-dry-run
```

## 只有在管理者決定真的讓新裝置加入時，才執行
這會**真正新增一筆線上邀請文件**。當下不能由一般網頁操作者操作，需要 Cloud Shell 具備受授權的 Admin 身分與專案權限。

```bash
GCLOUD_PROJECT=taipei-cultural-adventure ALLOW_PILOT2026_RECOVERY=YES node functions/scripts/issue-pilot2026-recovery.mjs --apply --project=taipei-cultural-adventure --confirm=ISSUE_PILOT2026_GROUP01_TEST01_RECOVERY
```

若出現缺套件錯誤，先檢查已安裝於 functions 的 SDK／Node module resolution；**不要**因錯誤重複執行此 apply，以免重複發碼。請優先確認邀請資料庫中是否已有未領取的恢復碼。

將私密新碼輸入家中 Chrome 的 `pilot2026-stage1-live-quest.html` 學生加入欄位，先點「學生匿名登入」再按「加入小組」。只能兌領一次；成功時顯示 group01、TEST01 與共享進度。換機後原 UID、localStorage 的未提交草稿不會跟著移動，**雲端共同進度會同步**。

## 必須知道的限制
1. 此版本屬於**組員資格補發**，不是原 Firebase 登入帳號恢復。
2. 原裝置的成員資格不會自動撤銷；遺失／遭竊裝置需要獨立撤銷機制。
3. Code 洩漏前被別人領取，即可能取得小組存取權，因此只能私密傳送、只使用非個資照片，且不應用於正式學生資料。
4. 如果 TEST01 的第一關已由另一台裝置完成，第二台只能看到 1/5，不能重複交件。
5. 不要重新運行 `prepare-pilot2026-stage1.mjs --apply` 或刪除原邀請、成員與任務。
