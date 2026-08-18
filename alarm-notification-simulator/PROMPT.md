# Project 01 — 重建規格 / Rebuild Prompt

讀完本檔即可重建 `alarm-notification-simulator/`（首頁與後端不在此檔範圍，
分別見根目錄 [`../PROMPT.md`](../PROMPT.md) 與本檔「後端部署」一節）。

Reading this file alone reproduces `alarm-notification-simulator/`. The
homepage and backend are out of scope here — see root
[`../PROMPT.md`](../PROMPT.md) and this file's "Backend deployment"
section respectively.

**與其他 5 個 project-XX 頁的關鍵差異**：那五頁是手寫 HTML，逐位元組相同
（除了一行 `MY_ID`）。**本頁不是** —— 它是一個 Vite/React 應用程式的建置
產物，經過一支腳本後製注入全站共用元件。重建方式因此完全不同，本檔從頭
交代。

**Key difference from the other five project-XX pages**: those are
hand-authored HTML, byte-identical except one line. **This one is not** —
it's the built output of a Vite/React app, post-processed by a script to
inject the site's shared components. The rebuild procedure is therefore
entirely different and covered here from scratch.

---

## 0. 這個資料夾裡有什麼 / What's in this folder

```
alarm-notification-simulator/
├── index.html          ← 實際上線的頁面（Vite build + 注入的頂列，見 §2）
├── assets/              ← Vite 建置產物：內容雜湊檔名的 JS/CSS（每次 build 都會變）
├── README.md            ← 本專案頁的開發歷程
├── PROMPT.md             ← 本檔
└── source/                ← 告警通知模擬台完整原始碼（供參考／重建後端用）
    ├── apps/
    │   ├── api/            Fastify 通知後端（部署於 Render，見 §3）
    │   ├── ops-server/     模擬營運伺服器（部署於 Render，見 §3）
    │   └── web/             這裡的 index.html/assets/ 就是 build 這個得到的
    ├── packages/contracts/  三個 app 共用的型別／enum／格式化函式
    ├── docs/、requirement/、discussion_summary_0811.md
    ├── README.md／PROMPT.md  告警模擬台系統**自己的**權威文件（唯一權威見
    │                        source/PROMPT.md，不是本檔）
    ├── package.json（npm workspaces 根）
    ├── .env.example
    └── .env                ← 本機建置用，內含 VITE_* 網址，gitignored 不進版控
```

`source/` **有 git 追蹤但不隨 Cloudflare Pages 部署**——見根目錄
`.assetsignore` 內的 `alarm-notification-simulator/source/` 排除規則。
`source/` 底下的 `node_modules/`、`data/`、`.env` 皆已被複製時排除或事後
刪除，不會出現在這個資料夾裡。

`source/` is git-tracked but excluded from the Cloudflare Pages deploy —
see the `alarm-notification-simulator/source/` entry in root
`.assetsignore`. `node_modules/`, `data/`, and `.env` were excluded at
copy time or removed afterward; they are not present under `source/`.

---

## 1. 前端 index.html 是怎麼來的 / How index.html was produced

**來源**：`source/apps/web`（React 19 + Vite 8，`packages/contracts` 提供
共用型別，經由 vite alias 直接消費原始碼，非 npm 套件）。

**Source**: `source/apps/web` (React 19 + Vite 8; `packages/contracts` is
consumed directly from source via a Vite alias, not as an npm package).

### 1.1 建置指令 / Build command

```bash
python tools/build_alarm_frontend.py
```

（在根目錄執行。首次執行、或刪除過 `source/node_modules` 後，加
`--install` 參數強制重新安裝。）

(Run from the repo root. Pass `--install` to force a fresh dependency
install — needed the first time, or after deleting `source/node_modules`.)

### 1.2 腳本實際做的事 / What the script actually does

原始碼：根目錄 `tools/build_alarm_frontend.py`。逐步：

1. 若 `source/node_modules` 不存在（或帶 `--install`）：
   `npm install --ignore-scripts`。
   **為何 `--ignore-scripts`**：`apps/api` 的原生模組（`better-sqlite3`、
   `@node-rs/argon2`）需要 C++ build 工具鏈（Windows 上是 MSVC），本機
   （這台跑 Claude Code 的工作站）沒有裝。這裡只需要建置 `apps/web`
   （純 JS/TS），跳過原生模組編譯不影響結果。
