# ST8925 LAB — 重建規格 / Rebuild Prompt

**讀完本檔即可重建整個 st8925lab.com 網站**：首頁的呼吸夜間地球、六個
專案軌道、星雲爆炸與雙向連動、六個獨立的專案子頁，以及全站命名同步規則。
本檔取代舊有的 `V4_prompt.md`（曾確認與當時的 `README.md` 逐位元組相同，
屬廢棄重複檔）。

> ℹ️ **註記（2026-08-14）**：本檔一度聲稱 `V4_prompt.md` 與 `project.html`
> 已於 2026-08-09 刪除，但 2026-08-13 覆核磁碟時發現兩者**都還在**（另有
> 一個 `V4/` 資料夾，內含整份舊版網站副本）——推測是某次還原動作把它們帶
> 了回來，原因無法查證，故不臆測。**2026-08-14 山姆哥指示後已實際刪除
> `V4/`、`project.html`、`V4_prompt.md`**，磁碟現況與本敘述一致。
> 刪除前已確認 `V4/` 內的 `SPEC-v4.md`、`geodata.js`、
> `st8925lab-deploy-guide.html` 與根目錄副本逐位元組相同（無獨有內容遺失）；
> 其餘 `app.js`／`config.js`／`index.html`／`verify.py` 為改版前的舊版本。
> **這些舊版本可從 git 首次提交 `9f05c8c` 還原**
> （`git checkout 9f05c8c -- V4/ project.html V4_prompt.md`）。
> **Note (2026-08-14)**: this file once claimed `V4_prompt.md` and
> `project.html` were deleted on 2026-08-09; a 2026-08-13 disk check found
> both still present, along with a `V4/` folder holding a full copy of the
> old site (apparently restored by something earlier; cause not
> verifiable, so not guessed at). **On 2026-08-14 Sam had `V4/`,
> `project.html` and `V4_prompt.md` actually deleted**, so this text and
> the disk now agree. Before deleting, `V4/`'s `SPEC-v4.md`, `geodata.js`
> and `st8925lab-deploy-guide.html` were confirmed byte-identical to their
> root copies (nothing unique lost); its older `app.js`/`config.js`/
> `index.html`/`verify.py` were pre-migration versions, and **all of it is
> recoverable from the initial git commit `9f05c8c`**
> (`git checkout 9f05c8c -- V4/ project.html V4_prompt.md`).

**Reading this file alone reproduces the entire st8925lab.com site**: the
breathing night-Earth homepage, six orbit rings mapped to six projects,
the nebula burst with bidirectional linking, six independently-editable
project pages, and the site-wide folder-naming-sync rule. This file
replaces the old `V4_prompt.md` (once confirmed byte-identical to the
`README.md` of the time — a stale duplicate; see the correction note
above for its actual on-disk status).

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
├── iot-gen2-simulator-monitor/    id '02'。Wayne IoT Server Gen 2 模擬監控台與 VPS 生產藍圖
├── ai-diagnostic-kb/              id '03'。工業冷卻水與冰水機組 AI 智慧診斷與知識庫平台
├── project-04/ .. project-05/     兩個獨立專案子頁（各含 index.html／README.md／PROMPT.md）
├── Travel-Assistance/             id '06'。旅遊協助平台（git submodule，指向 Steven8925/Travel-Assistance）
├── tools/
│   ├── rename_project.py     ★ 專案改名同步工具
│   └── build_alarm_frontend.py  ★ 重建 alarm-notification-simulator 前端
├── render.yaml                 Render 部署藍圖（alarm 與 ai-diagnostic-kb 服務）
├── VPS_DEPLOYMENT_GUIDE.md     ★ 獨立生產環境 (VPS Prod) 遷移部署與維運總手冊
├── verify.py                  驗證腳本（常數直接從原始碼解析）
├── make_standalone.py         打包單一檔案驗收版的工具
├── .gitignore                ★ 擋「進不進 git」（repo 為 public，見 §7.2）
├── .assetsignore             ★ 擋「會不會被發佈成網站資產」（見 §7）
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
    { id: '01', label: 'ALARM NOTIFICATION SIMULATOR', slug: 'alarm-notification-simulator' },
    { id: '02', label: 'IOT GEN2 SIMULATOR & MONITOR', slug: 'iot-gen2-simulator-monitor' },
    { id: '03', label: 'AI DIAGNOSTIC KB', slug: 'ai-diagnostic-kb' },
    { id: '04', label: 'PROJECT 04', slug: 'project-04' },
    { id: '05', label: 'PROJECT 05', slug: 'project-05' },
    { id: '06', label: 'TRAVEL ASSISTANCE', slug: 'Travel-Assistance' },
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

### 3.6 頂部導覽列全專案永遠可見原則 / Responsive Top Bar & Universal Visibility Invariant

