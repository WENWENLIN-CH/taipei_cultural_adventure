# 小組加入測試準備（尚未正式開放）

## 已建立的檔案
- `group-service.js`：以匿名 UID 搭配一次性邀請碼，原子交易建立小組成員紀錄。
- `group-test.html`：加入碼與五關唯讀進度的測試頁。
- `docs/firestore-group-draft.rules`：**未發布**的 Firestore 安全規則草案，禁止學生自行修改已完成資料。
- `scripts/build-preview.mjs`：已加入 group-test.html 及 group-service.js，未部署。

## 小組加入的資料條件
由受信任的專案管理者（不是學生網頁）事先建立：
```
activities/demo2026/groups/group01
  displayName = "第一組"
invites/{48位隨機十六進位加入碼}
  activityId = "demo2026"
  groupId = "group01"
  studentCode = "S01"
  claimedBy = null
```
每個學生各領一個不同的 48 位隨機碼。邀請碼屬於存取憑證，不要貼到公開 GitHub。

## 待驗證的安全與邊界案例
1. 未登入者不可讀小組或邀請碼。
2. 持有邀請碼的匿名帳號可原子地領取一次並建立相符的 member 文件。
3. 同一邀請碼不能被第二個帳號領取（含兩台裝置競爭）。
4. A 組成員不能讀 B 組的關卡。
5. 學生不能自行建立或修改 teacherAccess、missions 或 final。
6. 學生重新整理後仍可憑本機小組指標與 Firestore member 驗證恢復進度；登出則清除本機指標。
7. 教師權限需由管理者建立，電子郵件登入成功本身並不代表教師權限。
8. 必須先用 Firebase Emulator 或隔離測試專案驗證安全規則，再部署真正資料庫規則。

## 避免誤操作
- 不要執行 `firebase deploy --only firestore:rules`；目前 `firestore.rules` 仍是全面拒絕，草案另放 docs。
- 不要將 Firestore 設成 `allow read, write: if true`。
- 不要用真實學生姓名、照片進行測試。
- 預覽頻道目前只含已發布的認證測試頁；更新 GitHub 後必須在 Cloud Shell 執行 git pull、重新 build 並部署，才能看到新的測試頁。
