# ST8925 LAB — 重建規格 / Rebuild Prompt

**讀完本檔即可重建整個 st8925lab.com 網站**：首頁的呼吸夜間地球、六個
專案軌道、星雲爆炸與雙向連動、六個獨立的專案子頁，以及全站命名同步規則。
本檔取代舊有的 `V4_prompt.md`（已確認與 `README.md` 逐位元組相同，屬廢棄
重複檔，2026-08-09 已刪除）。

**Reading this file alone reproduces the entire st8925lab.com site**: the
breathing night-Earth homepage, six orbit rings mapped to six projects,
the nebula burst with bidirectional linking, six independently-editable
project pages, and the site-wide folder-naming-sync rule. This file
replaces the old `V4_prompt.md` (confirmed byte-identical to `README.md` —
a stale duplicate, deleted 2026-08-09).

深入的「為什麼」（每個決策背後被推翻的假設、實測數字、抓到的 bug）記錄在
[`README.md`](README.md)（開發史）與 [`SPEC-v4.md`](SPEC-v4.md)（v1–v4 詳細
規格書）。本檔只保留**重建所需**的內容，不重複那兩份文件的敘事，
避免規格與說明文件三份互相飄移。

The "why" behind each decision (overturned assumptions, measurements, bugs
caught) lives in [`README.md`](README.md) (dev history) and
[`SPEC-v4.md`](SPEC-v4.md) (the v1–v4 detailed spec). This file keeps only
what is **needed to rebuild**, so the three documents cannot silently
drift apart.

---

## 0. 檔案清單與載入順序 / File Manifest & Load Order

```
site-root/
├── index.html              首頁：夜間地球 + 導覽列 + 時間列
├── config.js                ★ 唯一資料源：PROJECTS + SITE_NAME + RAINBOW(12色)
├── geodata.js                地理資料（海岸線／陸地打包點）
├── shared/
│   ├── wordmark.css          ★ 共用元件：站名樣式
│   └── wordmark.js           ★ 共用元件：站名亦滅 + 逐字透鏡邏輯
├── app.js                    首頁渲染引擎（地球、軌道、爆炸、時鐘）
├── alarm-notification-simulator/  id '01'。★ 例外：不是手寫 HTML，是
│                              Vite/React 建置產物，見該資料夾自己的
│                              PROMPT.md（§4 有完整說明）
├── project-02/ .. project-06/  五個獨立專案子頁（各含 index.html／README.md／PROMPT.md）
├── tools/
│   ├── rename_project.py     ★ 專案改名同步工具
│   └── build_alarm_frontend.py  ★ 重建 alarm-notification-simulator 前端
├── render.yaml                 alarm-notification-simulator 後端的 Render 部署藍圖
├── verify.py                  驗證腳本（常數直接從原始碼解析）
├── make_standalone.py         打包單一檔案驗收版的工具
├── README.md / PROMPT.md      根目錄文件（本檔）
└── SPEC-v4.md                 v1–v4 詳細規格（歷史，供深入查閱）
```

**首頁載入順序不可調換** / homepage load order is mandatory:
```html
<link rel="stylesheet" href="shared/wordmark.css">
...
<script src="config.js"></script>
<script src="geodata.js"></script>
<script src="shared/wordmark.js"></script>
<script src="app.js"></script>
```
`app.js` 在頂層即讀取 `PROJECTS`、`SITE_NAME`、`COAST_PACKED` 與
`initWordmark`，故三者必須先於它載入。

**每個 project-XX/index.html 的載入順序**：
```html
<link rel="stylesheet" href="../shared/wordmark.css">
...
<script src="../config.js"></script>
<script src="../shared/wordmark.js"></script>
<script> /* page-specific inline script, MY_ID = '0N' */ </script>
```
子頁**不**載入 `app.js`（需要 canvas 與 `geodata.js`，子頁沒有 canvas）也
**不**載入 `geodata.js`。

---

## 1. `config.js` — 唯一資料源 / Single Source of Truth