> ⚠️ **核心原則：全站頂部導覽列（`#projects`）之所有子專案按鈕在任何視窗尺寸、螢幕解析度或系統縮放比例（如 Windows 125%/150% 縮放）下，都必須永遠完整可見，絕對禁止將右側子專案推擠至螢幕外或裁切隱藏。**
>
> **Core Invariant: All sub-project buttons in the top navigation bar (`#projects`) must remain fully visible at all times across any viewport size, display resolution, or system scaling level (125%/150%). Under no circumstances may right-hand sub-projects be pushed off-screen, clipped, or hidden.**

為達成此原則，導覽列採用「多階層自適應文字階梯」（Multi-tier Responsive Labeling）：

1. **多階層自適應階梯 (Multi-tier Adaptive Labeling)**：
   - **寬螢幕（> 1420px）**：顯示完整全名（`.t-full`，例如 `ALARM NOTIFICATION SIMULATOR`、`TRAVEL ASSISTANCE`）。
   - **標準桌機 / 筆電縮放（1150px ~ 1420px）**：自動切換為精簡標籤（`.t-mid`，例如 `ALARM SIMULATOR`、`IOT GEN2 MONITOR`、`AI DIAGNOSTIC`、`TRAVEL ASSIST`）。
   - **平板 / 窄視窗分割（840px ~ 1149px）**：自動切換為短標籤（`.t-short`，例如 `ALARM`、`IOT GEN2`、`AI KB`、`P04`、`P05`、`TRAVEL`）。
   - **手機 / 極窄螢幕（< 840px）**：自動切換為編號徽章（`.t-tiny`，例如 `P01`、`P02`、`P03`、`P04`、`P05`、`P06`）。
   - **完整名稱 Tooltip**：所有按鈕均綁定 `a.title = "${proj.id}: ${proj.label}"`，滑鼠懸停時隨時可查閱完整專案名稱。

2. **禁止隱形橫向捲動裁切**：
   - 嚴格禁止使用 `overflow-x: auto; scrollbar-width: none;` 來遮掩溢位。這種做法會導致桌機使用者在無觸控板時無法察覺右側專案的存在。容器必須使用彈性流式佈局配合文字階梯，確保 100% 空間配比自然相容。

---

## 4. Project-XX 頁面規格 / Project Page Specification

> ⚠️ **本節描述的樣板僅適用於 iot-gen2-simulator-monitor ~ project-05。**
> `alarm-notification-simulator/`（id `01`）2026-08-13 起是例外——它不是
> 手寫 HTML，而是一個真實 React 應用（告警通知模擬台）的 Vite 建置產物，
> 經 `tools/build_alarm_frontend.py` 後製注入頂列／站名／色相邏輯。完整
> 規格見 [`alarm-notification-simulator/PROMPT.md`](alarm-notification-simulator/PROMPT.md)，
> 本節不重複、也不適用於它。`Travel-Assistance/`（id `06`）亦為例外——
> 它是獨立的 git submodule，有自己的完整前後端結構。一個專案一旦被填入
> 真實內容，就沒有義務繼續套用「佔位頁」的樣板。
>
> **This section's template applies to iot-gen2-simulator-monitor through project-05 only.**
> `alarm-notification-simulator/` (id `01`) has been an exception since
> 2026-08-13 — it's the Vite build output of a real React app, not
> hand-authored HTML. Full spec:
> [`alarm-notification-simulator/PROMPT.md`](alarm-notification-simulator/PROMPT.md).
> A project that receives real content has no obligation to keep following
> the "six byte-identical files" template — that template only ever existed
> for blank placeholder pages.

### 4.1 共用頂列強制規則 / Mandatory Shared Top Bar

> ⚠️ **此規則適用於所有專案子頁面，無一例外——無論是樣板佔位頁、Vite 建置**
> **產物、還是獨立 git submodule。違反此規則的頁面不得合併。**
>
> **This rule applies to EVERY sub-project page without exception — whether**
> **it is a template placeholder, a Vite build output, or an independent git**
> **submodule. Pages violating this rule must not be merged.**

每個專案子頁面都**必須**包含以下站點共用元素：

1. **ST8925 LAB 字樣（左上）**：載入 `../shared/wordmark.css` +
   `../shared/wordmark.js`，並呼叫 `initWordmark('wordmark', SITE_NAME)`。
   字樣必須具備 5 秒灰階呼吸動畫與滑鼠 hover 逐字透鏡放大效果。
2. **BACK TO ORBIT 連結（右上）**：`href="../index.html"`，回到首頁軌道頁。
3. **`config.js` 載入**：`<script src="../config.js">`，確保
   `PROJECTS`、`RAINBOW`、`SITE_NAME` 等全站常數可用。
4. **`MY_ID` 宣告**：`const MY_ID = '<id>';`，`<id>` 為該專案在 `PROJECTS`
   中的 `id` 值（如 `'01'`、`'06'`）。
