# 規格變動與決策紀錄 (CHANGELOG.md)


`[2026-10-17_22:39:28]` V1.4 更新紀錄
* **討論過程**：
  1. 山姆哥於驗收畫面後指示放大字體、消除左下角「`📎 圖檔`」按鈕斷行，並要求提供 Step-by-Step PROD（`z:\11_st8925lab\`）部署流程與代為執行 Step 1（方式 B：`rename_project.py 04 "SECURE MESSENGER & CHATOPS"`）及 Step 2。
  2. 山姆哥上傳 Cloudflare Dashboard（`Runtime variables and secrets` -> `Production`）截圖，詢問黃色提示框 `Update your Wrangler configuration with these changes to keep deployments in sync` 該如何更新。Maru 將 `"vars"`（`NVIDIA_NIM_TEXT_MODEL`、`NVIDIA_NIM_VISION_MODEL`）寫入 `z:\11_st8925lab\wrangler.jsonc`，並建立 `z:\11_st8925lab\worker\messenger.js` 掛載進 `z:\11_st8925lab\worker\index.js`。
  3. 山姆哥嚴正指正：在從 LAB 同步至 PROD（含更新 `wrangler.jsonc` 與 `worker/`）的過程中，必須先讀取 PROD（`z:\11_st8925lab\secure-messenger-chatops\` 與根目錄 `z:\11_st8925lab\`）既有的最新開發文件（`PROMPT.md`、`README.md`、`CHANGELOG.md`、`AGENTS.md`、`LOG/`），與 LAB 最終確認文件進行比對與合併，再同步雙寫至 LAB 與 PROD 兩端目錄，絕不可只改程式碼而漏更文件造成兩端狀態不一致，並指示將完整標準流程寫入 `d:\Google Antigravity Proejct_free modification\LAB_to_Prod.md`。
* **最終決策**：
  1. 升級 `PROMPT.md` 至 `V1.4`：完整合併 PROD 端（`z:\11_st8925lab\CHANGELOG.md` 與 `secure-messenger-chatops/`）之線上修補（XSS 跳脫與 `data:|blob:` 附件白名單、手機版 `≤ 760px` 橫向頻道條與 `← ORBIT`、誠實離線狀態 `OFFLINE_NOT_SENT`、去除頂列徽章 `P04 · ` 前綴）以及 LAB 端之字級縮放（`18px` + `A- / 100% / A+`）、按鈕防斷行、`wrangler.jsonc` `"vars"` 與 `worker/messenger.js` 路由架構。
  2. 將合併後的 `PROMPT.md`、`CHANGELOG.md`、`README.md`、`AGENTS.md` 與 `LOG/Log_2026-10-17.md` 同步雙寫至 LAB（`d:\Google Antigravity Proejct_free modification\Messebger\`）與 PROD（`z:\11_st8925lab\secure-messenger-chatops\`），並同步更新 PROD 根目錄之 `PROMPT.md` §7.0、`CHANGELOG.md`、`worker/PROMPT.md` 與 `worker/README.md`。
  3. 產出標準化跨環境開發與部署手冊 `d:\Google Antigravity Proejct_free modification\LAB_to_Prod.md`。
* **重大錯誤／問題紀錄**：
  1. **流程缺失修正**：先前更新 `z:\11_st8925lab\wrangler.jsonc` 與 `worker/index.js` 時，未即時同步更新 `z:\11_st8925lab\PROMPT.md` §7.0、`worker/PROMPT.md`、`worker/README.md` 及 `secure-messenger-chatops/PROMPT.md`，導致程式碼與文件短暫脫節；現已全面補齊並建立強制預讀合併雙寫機制。
  2. **公開暴露面攔截**：透過 `tools/check_public_surface.py` 發現 `z:\11_st8925lab\secure-messenger-chatops\copy from LAB\` 暫存資料夾內含 `.env`、`Supabase.txt`、`telegram Bot.txt` 及重複 `src/`，立即於 `.gitignore` 與 `.assetsignore` 加入阻擋保護並提請山姆哥確認清理。
* **變更原因**：
  * 確立以 Project 04 為標竿之「LAB 沙盒開發 ➔ 雙向文件預讀比對合併 ➔ PROD 同步雙寫」標準開發模式。


`[2026-10-17_21:55:07]` PROD 線上修補合併紀錄（手機版頻道條、誠實離線提示與頂列徽章對齊）
* **討論過程**：
  * 山姆哥於 PROD 檢視時指示修正手機版操作與離線通知提示，並把頂列徽章去掉 `P04 · ` 前綴（經查 `PROMPT_v11.md` 為 2026-09 根目錄網站規格舊版，不含本頁內容）。
* **最終決策**：
  1. 手機版（`≤ 760px`）：頻道列由「整欄隱藏」改為頂部可橫向捲動的頻道條，保留「📲 呼叫山姆哥」按鈕；標題徽章隱藏，返回鈕縮為「`← ORBIT`」。
  2. 離線時「呼叫山姆哥」、`/notify` 與浮動視窗改為明講「目前離線，通知未送出」；離線模式名稱由 `OFFLINE_LOCAL_QUEUE` 改為 `OFFLINE_NOT_SENT`（原名暗示有佇列重送，實際沒有）。
  3. 頂列徽章文字統一為 `SECURE MESSENGER & CHATOPS`（`index.html` 靜態文字與 `js/main.js` 動態寫入同步）。
* **重大錯誤／問題紀錄**：
  * 修正原手機版 B／C 頻道無法切換、返回鈕被推出畫面，以及原離線訊息讓訪客誤以為已通知到本人的問題。
* **變更原因**：
  * 提升窄螢幕（375px）可用性並落實不編造／誠實狀態顯示原則。


`[2026-10-17_21:19:42]` PROD 首次同步與 XSS 資安強化紀錄
* **討論過程**：
  * 執行 `tools/rename_project.py 04 "SECURE MESSENGER & CHATOPS"` 將 `id: '04'` 指向新資料夾 `secure-messenger-chatops/`，移除舊 `project-04/` 佔位頁；同時盤點發現本站為 Cloudflare Worker 部署（`worker/index.js`），Pages Function 草稿（`functions/api/[[route]].js`）不會被執行。
* **最終決策**：
  1. `id: '04'` 改為 `SECURE MESSENGER & CHATOPS`／`secure-messenger-chatops`，首頁導覽 `RESPONSIVE_LABELS['04']` 對應更新為 `SECURE MESSENGER`／`MESSENGER`／`P04`。
  2. `functions/` 列入 `.gitignore` 與 `.assetsignore`，後端統一整合至 `worker/`。
* **重大錯誤／問題紀錄**：
  * 發佈前覆核新程式，於原檔就地修正兩處儲存型／DOM XSS 隱患：
    * `js/ui-controller.js`：訊息的 `role`、密文的 `iv`／`fingerprint` 改為一律經 `_escapeHtml()` 跳脫；附件網址透過 `_safeAttachmentUrl()` 限制只接受 `data:`／`blob:`。
    * `js/widget-embed.js`：浮動視窗 `appendBubble()` 把 `sender` 與訊息內容改為 `escapeHtml()` 跳脫後才寫入 `innerHTML`。
* **變更原因**：
  * 後端接上雲端持久化後，訊息可能來自任何外部訪客，必須在寫入 DOM 前徹底阻絕 XSS 與 `javascript:` 偽協定。


`[2026-10-17_20:20:07]` V1.3 更新紀錄
* **討論過程**：
  1. 山姆哥完成 `.env` 四組外部服務憑證（`NVIDIA_NIM_API_KEY`、`TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID`、`SUPABASE_URL`、`SUPABASE_ANON_KEY`）設定，指示完善 `dev-gateway.py` 與 Supabase 的雲端持久化同步串接，並發送測試告警至 Telegram 手機驗證。
  2. 初次擊發時 Telegram API 回傳 `HTTP 400: Bad Request: chat not found`，經 `getUpdates` 診斷確認 `@Maru_TGBot` 收件數為 `0`；請山姆哥於 Telegram 點開 `@Maru_TGBot` 按下 `Start` 後重新執行 `verify_messenger.py`，山姆哥確認手機成功收到 `🛡️ [ST8925 LAB | CRITICAL]` 告警推播。
* **最終決策**：
  1. 升級 `PROMPT.md` 至 `V1.3`：正式納入 Supabase PostgREST (`public.st8925_messages`) 雲端持久化讀寫與自動降級機制，以及 Telegram `@Maru_TGBot` 實機推播與 `getUpdates` 備援探索規範。
  2. 依據全域規範 5.4，於山姆哥實測確認收到手機告警後，正式將已驗證完成狀態與執行指令寫入 `PROMPT.md`、`README.md` 與 `LOG/Log_2026-10-17.md`。
* **重大錯誤／問題紀錄**：
  * 排除 Telegram 新建 Bot 因尚未被使用者點擊 `Start` 而觸發之 `HTTP 400: chat not found` 攔截問題。
* **變更原因**：
  * 完成真實雲端 API 串接與手機告警實測驗證。


`[2026-10-17_19:17:18]` V1.2 更新紀錄
* **討論過程**：
  1. 山姆哥提供 NVIDIA Build 官方熱門模型篩選清單（`nimType=Preview, publisher=nvidia`），詢問哪一顆模型最適合本專案。
  2. Maru 檢視清單內全部 26 個模型與最新 Model Card，指出過半數為非對話專用模型，且 `nemotron-3.5-lightning-30b-a3b` 欠缺官方中文支援、`nemotron-3-ultra-550b-a55b` 首字延遲較高，建議採用 `nvidia/nemotron-3-super-120b-a12b`（純文字 120B/12B Active 極速主力）搭配 2026-10-15 最新發布之 `nvidia/nemotron-3.5-super-vl-120b-a12b`（C-RADIO 視覺語言模型）。
  3. 山姆哥拍板採用「文字走 `nemotron-3-super-120b-a12b` ＋ 附圖自動切換 `nemotron-3.5-super-vl-120b-a12b`」之雙模型智慧路由，並詢問 `.env` 是否需同步修改。
* **最終決策**：
  1. 升級 `PROMPT.md` 至 `V1.2`：於 `.env` 與 `.env.example` 設定 `NVIDIA_NIM_TEXT_MODEL=nvidia/nemotron-3-super-120b-a12b` 與 `NVIDIA_NIM_VISION_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b`（共用同一把 `NVIDIA_NIM_API_KEY`）。
  2. 於 `dev-gateway.py`、`ai-bot-client.js` 與 `ui-controller.js` 實作雙模型自動路由與官方建議採樣參數（文字 `temperature=1.0, top_p=0.95`；視覺 `temperature=0.6, top_p=0.95`），並通過自動化測試驗證。
* **重大錯誤／問題紀錄**：
  * 無錯誤；透過查閱官方 Model Card 提前設定正確的 `chat_template_kwargs.enable_thinking` 動態開關，避免一般訪客接待因長篇推理造成延遲。
* **變更原因**：
  * 支援聊天室文字高速回應與圖片／截圖多模態自動視覺診斷。


`[2026-10-17_18:44:49]` V1.1 更新紀錄
* **討論過程**：
  1. 山姆哥針對 Hook 1 做出裁示：同意採用「先完成 V1.0 全功能模組與 `.env` 讀取介面，支援本地即開即用 ＋ 填入 `.env` 即時啟用真實 NVIDIA NIM / Telegram」之建議方案，直接啟動編寫程式碼與自動化測試。
  2. 山姆哥提供關鍵生產環境資訊：`https://st8925lab.com/project-04` 的原始碼位於 `z:\11_st8925lab\project-04\`，且 `z:\11_st8925lab\` 已完成 GitHub 與 Cloudflare 整合。山姆哥將 `d:\Google Antigravity Proejct_free modification\Messebger\` 定位為 **LAB 開發環境**，最終上線版本以 **PROD 環境（`z:\11_st8925lab\`）** 為主，並詢問環境配置建議。
  3. 山姆哥拍板將 `project-04` 正式命名為 **`SECURE MESSENGER & CHATOPS`**。