```javascript
const SITE_NAME = 'ST8925 LAB';

const RAINBOW = [
    { name: 'red',     hex: '#ff6b6b', rgb: [255, 107, 107] },
    { name: 'orange',  hex: '#ffa94d', rgb: [255, 169,  77] },
    { name: 'yellow',  hex: '#ffe066', rgb: [255, 224, 102] },
    { name: 'green',   hex: '#69db7c', rgb: [105, 219, 124] },
    { name: 'blue',    hex: '#4dabf7', rgb: [ 77, 171, 247] },
    { name: 'indigo',  hex: '#a78bfa', rgb: [167, 139, 250] },
    { name: 'violet',  hex: '#f783ac', rgb: [247, 131, 172] },
    { name: 'lime',    hex: '#61af0e', rgb: [ 97, 175,  14] },
    { name: 'teal',    hex: '#0eb08f', rgb: [ 14, 176, 143] },
    { name: 'azure',   hex: '#8595f5', rgb: [133, 149, 245] },
    { name: 'purple',  hex: '#d077f4', rgb: [208, 119, 244] },
    { name: 'magenta', hex: '#f265d8', rgb: [242, 101, 216] },
];   // every hex >= 7.26 contrast against #04070e (WCAG AAA), 12-project ceiling

const PROJECTS = [
    { id: '01', label: 'PROJECT 01', slug: 'project-01' },
    { id: '02', label: 'PROJECT 02', slug: 'project-02' },
    { id: '03', label: 'PROJECT 03', slug: 'project-03' },
    { id: '04', label: 'PROJECT 04', slug: 'project-04' },
    { id: '05', label: 'PROJECT 05', slug: 'project-05' },
    { id: '06', label: 'PROJECT 06', slug: 'project-06' },
];

const PROJECT_URL = (slug, hue) =>
    `${slug}/index.html` + (hue ? `?hue=${encodeURIComponent(hue)}` : '');
```

**每筆 `PROJECTS` 三個欄位的角色**（規則不可弱化）：

| 欄位 | 角色 | 可否變動 |
|---|---|---|
| `id` | 內部穩定代碼（`'01'`..`'12'`）。命名同步腳本、per-project 文件、`MY_ID` 皆以此為準。 | **永不**變動 |
| `label` | 導覽列與頁面上顯示的人類可讀名稱 | 隨時可改 |
| `slug` | 資料夾名稱＝URL 路徑（`<slug>/index.html`） | **改 `label` 時必須同步改**，用 `tools/rename_project.py` |

**一筆＝一個專案＝一條軌道＝一個顏色＝一個實體資料夾。** `ORBIT_RINGS`（app.js）
由 `PROJECTS.length` 推導；環平面角 `k·π/N`、導覽列、可點光點全部跟著自動
適應。新增第 7 個以上專案時，除了在 `PROJECTS` 加一筆，還需**手動建立對應
資料夾**（見 §5「新增專案」）——這是本次改版與舊版 `project.html?id=` 機制
最大的差異：舊機制新增專案不必建檔，新機制需要，換取的是「每個專案可被
獨立編輯」。

硬上限 `RAINBOW.length`（12）；超過會使兩專案同色，`app.js` 有執行期
`console.error` 警告，`verify.py` 亦會失敗。

**色相傳遞 / Hue handoff**：首頁每次載入都會用 Fisher-Yates 洗牌
`RAINBOW`，因此「第 i 環」不等於「調色盤第 i 色」。點擊軌道或導覽列時，
`app.js` 呼叫 `PROJECT_URL(PROJECTS[ringIndex].slug, ringColours[ringIndex].name)`，
把**實際被點到的色相**用 `?hue=` 帶到目的頁，讓子頁顯示的顏色與剛才點擊的
軌道一致（機率原本只有約 1/12，見 README.md §6.7 錯誤 A）。子頁沒有
`?hue=`（直接開啟）時，退回 `RAINBOW[idx % RAINBOW.length]`。

---

## 2. `shared/wordmark.css` + `shared/wordmark.js` — 共用站名元件

首頁與六個 project-XX 頁面**共用同一份**站名程式碼（不是六份複製貼上）。
使用方式：

```html
<link rel="stylesheet" href="<相對路徑>/shared/wordmark.css">
<script src="<相對路徑>/shared/wordmark.js"></script>
```
```html
<a id="wordmark" href="<回首頁的相對路徑>" aria-label="ST8925 LAB"></a>
```
```js
initWordmark('wordmark', SITE_NAME);   // SITE_NAME 來自 config.js
```

`initWordmark(elementId, text)` 做的事：

1. 把 `text` 逐字拆成 `<span class="glyph">`（空白也給獨立 span，讓透鏡
   連空隙一起變形）。
