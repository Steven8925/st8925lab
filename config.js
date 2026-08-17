// ===============================================================
//  SHARED CONFIG / 共用設定
//  Loaded by BOTH index.html (the orbit) and project.html (the pages),
//  so the two can never disagree about what projects exist or what
//  colour each one is. This is the single source of truth.
//  首頁與專案頁共用本檔，兩者對「有哪些專案、各是什麼顏色」永不分歧。
// ===============================================================

// 提亮版彩虹 — 每色對 #04070e 背景的對比 >= 7.26，已達 WCAG AAA (7.0)
// Brightened rainbow — every hue scores >= 7.26 against the #04070e backdrop,
// clearing WCAG AAA (7.0). Run verify.py for the full contrast table.
//
// The first seven are the original palette, unchanged byte for byte, so a
// six-project site looks exactly as it did before. The last five were added
// to raise the ceiling from 7 to 12: each sits in a hue gap of the original
// seven, with its lightness binary-searched until the contrast cleared AAA.
// 前七色為原始配色，一個位元都沒動；後五色填入原七色的色相空隙，
// 明度以二分搜尋調整至對比達 AAA，使專案上限由 7 提高到 12。
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
];

// Site-wide name, used by the shared wordmark component on the homepage
// AND every project-XX page. 全站站名，首頁與每個 project-XX 頁面共用。
const SITE_NAME = 'ST8925 LAB';

// ---------------------------------------------------------------
// PROJECTS — add a project here and nowhere else / 唯一資料源
// ---------------------------------------------------------------
// One entry == one project == one orbit ring == one colour == one real
// folder on disk (project-XX/index.html). ORBIT_RINGS, the ring plane
// angles (k*pi/N), the nav bar, the colour assignment and the clickable
// light points ALL derive from this array. Adding an entry is the
// complete procedure for adding a project (plus creating its folder —
// see PROMPT.md "Adding a project").
// 一筆 = 一個專案 = 一條軌道 = 一個顏色 = 一個實體資料夾
// （project-XX/index.html）。環數、平面角、導覽、配色、可點光點全部
// 由此推導；新增專案只需在此加一筆並建立對應資料夾（見 PROMPT.md）。
//
// `id`   — stable internal key. NEVER changes once assigned, even if the
//          project is renamed. Nothing on disk is named after it.
//          穩定內部代碼，即使專案改名也「永不」變動；磁碟上沒有東西以它命名。
// `label`— the human-facing name shown in the nav bar and on the page.
//          顯示於導覽列與頁面上的人類可讀名稱。
// `slug` — the folder name AND URL path (`<slug>/index.html`). Must stay
//          in sync with `label` by construction: whenever `label`
//          changes, `slug` (and the actual folder on disk) must be
//          renamed to match in the SAME edit. Use
//          `python tools/rename_project.py <id> "<new label>"` to do
//          both atomically — see PROMPT.md and README.md.
//          資料夾名稱與 URL 路徑（<slug>/index.html）。規則：`label`
//          一旦變更，`slug`（與磁碟上的實際資料夾）必須在同一次修改中
//          同步改名。請用
//          `python tools/rename_project.py <id> "<新名稱>"`
//          一次完成兩者的同步，詳見 PROMPT.md 與 README.md。
//
// Hard limit: RAINBOW.length (12). Beyond that two projects would share a
// hue and the colour<->project mapping the click-linking depends on breaks.
// Guarded at runtime in app.js.
// 硬上限 RAINBOW.length (12)；超過會使兩專案同色，雙向對應即失效。
const PROJECTS = [
    { id: '01', label: 'ALARM NOTIFICATION SIMULATOR', slug: 'alarm-notification-simulator' },
    { id: '02', label: 'IOT GEN2 SIMULATOR & MONITOR', slug: 'iot-gen2-simulator-monitor' },
    { id: '03', label: 'PROJECT 03', slug: 'project-03' },
    { id: '04', label: 'PROJECT 04', slug: 'project-04' },
    { id: '05', label: 'PROJECT 05', slug: 'project-05' },
    { id: '06', label: 'PROJECT 06', slug: 'project-06' },
];

// Each project is a real folder + index.html now (not a single dynamic
// page), so adding a project DOES need a new folder — see PROMPT.md.
// 每個專案現在是實體資料夾 + index.html（非單一動態頁），
// 新增專案「需要」建立新資料夾，詳見 PROMPT.md。
//
// The hue is still carried in the URL because the homepage RESHUFFLES the
// palette on every load: ring i is not palette entry i. Without passing it,
// the project page would show the colour of ring index i in the
// UNSHUFFLED palette, which matches what the user clicked only about
// 1 time in 12. See RAINBOW note above and README.md §6.7 bug A for the
// bug this prevents.
// 首頁每次載入都會洗牌，第 i 環並非第 i 色。若不隨 URL 傳遞色相，
// 專案頁只會顯示「未洗牌」的第 i 色，與使用者點到的顏色約 12 次才對 1
// 次符合。此設計是為修正 README.md §6.7 錯誤 A 而存在，見該節。
const PROJECT_URL = (slug, hue) =>
    `${slug}/index.html` + (hue ? `?hue=${encodeURIComponent(hue)}` : '');