* **最終決策**：
  1. 升級 `PROMPT.md` 至 `V1.1`：將 LAB 目錄下之 `src/` 設計為與 `z:\11_st8925lab\` **1:1 鏡像同構**（包含 `src/config.js`、`src/shared/wordmark.css`、`src/shared/wordmark.js` 與 `src/project-04/`），完全相容線上站台之 `MY_ID = '04'`、`?hue=` 動態彩虹主題色與 `tools/rename_project.py` 改名機制。
  2. 將「跨磁碟寫入 `z:\11_st8925lab\` 生產環境」明確納入 **Hook 4（環境依賴與外部發布）** 保護範圍：在 LAB 完成全套開發與驗證前，絕不擅自改動 `z:\11_st8925lab\` 檔案。
* **重大錯誤／問題紀錄**：
  * 無錯誤；透過讀取線上 `https://st8925lab.com/project-04/index.html`、`shared/wordmark.js` 與 `config.js`，提前發現 `rename_project.py` 對 `label` 與 `slug` 的強制同步約束，確保 `project-04` 內部資源全部採用相對路徑 `./css/` 與 `./js/`，避免改名後斷鏈。
* **變更原因**：
  * 對齊山姆哥之 LAB / PROD 雙環境工作流與 `PROJECT 04` 正式命名。