2. 啟動獨立 rAF 迴圈（不與宿主頁面的其他繪製迴圈共用，避免 DOM 寫入與
   canvas 繪製交錯），每幀做：
   - **5 秒正弦亦滅**：`k = 0.5 - 0.5·cos(2π·t/5)`，灰階
     `v = round(0x55 + (0x99-0x55)·k)`，寫入 `style.color = rgb(v,v,v)`。
     `t=0` 為 `#555555`（對比 2.70），`t=2.5` 為 `#999999`（對比 7.07，AAA）。
     恆常執行，hover 不影響。
   - **逐字透鏡**：`pointermove` 時以阻尼 `LENS_DAMPING=0.18` 平滑追隨
     滑鼠 x 座標；每個字元依「升餘弦衰減」公式
     `f = 0.5 + 0.5·cos(π·d/110)`（`d`＝與鏡心距離，`d<110` 才生效）算出
     `scale = 1 + 0.55·f`（峰值 1.55）與 `lift = -9·f`（峰值上移 9px），
     寫入 `transform: translateY(lift) scale(scale)`。升餘弦衰減保證兩端
     斜率為 0，邊界無折痕（線性衰減會有摺角）。
3. `resize` 與 `document.fonts.ready` 後重新量測每個字元的靜止中心
   （必須在透鏡關閉時量測，否則放大後的位置會回授到下一幀）。

**常數**（寫在 `wordmark.js` 的 `initWordmark` 函式作用域內，非全域）：

| 常數 | 值 | 意義 |
|---|---|---|
| `PULSE_PERIOD` | 5.0 s | 亦滅週期 |
| `PULSE_DARK` / `PULSE_BRIGHT` | `0x55` / `0x99` | 暗相／亮相灰階 |
| `LENS_MAX_SCALE` | 1.55 | 鏡心最大放大 |
| `LENS_RADIUS` | 110 px | 透鏡影響半徑 |
| `LENS_LIFT` | 9 px | 鏡心最大上移 |
| `LENS_DAMPING` | 0.18 | 透鏡追隨阻尼 |

`shared/wordmark.css` 只放 `#wordmark`／`.glyph`／`.glyph.space` 三條規則
（見檔案本身，全站唯一副本）。

---

## 3. 首頁 `index.html` + `app.js` — 夜間地球與軌道

（完整規格、每個決策的實測數字與被推翻的假設見 SPEC-v4.md 與 README.md；
本節只列出**重建所需**的常數與演算法摘要，數字直接取自目前的 `app.js`
原始碼，2026-08-09。）

### 3.1 固定參數 / Fixed parameters

| 常數 | 值 | | 常數 | 值 |
|---|---|---|---|---|
| `POINTS_PER_RING` | 4 | | `CAM_DISTANCE` | 900 |
| `ORBIT_RADIUS` | 240 px | | `CAM_RX0` / `CAM_RY0` | 0.35 / 0.0 |
| `EARTH_RADIUS` | 130 px | | `DRAG_SENS` | 0.006 rad/px |
| `TILT_DEG` | 65 | | `OCCLUSION_MARGIN` | 0.985 |
| `RING_ALPHA` | 0.4 | | `BACKFACE_ALPHA` | 0.0 |
| `RING_SEGMENTS` | 120 | | `STAGE_Y_OFFSET` | -50 px |
| `ORBIT_SPEED` | 1.5 rad/s | | `TRAIL_POINTS` | 15 |
| `EARTH_SPIN` | 0.18 rad/s | | `TRAIL_DTHETA` | 0.04 rad |
| `LEAD_SCALE` | 1.5 | | `POINT_SIZE` | 6 px |
| `DIM_ALPHA` | 0.45 | | | |

`ORBIT_RINGS = PROJECTS.length`（推導，非字面量）。

### 3.2 幾何 / Geometry

圓在 XY 平面，先繞 X 軸傾斜 `TILT`，再繞 Z 軸轉 `planeAngle = k·π/ORBIT_RINGS`：
```
x0 = R·cosθ,  y0 = R·sinθ
x  = x0·cos(planeAngle) − y0·cos(tilt)·sin(planeAngle)
y  = x0·sin(planeAngle) + y0·cos(tilt)·cos(planeAngle)
z  = y0·sin(tilt)
```
相機：先繞 Y 轉 `rotY` 再繞 X 轉 `rotX`；透視 `fov = CAM_DISTANCE / (CAM_DISTANCE + z)`；
`px = cx + x·fov·scale`，`py = cy + y·fov·scale`。

