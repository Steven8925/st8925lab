# Project 05 — 重建規格 / Rebuild Prompt

讀完本檔即可重建 `project-05/index.html`。本頁**依賴**根目錄的共用檔案
（`config.js`、`shared/wordmark.css`、`shared/wordmark.js`），其規格在
根目錄 [`../PROMPT.md`](../PROMPT.md)，此處不重複——只講本頁**自己**的部分。

Reading this file alone reproduces `project-05/index.html`. This page
**depends on** the root's shared files (`config.js`,
`shared/wordmark.css`, `shared/wordmark.js`), specified in the root
[`../PROMPT.md`](../PROMPT.md) and not duplicated here — this file covers
only what is unique to this page.

---

## 前置需求 / Prerequisites

這個資料夾單獨存在**無法**運作；它必須放在整個 `st8925lab` 網站的檔案結構
下，與下列檔案同目錄的上一層並存：

```
site-root/
├── config.js              ← 必須存在，提供 PROJECTS / RAINBOW / SITE_NAME
├── shared/
│   ├── wordmark.css        ← 必須存在
│   └── wordmark.js         ← 必須存在
└── project-05/
    └── index.html          ← 本檔
```

This folder cannot run in isolation. It must sit one level below a site
root that also has `config.js` and `shared/wordmark.{css,js}` as shown
above.

---

## 規格 / Specification

**檔案 File**: `project-05/index.html`

**識別碼 Identity**: `const MY_ID = '05';` — 硬寫在本頁 `<script>` 內的唯一一行
專案專屬程式碼。其餘 JS 邏輯與另外五個 project-XX 頁面逐位元組相同。
Hard-coded as the one line of page-specific JS; everything else is
byte-identical across all six project-XX pages.

**版面 Layout**（由上到下 top to bottom）:

1. `<header id="topbar">` — 毛玻璃導覽列，只放 wordmark（無專案導覽，因為
   本頁已經「身在」某個專案裡）。`<a id="wordmark" href="../index.html">`，點擊回到
   首頁（`../` = 上一層 = 網站根目錄）。
   Frosted top bar, wordmark only (no project nav — this page already is
   a project). `href="../index.html"` returns to the homepage.
2. `<main>` 置中內容 centred content:
   - `#halo` — 86px 圓形光暈，色彩為 `var(--c)`，2.6 秒呼吸動畫（沿用
     `pulse` keyframes，`scale(1)→scale(1.14)→scale(1)`，`opacity .92→1→.92`）。
   - `#lead`（`<p>`）— 文字內容：`this is "PROJECT 05" home page.`
   - `#title`（`<h1>`）— 文字內容：`Welcome to "PROJECT 05"`
     （兩行合起來即為需求原文「this is "Project XX" home page. Welcome to
     "Project XX"」，`XX` 一律取自 `config.js` 的 `PROJECTS[].label`，
     **不寫死**，未來改名會自動反映。）
   - `#back`（`<a href="../index.html">`）— 文字 `← BACK TO ORBIT`。
3. Script 載入順序：`../config.js` → `../shared/wordmark.js` → 頁內 inline
   `<script>`。

**顏色邏輯 / Colour logic**（inline script）:

```js
const MY_ID = '05';
const idx  = PROJECTS.findIndex(p => p.id === MY_ID);
const proj = PROJECTS[idx];

const hue = new URLSearchParams(location.search).get('hue');
const col = RAINBOW.find(c => c.name === hue) || RAINBOW[idx % RAINBOW.length];
document.documentElement.style.setProperty('--c', col.hex);

document.title = `ST8925 LAB — ${proj.label}`;
document.getElementById('lead').textContent  = `this is "${proj.label}" home page.`;
document.getElementById('title').textContent = `Welcome to "${proj.label}"`;

initWordmark('wordmark', SITE_NAME);
```

優先採用 URL 的 `?hue=`（點擊首頁軌道時傳來的實際色相，見根目錄
PROMPT.md「色相傳遞」一節）；直接開啟本頁（無 `?hue=`）時退回
`RAINBOW[idx % RAINBOW.length]`。

Prefers the `?hue=` query param (the actual colour handed over when the
matching orbit ring was clicked — see the root PROMPT.md's "hue handoff"
section); falls back to `RAINBOW[idx % RAINBOW.length]` when opened
directly with no `?hue=`.

**CSS 要點 / CSS notes**:
- 沿用全站色票：`--bg:#04070e`、`--text:#e8eef7`、`--muted:#64748b`，
  字型 `ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace`。
- `--bar-h: 64px`，導覽列毛玻璃 `backdrop-filter: blur(14px) saturate(120%)`，
  與首頁一致。
- `--c` 由 JS 於執行期寫入，CSS 只讀取不寫死。
- `prefers-reduced-motion: reduce` 時停用 halo 動畫與 hover transition。

---

## 未來修改 / Future Edits

這是一個**可獨立編輯**的頁面——直接修改 `project-05/index.html` 的
`<main>` 內容即可放入真正的專案介紹，不會影響其他 5 個 project-XX 頁面
或首頁。修改後請同步：
1. 在 [`README.md`](./README.md) 新增一列變更紀錄（含日期）。
2. 若同時變更了 `config.js` 的 `label`，依「命名同步規則」（見
   README.md）重新命名本資料夾。

This page can be edited independently — change the `<main>` content in
`project-05/index.html` directly; it will not affect the other five
project-XX pages or the homepage. After editing:
1. Add a dated row to [`README.md`](./README.md).
2. If `config.js`'s `label` also changed, rename this folder per the
   naming-sync rule in README.md.