2. `npm exec -w @alarm/web -- vite build --base=/alarm-notification-simulator/`
   ——`--base` **必須**設成這個值，因為頁面實際部署路徑是
   `st8925lab.com/alarm-notification-simulator/`，不是網域根目錄；Vite
   預設把資產路徑寫成絕對路徑 `/assets/...`，若不設 `--base` 會在正式站
   404。
3. 讀取 `source/apps/web/dist/index.html`，注入（若已注入過則跳過，可
   重複執行不出錯）：
   - `<link rel="stylesheet" href="../shared/wordmark.css">`
   - 一段 `<style>`：定義 `--bar-h: 64px`、`#st8925-topbar`（毛玻璃頂列，
     `position: fixed`、`z-index: 999999`、`border-bottom: 2px solid var(--c)`）、
     `#root { padding-top: var(--bar-h); }`（把 React 應用往下推，避免被
     頂列蓋住）。
   - `<header id="st8925-topbar"><a id="wordmark" href="../index.html" ...>` 插在 `<body>` 開頭、`#root` 之前。
   - `<script src="../config.js">`、`<script src="../shared/wordmark.js">`，
     與一段 inline script（見 §2）插在 `</body>` 前。
4. 把處理後的 `index.html` 與整個 `dist/assets/` 複製到本資料夾（覆蓋）。

（完整、逐行的實作以 `tools/build_alarm_frontend.py` 原始碼為準——上面
是摘要，數字與字串常數如有出入以該檔案為準。）

(For the exact, line-by-line implementation, read
`tools/build_alarm_frontend.py` itself — the above is a summary; that file
is authoritative for any constant or string.)

### 1.3 資產檔名 / Asset filenames

`assets/` 底下的檔名是 Vite 依內容雜湊產生（例如
`index-cbxPEGos.js`），**每次重新 build 都會改變**——本檔刻意不記錄
具體檔名，記了也會在下次 build 後過時。`index.html` 內的 `<script>`／
`<link>` 永遠指向當時實際產出的檔名，不需要手動同步。

Filenames under `assets/` are Vite's content hashes (e.g.
`index-cbxPEGos.js`) and **change on every rebuild** — deliberately not
recorded here, since they'd go stale the moment the next build runs.
`index.html`'s `<script>`/`<link>` tags always point at whatever the
current build actually produced; nothing to sync by hand.

---

## 2. 注入的頁面邏輯 / The injected page logic

`</body>` 前注入的 inline script（與另外五個 project-XX 頁使用完全相同的
色相交接慣例，見根目錄 PROMPT.md「色相傳遞」一節）：

```js
const MY_ID = '01';
const idx  = PROJECTS.findIndex(p => p.id === MY_ID);
const proj = PROJECTS[idx];
const hue = new URLSearchParams(location.search).get('hue');
const col = RAINBOW.find(c => c.name === hue) || RAINBOW[idx % RAINBOW.length];
document.documentElement.style.setProperty('--c', col.hex);
initWordmark('wordmark', SITE_NAME);
```

`MY_ID` 寫死為 `'01'` 是準確的（不是佔位符）——這支腳本本來就只為這一個
專案而寫，不像其他五頁的樣板需要靠改一行來複用六次。

`MY_ID` is hardcoded to `'01'` because it's accurate, not a placeholder —
this script exists to build exactly one project, unlike the five-page
template where one line is swapped to reuse it six times.

`--c` 除了原本用於（若有）UI 強調色外，這裡實際用於頂列下緣的 2px 色線
（`#st8925-topbar { border-bottom: 2px solid var(--c); }`），讓本頁與其他
專案共享「軌道顏色 = 進入後的強調色」這個視覺語言，即使版面完全不同。

Beyond any UI accent use, `--c` here specifically colours the top bar's
2px bottom border, so this page shares the "ring colour becomes the
accent colour on arrival" visual language with the other five pages even
though the layout is completely different.

---

## 3. 後端部署 / Backend deployment