**z 軸號誤（極重要，曾出兩次）**：`fov` 與 `z` 成反比，`z` 越大＝越遠。
地球「背面」是 `z > 0`（相機座標系，非世界座標系——世界座標會導致拖曳時
可見半球不隨相機改變）。遮擋判斷：`if (p.z <= 0) continue;`（配合
`OCCLUSION_MARGIN` 的球面測試）。

環平面角必須均分於 `π`（非 `2π`）——環轉 `π` 後與原環共平面，走滿
`2π` 會產生重複環。任意 `N`：`angles = [k·π/N for k in 0..N-1]`。

### 3.3 呼吸 / Breathing

只作用於軌道與光點，**地球半徑恆為 `EARTH_RADIUS`**（`earthPx = EARTH_RADIUS * sceneScale`，
不乘 breath）。

```
breath = 1 + sin(2π·t/BREATH_PERIOD)·BREATH_AMPLITUDE + mouseBreath
orbitR = ORBIT_RADIUS * breath
```

| 常數 | 值 |
|---|---|
| `BREATH_AMPLITUDE` | 0.12（±12%）|
| `BREATH_PERIOD` | 8.0 s |
| `MOUSE_BREATH_MAX` | 0.08（+8%，滑鼠距離越遠疊加越大）|
| `MOUSE_BREATH_RANGE` | 420 px |
| `MOUSE_DAMPING` | 0.06 |

用 `sin()` 而非 `(1-cos)/2` 重新映射：`sin(0)=0` 保證載入瞬間倍率恰為
1.0000，無跳動。`resize()` 必須以 `ORBIT_RADIUS*(1+BREATH_AMPLITUDE+MOUSE_BREATH_MAX)`
預留最大膨脹空間。

### 3.4 星雲爆炸 / Nebula burst

點擊軌道光點或導覽列項目都呼叫同一個入口 `openProject(ringIndex)`（雙向
共用，避免行為飄移）；同色環上**所有**光點同時爆炸，`BURST_DURATION`
後導向 `PROJECT_URL(PROJECTS[ringIndex].slug, ringColours[ringIndex].name)`。

| 常數 | 值 | | 常數 | 值 |
|---|---|---|---|---|
| `BURST_DURATION` | 1400 ms | | `BURST_RING_MAX` | 960 px |
| `BURST_PARTICLES` | 400 | | `BURST_FLASH_SCALE` | 40.0 |
| `BURST_SPEED_MIN` | 560 px/s | | `BURST_PARTICLE_R` | 19.2 px |
| `BURST_SPEED_MAX` | 2400 px/s | | `BURST_CLOUDS` | 16 |
| `BURST_DAMPING` | 0.945 | | `BURST_CLOUD_R` | 624 px |
| `BURST_GLOW_MULT` | 4.5 | | `BURST_SPARKS` | 48 |

五層合成：瀰漫雲團 → 衝擊波 → 核心閃光 → 粒子＋光暈 → 十字星芒。
`ctx.globalCompositeOperation = 'lighter'`（加成混合，重疊處趨白，星雲
發光的關鍵），繪製後**必須還原**否則後續繪製全變加成。淡出曲線
`(1-prog)^1.7`。爆炸參與正常深度排序（`drawList.push({ z: b.z, ... })`），
轉到地球背面會被正確遮住。

點擊判定：位移 `< CLICK_MAX_MOVE`(6px) 且按壓 `< CLICK_MAX_MS`(400ms) 才算
點擊，`HIT_PADDING`(8px) 為命中寬容。被地球遮擋的光點在 `hitTargets`
註冊前已 `continue`，天然不可點。

### 3.5 貼地浮雕文字 / Embossed surface text、地標、時鐘

太平洋（經度 -144°）與大西洋（經度 -14°，皆由 `geodata.js` 的赤道帶
無陸地缺口推導，非目測）各貼一次 `st8925lab`。顏色以海洋底色
`#0b1a2e`（`OCEAN_BASE`）為基準，5 秒週期在 ×1.0（隱形）到 ×2.5（對比
1.71）間振盪。邊緣 `cos(theta) < 0.35` 淡出（`EMBOSS_FADE_COS`）。