5. **色相傳遞**：從 `?hue=` 查詢參數接收首頁傳來的色相名稱，以
   `RAINBOW.find(c => c.name === hue)` 解析；直接開啟時退回
   `RAINBOW[idx % RAINBOW.length]` 的索引配色。寫入 CSS 自訂屬性
   `--c` 以統一頂列底線顏色。

**實作參考**：
- 樣板佔位頁：見 `project-04/index.html`、`project-05/index.html`
- 工業監控主控台：見 `iot-gen2-simulator-monitor/index.html`
- AI 智慧診斷知識庫：見 `ai-diagnostic-kb/index.html`
- Vite 建置產物：見 `alarm-notification-simulator/index.html`（由 `tools/build_alarm_frontend.py` 注入）
- 獨立 submodule：見 `Travel-Assistance/index.html`（在原有 header 之上疊加 `#st8925-topbar`）

目前僅 `project-04` 與 `project-05` 仍為樣板佔位頁；其餘 `alarm-notification-simulator` (01)、`iot-gen2-simulator-monitor` (02)、`ai-diagnostic-kb` (03)、`Travel-Assistance` (06) 皆為真實獨立子專案，均具備全站共用頂列規範。

### 4.2 全站子專案視覺風格統一原則 / Unified Industrial Cyber Dark Aesthetic Invariant

> ⚠️ **核心原則：全站所有子專案（無論是獨立 submodule、Vite 編譯物或內部專案）之主視覺配色與設計風格，一律強制統一為 Industrial Cyber Dark Glassmorphism（工業賽博深色毛玻璃）沉浸式宇宙深空風格，與前三個子專案（01 Alarm、02 IoT Gen2、03 AI Diagnostic KB）嚴格保持一致。絕對禁止採用刺眼之淺白底、灰白底等不和諧配色。**
>
> **Core Invariant: The visual design and palette of EVERY sub-project (submodules, Vite apps, internal projects) MUST strictly adhere to the Industrial Cyber Dark Glassmorphism theme, fully harmonized with the first 3 sub-projects (P01, P02, P03). Bright white, light-gray, or discordant daytime themes are strictly prohibited.**

#### 具體視覺設計規範 (Theme Specifications)：
1. **背景基底 (Base Background)**：
   - 統一使用全站深空暗黑底色 `#04070e` / `#060b14`。
   - 必須疊加多點柔和環境光暈（`radial-gradient ambient glow`，使用透明度 3%~5% 之動態色相與補色），呈現深邃宇宙微光質感。
2. **容器與卡片 (Glassmorphism Cards & Panels)**：
   - 採用半透明暗色毛玻璃卡片（`rgba(18, 30, 54, 0.65~0.75)` 或 `rgba(11, 20, 38, 0.75)`）。
   - 邊框使用細緻半透明亮邊（`border: 1px solid rgba(255, 255, 255, 0.08)`），並具備 `backdrop-filter: blur(...)` 與陰影深度（`box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45)`）。
   - 滑鼠懸停（hover）時產生動態邊框提亮或色相外發光。
3. **字體與文字對比度 (Typography & High Contrast)**：
   - 主標題與關鍵數據：純白 / 冰白高亮度高對比（`#ffffff` / `#e8eef7`），符合 WCAG AAA 標準。
   - 次要說明、欄位標籤與元資料：科技金屬藍灰（`#8494ab` / `#94a3b8` / `#cbd5e1`）。
   - 輔助次要文字：深石板灰（`#64748b`）。
4. **表單與控制項 (Form Inputs, Dropdowns & Controls)**：
   - 下拉選單、文字輸入框等一律使用半透明深色玻璃底（`rgba(6, 12, 24, 0.85)` / `#060c18`）。
   - 選項（`option`、`optgroup`）設定深色背景與高對比淺字，focus 時觸發專案動態色相（`var(--c)`）霓虹光暈外框。
5. **按鈕與徽章 (Badges & Buttons)**：
   - 狀態標籤採用低透明度暗彩色膠囊（如 `rgba(16, 185, 129, 0.16)` 綠、`rgba(245, 158, 11, 0.16)` 橘黃、`rgba(59, 130, 246, 0.16)` 藍），字色明亮飽和。
   - 主要操作按鈕採精緻飽和漸層與陰影，呈現頂級儀表板質感。

### 4.3 全站 AI API 金鑰與環境變數統一原則 / Unified AI API Key & Environment Configuration Invariant

