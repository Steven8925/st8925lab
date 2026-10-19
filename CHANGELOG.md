# CHANGELOG — st8925lab.com 規格變動與決策紀錄

本檔記錄根目錄 `PROMPT.md` 的變動與原因，最新在最上方。2026-10-17 之前的歷程記在 `README.md`（不搬移、不改寫）。


[2026-10-20_00:04:03] V1.2 更新紀錄（根目錄 PROMPT.md §0 檔案清單、「9. 全系統架構」）

**討論過程**：山姆哥同意清理清單（移到 `_archive/`，不刪除）與 architect 的「共用抽出暫緩／不做」結論，並指示直接 commit、push。

**最終決策**：
- 以下 9 項移到 `C:\Claude Projects\_archive\11_st8925lab\20261019_cleanup\`：`PROMPT_v11.md`、`SPEC-v4.md`、`V4/`、`cloudmd/old`、`cloudmd/option_A`、`cloudmd/option_B`、`cloudmd/option_C`、`functions/`、`$RECYCLE.BIN/`。其中 `SPEC-v4.md` 與 `cloudmd/` 下 4 個資料夾原本有進 git（105 個檔），在 git 歷史中仍可還原。
- `PROMPT.md` 移除對 `SPEC-v4.md` 的連結與檔案清單條目，架構圖移除 `functions/` 節點。
- `.assetsignore` 中對應的排除規則保留不動：沒有壞處，日後有人誤把舊檔放回來時仍會擋住。

**重大錯誤／問題**：`cloudmd/option_C` 移動時，複製已完成，但刪除原處時遇到唯讀屬性（`.astro/astro`）而中止。比對 15,419 個檔案的雜湊值，確認封存複本完整無缺後，才解除唯讀屬性、刪除原處。

**變更原因**：這些是已被取代的舊版本與暫存，留在網站根目錄只會增加誤發佈的風險與盤點成本。


[2026-10-19_23:36:10] V1.1 更新紀錄（根目錄 PROMPT.md 新增版本表、「9. 全系統架構」、「10. 效能與資產預算」）

**討論過程**：山姆哥指示依 `sub-agent-optimization.md` §1.1 回補本專案。`project-check.ps1` 回報缺專案 `CLAUDE.md`、缺 `LOG/`、`PROMPT.md` 沒有 Mermaid 架構圖。既有的兩張圖（`README.md` 的 IoT 三專案資料流、`VPS_DEPLOYMENT_GUIDE.md` 的部署圖）都沒有涵蓋全站。

**最終決策**：
- `PROMPT.md` 最上方加版本表。此前沒有版本號，把 2026-10-19 之前的狀態定為 V1.0，本次為 V1.1（只增補文件，不改功能）。
- 「9. 全系統架構」依原始碼與線上實測畫出，實線是有證據的連線，虛線是藍圖、草稿或未接通。未來功能還在等山姆哥說明，尚未納入。
- 「10. 效能與資產預算」只寫實測基準，預算待和山姆哥一起訂。
- 新增專案 `CLAUDE.md`（含本專案 Hook 門檻）與 `LOG/`；`README.md` 檔首加導讀，內容不刪不改。

**重大錯誤／問題**：
- `README.md` 的 P02→P03→P01 資料流圖在程式裡沒有對應實作：P02、P03 前端沒有任何 `fetch(` 呼叫。新架構圖改用虛線標示。
- `worker/messenger.js` 的 `/api/ai` 沒有檢查 NIM 回應狀態：NIM 回 401／429／500 時，會回一個空字串並標成 `NVIDIA_NIM`，而不是走備援。已在原檔修正，並加 4 個測試案例。
- `SHARED_MODULES.md` §2 有兩處錯誤（architect 審查發現）：Travel 的實際呼叫點是 `workflow_chat.py`，不是 `workflow_session.py`；登錄的 6 處都沒有重試機制。

**變更原因**：依工作區規則補齊最低必備文件，讓架構圖與效能數據都有實測依據。


[2026-10-18_01:22:17] 更新紀錄（根目錄 PROMPT.md §3.6 導覽字級與門檻、§4.1 第 6 點頂列字級）

**討論過程**：山姆哥附兩張截圖（Alarm 子專案頂列、首頁導覽列），要求首頁與每個子專案上方字體放大。實測頂列字級：首頁導覽 12.16px、Alarm 11px、IoT 11–13px、KB 11–12px、字體控制鈕 13px、P04 約 14px。

**最終決策**：頂列文字統一放大到 14px（首頁導覽 `clamp(.68rem, 1vw, .9rem)`，≥1440px 為 14.4px）。

**重大錯誤／問題**：放大後以 6 頁 × 15 種寬度與改前比對，發現以下擠壓並逐一修正：
- 首頁完整名稱在 1421–1650px 被截斷，實測需 ≥1690px，完整名稱門檻由 1420px 改為 1759px。
- IoT 在 839–1150px 跨專案連結換行或被擠出：≤1280px 收起頁名徽章。
- KB 在 1280–1650px 分頁換行、1024px 以下被擠出：分頁改為不換行、空間不足時左右捲動；≤1700px 收起裝飾徽章與跨專案連結文字。
- 375px 時 Alarm、KB 的 BACK TO ORBIT 被擠出：≤480px 縮小一號。
修正後所有寬度都不比改前差，KB 在 840–1150px 由破版變正常；375px 首頁標籤截斷是改前就有的問題。

**變更原因**：頂列字太小、各頁不一致。


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