台灣（25.03, 121.57）與新加坡（1.35, 103.82）各有 2 秒週期雷達紅點
（`MARKER_PERIOD/DOT_R/RING_MAX/COLOUR/SITES`）。部署地第三個紅點需
`ENABLE_GEO_LOOKUP = true` 才會查詢（預設關閉，見 README.md §5.6 隱私
取捨）。

時鐘列：本地時間（62 城市下拉選單，`WORLD_CITIES`，`Intl.DateTimeFormat`）
與 GMT+8（`CLOCK_TZ_OFFSET`）並列，彩虹隨機取 2 色。

完整參數表與每個決策的實測依據見 SPEC-v4.md §4–§7。

---

## 4. Project-XX 頁面規格 / Project Page Specification

> ⚠️ **本節描述的樣板僅適用於 project-02 ~ project-06。**
> `alarm-notification-simulator/`（id `01`）2026-08-13 起是例外——它不是
> 手寫 HTML，而是一個真實 React 應用（告警通知模擬台）的 Vite 建置產物，
> 經 `tools/build_alarm_frontend.py` 後製注入頂列／站名／色相邏輯。完整
> 規格見 [`alarm-notification-simulator/PROMPT.md`](alarm-notification-simulator/PROMPT.md)，
> 本節不重複、也不適用於它。一個專案一旦被填入真實內容，就沒有義務繼續
> 套用「六份逐位元組相同」的樣板——那個樣板本來就只是給空白佔位頁用的。
>
> **This section's template applies to project-02 through project-06 only.**
> `alarm-notification-simulator/` (id `01`) has been an exception since
> 2026-08-13 — it's the Vite build output of a real React app, not
> hand-authored HTML. Full spec:
> [`alarm-notification-simulator/PROMPT.md`](alarm-notification-simulator/PROMPT.md).
> A project that receives real content has no obligation to keep following
> the "six byte-identical files" template — that template only ever existed
> for blank placeholder pages.

每個 `project-XX/index.html`（`XX` = 02~06）**是一個真實、獨立可編輯的
靜態頁面**（不是由查詢字串渲染的樣板）。五份檔案除了一行
`const MY_ID = '0N';` 之外逐位元組相同。完整版面／CSS／JS 見任一
`project-XX/PROMPT.md`（內容彼此僅 `MY_ID` 不同）；摘要如下：

**版面**：毛玻璃導覽列（僅站名，無專案導覽）→ 置中的 halo（顏色
`var(--c)`，2.6 秒呼吸動畫）→ 文字 `this is "<label>" home page.` →
`<h1>Welcome to "<label>"</h1>` → 返回首頁連結。

**識別與配色**（inline script）：
```js
const MY_ID = '01';   // 本頁唯一與其他 project-XX 不同的一行
const idx  = PROJECTS.findIndex(p => p.id === MY_ID);
const proj = PROJECTS[idx];
const hue  = new URLSearchParams(location.search).get('hue');
const col  = RAINBOW.find(c => c.name === hue) || RAINBOW[idx % RAINBOW.length];
document.documentElement.style.setProperty('--c', col.hex);
document.title = `ST8925 LAB — ${proj.label}`;
// ...填入 lead / title 文字...
initWordmark('wordmark', SITE_NAME);
```

`<label>` 一律讀 `proj.label`，**不寫死**——改了 `config.js` 的 label，
六個頁面的文字會自動反映，不需要逐檔修改。

---

## 5. 新增／改名專案 / Adding or Renaming a Project

### 新增專案 Adding

1. 在 `config.js` 的 `PROJECTS` 加一筆 `{ id, label, slug }`（`id` 用下一個
   未使用的兩位數字，`slug` 建議直接等於 `label` 的 kebab-case）。
2. 建立資料夾 `<slug>/`，複製任一既有 `project-XX/index.html` 進去，
   把 `const MY_ID = '0N';` 改成新專案的 `id`。
3. 複製對應的 `README.md`／`PROMPT.md`，依同樣格式填入新 `id`／`label`／`slug`。
4. 執行 `python verify.py` 確認：`ORBIT_RINGS` 自動跟上、色票是否還有
   餘量（硬上限 12）、每個 `PROJECTS` 條目都有對應資料夾。

超過 12 個專案會超出 `RAINBOW` 色票，`app.js` 執行期會 `console.error`，
`verify.py` 也會失敗——這是刻意設計的**明確失敗**，而非默默壞掉。

### 改名專案 Renaming（label 變更）

