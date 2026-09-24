# st8925lab Worker — 重建規格 / Rebuild Spec

**範圍 / Scope**：只涵蓋 `worker/` 這個資料夾（Cloudflare Worker 的 `/api/*`
入口）。全站架構、發佈範圍與兩道排除防線見根目錄
[`../PROMPT.md`](../PROMPT.md) §7；`wrangler.jsonc` 的逐值轉寫在該節 §7.0，
本檔不複述以避免漂移。
This file covers only the `worker/` folder. Site-wide architecture, publishing
scope and the two exclusion barriers live in the root [`../PROMPT.md`](../PROMPT.md)
§7, which also carries the transcribed `wrangler.jsonc` table. Not duplicated here.

> 本檔所有值均於 2026-09-24 從 `worker/index.js` 逐項讀出，非憑記憶撰寫。
> Every value below was read from `worker/index.js` on 2026-09-24, not recalled.

---

## 1. 用途 / Purpose

單一檔案 `worker/index.js`，預設匯出一個帶 `fetch(request, env)` 的物件。
負責兩件事：

1. 提供 `/api/health` 健康檢查，回報兩把金鑰**是否已設定**（布林值）。
2. 其餘所有路徑轉交靜態資產綁定 `env.ASSETS`。

A single file exporting `{ async fetch(request, env) }`. It serves `/api/health`
and hands every other path to the `env.ASSETS` static-assets binding.

---

## 2. 常數 / Constants

```js
const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

const NVIDIA_MODELS_URL = 'https://integrate.api.nvidia.com/v1/models';
```

`cache-control: no-store` 是必要的：健康檢查與 probe 結果不得被任何快取層
保留。`NVIDIA_MODELS_URL` 選用模型清單端點，因為它**只驗證授權、不消耗
token**。
`no-store` is required so health and probe results are never cached. The
model-list endpoint is used because it validates auth without consuming tokens.

輔助函式 / Helper：

```js
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
```

---

## 3. 路由行為 / Routing

依序判斷，先符合者先回應：

| 條件 Condition | 回應 Response |
|---|---|
| `pathname === '/api/health'` 且 method 不是 `GET` 也不是 `HEAD` | `405` + `{ ok: false, error: 'method_not_allowed' }` |
| `pathname === '/api/health'`（`GET`／`HEAD`） | `200` + 健康檢查主體（見 §4） |
| `pathname.startsWith('/api/')` | `404` + `{ ok: false, error: 'not_found' }` |
| 其他所有路徑 All other paths | `return env.ASSETS.fetch(request)` |

> 最後的 `env.ASSETS` 分支是保底設計。`wrangler.jsonc` 的
> `run_worker_first: ["/api/*"]` 本來就只把 `/api/*` 導進 Worker，但保留這條
> 分支可確保「萬一路由設定被改動」時網站頁面仍然正常。**重建時不可省略。**
> The final `env.ASSETS` branch is a deliberate safety net: routing config already
> sends only `/api/*` here, but keeping it means pages still work if that changes.
> Do not omit it when rebuilding.

---

## 4. `/api/health` 回應主體 / Response body

```json
{
  "ok": true,
  "service": "st8925lab-api",
  "time": "<new Date().toISOString()>",
  "configured": {
    "nvidia": "<Boolean(env.NVIDIA_API_KEY)>",
    "tavily": "<Boolean(env.TAVILY_API_KEY)>"
  }
}
```

`configured` 只回報布林值 —— **絕不回傳金鑰內容**。

> ⚠️ **`configured: true` 只證明環境變數裡有字串，不代表金鑰有效。**
> 金鑰被撤銷後這個值依然是 `true`。這正是 §5 probe 存在的理由，起因見
> [`README.md`](README.md) 2026-09-24 條目。
> `configured: true` only proves a string exists. It stays true after the key is
> revoked — which is exactly why the probe in §5 exists.

通過 probe 授權時，額外附加一個 `probe` 欄位（未授權時**此欄位完全不存在**）：
When probe authorization passes, a `probe` field is added; otherwise it is absent.

```json
"probe": { "nvidia": { "...": "見 §6 / see §6" } }
```

---

## 5. probe 授權 / `isProbeAuthorized`

```js
function isProbeAuthorized(request, url, env) {
  if (request.method !== 'GET') return false;
  if (url.searchParams.get('probe') !== '1') return false;
  if (!env.PROBE_TOKEN) return false;
  return request.headers.get('x-probe-token') === env.PROBE_TOKEN;
}
```

四個條件必須**同時**成立：

1. method 為 `GET`（注意：`/api/health` 本身接受 `HEAD`，但 `HEAD` 永遠拿不到
   probe —— 這是刻意的）
2. query string `?probe=1`（字串比對 `'1'`，不是 truthy 判斷）
3. `env.PROBE_TOKEN` 有值 —— **未設定時一律關閉（fail closed）**
4. 請求標頭 `x-probe-token` 與 `env.PROBE_TOKEN` 相等

### 為什麼不回 401 / Why no 401