> ⚠️ **核心原則：本專案 `d:\st8925lab`（包含所有子專案與模組），凡有使用到 AI 工具／LLM 的地方，一律強制統一使用此 NVIDIA NIM API 規範：**
> - **API 端點 (Base URL)：`https://integrate.api.nvidia.com/v1`**
> - **標準模型 (Default Model)：`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`**
> - **環境變數：`NVIDIA_API_KEY` 與 `NVIDIA_MODEL`（優先自 `.env` 動態讀取）**
> - **呼叫規範：一律使用 `openai` Python SDK（`OpenAI` client）或相容 HTTP POST**
> - **推論參數標準：`temperature=0.6`, `top_p=0.95`, `max_tokens=65536`, `reasoning_budget=16384`**
> - **圖文多模態與思維鏈：支援純文字、文字檔案與圖片 Base64 (`image_url`) 多模態輸入；支援 CoT 深度推理相容**
> - **輸出原則：對話回覆一律採用【繁體中文】與【English】雙語對照輸出，並於訊息尾部附帶 Token 與耗時監控列**
> - **設定檔位置：專案根目錄 `.env`（若子專案為獨立執行實體，亦可於子專案目錄建立 `.env`）**
> - **格式要求：等號兩側不得有空白，值不得加引號（`KEY=value`）**
> - **版控安全：`.env` 嚴格受 `.gitignore` 排除，絕對禁止提交或推送至公開 Git 儲存庫**
>
> **Core Invariant: Across `st8925lab` and all sub-projects, whenever AI/LLM tools are used, they MUST uniformly adhere to the NVIDIA NIM API standard (`https://integrate.api.nvidia.com/v1`) using model `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` and keys read from `.env` (`NVIDIA_API_KEY`, `NVIDIA_MODEL`). Hardcoding keys in source files or documentation is strictly forbidden.**

#### 具體規範與 Python 整合標準代碼 (Implementation Standard & Code Template)：
1. **`.env` 格式規範 (Format Requirements)**：
   - 檔案命名：`.env`（位於 `d:\st8925lab\.env` 或子專案根目錄）。
   - 填寫規則：**等號兩側不要有空白，值不要加引號**。
   ```env
   NVIDIA_API_KEY=nvapi-...
   NVIDIA_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning
   ```
2. **AI 工具整合代碼規範 (Python Integration Pattern)**：
   本專案中所有需要與 AI 整合之程式碼（例如即時聊天、行程建議、知識庫充實、診斷分析），一律採用下列統一模式整合：
   ```python
   import os
   from openai import OpenAI
   from dotenv import load_dotenv

   # 載入環境變數
   load_dotenv()
   api_key = os.getenv("NVIDIA_API_KEY")
   model = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning")

   client = OpenAI(
       base_url="https://integrate.api.nvidia.com/v1",
       api_key=api_key
   )

   completion = client.chat.completions.create(
       model=model,
       messages=[{"role": "user", "content": "..."}],
       temperature=0.6,
       top_p=0.95,
       max_tokens=65536,
       extra_body={"reasoning_budget": 16384},
       stream=False
   )

   # nvidia/nemotron-3 具備 CoT 思維鏈，回傳內容支援 content 與 reasoning_content 取值
   msg = completion.choices[0].message
   result_text = (msg.content or "").strip() or getattr(msg, "reasoning_content", "")
   ```
3. **金鑰不落地與環境變數優先層級 (Key Isolation & Precedence)**：
   - 程式啟動時依序從系統環境變數、當前工作目錄 `.env`、上層根目錄 `.env` 自動探測讀取（透過 `dotenv.load_dotenv()`）。
   - 絕不可將正式金鑰明文寫入程式碼、Markdown 文件、範例檔案或 commit 訊息。
4. **Git 版控防護 (Gitignore Invariant)**：
   - 根目錄與各 Submodule 的 `.gitignore` 必須永久保留 `.env`、`.env.*` 阻擋規則，僅允許 `.env.example` 提交。

### 4.4 佔位頁樣板規格 / Placeholder Template Specification

對於尚未填入真實內容的佔位頁樣板（目前為 project-04 與 project-05），版面／CSS／JS 摘要如下：

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

### 4.5 Project 06 (Travel-Assistance) 雙模部署與離線韌性規範 / Dual-Mode Deployment & Static Resilience Invariant

> ⚠️ **核心原則：Project 06（Travel-Assistance 豆油哥）線上以 Cloudflare Worker 的靜態資產提供（無專屬後端，等同純靜態環境），同時支援本機 Python FastAPI 全功能守護行程。系統必須嚴格遵循雙模零轉圈容錯原則，絕不允許因後端未啟動或網路阻塞陷入無窮等候。**
>
> **Core Invariant: Travel-Assistance supports both static showcase (served as Worker static assets, no dedicated backend) and full-stack local daemon modes. The frontend must NEVER hang in an infinite spinner due to backend absence.**

1. **雙模部署與快速離線路徑 (Dual-Mode & Fast Offline Path)**：
   - **線上展示模式 (`st8925lab.com`，Worker 靜態資產)**：在無本機 Python 服務環境下，前端透過 `checkBackendHealth(1800)` 於 1.8 秒內完成探測。點擊規劃行程時，系統自動在 1.25 秒內走 Fast Offline Path 完成高品質策展行程渲染，提供秒開體驗。
   - **本機全功能模式 (Local Daemon `http://127.0.0.1:8001`)**：支援 FastMCP 動態比價工具、NVIDIA Nemotron-3 30B AI 對話推論與知識庫排程更新。
