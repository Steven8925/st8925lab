# Project 01 — 開發紀錄 / Development Log

本檔記錄 `alarm-notification-simulator/`（`config.js` 內 `id: '01'`）這個子頁面**自己的**變更歷史。
整站共用的架構決策（軌道、星雲爆炸、色相傳遞機制、共用站名元件等）記錄在
根目錄的 [`../README.md`](../README.md) 與 [`../PROMPT.md`](../PROMPT.md)，本檔不重複。

This file records the change history **local to** `alarm-notification-simulator/`
(`id: '01'` in `config.js`). Site-wide architecture decisions (the orbit,
the nebula burst, the hue-handoff mechanism, the shared wordmark
component, …) live in the root [`../README.md`](../README.md) and
[`../PROMPT.md`](../PROMPT.md) — not duplicated here.

---

## 本頁身份 / Identity

| 項目 Item | 值 Value |
|---|---|
| 內部代碼 Internal id | `01`（永不變動 / never changes）|
| 顯示名稱 Display label | `ALARM NOTIFICATION SIMULATOR`（取自 `config.js` 的 `PROJECTS[].label`）|
| 資料夾／URL Slug | `alarm-notification-simulator`（**必須**與 label 同步改名，見下方「命名同步規則」）|
| 軌道顏色 Ring colour | 由首頁彩虹配色第 1 環決定，隨機洗牌；本頁頂列下緣的色線與此同步 |
| 與其他 5 個 project-XX 頁的差異 | **本頁不是手寫 HTML。** 其餘五頁是逐位元組相同的樣板頁；本頁是一個
真實 React／Vite 應用程式（告警通知模擬台）打包後的產物，見下方「這是什麼」。<br>**This page is NOT hand-authored HTML** like the other five. It's the built output of a real React/Vite application (the alarm notification simulator). |

---

## 這是什麼 / What this page is

這是「告警通知模擬台」（Mobile Alarm Notification System — Phase A Simulation
Platform）的**模擬控制台前端**，原始開發於獨立專案
`C:\Claude Projects\12_App_notification\`。2026-08-13，山姆哥要求把該專案
變成 st8925lab.com 的 Project 01——不是寫一個介紹頁連結過去，而是讓
「點 PROJECT 01」這個動作，打開的就是那個真正可互動的模擬台本身。

This is the **console frontend** of the alarm notification simulator,
originally developed as the standalone project `12_App_notification`. On
2026-08-13, Sam asked for it to become st8925lab.com's Project 01 — not a
write-up linking out to it, but literally: clicking PROJECT 01 opens the
real, interactive console.

該系統完整的產品定義、架構決策、被推翻的假設、每一個抓到的 bug，記錄在
[`source/README.md`](source/README.md)（開發歷程）與
[`source/PROMPT.md`](source/PROMPT.md)（現行重建規格，唯一權威）——這兩份
文件是從 `12_App_notification` **原封不動複製過來的**，本檔不重複其內容。

The system's full product definition, architecture decisions, overturned
assumptions, and every bug caught along the way are recorded in
[`source/README.md`](source/README.md) (dev history) and
[`source/PROMPT.md`](source/PROMPT.md) (current rebuild spec, sole
authority for that system) — copied verbatim from `12_App_notification`,
not duplicated here.

---

## 架構上的取捨 / The architectural trade-off

st8925lab.com 是純靜態站（Cloudflare Pages，無伺服器）。告警模擬台需要三個
持續運行的服務（Fastify API、模擬營運伺服器、WebSocket）與一個 SQLite
資料庫，Cloudflare Pages 無法執行。因此：

st8925lab.com is a pure static site (Cloudflare Pages, no server). The
simulator needs three long-running services (a Fastify API, a simulated
ops server, WebSocket) plus a SQLite database — none of which Cloudflare
Pages can run. So:

| 部分 Part | 放在哪 Where | 說明 |
|---|---|---|
| 前端 Frontend（`apps/web`）| **這裡**，`index.html` + `assets/`，隨 st8925lab.com 一起部署 | Vite build，見下方「如何重建」 |
| 後端 Backend（`apps/api` + `apps/ops-server`）| **Render.com 免費方案**，`source/` 內原始碼供參考，實際執行於獨立網址 | 部署設定見根目錄 [`../render.yaml`](../render.yaml) |
| 原始碼 Full source | `source/` 子資料夾，git 有追蹤但**不**隨站部署（見根目錄 `.assetsignore`）| 供閱讀／重建參考 |

**後端網址（寫死於前端 build，見下方）：**
- API: `https://st8925lab-alarm-api.onrender.com`
- Ops-server: `https://st8925lab-alarm-ops.onrender.com`

**已知限制（山姆哥已接受）：** Render 免費方案閒置 15 分鐘後休眠，喚醒約
30–60 秒；檔案系統非持久化，SQLite 每次重啟會重置回種子資料。這對「純展示、
無真實使用者資料」的用途是可接受的取捨，不是 bug。另外，該系統的
`/v1/admin/*` 端點目前完全沒有身分驗證（見 `source/PROMPT.md` §6.2）——
公開部署前已明確告知山姆哥此風險，他選擇接受（假資料、無真實使用者）。

**Known limitations (accepted by Sam):** Render's free tier sleeps after 15
minutes idle (≈30–60 s to wake) and has an ephemeral filesystem — SQLite
resets to seed data on every restart. Acceptable for a public demo with
fake data, not a bug. Also, `/v1/admin/*` has zero authentication (see
`source/PROMPT.md` §6.2) — flagged explicitly before deployment; Sam
accepted the risk given there is no real user data involved.

