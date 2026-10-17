# 專案級 AI Agent 協作與開發規範 (AGENTS.md)


## 一、 專案定位與核心守則
本專案為 `st8925lab.com` 嵌入式安全即時通訊系統（**SECURE MESSENGER & CHATOPS**，內部代碼 `MY_ID = '04'`，資料夾 `secure-messenger-chatops`），所有開發、測試、資安與文件維護除遵守全域規範（`通用型要求.md` / 全域 `AGENTS.md`）外，須嚴格對齊 [`PROMPT.md`](./PROMPT.md)。


## 二、 模組化與程式碼護欄
1. **極簡 Entrypoint**：`src/project-04/js/main.js`、`src/server/dev-gateway.py` 與生產環境 `worker/index.js` 入口保持精簡，僅負責流程編排與啟動。
2. **量化指標**：單一檔案典型 `200–400` 行，硬上限 `800` 行；單一函式 `< 50` 行；條件與迴圈巢狀 `≤ 4` 層。
3. **修 Bug 原則**：一律於原檔直接修復，嚴禁衍生 `main_v2.js`、`fix_final.py` 等冗餘檔案。


## 三、 資安、XSS 防護與端對端加密 (E2EE) 鐵律
1. **禁止自創脆弱加密演算法**：場景 B（E2EE 私密包廂）必須使用瀏覽器標準 `window.crypto.subtle`（`PBKDF2` + `AES-256-GCM`），每次加密必須產生全新隨機 12-byte (96-bit) IV。
2. **金鑰不落地原則**：使用者輸入之通行密語（Passphrase）與衍生之 `CryptoKey` 嚴禁傳送至後端伺服器或寫入雲端資料庫。
3. **憑證隔離與兩道排除防線**：
   * `NVIDIA_NIM_API_KEY`、`TELEGRAM_BOT_TOKEN`、`SUPABASE_ANON_KEY` 等敏感金鑰於 LAB 僅能存於 `.env`（列入 `.gitignore`），於 PROD 僅能存於 Cloudflare Runtime Secrets（嚴禁將含密鑰之 `.env` 或文字檔放入 `z:\11_st8925lab\` 公開 repo 目錄，亦不得寫入 `wrangler.jsonc`）。
   * 動態渲染至 `innerHTML` 之所有欄位（含 `sender`、`role`、`text`、`iv`、`fingerprint`）必須經過 `_escapeHtml()` 跳脫，附件網址必須經 `_safeAttachmentUrl()` 限制僅允許 `data:` 與 `blob:`。


## 四、 文件更新、驗證分流與 LAB ➔ PROD 雙向同步鐵律
1. **規格變動即時同步**：只要討論涉及規格或設定檔（如 `wrangler.jsonc`、`worker/index.js`）變動，必須**立即**同步更新 `PROMPT.md` 與 `CHANGELOG.md`。
2. **驗證後寫入分流**：任何「功能已確認可用」之完成陳述，須先執行自動化測試腳本自檢（LAB：`tests/verify_messenger.py`；PROD：`verify.py` + `tools/check_public_surface.py`），並等待山姆哥實測確認後，方可寫入正式完成摘要（或依 7 天逾時機制標註 `⏳ 待山姆哥複核`）。
3. **LAB ➔ PROD 雙向文件預讀、比對、合併與雙寫鐵律（Pre-Sync Read, Merge & Dual-Write Rule）**：
   * 當從 LAB（`d:\Google Antigravity Proejct_free modification\Messebger\`）同步至 PROD（`z:\11_st8925lab\secure-messenger-chatops\` 及根目錄 `z:\11_st8925lab\`、`z:\11_st8925lab\worker\`）時，若 PROD 已有運行中版本，**必須先讀取 PROD 端所有最新開發文件**（`PROMPT.md`、`README.md`、`CHANGELOG.md`、`AGENTS.md`、`LOG/`）。
   * 將 PROD 既有紀錄／線上修補與 LAB 最終確認文件進行**雙向比對與合併**，確保無任何設定或修補紀錄遺漏。
   * 合併完成後，必須將最終一致的四大核心文件（`PROMPT.md`、`CHANGELOG.md`、`README.md`、`LOG/Log_YYYY-MM-DD.md`）與 `AGENTS.md` **分別於 LAB 與 PROD 對應目錄中各放一份**，嚴禁發生只改程式碼／設定檔而未更新文件的狀態不一致情況。
4. **排版紀律**：所有紀錄檔（`LOG/Log_YYYY-MM-DD.md`、`CHANGELOG.md`）強制遵守「最新紀錄在最上方（Newest on top）」與「主段落／前後紀錄空隔 2 行」規則。
