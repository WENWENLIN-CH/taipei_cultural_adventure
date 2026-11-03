# 台北異文化闖關 3.0 — Firebase 整合規格（開發分支）

> 本檔為設計規格，不代表 Firebase 已連線或安全規則已部署。正式網站 main 不受此分支影響。

## 已定稿需求
- 每位學生各用一台手機，同組共享五關進度。
- 每組每關只提交 **一份** 共同成果；必須先成功上傳必要照片與答案，經伺服器確認後才算完成。
- 不必教師審核；老師事後只能查看：(1) 各組五關進度 (2) 每關答案與照片 (3) 實際提交組員與時間 (4) 哪些組別已解鎖最終任務。
- 五關完成時自動解鎖圓山／酒泉街最終謎題。
- 保留五關原內容、Q 版台北島、拍照、原本備援解鎖概念及本機草稿；備援解鎖要重做權限檢查，不得相信前端密碼。
- 活動操作宜允許五關自由順序；不得讓一個學生的草稿覆蓋其他人的資料。

## 技術選型
- 網頁：維持 GitHub Pages + 原生 HTML/CSS/JS；使用 Firebase Web SDK 的 browser modules，不需要 npm。
- Auth：學生匿名驗證；教師 Email/Password 驗證。Auth UID 不等於小組權限。
- Firestore：共享小組進度和成果 metadata；監聽 group 的關卡文件，讓同組即時同步。
- 照片：**不能把 base64 圖片寫到 Firestore**。需另用檔案物件儲存（Firebase Storage 需要 Blaze 帳單方案），Firestore 只儲存 photo path。正式上線前必須選定並測試。
- localStorage：只保存本機未提交草稿。前端 UI 必須顯示「上傳中／等待伺服器確認／已完成」。
- Firebase Console 中預設 `allow read, write: if false` 保持不變，直到真正設計、測試並部署細粒度規則。

## 建議 Firestore 結構（提案）
```text
activities/{activityId}
  title, isOpen, createdAt
activities/{activityId}/groups/{groupId}
  displayName, createdAt
activities/{activityId}/groups/{groupId}/members/{uid}
  studentCode, joinedAt
activities/{activityId}/groups/{groupId}/missions/{missionId}
  status: "completed", submittedByUid, submittedByCode, submittedAt, answers, photoPaths
activities/{activityId}/groups/{groupId}/final/{finalId}
  solved, solvedAt
teacherAccess/{uid}
  authorized: true
```
- 建議資料庫以每關獨立文件存一份正式成果。尚未提交 = 文件不存在；必要時設計不可任意覆寫的安全規則。
- 已完成關卡數由 5 個 mission 文件推算；最終謎題解鎖狀態由 5 關是否全完成推導，避免前端任意寫入 unlocked=true。
- 所有 submittedAt 使用伺服器時間；submittedByUid 與 auth.uid 綁定。
- 教師若必須查看所有照片，檔案讀取權限不能直接設為公開。

## 必須先解決的授權問題
- 學生不能只輸入「第一組」就獲得第一組讀寫權限。需要每位學生專屬加入憑證或受信任的加入流程，並防止猜測／重複冒用。
- `teacherAccess/{uid}` 必須由受信任的管理者建立，且 **任何學生端／普通使用者不得自行建立或修改**。
- 學生只准讀自己加入的小組；只准建立自己小組尚未完成的指定任務；不可任意重寫已提交結果、其他組資料或教師權限。
- 教師只讀所需資料；如果保留緊急解鎖，要用受保護的教師操作，不得由使用者任意設 teacherUnlocked。
- 同時提交應確保「最多一份有效完成成果」：使用 create-only 安全規則及資料檢核，並在 UI 處理已被其他組員先提交的情況。
- 需測試四台手機、重複提交、斷線後重送、刷新網頁、教師登入錯誤權限、匿名身分遺失等案例。
- 身分資料最小化；避免儲存不必要學生個資與人臉，活動結束後清除照片及個資。

## 實作順序
1. 先確認目前 GitHub 現況、資料儲存方式，保留 main。
2. 建立獨立開發分支與本設計文件、安全預設規則。
3. 決定學生加入組別的安全憑證流程及照片儲存方案（涉及成本）。
4. 建立 Firebase 初始化、匿名登入、教師登入與資料規則；先使用假資料測試權限。
5. 學生任務提交：文字與照片先上傳成功 → 建立單一 Firestore 完成文件 → 同組即時更新。
6. 增加 teacher.html：只提供四項已定稿功能。
7. 實際多手機與不同網路測試，確認後才合併到 main。

## 目前狀態
- Firebase 專案、Firestore、Auth 提供者和 Web App：使用者已在 Console 建立。
- Console Firestore 規則：`allow read, write: if false`。
- 開發分支僅供設計及實作；尚未連線、尚未儲存雲端照片、尚未部署任何 Firestore 規則。