2. **全網路邊界逾時守護盾 (`AbortSignal.timeout`)**：
   - 所有 `fetch` 請求必須封裝於安全逾時邊界內：健康檢查 1.8s、行程規劃 3.5s、AI 聊天 18s、匯出下載 2.5s。
3. **純前端備援匯出 (Client-Side Fallback Exports)**：
   - 後端 `/api/export/*` 離線時，前端自動無縫降級：使用 SheetJS 於瀏覽器本地生成 Excel（`.xlsx`），使用純 JS 演算法動態生成 RFC 5545 標準 `.ics` 日曆檔供使用者匯入行事曆。
4. **即時 AI 旅遊助手聊天室標準 (AI Travel Assistant Standards)**：
   - 多模態上傳：支援 PNG, JPG, WEBP, TXT, MD, CSV, JSON（上限 5MB）。
   - 雙語輸出：一律依序輸出【繁體中文】與【English】雙語內容。
   - 監控列：實際呼叫 AI 模型的回覆，尾部輸出 `本次共用 {tokens} token, 耗時 {duration} sec, YYYY-MM-DD_HH:MM:SS`；未呼叫模型的回覆（`meta.mode === 'local'`）改輸出「未呼叫 AI 模型 · 本站內建資料」，不得顯示估算 token（2026-09-23 起，見 `Travel-Assistance/PROMPT.md` §0.6）。
   - 雙軌頁面一致性：`Travel-Assistance/index.html` 與 `Travel-Assistance/prototype.html` 雙軌檔案必須 100% 保持同步。

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
> 若日後需要，可額外用 `_redirects` 檔（Workers 靜態資產同樣支援）保留舊路徑。

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

Cloudflare **Worker + 靜態資產（Workers Static Assets）**，網址
`st8925lab.com`。設定見根目錄 [`wrangler.jsonc`](wrangler.jsonc)，部署指令
`npx wrangler deploy`。
Cloudflare **Worker with static assets**, served at `st8925lab.com`.

> ⚠️ **不是 Cloudflare Pages。** 2026-09-23 Phase 1 之前本站確實是純靜態站，
> 本節因此長期寫成「靜態網站，部署於 Cloudflare Pages」；Phase 1 起改為
> Worker 並新增 `/api/*` 端點，該敘述已不成立，2026-09-24 校正。
> 依此規格重建時若照舊建成 Pages 純靜態站，`/api/*` 會整個不存在。
> 同樣的舊敘述仍散見於 `ai-diagnostic-kb/`、`alarm-notification-simulator/`、
> `cloudmd/` 的文件與 `.gitignore` 檔頭（見 README.md 對應日期條目）。
> **Not Cloudflare Pages.** The site was pure-static until Phase 1
> (2026-09-23) and this section described it as Pages for months. It is now a
> Worker with static assets and live `/api/*` routes. Rebuilding it as a
> static Pages site would omit the entire API.

### 7.0 wrangler.jsonc 逐值轉寫 / Transcribed configuration

下表每個值都是 2026-09-24 從 `wrangler.jsonc` 讀出的，不是憑記憶寫的。
Every value below was read from the file, not recalled.

| 欄位 Field | 值 Value |
|---|---|
| `name` | `st8925lab` —— **不可更改**，改名 wrangler 會另建一個新的 Worker |
| `main` | `worker/index.js` |
| `compatibility_date` | `2026-09-21` |
| `keep_vars` | `true` —— 儀表板上設定的變數不會因部署被清掉 |
| `observability.enabled` | `true` |
| `assets.directory` | `.` —— **repo 根目錄就是發佈根目錄**，這是 §7.2 兩道防線的成因 |
| `assets.binding` | `ASSETS` |
| `assets.run_worker_first` | `["/api/*"]` |

路由行為：`/api/*` 先進 Worker；其餘所有路徑直接由靜態資產回應，完全不經過
Worker。Worker 目前只實作 `/api/health`，回報 `configured.nvidia` 與
`configured.tavily` 兩個布林值（只說金鑰字串存不存在，**不回傳金鑰本身**），
並在通過授權時附上 `probe`。其他 `/api/*` 路徑回 404。`/api/chat` 尚未實作，
屬 Phase 1 Stage C。
Routing: `/api/*` hits the Worker first; everything else is served straight from
static assets. Only `/api/health` is implemented today.

### 7.0.1 發佈範圍 / What actually gets published

`.assetsignore` 是唯一權威來源，**請直接讀該檔**，本節不複述完整清單（複述會
漂移）。截至 2026-09-24，375 個受 git 追蹤的檔案中只有 24 個會被發佈：網站的
`index.html`／`app.js`／`config.js`／`geodata.js`／`shared/`，以及
`ai-diagnostic-kb`／`iot-gen2-simulator-monitor`／`alarm-notification-simulator`／
`project-04`／`project-05` 各自的 `index.html` 與其 `app.js`、`style.css`、
`modules/`、`assets/`，加上 Travel-Assistance 的 `index.html` 與 `prototype.html`。