前端內建的後端網址（寫死於 build 時的 `source/.env`，見 `VITE_API_BASE_URL`／
`VITE_OPS_BASE_URL`，並在 build 時被 Vite 內聯進 JS）：

The backend URLs baked into the frontend at build time (from
`source/.env`'s `VITE_API_BASE_URL`/`VITE_OPS_BASE_URL`, inlined into the
JS by Vite):

| 服務 Service | 網址 URL |
|---|---|
| API（`apps/api`）| `https://st8925lab-alarm-api.onrender.com` |
| Ops-server（`apps/ops-server`）| `https://st8925lab-alarm-ops.onrender.com` |

### 3.1 部署方式 / How to deploy

部署設定：根目錄 [`../render.yaml`](../render.yaml)（Render Blueprint，
定義上述兩個服務）。步驟：

1. Render dashboard → New → Blueprint → 連接 st8925lab 的 GitHub repo。
2. Render 會在 repo 根目錄自動找到 `render.yaml` 並讀取設定。
3. 兩個服務的 `rootDir` 都指向 `alarm-notification-simulator/source`
   （npm workspaces 的根目錄，`@alarm/contracts` 靠 workspace symlink
   解析，若把 rootDir 設到子資料夾會解析失敗）。
4. 首次部署後，到**兩個服務各自的** Environment 分頁，把
   `render.yaml` 裡標記 `sync: false` 的 `INTERNAL_WEBHOOK_SECRET` 填入
   ——**兩邊必須填完全相同的值**（ops-server 用它簽署 webhook，api 用它
   驗證；不同值會讓每一次模擬事件都驗簽失敗）。產生一個值：
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
5. `JWT_SECRET` 已設為 `generateValue: true`，Render 會自動產生，不需
   手動填。

### 3.2 已知限制 / Known limitations

Render 免費方案：閒置 15 分鐘後休眠，喚醒約 30–60 秒；檔案系統非持久化
——SQLite 資料庫在每次重啟（含休眠喚醒）時重置回種子資料。對「純展示、
假資料」的用途是可接受的取捨。若日後需要真正持久化，`render.yaml` 的
`plan: free` 改為付費方案並掛載 persistent disk 即可，應用程式碼不需
改動（`DATABASE_URL` 已是可設定項）。

Render's free tier sleeps after 15 min idle (≈30–60 s cold start) and has
an ephemeral filesystem — the SQLite DB resets to seed data on every
restart. Acceptable for a fake-data public demo. For real persistence
later, switching `plan: free` to a paid plan with a persistent disk needs
no application code changes (`DATABASE_URL` is already configurable).

### 3.3 登入帳號 / Demo login

`render.yaml` 設定的種子帳號（`SEED_MANAGER_EMAIL`／`SEED_ADMIN_EMAIL`／
`SEED_PASSWORD`）：

| 帳號 Account | Email | 密碼 Password |
|---|---|---|
| 值班經理 Manager | `manager@demo.local` | `Demo-Alarm-2026` |
| 系統管理員 Admin | `admin@demo.local` | `Demo-Alarm-2026` |

這組密碼直接寫在公開的 `render.yaml` 裡（非 `sync: false`）——刻意如此：
這是給任何造訪展示頁的人登入用的展示帳號，不是需要保密的憑證。

This password is deliberately in the public `render.yaml` (not marked
`sync: false`) — it's a demo credential meant for any visitor trying the
live page, not something that needs protecting.

### 3.4 完整系統規格 / Full system specification

後端的資料模型、API 端點、告警編號規則、雙層帳本、去重機制等——本檔不
重複，唯一權威是 [`source/PROMPT.md`](source/PROMPT.md)（開發時逐項自
`12_App_notification` 的原始碼轉寫，2026-08-13）。開發歷程與被推翻的
設計決策見 [`source/README.md`](source/README.md)。