**規則：`label` 一旦變更，`slug`（與磁碟上的實際資料夾）必須在同一次
修改中同步改名。** 不要只改 `config.js` 的 `label` 而漏改資料夾——兩者
不同步會讓 URL（`slug`）與畫面顯示（`label`）互相矛盾。

```bash
python tools/rename_project.py <id> "<新的顯示名稱>"
python verify.py
```

`tools/rename_project.py` 會原子性地完成：資料夾改名、`config.js` 的
`label`／`slug` 更新、該資料夾內 `README.md`／`PROMPT.md` 的 label／slug
文字盡力更新。磁碟改名失敗（權限、鎖定）時**不會**去動 `config.js`，
確保失敗時儲存庫仍是一致狀態，不留半套。

> ⚠️ 資料夾改名會改變其 URL 路徑（`<slug>/index.html`）。若網站已上線
> 且曾被搜尋引擎索引或有人加了書籤，改名會讓舊網址失效（無自動轉址）。
> 這是本次架構選擇的已知取捨——換取「資料夾名稱與顯示名稱永遠一致」，
> 若日後需要，可額外在 Cloudflare Pages 設定 `_redirects` 規則保留舊路徑。

---

## 6. 驗證 / Verification

```bash
python verify.py            # 純檢查
python verify.py --render   # 另外輸出預覽 PNG（需 Pillow）
```

常數直接從 `app.js`／`config.js`／`shared/wordmark.js` 原始碼解析，不重新
輸入，因此腳本不會與被檢驗的實作悄悄脫節。檢查涵蓋：光點遮擋、環平面角、
z 軸號誤、配色洗牌與對比、地理資料、版面標籤、呼吸、站名亦滅與透鏡、
貼地浮雕文字、地標、時鐘、星雲爆炸與點擊判定、**擴充性（`PROJECTS` 每筆
是否都有對應的 `<slug>/index.html`）**。

驗證腳本**不執行瀏覽器 JavaScript**，只驗證幾何、資料與原始碼中的關鍵
判斷式；互動與視覺效果需在真實瀏覽器測試（見 README.md §6.10 的教訓：
兩個 bug 只有真人實測才發現）。

---

## 7. 部署 / Deployment

靜態網站，部署於 Cloudflare Pages（`st8925lab.com`）。`.assetsignore` 排除：
- `cloudmd/`（開發筆記，不隨站部署）
- `alarm-notification-simulator/source/`（告警模擬台完整原始碼，git 有
  追蹤供參考，但不隨靜態站部署——見下方「後端部署」）

`shared/`、`project-02/`..`project-06/`、`alarm-notification-simulator/`
（僅 `index.html` 與 `assets/`）、`tools/` 皆為一般靜態資源／原始碼，
`tools/*.py` 不會被瀏覽器請求，留在 repo 中純供維運使用，不影響前端載入。

單檔驗收版：`python make_standalone.py` 仍可用（打包 `index.html` +
`config.js` + `geodata.js` + `shared/wordmark.js` + `app.js` 為一個檔案，
專案點擊改以隱藏覆蓋層呈現，因為單檔版沒有可導向的實體資料夾）。**此工具
不處理 `alarm-notification-simulator`**——它是獨立打包的 React 應用，不是
`app.js` 渲染邏輯的一部分。

### 7.1 alarm-notification-simulator 的後端部署 / Backend deployment

`alarm-notification-simulator/`（id `01`）與其餘專案的關鍵差異：它需要
兩個持續運行的 Node.js 服務（`apps/api`、`apps/ops-server`），Cloudflare
Pages 無法執行。這兩個服務部署於 **Render.com 免費方案**，設定見根目錄
[`render.yaml`](render.yaml)。完整部署步驟、已知限制（免費方案休眠與
非持久化檔案系統）、展示帳號，見
[`alarm-notification-simulator/PROMPT.md`](alarm-notification-simulator/PROMPT.md) §3。

前端與後端網址的耦合方式：`alarm-notification-simulator/source/apps/web`
在建置時（`tools/build_alarm_frontend.py`）把後端網址從
`source/.env` 的 `VITE_API_BASE_URL`／`VITE_OPS_BASE_URL` **內聯進打包後的
JS**——這是 Vite 的標準行為，不是本站特有的設計。後端網址若改變（例如
Render 服務改名），必須重新執行建置腳本，不能只改設定檔生效。