排除的類別（規則細節見 `.assetsignore` 內的註解）：所有 `*.md`／`*.txt`／`*.py`、
`cloudmd/`、`worker/`、`tools/`、`wrangler.jsonc`、`render.yaml`、`.git`、
`.agentMemory/`、`.claude/`、`alarm-notification-simulator/source/`、
`ai-diagnostic-kb/source/`、`iot-gen2-simulator-monitor/vps/`、
`Travel-Assistance/` 除兩個 HTML 以外的全部內容。

> `*.md`／`*.txt`／`*.py` 採全域規則是刻意的：讓「未來新增的子專案」預設就不
> 外洩文件與腳本，而不是依賴有人記得補規則。2026-09-23 那次只補了
> Travel-Assistance／worker／tools／cloudmd，其餘子專案就是這樣漏掉的。
> Blanket type rules are deliberate: future subprojects are private by default
> instead of depending on someone remembering.

單檔驗收版：`python make_standalone.py` 仍可用（打包 `index.html` +
`config.js` + `geodata.js` + `shared/wordmark.js` + `app.js` 為一個檔案，
專案點擊改以隱藏覆蓋層呈現，因為單檔版沒有可導向的實體資料夾）。**此工具
不處理 `alarm-notification-simulator`**——它是獨立打包的 React 應用，不是
`app.js` 渲染邏輯的一部分。

單檔驗收版：`python make_standalone.py` 仍可用（打包 `index.html` +
`config.js` + `geodata.js` + `shared/wordmark.js` + `app.js` 為一個檔案，
專案點擊改以隱藏覆蓋層呈現，因為單檔版沒有可導向的實體資料夾）。**此工具
不處理 `alarm-notification-simulator`**——它是獨立打包的 React 應用，不是
`app.js` 渲染邏輯的一部分。

### 7.1 alarm-notification-simulator 的後端部署 / Backend deployment

`alarm-notification-simulator/`（id `01`）與其餘專案的關鍵差異：它需要
兩個持續運行的 Node.js 服務（`apps/api`、`apps/ops-server`），Cloudflare
Worker 與靜態資產都無法承載常駐行程（原文寫「Cloudflare Pages 無法執行」，
2026-09-24 一併校正平台名稱；結論不變）。這兩個服務部署於
**Render.com 免費方案**，設定見根目錄
[`render.yaml`](render.yaml)。完整部署步驟、已知限制（免費方案休眠與
非持久化檔案系統）、展示帳號，見
[`alarm-notification-simulator/PROMPT.md`](alarm-notification-simulator/PROMPT.md) §3。

前端與後端網址的耦合方式：`alarm-notification-simulator/source/apps/web`
在建置時（`tools/build_alarm_frontend.py`）把後端網址從
`source/.env` 的 `VITE_API_BASE_URL`／`VITE_OPS_BASE_URL` **內聯進打包後的
JS**——這是 Vite 的標準行為，不是本站特有的設計。後端網址若改變（例如
Render 服務改名），必須重新執行建置腳本，不能只改設定檔生效。

### 7.2 兩道排除防線（重建時務必一併建立）/ Two exclusion barriers

**重建這個站時，`.gitignore` 與 `.assetsignore` 都必須建立，不可只建一個。**

這個 repo 有一個容易致命的特性：**工作目錄本身就是發佈根目錄，而 repo 是
公開的**（`github.com/Steven8925/st8925lab`，`visibility: public`）。因此
放進工作目錄的任何檔案，預設會同時出現在兩個公開位置：

| 檔案 | 管的是 | 攔不住的情況 |
|---|---|---|
| `.gitignore` | 檔案會不會進入 git → 公開 GitHub 歷史 | 若採直接上傳部署，未進 git 的檔案仍可能被發佈 |
| `.assetsignore` | 檔案會不會被當成網站資產發佈 | 已被發佈排除的檔案，仍可能 commit 進公開 git 歷史 |

兩者職責不重疊，**只設一道就等於只擋住一半**。兩份檔案目前都刻意涵蓋
同一批「部署過程暫存筆記」檔名，這個重複是設計，不是冗餘。

**這條規則的由來**：2026-08-14 收尾覆核時發現一個含有正式
`INTERNAL_WEBHOOK_SECRET` 明文的部署筆記檔躺在發佈樹內，而當時根目錄
**根本沒有 `.gitignore`**——差一次 `git add .` 就會把正式密鑰永久寫進公開
的 git 歷史。已查證該密鑰從未進入版控、從未被發佈（詳細查證方式與事件
經過見 [README.md](README.md) §13.9）。

