# CHANGELOG — st8925lab.com 規格變動與決策紀錄

本檔記錄根目錄 `PROMPT.md` 的變動與原因，最新在最上方。2026-10-17 之前的歷程記在 `README.md`（不搬移、不改寫）。


[2026-10-17_21:55:07] 更新紀錄（secure-messenger-chatops，根目錄 PROMPT.md 不變）

**討論過程**：山姆哥指示先修上次列出的兩個問題，並把頂列徽章去掉 `P04 · ` 前綴。他提供的 `PROMPT_v11.md` 經查是 2026-09 的根目錄網站規格舊版，不含本頁內容，不能當本頁規格。

**最終決策**：
- 手機版（≤ 760px）：頻道列由「整欄隱藏」改為頂部可橫向捲動的頻道條，呼叫鈕保留；標題徽章隱藏，返回鈕縮為「← ORBIT」。
- 離線時「呼叫山姆哥」、`/notify` 與浮動視窗改為明講「目前離線，通知未送出」；離線模式名稱由 `OFFLINE_LOCAL_QUEUE` 改為 `OFFLINE_NOT_SENT`（原名暗示有佇列重送，實際沒有）。
- 頂列徽章文字改為 `SECURE MESSENGER & CHATOPS`（`index.html` 靜態文字與 `js/main.js` 動態寫入同步）。

**變更原因**：原手機版 B／C 頻道無法切換、返回鈕被推出畫面；原離線訊息讓訪客以為已通知到本人。


[2026-10-17_21:19:42] 更新紀錄（根目錄 PROMPT.md 尚無版本表，故未標版本號）

**討論過程**：山姆哥要求檢查 `config.js` 並重新 commit。檢查發現 `config.js` 只改一行，把 id `04` 指向新資料夾 `secure-messenger-chatops/`，但該資料夾未進 git，`project-04/` 的刪除也未進 git；單推 `config.js` 會讓線上 04 號環 404。新資料夾另附一個 Cloudflare Pages Function（`functions/api/[[route]].js`），本站是 Worker 部署，它不會執行；頁面呼叫的 `/api/status`、`/api/messages`、`/api/ai`、`/api/telegram` 在現行 `worker/index.js` 一律回 404。

**最終決策**：山姆哥選 A ——只上線前端，並列為功能凍結的例外。
- id `04` 改為 `SECURE MESSENGER & CHATOPS`／`secure-messenger-chatops`，移除 `project-04/` 佔位頁。
- 首頁導覽 `RESPONSIVE_LABELS['04']` 改為 `SECURE MESSENGER`／`MESSENGER`／`P04`。
- `functions/` 列入 `.gitignore` 與 `.assetsignore`，後端改寫進 Worker 之前不進公開 repo。
- 頁面在無後端時走瀏覽器本機模式（BroadcastChannel／localStorage）；AI、Telegram、跨裝置同步皆為離線降級。
- `secure-messenger-chatops/PROMPT.md`、`README.md` 是改名工具從舊佔位頁複製的內容，與現行程式不符；檔首已加過時警告，正式重建規格列待辦。

**重大錯誤／問題**：發佈前覆核新程式，修正兩處 XSS 隱患（原檔就地修）：
- `js/ui-controller.js`：訊息的 `role`、密文的 `iv`／`fingerprint` 未跳脫就寫進 HTML；附件網址未限制協定。改為一律跳脫，附件網址只接受 `data:`／`blob:`。
- `js/widget-embed.js`：浮動視窗 `appendBubble()` 把訊息與 AI 回覆直接寫進 `innerHTML`，改為跳脫。

**變更原因**：目前訊息只來自同一瀏覽器，無法跨使用者利用；但後端一接上，訊息會來自任何訪客，屆時即成儲存型 XSS，故先修。