The backend's data model, API endpoints, alarm-reference-code rules, the
two-layer ledger, deduplication, etc. are not repeated here — the sole
authority is [`source/PROMPT.md`](source/PROMPT.md) (transcribed from
`12_App_notification`'s actual source, 2026-08-13). Development history
and reversed decisions are in [`source/README.md`](source/README.md).

---

## 4. 未來修改 / Future Edits

- **改前端顯示內容**：改 `source/apps/web/src/` 底下的 React 原始碼，
  重新跑 `python tools/build_alarm_frontend.py`。**不要**直接編輯
  `alarm-notification-simulator/index.html`——那是建置產物，下次 build
  會被覆蓋。
- **改後端網址**：改 `source/.env` 的 `VITE_API_BASE_URL`／
  `VITE_OPS_BASE_URL`，重新 build（見 §1.1）。
- **改後端行為**：改 `source/apps/api` 或 `source/apps/ops-server`，
  推送後 Render 會自動重新部署（若有連 GitHub 自動部署；否則手動觸發）。
- 任何修改後：在 [`README.md`](./README.md) 新增一列變更紀錄，並在根目錄
  跑 `python verify.py` 確認全站仍然一致。

- **Editing frontend content**: edit React source under
  `source/apps/web/src/`, then rerun
  `python tools/build_alarm_frontend.py`. Do **not** hand-edit
  `alarm-notification-simulator/index.html` directly — it's build output
  and will be overwritten.
- **Changing backend URLs**: edit `VITE_API_BASE_URL`/`VITE_OPS_BASE_URL`
  in `source/.env`, then rebuild (§1.1).
- **Changing backend behaviour**: edit `source/apps/api` or
  `source/apps/ops-server`; Render redeploys automatically on push (if
  GitHub auto-deploy is connected) or on manual trigger.
- After any change: add a dated row to [`README.md`](./README.md) and run
  `python verify.py` from the repo root to confirm the whole site is
  still consistent.

---

## 5. 三專案協同互聯與機隊規範 / 3-Project Triad & Fleet Invariants

1. **角色職責**: 本專案（P01）為 ST8925 LAB 的告警推播與排班升級中樞 (Notification & Escalation Hub)。
2. **21 台實體機組規範 (21-Machine Production Fleet Scope)**:
   - 機隊定義由 `source/apps/web/src/constants/fleet.ts` 集中維護，收錄 8 大客戶廠區共 21 台實體冰水機（Chiller）與冷卻水塔（Tower），與 P02 及 P03 完全一致。
   - 預設機組為 `id: 15`（內湖生技-西側1號主機 `ECO-CH-01`）。
3. **頂部機組選擇橫幅 (`device-switcher-bar`)**:
   - `App.tsx` 必須在 header 與 main grid 之間渲染 `.device-switcher-bar`，提供 `🔍 目標監控機組 / Active Monitored Device:` 下拉選單與 `[SN]`, `[型號]`, `[🟢 監控中 Active]` 藥丸標籤。
4. **遙測動態綁定 (Dynamic Sensor & Trigger Binding)**:
   - **`SensorPanel.tsx`**: 接收 `selectedDevice` prop。依機組類型自適應調整感測器標籤（Chiller 為冰水出水溫/冷媒高壓；Tower 為冷卻水出水溫/風機負載），右下角顯示 `selectedDevice.sn`。
   - **`TriggerConsole.tsx`**: 接收 `selectedDevice` prop。情境預覽標題與內文動態帶入 `[${selectedDevice.sn}] ${selectedDevice.name}` 與型號。
5. **數據輸入流向**:
   - **來自 P02 (`iot-gen2-simulator-monitor`)**: 接收設備 Modbus 即時閾值超限告警（如冷媒高壓過高、壓縮機過電流、水流開關跳脫）。
   - **來自 P03 (`ai-diagnostic-kb`)**: 接收 AI 預防性診斷報告與 72h CUSUM 漸進漂移預警（如冷卻水塔結垢趨勢、冷媒微漏預警、處方型建議）。
6. **頂部導覽列規範**:
   - `st8925-topbar` 必須提供前往 `../iot-gen2-simulator-monitor/index.html` (P02) 與 `../ai-diagnostic-kb/index.html` (P03) 的快速切換連結。
7. **生產環境部署**:
   - 完整的 VPS Docker 容器化部署請參照根目錄 [`../VPS_DEPLOYMENT_GUIDE.md`](../VPS_DEPLOYMENT_GUIDE.md)。