**新增規則**：任何含有密鑰、憑證、或 `.env` 內容的檔案，**不得放進這個
工作目錄**。要留存就放到專案目錄外或密碼管理器。`render.yaml` 的
`sync: false` 只保證那個值不在 `render.yaml` 裡，它管不到旁邊的純文字檔。

**When rebuilding this site, create BOTH `.gitignore` and `.assetsignore`.**
The working directory doubles as the publish root and the repo is public,
so anything placed here is exposed twice over by default. The two files
guard different paths (git history vs. served assets) and deliberately
overlap; one alone leaves half the gap open. Never place secrets,
credentials, or `.env` content in this directory at all.

---

## 8. Travel-Assistance 子專案維運與規格準則 / Travel-Assistance Architecture Notes

### 8.1 多樞紐出發地與航線對齊 (Multi-Hub Origin Routing)
- **原則**：當使用者選擇非台北出發（如 `SIN` 新加坡、`HKG` 香港、`KHH` 高雄、`RMQ` 台中）時，後端（`flight_matrix.py`、`planner.py`）與前端（`generateFallbackPlan`）必須嚴格依照該出發機場推薦直飛或真實班次，絕不可無條件 fallback 為台北桃園（TPE）或長榮 BR132。
- **文案邊界**：航段、里程碑與安全返航文字動態依據國家與機場代碼調整（如「🇸🇬 平安抵星 [SIN]」），杜絕誤植「平安抵台」。

### 8.2 離線報告規範 (Offline Report Triad - PDF, Excel, ICS)
- **偏好設定完整收錄**：使用者在「旅客偏好與需求設定」所選之 5 大維度（出發時間/連假、出發機場、人數組成、風格主題、目的地）必須於搜尋結果頂部卡片（`#userPreferencesCard`）、PDF 手冊（ReportLab 表格與列印模式）、Excel 活頁簿（Sheet 1「旅客偏好與需求設定」工作表）、ICS 日曆檔（`DESCRIPTION` 欄位）完整呈現。
- **測試契約保護**：Excel Sheet 0 必須維持為天數行程指南，保護既有自動化 characterisation 測試不被破壞。

### 8.3 知識庫自我充實引擎與權威資料收錄規格 (Self-Enrichment & Verified Ingestion)
> ⚠️ **現況（2026-09-23 查證）：本節描述的是目標設計，尚未實作。** `youtube_enricher.py` 為空殼（回傳「YouTube collection is not implemented」），觀光局資料未實際抓取，知識庫檔案沒有任何來源欄位。取代方案（搜尋 API＋每日查核＋人工審核寫入 D1）見 `Travel-Assistance/20260923 修正討論與implementation plan.md` Phase 1～2。
> **Status (verified 2026-09-23): target design, not implemented.** See the Travel-Assistance plan document, Phases 1–2.

- **快取優先與缺口觸發 (Fetch-on-Gap)**：旅客送出查詢時，系統以 O(1) 讀取 `manifest.json` 與本機 JSON 檔案。凡知識庫未收錄之目的地或自訂風格，即時啟動 `youtube_enricher.py` 聯網補足，嚴禁憑空捏造或縮減規格。
- **國家觀光局權威對齊**：強制對齊日本 JNTO、越南 VNAT、泰國 TAT、韓國 KTO、新加坡 STB、瑞士 MySwitzerland、法國 France.fr 等官方最新政策、簽證與開放狀態。
- **Top-Viewed 旅遊達人實測萃取**：自動檢索觀看數最高之真實旅人實測影片，萃取免排隊私房密技、在地排隊名店與交通票券組合，持久化回寫磁碟知識庫。

### 8.4 各子項目定時更新頻率與動態基準日審查 (Update Cadence & Rolling 2-Year Benchmark)
> ⚠️ **現況（2026-09-23 查證）：以下排程目前都沒有在執行。** `/api/health` 將 `daily_updater_active` 寫死為 `False`，排程器預設關閉，`sync_log.json` 最後一次執行為 2026-09-12 且更新 0 筆。已定案的取代設計為「每日 1 AM（UTC 17:00）查核、只寄變動項目、山姆哥審核後寫入」，見 `Travel-Assistance/20260923 修正討論與implementation plan.md` Phase 2。
> **Status (verified 2026-09-23): none of these schedules currently run.** The agreed replacement is a daily 1 AM check emailing only changes, written after Sam's approval (plan document, Phase 2).

- **官方連假資訊**：每年 1/1 全域更新 + 年中政府行事曆公布時同步；每日 00:00 執行過期審核，滾動維持當年與次年（如 2026-2027）至少 2 年連假，自動隱藏已結束日期。
- **航班航網時刻**：每季（3 個月）配合國際民航夏季（3月）與冬季（10月）班表大換季更新；實時票價透過 FastMCP 工具層即時比價。
- **觀光局政策指引**：每月 1 日 00:00 自動審查更新。
- **旅遊達人 YouTube 精華**：每月 1 日 00:00 全域維護 + 遇到新自訂目的地時按需即時觸發。
- **即時天氣穿搭**：每日 00:00 重新整理氣候季節指標，查詢時調度。