`[2026-10-17_18:27:22]` V1.0 更新紀錄
* **討論過程**：
  1. 山姆哥詢問主流即時通訊軟體（WhatsApp、LINE、Teams、Telegram、Signal）之產品特性，並提出希望在自家產品網站 `https://st8925lab.com/` 中嵌入一套「即時通訊／安全通訊系統」，探討應自建或串接既有工具。
  2. Maru 檢視 `st8925lab.com` 現有靜態深色科技架構與 6 大子專案設定（`config.js`），以直言導師（Brutal Mentor）角度點出從零手刻 IM 協定、自行實作加密（Roll Your Own Crypto）、無狀態靜態站台衝突、網頁離線推播孤島效應及純外部平台喪失 UI 主權等 5 大風險，並提出 3 個主流架構選項。
  3. 山姆哥明確拍板需求範圍：
     * 對話場景涵蓋 **A（網站訪客＋AI 諮詢接待）＋ B（特定授權人員於子專案內進行多方 E2EE 私密群聊）＋ C（P01～P03 系統／IoT／AI 診斷模組雙向指令與告警互動 ChatOps）**。
     * 功能邊界為 **「文字 ＋ 圖片/檔案傳輸 ＋ AI 機器人接入」**（不納入語音／視訊 WebRTC 通話）。
* **最終決策**：
  * 拍板採用 **「進化版選項 2（網站原生嵌入式安全加密聊天室 ＋ 瀏覽器 Web Crypto API 端對端加密 ＋ NVIDIA NIM AI 機器人 ＋ Telegram 隨身告警推播橋接）」**，正式建立 `PROMPT.md` `V1.0` 規格書。
* **重大錯誤／問題紀錄**：
  * 初期尚未進入程式碼實作，無錯誤紀錄；透過前期架構收斂，成功規避從零手寫密碼學協定與維護高成本 STUN/TURN 伺服器之架構風險。
* **變更原因**：
  * 新專案啟動，確立 `V1.0` 基準規格與四大強制攔截點（Hooks）量化門檻。
