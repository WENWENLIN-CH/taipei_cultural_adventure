# 台北島｜第二階段：其餘四關雲端提交盤點與測試

日期：2026-11-04。這一階段**僅更新 GitHub 開發分支**，不部署 Hosting、Functions、Firestore／Storage 規則，不讀寫正式 Firebase 資料。第一階段快照 `stable/2026-11-04-firebase-milestone1` 保持不動。

## 五關表單與照片對照

| 關卡 | 必填文字欄位 | 照片欄位 | 雲端正式狀態 |
| --- | --- | ---: | --- |
| 1 星月偵查員 | `location` | `photo1`：1 張 | 尚未真正提交；`group01/missions/1` 是既有手動模擬完成紀錄 |
| 2 異國文字解密 | `lang1_lang`～`lang4_lang`，須四種不同語言 | `lang1_photo`～`lang4_photo`：4 張 | 尚未正式實測；S02 曾上傳舊照片，缺少 SHA-256 |
| 3 Halal 大搜查 | `restaurant` | `photo1`、`photo2`：2 張 | **已在第一組正式受控測試成功**，勿覆寫 |
| 4 環遊世界美食家 | 各 `c1/c2/c3` 的 `continent`、`country`、`restaurant`，須三個不同洲 | `c1_photo`～`c3_photo`：3 張 | 尚未正式實測 |
| 5 揭秘南洋商店 | 各 `p1/p2/p3` 的 `country`、`name`，須三個不同國家 | `p1_photo`～`p3_photo`：3 張 | 尚未正式實測 |

每組五關合計 13 張照片，三組理想情況共 39 張；這不包含補拍、失敗重試、教師示範。單檔目前上限為 1 MiB，預估 39 張最多約 39 MiB（不含中繼資料與其他費用）；真正的 Storage 成本與網路流量要另外監控。

## 現有實作已具備的能力
- `script.js`：五關表單；`mission-form-adapter.js`：原始欄位對接；
- `mission-schema.js`、`functions/submission-core.js`：五關必要欄位與唯一性規則；
- `photo-upload.js`：登入組員上傳固定欄位 JPEG；相同 SHA-256 允許恢復，但不同照片不可覆蓋；
- `functions/submission-handler.js`：驗證組員、照片路徑、Storage 物件與 JPEG 標頭，Firestore 原子地建立一次完成紀錄。
- **正式部署的 `functions/index.js` 仍只允許 `demo2026/group01/mission3`**，這輪不改動限制。

## 新增的第二階段測試（只對 Firebase Emulators）

`functions/test/four-missions-callable.test.mjs` 對 1、2、4、5 關各執行六個案例：
1. 尚未上傳照片，必須拒絕；
2. 未加入小組的學生不能提交；
3. 指定張數的 JPEG 均已上傳，能建立一次完整成果；
4. 同組另一位學生不能覆寫；
5. 必填文字或重複語言／洲別／國家必須拒絕；
6. 不同關卡的照片路徑不能混用。

每個案例都建立在獨立 `demo-taipei-callable` 模擬專案。專案 ID 硬性檢查、所有 Emulator 環境變數必須存在；**不可把這項測試改指向正式 taipei-cultural-adventure**。

## Cloud Shell 驗證（未執行前不能宣稱通過）

```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:form-contract
npm run test:four-missions-emulator
```

若模擬器尚未安裝必要依賴，請先檢查 `npm ci`／`npm --prefix functions install`，不要因此切換到正式專案驗證。模擬器過關後，再決定是否新增獨立、**非正式活動**的受控預覽流程。

## 必須先解決的教學現場問題
- 第一關既有 mock `completed` 會導致第一組無法重新提交第一關；不能直接刪除正式測試紀錄，要另設測試小組／活動。
- 第二關以前上傳的舊照片缺少 SHA-256；不能假設同一照片能覆蓋。
- 當學生換裝置或清除瀏覽器資料時，匿名 UID 不會自動恢復；後續需安全的重新加入機制。
- 上傳 4 張照片的關卡最容易遇到部分成功與 localStorage 容量問題，要新增恢復和補拍流程。
- 需確認照片上傳的內容是否合適、安全、遵守學生影像隱私規範；後端目前只驗證檔案格式，不會辨識招牌、語言或商品是否符合題意。
- 待教師審核／補拍權限、整組同時提交競爭、五關全過關的最終謎題驗證，以及三組跨組隔離測試完成，才可能正式開放。

## 本次禁止動作
不得執行 `firebase deploy`、更動正式 Cloud Function 提交白名單、刪除 `missions/1`／`missions/3`、刪除既有照片、修改 teacherAccess 或推送到 `main`／穩定快照分支。