**任一條件不符時，一律「靜默忽略」：回傳一般健康檢查結果，不回 401。**
不符與根本沒帶 probe 參數的回應**逐位元組相同**，因此外界無法從回應差異推斷
這個端點存在、也沒有可供暴力嘗試的目標。

Any failure is silently ignored: the plain health response is returned, byte-identical
to a request that never asked for a probe. A 401 would confirm the endpoint exists and
give an attacker something to brute-force against. **Do not "improve" this into a
401 when rebuilding — the silence is the security property.**

### 已知取捨 / Known trade-off

比較使用 `===`，**不是**常數時間比較。以 256-bit 隨機 token 而言，時序旁路
不構成實際風險；若日後改用較短或可預測的 token，必須改為常數時間比較。
Uses `===`, not a constant-time compare. Acceptable for a 256-bit random token;
revisit if the token ever becomes short or predictable.

---

## 6. `probeNvidia` 行為 / Behaviour

```js
async function probeNvidia(env) {
  if (!env.NVIDIA_API_KEY) {
    return { configured: false, reason: 'not_configured' };
  }
  try {
    const res = await fetch(NVIDIA_MODELS_URL, {
      method: 'GET',
      headers: { authorization: `Bearer ${env.NVIDIA_API_KEY}` },
      signal: AbortSignal.timeout(10000),
    });
    return { configured: true, status: res.status, valid: res.status === 200 };
  } catch {
    return { configured: true, status: null, valid: false, reason: 'unreachable' };
  }
}
```

三種回傳形狀 / Three possible shapes：

| 情況 Case | 回傳 Returns |
|---|---|
| 金鑰未設定 No key | `{ configured: false, reason: 'not_configured' }` |
| 請求完成 Request completed | `{ configured: true, status: <HTTP 狀態碼>, valid: <status === 200> }` |
| 請求拋出（逾時／網路） Threw | `{ configured: true, status: null, valid: false, reason: 'unreachable' }` |

逾時為 `AbortSignal.timeout(10000)`，即 **10 秒**。

> 🔒 **安全不變式：只回報 HTTP 狀態碼。** 絕不回傳金鑰、上游回應主體，或
> `catch` 到的錯誤細節（`catch` 刻意不綁定變數，從語法上就拿不到錯誤物件）。
> **重建時不可為了「方便除錯」把錯誤訊息加進回應。**
> Security invariant: report only the HTTP status. Never the key, the upstream
> response body, or error detail — the `catch` deliberately binds no variable.
> Do not add error messages "for easier debugging" when rebuilding.

---

## 7. 環境繫結 / Bindings and secrets

| 名稱 Name | 類型 Type | 用途 Purpose |
|---|---|---|
| `ASSETS` | 靜態資產繫結 Assets binding | 由 `wrangler.jsonc` 的 `assets.binding` 定義 |
| `NVIDIA_API_KEY` | Runtime secret | `configured.nvidia` 與 probe |
| `TAVILY_API_KEY` | Runtime secret | 僅 `configured.tavily`（目前無其他使用） |
| `PROBE_TOKEN` | Runtime secret | probe 授權；未設定即關閉 probe |

**三把金鑰都必須設在 Cloudflare 的「Runtime variables and secrets」，並存為
Secret。** 設成 Build-time 變數時 Worker 在執行期讀不到（`configured` 會是
`false`）；這正是 2026-09-24 修正的問題，經過見 [`README.md`](README.md)。
All three must live in Runtime variables and secrets, stored as Secret. Build-time
variables are unreadable at runtime — the bug fixed on 2026-09-24.

`wrangler.jsonc` 已設 `keep_vars: true`，因此 `npx wrangler deploy` 不會清掉
儀表板上設定的變數。
`keep_vars: true` means a deploy will not wipe dashboard-set variables.

---

## 8. 尚未實作 / Not implemented

| 項目 Item | 狀態 Status |
|---|---|
| `/api/chat` | 未實作，Phase 1 Stage C 主體。目前任何 `/api/chat` 請求都落到 §3 的 `404`。Not built; currently returns the §3 404. |
| Tavily 金鑰實際驗證 Live validation | 無免費驗證端點，最小查詢需 1 credit，故未做。待 `/api/chat` 接上時自然驗證。No free validation endpoint; deferred. |

---

## 9. 重建檢查表 / Rebuild checklist

- [ ] `wrangler.jsonc` 的 `name` 為 `st8925lab`（改名會建出另一個 Worker）
- [ ] `run_worker_first: ["/api/*"]`，其餘路徑不經 Worker
- [ ] 保留最後的 `env.ASSETS.fetch(request)` 保底分支
- [ ] 三把金鑰設為 Runtime **Secret**，不是 Build-time 變數
- [ ] probe 未授權時回**一般健康檢查結果**，不是 401
- [ ] `PROBE_TOKEN` 未設定時 probe 關閉（fail closed）
- [ ] probe 回應只含 HTTP 狀態碼，不含金鑰／回應主體／錯誤細節
- [ ] 所有 JSON 回應帶 `cache-control: no-store`
