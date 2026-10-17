# ST8925 LAB 嵌入式安全即時通訊系統 (SECURE MESSENGER & CHATOPS) 專案規格書 (PROMPT.md)


## 版本修改紀錄表
| 時間戳記 | 版本別 | 狀態 | 修改摘要 |
| :--- | :--- | :--- | :--- |
| `[2026-10-17_23:49:43]` | `V1.5` | 規格增修 | 字體控制改用全站共用元件 `shared/fontscale.js`；根字級 18px → 16px（主要文字約 14px，山姆哥 1(b)）。 |
| `[2026-10-17_22:39:28]` | `V1.4` | 雙向合併定案 | 合併 PROD (`z:\11_st8925lab\secure-messenger-chatops\`) 與 LAB (`d:\Google Antigravity Proejct_free modification\Messebger\`) 雙向規格：納入 Cloudflare Worker (`worker/index.js` + `worker/messenger.js`) 與 `wrangler.jsonc` (`vars` 雙模型設定)、XSS 跳脫與 `data:\|blob:` 附件協定白名單、手機版（`≤ 760px`）頂部橫向頻道條與 `← ORBIT` 縮寫、誠實離線狀態 `OFFLINE_NOT_SENT`、字體縮放（`18px` 基準 + `A- / 100% / A+`）及防斷行規範，並確立 LAB ➔ PROD 雙向文件預讀合併與雙寫 SOP。 |
| `[2026-10-17_20:20:07]` | `V1.3` | 實測驗證通過 | 完成 NVIDIA NIM 雙模型雲端推論、Telegram (`@Maru_TGBot`) 手機告警實機推播驗證與 Supabase REST API (`public.st8925_messages`) 雲端持久化同步串接，由山姆哥確認手機成功收到告警。 |
| `[2026-10-17_19:17:18]` | `V1.2` | 規格增修 | 升級 AI 推論引擎為「NVIDIA NIM 雙模型智慧路由」：純文字走 `nvidia/nemotron-3-super-120b-a12b`（`temperature=1.0, top_p=0.95`），附圖自動切換至多模態視覺模型 `nvidia/nemotron-3.5-super-vl-120b-a12b`（`temperature=0.6, top_p=0.95`），兩者共用單一 `NVIDIA_NIM_API_KEY`。 |
| `[2026-10-17_18:44:49]` | `V1.1` | 規格增修 | 確立 LAB (`d:\Google Antigravity Proejct_free modification\Messebger\`) 與 PROD (`z:\11_st8925lab\`) 雙環境 1:1 鏡像架構；拍板 `PROJECT 04` 正式名稱為 `SECURE MESSENGER & CHATOPS`；整合全站共用 `wordmark.js/css`、`config.js` 與 `?hue=` 動態彩虹色相繼承機制。 |
| `[2026-10-17_18:27:22]` | `V1.0` | 規格拍板 | 初版規格定案：採用「進化版選項 2」架構（網站原生嵌入式安全聊天室 ＋ 瀏覽器 Web Crypto E2EE ＋ AI 機器人接入 ＋ Telegram 隨身告警橋接），支援 A（訪客接待）、B（授權團隊 E2EE 私密群聊）、C（P01-P03 系統告警與 ChatOps）三大場景及文字／圖片檔案傳輸。 |


## 一、 專案背景、本頁身份與前置依賴 (Identity & Prerequisites)
本專案旨在為 `https://st8925lab.com/` 打造一套兼具深色科技極簡視覺（對齊全站 `#04070e` 背景與 WCAG AAA 彩虹色票）與高資安規格的**嵌入式即時通訊與安全通訊系統（ST-SecureMessenger）**。
* **本頁身份 (Identity)**：
  * **內部代碼 (`MY_ID`)**：`'04'`（硬寫於 `index.html` 頁尾 inline `<script>` 與 `js/main.js`，永不變動）。
  * **正式顯示名稱 (`label`)**：取自根目錄 `config.js` 的 `PROJECTS[].label`，目前定名為 **`SECURE MESSENGER & CHATOPS`**（頂列徽章 `#project-title-badge` 直接顯示 `SECURE MESSENGER & CHATOPS`，不加 `P04 · ` 前綴）。
  * **資料夾／URL (`slug`)**：`secure-messenger-chatops`（於 PROD 經 `python tools/rename_project.py 04 "SECURE MESSENGER & CHATOPS"` 原子改名；一旦 `label` 變更，資料夾名稱必須同步改名）。
* **前置依賴 (Prerequisites)**：
  * 本子專案頁面依賴網站根目錄的共用檔案：`../config.js`（提供 `PROJECTS`、`RAINBOW`、`SITE_NAME`）、`../shared/wordmark.css` 與 `../shared/wordmark.js`（提供 `initWordmark('wordmark', SITE_NAME)`）。
  * 頁尾 inline `<script>` 必須維持 `verify.py` 擴充性檢查所需的標準色相繼承算式：優先讀取 URL `?hue=`，直接開啟無參數時退回 `RAINBOW[idx % RAINBOW.length]`，並寫入 CSS 變數 `--c`。
* **LAB vs. PROD 雙環境定位與雙向文件同步鐵律**：
  1. **LAB 開發與驗證沙盒環境**：位於 `d:\Google Antigravity Proejct_free modification\Messebger\`，負責全功能模組開發、本地閘道器（`src/server/dev-gateway.py`）代理測試、端對端加密驗證與自動化測試（`tests/verify_messenger.py`）。
  2. **PROD 正式生產環境**：位於 `z:\11_st8925lab\secure-messenger-chatops\`（前端靜態資產）與 `z:\11_st8925lab\worker\`（Cloudflare Worker `/api/*` 後端路由，由根目錄 `wrangler.jsonc` 管理）。
  3. **雙向文件預讀、比對、合併與雙寫原則**：每次從 LAB 同步至 PROD 前，必須先讀取 PROD 子目錄（`z:\11_st8925lab\secure-messenger-chatops\`）與根目錄（`z:\11_st8925lab\`、`z:\11_st8925lab\worker\`）現有之 `PROMPT.md`、`README.md`、`CHANGELOG.md`、`AGENTS.md`、`LOG/`，與 LAB 已驗證文件進行比對與合併，確保無遺漏任何線上修補或規格紀錄，並將最終合併版同步存放於 LAB 與 PROD 兩端目錄。


## 二、 三大核心應用場景與功能邊界
### 2.1 三大對話場景（A + B + C）
* **場景 A：🌐 訪客與 AI 接待室 (Guest & AI Concierge)**
  * 外部訪客免註冊即可於網頁端建立臨時加密連線（TLS + Session Token）。
  * 預設由駐站 **AI Agent（串接 NVIDIA NIM 雙模型智慧路由）** 即時接待回答問題；當訪客要求轉接真人或點擊「📲 呼叫山姆哥」時，透過 **Telegram Bridge** 推播通知管理員（山姆哥）。
  * **誠實離線狀態顯示**：當後端 `/api/telegram` 離線或未送達時（`delivered: false`，回傳 `mode: 'OFFLINE_NOT_SENT'`），系統與浮動視窗必須誠實顯示「`⚠️ 目前離線，通知未送出`」，嚴禁誤導訪客以為已有離線佇列重送。
* **場景 B：🔒 授權團隊端對端加密私密包廂 (E2EE Secret Vault)**
  * 專供授權人員使用。採用瀏覽器原生 **W3C Web Crypto API** 實作端對端加密（E2EE）。
  * 密鑰衍生與加密規格：採用 `PBKDF2`（迭代 `100,000` 次，搭配 `SHA-256`）衍生 256-bit 對稱金鑰，並以 `AES-256-GCM`（每次加密隨機產生 12-byte / 96-bit IV）於瀏覽器本地端完成文字與圖片／檔案之加解密。
  * **零知識原則（Zero-Knowledge Server）**：傳輸中繼站與雲端資料庫僅儲存 Base64 密文（Ciphertext）與 IV，通行密語與金鑰永不離開使用者瀏覽器記憶體，伺服器端無法窺探明文。
* **場景 C：⚡ P01～P06 戰情告警與 ChatOps 頻道 (System Telemetry & ChatOps)**
  * 提供標準 REST Webhook（`POST /api/telemetry`）與前端跨模組 Event Bus 介面，讓 `st8925lab.com` 旗下之 `01 ALARM NOTIFICATION SIMULATOR`、`02 IOT GEN2 SIMULATOR & MONITOR`、`03 AI DIAGNOSTIC KB`、`06 TRAVEL ASSISTANCE` 可直接推播結構化告警卡片、數據圖表與診斷報告至頻道。
  * 支援斜線指令（Slash Commands，如 `/status`、`/diag <target>`、`/ask <prompt>`、`/notify <msg>`、`/sim <p01|p02|p03|p06>`、`/help`）進行雙向系統控制與 AI 根因分析。


### 2.2 支援媒介、雙模型 AI 智慧路由與 UI/UX 響應式規格
* **支援媒介與 XSS 防護邊界**：
  1. **即時文字訊息與強制 HTML 跳脫**：所有動態渲染欄位（含 `sender`、`role`、`text`、密文 `iv` 與 `fingerprint`）寫入 `innerHTML` 前一律經過 `_escapeHtml()` 跳脫（浮動視窗 `widget-embed.js` 之 `appendBubble()` 亦同），防範跨站腳本攻擊（Stored / DOM XSS）。
  2. **圖片與檔案傳輸（協定白名單）**：支援拖曳（Drag & Drop）、按鈕選取或剪貼簿貼上圖片／檔案（單檔上限 `10 MB`，支援 `PNG`, `JPG`, `WEBP`, `GIF`, `PDF`, `TXT`, `JSON`, `CSV`, `LOG`, `MD`）。渲染附件網址時透過 `_safeAttachmentUrl()` 強制檢核，僅允許本機產生的 `data:` 與 `blob:` 協定，阻絕 `javascript:` 偽協定注入。
  3. **NVIDIA NIM 雙模型智慧路由（Dual-Model Smart Router）**：
     * **純文字高速路由（`TEXT_FAST_ROUTE`）**：當訊息為純文字時，自動路由至 **`nvidia/nemotron-3-super-120b-a12b`**（採樣參數 `temperature=1.0, top_p=0.95`；Channel A 預設 `enable_thinking=False`，Channel C 或 `/diag` 開啟 `enable_thinking=True`）。
     * **多模態視覺路由（`VISION_MULTIMODAL_ROUTE`）**：當訊息包含非 E2EE 圖片附件（`data:image/*`）時，自動切換至 **`nvidia/nemotron-3.5-super-vl-120b-a12b`**（採樣參數 `temperature=0.6, top_p=0.95`）。
  4. **Telegram 告警推播橋接**：當場景 A 訪客呼叫真人，或場景 C 觸發 `CRITICAL / HIGH` 級別告警時，透過 Telegram Bot API（`@Maru_TGBot`）推播至山姆哥手機。
* **UI/UX 字級縮放、防斷行與手機版響應式規格**：
  1. **字體大小與即時縮放控制**：根元素 `html` 基準字級為 `calc(16px * var(--font-scale, 1))`（2026-10-17 由 18px 調為 16px，讓主要文字預設約 14px，與全站一致）。頂列 `A-`、`100%`、`A+` 三顆縮放鈕改由全站共用元件 `../shared/fontscale.js`／`fontscale.css` 產生：`index.html` 放 `<div id="font-scale-slot"></div>`，頁尾 inline script 在 `initWordmark` 後呼叫 `initFontScale('font-scale-slot')`；倍率 `0.85`～`1.45`、每次 `0.1`，存於 `localStorage` 的 `st8925_font_scale`（與其他子專案共用）。規格見根目錄 `../PROMPT.md` §4.1 第 6 點。
  2. **按鈕與狀態列防斷行（No-Wrap Invariant）**：`.mini-btn`（如 `📎 圖檔`）、`.cyber-btn`、`.vault-badge`、`.kv-row > span:first-child`、`.ch-row-top`、`.e2ee-pill` 強制設定 `white-space: nowrap; flex-shrink: 0; display: inline-flex;`，輸入框 `#chat-message-input` 設定 `flex: 1; min-width: 0;`，確保任何字級下按鈕絕不折行。
  3. **手機版響應式佈局（`@media (max-width: 760px)`）**：左側頻道欄轉為頂部可橫向捲動的精簡頻道條（`.channel-list { flex-direction: row; overflow-x: auto; }`）並保留「📲 呼叫山姆哥」按鈕，確保手機端可自由切換 A／B／C 頻道；頂列隱藏 `#project-title-badge` 並隱藏 `.bo-long`，使返回鈕自動縮寫為 `← ORBIT`，於 `375px` 窄螢幕完整可見。
* **明確排除邊界（Out of Scope）**：
  * 不包含 WebRTC 即時語音／視訊通話。


## 三、 系統架構與雙環境目錄對應
系統遵循「前端零框架原生極簡（100% 對齊 `st8925lab.com` 技術棧）＋ 三層可插拔傳輸層（Cloudflare Worker `/api/*` + Supabase PostgREST / Local Python Gateway `dev-gateway.py` / Browser `BroadcastChannel`）」原則。單一檔案維持在 `200–400` 行（硬上限 `800` 行）、單一函式 `< 50` 行、巢狀層數 `≤ 4` 層。

```text
LAB (d:\Google Antigravity Proejct_free modification\Messebger\)      PROD (z:\11_st8925lab\)
├── LOG/Log_YYYY-MM-DD.md                                      <==>   ├── secure-messenger-chatops/LOG/Log_YYYY-MM-DD.md
├── PROMPT.md (V1.4)                                           <==>   ├── secure-messenger-chatops/PROMPT.md (V1.4)
├── CHANGELOG.md                                               <==>   ├── secure-messenger-chatops/CHANGELOG.md (另同步摘要至根目錄 CHANGELOG.md)
├── README.md                                                  <==>   ├── secure-messenger-chatops/README.md
├── AGENTS.md                                                  <==>   ├── secure-messenger-chatops/AGENTS.md
├── src/
│   ├── config.js                                              <==>   ├── config.js (id '04' = SECURE MESSENGER & CHATOPS, slug = secure-messenger-chatops)
│   ├── wrangler.jsonc                                         <==>   ├── wrangler.jsonc (main = "worker/index.js", run_worker_first = ["/api/*"], vars 雙模型設定)
│   ├── worker/
│   │   ├── index.js                                           <==>   ├── worker/index.js (/api/health + probeNvidia + 轉發 handleMessengerApi)
│   │   └── messenger.js                                       <==>   ├── worker/messenger.js (/api/status, /api/messages, /api/ai, /api/telegram, /api/telemetry)
│   ├── project-04/                                            <==>   └── secure-messenger-chatops/
│   │   ├── index.html                                                │   ├── index.html
│   │   ├── css/messenger.css                                         │   ├── css/messenger.css
│   │   └── js/                                                       │   └── js/
│   │       ├── main.js                                               │       ├── main.js
│   │       ├── crypto-engine.js                                      │       ├── crypto-engine.js
│   │       ├── transport-adapter.js                                  │       ├── transport-adapter.js
│   │       ├── file-handler.js                                       │       ├── file-handler.js
│   │       ├── ai-bot-client.js                                      │       ├── ai-bot-client.js
│   │       ├── telemetry-bridge.js                                   │       ├── telemetry-bridge.js
│   │       ├── ui-controller.js                                      │       ├── ui-controller.js
│   │       └── widget-embed.js                                       │       └── widget-embed.js
│   └── server/dev-gateway.py (LAB 本地開發閘道器)
├── tests/verify_messenger.py (LAB 6 大自動化與雲端驗證套件)
└── docs/prod-deployment-guide.md
```


## 四、 環境變數、Wrangler 設定與金鑰資安規範
1. **敏感憑證隔離原則**：所有 API Key 與 Secret 嚴禁寫入前端程式碼、`wrangler.jsonc` 或任何公開 Git 版控檔案。
   * **LAB 環境**：存放於 `d:\Google Antigravity Proejct_free modification\Messebger\.env`（已列入 `.gitignore`），由 `src/server/dev-gateway.py` 讀取。
   * **PROD 環境**：存放於 Cloudflare Dashboard（`Workers & Pages` -> `st8925lab` -> `Settings` -> `Runtime variables and secrets`）並設為 **`Secret`**。**切勿將任何含 `.env` 或密鑰之文字檔放入 `z:\11_st8925lab\` 工作目錄**（見根目錄 `PROMPT.md` §7.2 兩道排除防線）。
2. **`wrangler.jsonc` 非機密變數同步 (`vars`)**：
   * 僅非機密之公開模型名稱可寫入 `z:\11_st8925lab\wrangler.jsonc` 的 `"vars"` 區塊，以保持 Cloudflare Dashboard 與 Git 部署一致（同時保留 `"keep_vars": true` 確保 Dashboard 上的 Secret 不被部署清除）：
     * `NVIDIA_NIM_TEXT_MODEL`: `"nvidia/nemotron-3-super-120b-a12b"`
     * `NVIDIA_NIM_VISION_MODEL`: `"nvidia/nemotron-3.5-super-vl-120b-a12b"`
3. **執行期環境變數與 Secret 清單**：
   * `PORT` / `HOST`：LAB 本地閘道器監聽設定（預設 `127.0.0.1:8765`）。
   * `NVIDIA_NIM_API_KEY`（或共用既有 `NVIDIA_API_KEY`）：NVIDIA NIM API 金鑰（`Secret`；Worker 端 `messenger.js` 與 `/api/health` 兩者皆相容讀取）。
   * `NVIDIA_NIM_TEXT_MODEL`：純文字推論模型名稱（預設值：`nvidia/nemotron-3-super-120b-a12b`）。
   * `NVIDIA_NIM_VISION_MODEL`：附圖／多模態推論模型名稱（預設值：`nvidia/nemotron-3.5-super-vl-120b-a12b`）。
   * `NVIDIA_NIM_BASE_URL`：API 端點（預設值：`https://integrate.api.nvidia.com/v1`）。
   * `TELEGRAM_BOT_TOKEN`：Telegram Bot 憑證（`Secret`，綁定 `@Maru_TGBot`）。
   * `TELEGRAM_CHAT_ID`：管理員接收通知之 10 位數 Telegram Chat ID（`Secret`）。
   * `SUPABASE_URL`（`Text`）與 `SUPABASE_ANON_KEY`（`Secret`）：Supabase 雲端即時同步與持久化端點（透過 PostgREST `/rest/v1/st8925_messages` 讀寫訊息與 E2EE 密文）。


## 五、 四大強制攔截點 (Hooks) 與量化門檻
開發與維運期間一旦觸及以下 **4 大條件**，Agent 必須**立即暫停**並向山姆哥回報**「① 遇到的問題、② 建議方案、③ 需要你做的決定」**，獲准後方可執行：
1. **Hook 1（外部資源與金流）**：
   * 需正式填入或啟用真實外部 API Key（如 `NVIDIA_NIM_API_KEY`、`TELEGRAM_BOT_TOKEN`、`SUPABASE_ANON_KEY`）、建立雲端資料庫實例、或涉及任何計費服務時。
2. **Hook 2（架構與規格偏離）**：
   * 實作中發現技術瓶頸，必須修改 `PROMPT.md` 既有規格、變更加密演算法（如更動 `AES-256-GCM`）、或增刪核心模組時。
3. **Hook 3（高風險破壞性操作）**：
   * 需清空／刪除既有通訊紀錄資料庫、刪除磁碟既有目錄／檔案、覆蓋核心設定檔、執行**大規模重構（定義為：單次同時修改 `≥ 3` 個核心模組檔案，或總變動行數 `> 300` 行）**、或放棄原檔另開新檔重寫時。
4. **Hook 4（環境依賴與外部發布）**：
   * 需安裝**大型系統級框架（定義為：安裝後體積 `> 200 MB`、需全域安裝或需變更作業系統底層服務之套件）**、修改系統全域環境變數、或準備將程式碼同步寫入 `z:\11_st8925lab\` 並執行 GitHub 上傳（Push）及部署至 `st8925lab.com` 生產環境前。