---

## 如何重建前端 / How to rebuild the frontend

```bash
python tools/build_alarm_frontend.py
```

這支腳本（根目錄 `tools/`）會：用 `--ignore-scripts` 安裝依賴（本機無 C++
build 工具鏈，跳過 `apps/api` 的原生模組編譯，反正這裡只需要建置
`apps/web`）→ 用 `vite build --base=/alarm-notification-simulator/` 建置→
把全站共用的毛玻璃頂列／站名／色相交接邏輯注入建置產物的 `index.html`→
複製 `dist/` 到本資料夾，覆蓋 `index.html` 與 `assets/`。

This script (in root `tools/`): installs deps with `--ignore-scripts`
(this workstation has no C++ build toolchain, so `apps/api`'s native
modules are skipped — irrelevant here since only `apps/web` gets built) →
runs `vite build --base=/alarm-notification-simulator/` → injects the
site's shared frosted top bar / wordmark / hue-handoff logic into the
built `index.html` → copies `dist/` into this folder, overwriting
`index.html` and `assets/`.

重建前若改了後端網址，要同步改 `source/.env` 的 `VITE_API_BASE_URL`／
`VITE_OPS_BASE_URL`（這個檔案被 `.gitignore` 排除，不會進 git；Vite 會把
它的值直接內聯進打包後的 JS，所以前端每次改後端網址都要重新 build，不能
只改設定檔生效）。

If the backend URLs change, update `VITE_API_BASE_URL`/`VITE_OPS_BASE_URL`
in `source/.env` first (gitignored, not committed — Vite inlines these
values directly into the built JS, so a URL change always needs a rebuild,
never takes effect by just editing a config file post-build).

---

## 命名同步規則 / Folder-Rename-on-Label-Change Rule

> ⚠️ 若你（或未來的 AI 助手）修改了本專案在網站上顯示的名稱（`config.js` 的
> `label` 欄位），**必須同步將本資料夾改名**，讓資料夾名稱與顯示名稱維持
> 一致。不要只改 `label` 而漏改資料夾。
>
> 建議使用根目錄的 `tools/rename_project.py` 一次完成兩者：
> ```bash
> python tools/rename_project.py 01 "新的顯示名稱"
> ```
> 該腳本會同時重新命名資料夾、更新 `config.js` 的 `label`／`slug`，並提醒你
> 執行 `python verify.py` 確認全站仍然一致。**注意**：`rename_project.py`
> 只會改本檔與 `PROMPT.md` 裡的 label/slug 文字提及，**不會**重寫本檔其餘
> 內容——改名後仍需人工確認本檔敘述（尤其是「這是什麼」一節）沒有過時。
>
> If you (or a future AI assistant) change this project's displayed name
> (the `label` field in `config.js`), **this folder must be renamed to
> match in the same edit**. Use `python tools/rename_project.py 01 "New
> Display Name"` from the repo root to do both atomically. **Note**: the
> rename tool only touches label/slug *mentions* in this file and
> PROMPT.md — it does not rewrite the rest of their content. After a
> rename, manually confirm this file's prose (especially "What this page
> is") is still accurate.

---

## 變更歷史 / Change History

| 日期 Date | 變更 Change | 說明 Notes |
|---|---|---|
| 2026-08-09 | 建立本資料夾（初版）Folder created (v1) | 全站架構由「單一動態 `project.html?id=`」改為「六個獨立實體資料夾」，本頁當時是與其他 5 頁相同的樣板（halo + 呼吸 + 返回連結）。 |
| 2026-08-13 | **改建為告警通知模擬台 Rebuilt as the alarm notification simulator** | 山姆哥要求：把獨立專案 `12_App_notification`（告警通知模擬台）變成 Project 01，點擊後開啟真正可互動的模擬台，而非介紹頁。決策過程：(1) 確認後端是需要持續運行的 Node.js 服務，Cloudflare Pages 無法執行；(2) 選定 Render 免費方案架設後端（Railway/Fly.io 2026 年已無真免費方案；Arvixe 為 shared hosting 不支援多服務／WebSocket）；(3) 山姆哥接受 `/v1/admin/*` 端點無驗證的風險（純展示假資料）；(4) `tools/rename_project.py` 把 label 改為 `ALARM NOTIFICATION SIMULATOR`，slug 改為 `alarm-notification-simulator`；(5) 完整原始碼複製進 `source/`（排除 `.env`／`data/`／`node_modules`，山姆哥本機手動執行，因 sandbox 禁止跨目錄 `cp`）；(6) 新增 `tools/build_alarm_frontend.py`：用正確的 `--base` 路徑建置 `apps/web`，注入全站共用頂列與色相交接邏輯；(7) 新增根目錄 `render.yaml`，定義兩個 Render 服務（api、ops-server），秘密值一律 `sync: false` 或 `generateValue: true`，不進 git；(8) `.assetsignore` 新增排除 `alarm-notification-simulator/source/`，讓原始碼進 git 但不隨靜態站部署；(9) 調整根目錄 `verify.py` 的 `project labels` 檢查——原本寫死全部專案都是 `PROJECT NN` 樣板文字，本專案改名後會使其誤報失敗，改為檢查「每個專案都有非空 label、數量與環數一致」這個真正該成立的不變量。 |

*(未來每次修改本頁，請在此表新增一列，附日期與說明。)*
*(Add a new dated row here every time this page changes.)*
