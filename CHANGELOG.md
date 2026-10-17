# CHANGELOG — st8925lab.com 規格變動與決策紀錄

本檔記錄根目錄 `PROMPT.md` 的變動與原因，最新在最上方。2026-10-17 之前的歷程記在 `README.md`（不搬移、不改寫）。


[2026-10-17_23:48:29] 更新紀錄（根目錄 PROMPT.md §0 檔案清單、§4.1 第 6 點）

**討論過程**：山姆哥要求以 Secure Messenger 的字級為基礎，統一各子專案預設字型大小，並在各子專案加上 A- / 100% / A+ 控制鈕。實測各頁主要文字：P04 約 15–16px、Alarm 11px、KB 11px、IoT 12px、Travel 12.4px。提出 (a) 全部對齊 P04、(b) 折衷約 14px 兩案。

**最終決策**：山姆哥選 (b) 主要文字約 14px；Travel-Assistance 不做；並宣布取消功能凍結。
- 新增共用元件 `shared/fontscale.css`、`shared/fontscale.js`；P04 原本自帶的控制鈕邏輯改用共用元件。
- IoT、KB 的 `font-size` 由 px 改為 rem（89 處，含 `app.js` 動態產生的 HTML）。以 `--fs-boost: 1` 先跑瀏覽器回歸比對，與改前逐元素完全相同後，才調整倍率。
- Alarm 改 `tools/build_alarm_frontend.py` 的注入內容後重新建置；資產雜湊不變，只有 `index.html` 改變。
- P04 根字級 18px → 16px。

**重大錯誤／問題**：
- 放大後 KB 頂列的導覽分頁擠成三行、超出 64px 頂列。處理方式：頂列字級固定為原 px；≤1500px 收起裝飾用的「AI ENGINE ACTIVE」；≤1280px 跨專案連結只留圖示。KB 在 1024px 的頂列反而比改前好（改前已破版）。
- 375px 時 Alarm、IoT、KB 頂列被擠出畫面（IoT、KB 改前就是如此）。手機版改為收起跨專案連結。
- `tools/build_alarm_frontend.py` 在 Windows 上 `rmtree(assets)` 會因目錄被佔用而失敗，留下空的 `assets/`。已就地修正為「清空內容再複製」。

**變更原因**：各子專案字級落差達 5px（11px 對 16px），在儀表板頁面閱讀吃力；統一基準並提供使用者自行調整。


[2026-10-17_22:39:28] 更新紀錄（根目錄 `wrangler.jsonc`、`PROMPT.md` §7.0、`worker/` 與 `secure-messenger-chatops/` 雙向文件同步）

**討論過程**：山姆哥於 Cloudflare Dashboard 設定 `NVIDIA_NIM_TEXT_MODEL` 與 `NVIDIA_NIM_VISION_MODEL` 後，指示更新 `wrangler.jsonc` 並串接 `worker/` API 路由；同時嚴正要求從 LAB（`d:\Google Antigravity Proejct_free modification\Messebger\`）同步至 PROD（`z:\11_st8925lab\`）時，必須先預讀 PROD 既有開發文件（`PROMPT.md`、`README.md`、`CHANGELOG.md`、`AGENTS.md`、`LOG/`），與 LAB 最終確認文件比對合併後，在 LAB 與 PROD 兩端各放一份，杜絕「只改程式碼／設定檔卻未更新開發文件」的不一致情況。

**最終決策**：
- `wrangler.jsonc` 新增 `"vars"` 區塊（`NVIDIA_NIM_TEXT_MODEL: "nvidia/nemotron-3-super-120b-a12b"`、`NVIDIA_NIM_VISION_MODEL: "nvidia/nemotron-3.5-super-vl-120b-a12b"`），敏感金鑰維持存於 Cloudflare Dashboard Runtime Secrets（配合 `"keep_vars": true`）。
- 新增模組化路由檔 `worker/messenger.js` 並由 `worker/index.js` 轉發 `/api/status`、`/api/messages`、`/api/ai`、`/api/telegram`、`/api/telemetry`（保留 `/api/health` 與 `probeNvidia` 原有行為不變，且相容 `NVIDIA_API_KEY` 與 `NVIDIA_NIM_API_KEY`）。
- 同步更新根目錄 `PROMPT.md` §7.0、`worker/PROMPT.md`、`worker/README.md`，並將雙向合併後的 `PROMPT.md`（`V1.4`）、`CHANGELOG.md`、`README.md`、`AGENTS.md`、`LOG/Log_2026-10-17.md` 同步落地於 `secure-messenger-chatops/` 與 LAB 目錄。

**重大錯誤／問題**：
- 修正先前更新 `wrangler.jsonc` 與 `worker/` 時漏未同步更新 `PROMPT.md` §7.0、`worker/PROMPT.md` 與 `secure-messenger-chatops/PROMPT.md` 之文件脫節問題。

**變更原因**：落實 LAB ➔ PROD 雙向文件預讀、比對、合併與雙寫標準開發模式。


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
