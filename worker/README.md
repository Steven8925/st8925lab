# st8925lab Worker — 開發歷程 / Development History

**範圍 / Scope**：只記錄 `worker/` 的演進。現行行為規格見
[`PROMPT.md`](PROMPT.md)；全站發佈架構見根目錄
[`../PROMPT.md`](../PROMPT.md) §7；當日完整的金鑰治理經過與教訓記錄於
[`../Travel-Assistance/README.md`](../Travel-Assistance/README.md) 的
2026-09-24 條目（依山姆哥指定位置）。本檔不複述那些內容。

This file records how `worker/` evolved. Current behaviour is specified in
[`PROMPT.md`](PROMPT.md). The full key-governance narrative and lessons for
2026-09-24 live in `../Travel-Assistance/README.md` at Sam's direction.

> 🔒 **本檔會進入公開的 GitHub repo**（`.assetsignore` 只擋網站發佈，擋不住
> GitHub）。因此**不記錄任何金鑰尾碼、token 識別字串或憑證片段**，只記錄日期與
> 事件。此為 2026-09-24 山姆哥核可的做法。
> This file goes into a public GitHub repo, so it records no key suffixes, token
> identifiers or credential fragments — only dates and events. Approved by Sam
> on 2026-09-24.

---

## [2026-09-23_21:10:00] `a4dd71c` — Worker 入口建立 / Worker entry created

Phase 1 Stage A。此前 repo **沒有任何設定檔**，Cloudflare Workers Builds 每次
建置時自動產生 `name`、`compatibility_date`、`observability` 與
`assets.directory="."`。

- 新增 `worker/index.js`，預設匯出 `{ async fetch(request, env) }`。
- 新增 `wrangler.jsonc`，**原樣保留** Workers Builds 自動產生的那些值，只另加
  `main`、`assets.binding`、`assets.run_worker_first`，讓 `/api/*` 進 Worker、
  其餘路徑仍由靜態資產直接回應。
- 保留最後的 `env.ASSETS.fetch(request)` 保底分支，確保萬一路由設定被改動時
  網站頁面照常可用。

Before this commit the repo had no config file at all; Workers Builds generated
those values on every build. They were kept verbatim; only `main`, the assets
binding and `run_worker_first` were added.

---

## [2026-09-23_21:26:00] `44e3fd6` — 回報金鑰設定狀態 / Report key configuration

- `/api/health` 新增 `configured.nvidia` 與 `configured.tavily` 兩個布林值，
  只回報「環境變數裡有沒有字串」，**絕不回傳金鑰內容**。
- `wrangler.jsonc` 加入 `keep_vars: true`。原因：若金鑰在儀表板被存成 Text 而非
  Secret，一次 `npx wrangler deploy` 會把它清掉；`keep_vars` 讓儀表板設定的變數
  在部署後留存。

---

## [2026-09-24_08:59:00] `6194621` — 新增 NVIDIA 金鑰 probe / Opt-in key probe

**動機**：`configured: true` 只證明環境變數裡有字串，**不代表金鑰有效** ——
金鑰被撤銷後這個值依然是 `true`。當天正是因為要確認「搬到 Runtime 的金鑰到底
能不能用」，才發現健康檢查根本回答不了這個問題。

- 新增 `/api/health?probe=1`：用執行期金鑰對 NVIDIA `/v1/models` 實際送一次
  請求。選這個端點是因為它**只驗證授權、不消耗 token**。
- **只回報 HTTP 狀態碼**，不回傳金鑰、上游回應主體，或 `catch` 到的錯誤細節
  （`catch` 刻意不綁定變數，從語法上就拿不到錯誤物件）。
- 逾時 `AbortSignal.timeout(10000)`。

`configured: true` proves only that a string exists, not that the key works — it
stays true after revocation. That gap is why this probe exists.

---

## [2026-09-24_09:20:00] `f33e993` — probe 改為需授權 / Probe requires a token

上一版「帶 `?probe=1` 就跑」等於讓任何人都能觸發一次對外請求。改為需授權：

- 新增 `isProbeAuthorized()`：必須**同時**滿足 `GET` + `?probe=1` +
  `x-probe-token` 標頭等於 `PROBE_TOKEN`。
- **任一條件不符時靜默忽略** —— 回傳一般健康檢查結果，**不回 401**。回 401 會
  向外確認「這個端點存在」，並給攻擊者一個可暴力嘗試的目標。不符與根本沒帶
  probe 參數的回應**逐位元組相同**。
- `PROBE_TOKEN` 未設定時一律關閉（**fail closed**）。
- `PROBE_TOKEN` 成為第三個 Runtime secret。

### 驗證方式 / How it was verified

| 測試 Test | 預期與實測結果 Expected and observed |
|---|---|
| 正確 token | `status: 200`、`valid: true` |
| 不帶 token | 回應中**沒有** `probe` 欄位 |
| 錯誤 token | 與「不帶 token」**逐位元組相同** |

線上獨立複驗通過。分支 `phase1-probe` 以 `--ff-only` 併入 `main`。

> **反向測試與正向測試同等重要。** 只測「擋得住」分不出兩種情況：保護正常運作，
> 或 token 貼錯導致功能永久失效。三個案例都要測才能區分。
> Negative tests matter as much as positive ones: testing only that access is
> blocked cannot distinguish working protection from a mis-pasted token that has
> silently killed the feature.

---

## [2026-09-24_10:xx] 文件補齊 / Documentation added

在此之前 `worker/` **沒有任何 README.md 或 PROMPT.md** —— Phase 1 的核心程式碼
（probe、授權判斷、金鑰讀取）完全沒有文件化，違反「每個獨立有意義的子資料夾
都應有自己的 README.md 與 PROMPT.md」的規則。本次稽核時發現並補上兩份。

同日根目錄 `PROMPT.md` §7 的平台敘述也一併校正：原文寫「靜態網站，部署於
Cloudflare Pages」，實際為 Cloudflare Worker + 靜態資產。依舊文重建會建出
Pages 純靜態站，`/api/*` 整個不會存在。

`worker/` had no documentation until this audit, despite holding the Phase 1
code. The root `PROMPT.md` §7 platform description was corrected the same day.

---

## 未完成 / Outstanding

| 項目 Item | 說明 Note |
|---|---|
| `/api/chat` | 未實作，Phase 1 Stage C 主體。目前任何 `/api/chat` 請求都回 404。 |
| Tavily 金鑰未實際驗證 | 無免費驗證端點，最小查詢需 1 credit；待 `/api/chat` 接上時自然驗證。 |
| `isProbeAuthorized` 的 `===` | 非常數時間比較。以 256-bit 隨機 token 而言時序旁路非實際風險；若日後改用較短或可預測的 token 必須改。 |
| NVIDIA 金鑰到期 | 兩把現役金鑰分別於 **2027-09-24** 與 **2028-09-24** 到期，建議設行事曆提醒。 |
| 金鑰命名 | 仍為供應商自動產生的無識別名稱，建議改為可識別名稱（如 `st8925lab-worker-prod`）。 |
