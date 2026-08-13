# Project 05 — 開發紀錄 / Development Log

本檔記錄 `project-05/`（`config.js` 內 `id: '05'`）這個子頁面**自己的**變更歷史。
整站共用的架構決策（軌道、星雲爆炸、色相傳遞機制、共用站名元件等）記錄在
根目錄的 [`../README.md`](../README.md) 與 [`../PROMPT.md`](../PROMPT.md)，本檔不重複。

This file records the change history **local to** `project-05/`
(`id: '05'` in `config.js`). Site-wide architecture decisions (the orbit,
the nebula burst, the hue-handoff mechanism, the shared wordmark
component, …) live in the root [`../README.md`](../README.md) and
[`../PROMPT.md`](../PROMPT.md) — not duplicated here.

---

## 本頁身份 / Identity

| 項目 Item | 值 Value |
|---|---|
| 內部代碼 Internal id | `05`（永不變動 / never changes）|
| 顯示名稱 Display label | 取自 `config.js` 的 `PROJECTS[].label`（目前為 `PROJECT 05`）|
| 資料夾／URL Slug | `project-05`（**必須**與 label 同步改名，見下方「命名同步規則」）|
| 軌道顏色 Ring colour | 由首頁彩虹配色第 5 環決定，隨機洗牌 |

---

## 命名同步規則 / Folder-Rename-on-Label-Change Rule

> ⚠️ 若你（或未來的 AI 助手）修改了本專案在網站上顯示的名稱（`config.js` 的
> `label` 欄位），**必須同步將本資料夾改名**，讓資料夾名稱與顯示名稱維持
> 一致。不要只改 `label` 而漏改資料夾。
>
> 建議使用根目錄的 `tools/rename_project.py` 一次完成兩者：
> ```bash
> python tools/rename_project.py 05 "新的顯示名稱"
> ```
> 該腳本會同時重新命名資料夾、更新 `config.js` 的 `label`／`slug`，並提醒你
> 執行 `python verify.py` 確認全站仍然一致。詳見根目錄 [`PROMPT.md`](../PROMPT.md)
> 的「新增／改名專案」一節。
>
> If you (or a future AI assistant) change this project's displayed name
> (the `label` field in `config.js`), **this folder must be renamed to
> match in the same edit** — never change the label alone. Use
> `python tools/rename_project.py 05 "New Display Name"` from the repo
> root to do both atomically; see root [`PROMPT.md`](../PROMPT.md) →
> "Adding / renaming a project".

---

## 變更歷史 / Change History

| 日期 Date | 變更 Change | 說明 Notes |
|---|---|---|
| 2026-08-09 | 建立本資料夾 Folder created | 全站架構由「單一動態 `project.html?id=`」改為「六個獨立實體資料夾」，本頁取代舊有 `project.html?id=05` 的角色。內容：導覽列（共用站名元件，含 5 秒呼吸與 hover 逐字透鏡）＋ halo ＋ `this is "PROJECT 05" home page. Welcome to "PROJECT 05"` 文字＋返回首頁連結。頁面 accent color 沿用點擊軌道時傳遞的 `?hue=` 參數，與首頁色彩系統保持一致。詳見根目錄 README.md 與 PROMPT.md。<br>Site-wide architecture changed from a single dynamic `project.html?id=` page to six real folders. This page supersedes the old `project.html?id=05`. Content: top bar (shared wordmark component, 5 s pulse + hover per-glyph lens) + halo + the literal text `this is "PROJECT 05" home page. Welcome to "PROJECT 05"` + a back-to-orbit link. The page's accent colour follows the `?hue=` param carried from the clicked orbit ring, preserving the site's colour-continuity design. See the root README.md / PROMPT.md for full rationale. |

*(未來每次修改本頁，請在此表新增一列，附日期與說明。)*
*(Add a new dated row here every time this page changes.)*