### 8.5 不編造原則與如實狀態顯示 (Zero-Fabrication Principle & Truthful Status) — v2 (2026-09-23)
- **取代 v1「零盲猜原則與動態即時 AI 運算架構」**：v1 同時要求「不盲猜」與「廢除靜態模式、不得拒答」，兩者互相矛盾，使系統在不知道時只能編造。山姆哥於 2026-09-23 決定保留「不編造」。推翻經過見 [README.md](README.md) §18；Travel-Assistance 的完整現行規格見 `Travel-Assistance/PROMPT.md` §0.6（唯一權威，本節不重複細節）。
- **重點**：
  - 沒有資料就明說「沒有查證資料」並提供查證連結，不得以模板產生飯店、航班、班次代碼、票價、登機門或準點狀態；「查不到」是正確回答。
  - AI 狀態徽章與頂部指示燈依健康檢查如實顯示離線／連線；未呼叫模型的回覆不得顯示 token 用量。
  - 前端**沒有**直連雲端 NIM 的路徑（v1 所述「第二層」從未實作）；目前資料來源依序為：後端（健康檢查通過時）→ 本站內建資料（須標示未即時查證）→ 查無資料提示。
- **Summary (English)**: v2 replaces v1's contradictory "no guessing but never refuse" rule with "never fabricate; say when nothing is verified". Full spec: `Travel-Assistance/PROMPT.md` §0.6.

### 8.6 行程天數當地日期標籤動態渲染規範 (Day Badge Local Date Alignment)
- **標籤格式**：行程天數卡片之橘色標籤嚴格遵循 `Day {day} - {date} {Month}`（例如：`Day 1 - 9 Oct`、`Day 2 - 10 Oct`、`Day 3 - 11 Oct`）。
- **動態運算**：依照旅客選取之國定連假或出發日期基準日動態計算每日日期，由 `formatDayBadge(d, planData)` 提供前端防禦性解析（相容 `d.date_display`、`d.date` 與 `planData.start_date`），後端 `planner.py` 之 `date_display` 亦 100% 格式同步。

### 8.7 全站 AI 推論引擎升級為 nvidia/nemotron-3-super-120b-a12b (NVIDIA NIM)
> ⚠️ **現況（2026-09-23 查證）**：山姆哥已決定將模型固定為 `nvidia/nemotron-3-ultra-550b-a55b`，將於 Phase 1 實作；在那之前設定仍不一致——根目錄 `render.yaml` 的 `NVIDIA_MODEL` 為 `meta/muse-glimmer-30b`，`Travel-Assistance/.env.example` 為 `nvidia/nemotron-3-super-120b-a12b`。另外，正式站的 Travel-Assistance 後端目前沒有回應，線上網站實際上沒有呼叫任何模型。「即時聯網檢索」尚未實作（模型本身不上網，需另接搜尋 API）。
> **Status (verified 2026-09-23)**: model to be fixed to `nvidia/nemotron-3-ultra-550b-a55b` in Phase 1; until then `render.yaml` and `.env.example` disagree, the production backend does not respond, and live web lookup is not implemented.

- **模型規格與推論參數**：
  - 端點：`https://integrate.api.nvidia.com/v1/chat/completions`
  - 模型：`nvidia/nemotron-3-super-120b-a12b`
  - 參數：`temperature: 0.5`, `top_p: 1.0`, `max_tokens: 1024`, `stream: false`
- **架構規範**：
  - 後端 (`/api/chat`) 與前端統一調用 `nvidia/nemotron-3-super-120b-a12b`，杜絕任何未經指示之降級回退或模型替換。
  - 嚴格遵守「不盲猜原則」：知識庫有，就精確列出；知識庫沒有，就啟動即時聯網檢索並誠實說明最新動態。
  - 回覆強制輸出【繁體中文】與【English】雙語對照內容，並在結尾輸出真實 token 與耗時遙測指標。

### 8.8 README.md 反序法寫入原則 (Reverse-Chronological Order: Newest First)
- **規範定義**：全專案之 `README.md` **必須嚴格採用反序法撰寫**：最新的時間戳記紀錄永遠插入/置於檔案最前頭，較舊的紀錄依序留在後頭。
- **效益**：任何工程師或 AI 重新讀取專案日誌時，無需滾動或掃描到檔案末端，即可第一時間獲取最新系統狀態與架構決策，大幅減少每次重新讀取的時間與 Token 消耗。
- **格式要求**：每一筆紀錄開頭必須包含標準時間戳記與執行模型標籤 `[YYYY-MM-DD_HH:MM:SS] [Model: <Model_Name> (Thinking: <Level>)]`，且每筆獨立紀錄之間必須強制空兩行。




