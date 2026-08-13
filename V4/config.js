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

// ---------------------------------------------------------------
// PROJECTS — add a project here and nowhere else / 唯一資料源
// ---------------------------------------------------------------
// One entry == one project == one orbit ring == one colour.
// ORBIT_RINGS, the ring plane angles (k*pi/N), the nav bar, the colour
// assignment and the clickable light points ALL derive from this array.
// Adding an entry is the complete procedure for adding a project.
// 一筆 = 一個專案 = 一條軌道 = 一個顏色。環數、平面角、導覽、配色、
// 可點光點全部由此推導；新增專案只需在此加一筆，別處都不用改。
//
// Hard limit: RAINBOW.length (12). Beyond that two projects would share a
// hue and the colour<->project mapping the click-linking depends on breaks.
// Guarded at runtime in app.js.
// 硬上限 RAINBOW.length (12)；超過會使兩專案同色，雙向對應即失效。
const PROJECTS = [
    { id: '01', label: 'PROJECT 01' },
    { id: '02', label: 'PROJECT 02' },
    { id: '03', label: 'PROJECT 03' },
    { id: '04', label: 'PROJECT 04' },
    { id: '05', label: 'PROJECT 05' },
    { id: '06', label: 'PROJECT 06' },
];

// Single page + query string, so adding a project needs no new file.
// 單一頁面吃參數，新增專案不必建檔。
//
// The hue is carried in the URL because the homepage RESHUFFLES the palette
// on every load: ring i is not palette entry i. Without passing it, the
// project page would show the colour of ring index i in the UNSHUFFLED
// palette, which matches what the user clicked only about 1 time in 12.
// 首頁每次載入都會洗牌，第 i 環並非第 i 色。若不隨 URL 傳遞色相，
// 專案頁只會顯示「未洗牌」的第 i 色，與使用者點到的顏色約 12 次才對 1 次。
const PROJECT_URL = (id, hue) =>
    `project.html?id=${id}` + (hue ? `&hue=${encodeURIComponent(hue)}` : '');
