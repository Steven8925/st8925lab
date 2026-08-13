# 方案 B — 漸進式演進 React 網站 + `/lab/` 互動區
## 實施計畫（中文版）

> 保留現有 React/Vite 技術棧，同時對齊 `cloudmd/` 內容策略。互動終端機與 Agent 展示保留為 `/lab/` 專區。

---

## 概述

方案 B 不進行全面重建，而是**在現有 React/Vite 網站上漸進演進**，使內容與導覽對齊 `cloudmd/` 願景，同時保留互動元件（TerminalHero、AI Agent 卡片、IoT 圖表）作為專屬的 `/lab/` 區段 — 一個展示程式能力的技術遊樂場。

---

## 架構

```
st8925lab.com（Cloudflare Pages）
│
├── 主站（React SPA + react-router-dom）
│   ├── / （首頁 — 專業 OT/IT 定位展示）
│   ├── /work/ （案例研究列表）
│   ├── /work/chiller-ot-monitoring （核心案例研究）
│   ├── /reference/ （技術參考文章）
│   ├── /tools/ （工業 Modbus 工具）
│   ├── /tools/modbus-address-converter
│   ├── /tools/modbus-float-decoder
│   ├── /capabilities/ （買方語言服務）
│   ├── /about/ （資歷 + 聯絡）
│   │
│   └── /lab/ ★ 保留的互動專區 ★
│       ├── /lab/terminal （TerminalHero 展示）
│       ├── /lab/ai-agents （Agent 展示卡片）
│       ├── /lab/iot-dashboard （即時 IoT 圖表）
│       ├── /lab/visitor-globe （隱私導向訪客分析）
│       └── /lab/security-architecture （NAS + 零信任架構圖）
│
├── Zone B：API 層（Cloudflare Workers）
│   ├── AI 代理
│   ├── 訪客統計收集
│   └── 工具 API
│
└── Zone C：私密區（NAS + Tailscale）
    ├── Nextcloud
    └── 3-2-1 備份
```

---

## 與目前網站的變更對照

### ✅ 保留（移至 `/lab/`）
| 元件 | 目前位置 | 新位置 |
| :--- | :--- | :--- |
| TerminalHero | 首頁 Hero | `/lab/terminal` |
| AIAgentShowcase | 主分頁「AI Agents」 | `/lab/ai-agents` |
| IoTAnalytics | 主分頁「IoT Analytics」 | `/lab/iot-dashboard` |
| SecurityArchitecture | 主分頁「Security」 | `/lab/security-architecture`（更新架構圖） |

### 🔄 修改
| 項目 | 變更內容 |
| :--- | :--- |
| **導覽** | 取消 Tab 系統 → 使用 `react-router-dom` 實作 5 段式導覽 + `/lab/` 連結 |
| **首頁** | 新的專業 Hero：10 秒 OT/IT 定位展示、成果指標晶片、案例研究連結 |
| **設計系統** | 青色 `#06b6d4` → 藍色 `#2563EB`；霓虹光暈 → 乾淨專業風格；新增金色 `#C9A227` 強調色 |
| **NAS 架構圖** | CF Tunnel → Tailscale；更新 SecurityArchitecture 元件 |
| **字型** | 新增 Noto Sans TC 支援中文內容 |
| **wrangler.json** | `"blue-butterfly-f996"` → `"st8925lab"` |

### 🆕 需要建構的新元件
| 元件 | 優先級 | 描述 |
| :--- | :--- | :--- |
| **CaseStudyPage** | P0 | 8 段式結構化版面（背景 → 問題 → 方案比較 → 建構 → 技術難點 → 成果 → 反思 → 角色） |
| **CaseStudyCard** | P0 | 首屏摘要卡片，含 Meta 條、成果指標、摘要 |
| **ModbusAddressConverter** | P0 | Table ↔ PDU Offset ↔ 各廠商慣例轉換器 |
| **ModbusFloatDecoder** | P0 | 4 種 Word/Byte Order 組合解析器 |
| **ReferencePage** | P1 | Markdown 渲染的技術文章版面 |
| **CapabilitiesPage** | P1 | 買方語言服務卡片 |
| **DataTable** | P1 | 可排序/可篩選的設備比較表 |
| **ContactCTA** | P0 | 浮動/固定聯絡按鈕 |

---

## 設計系統更新

```css
/* 之前（賽博霓虹）*/              /* 之後（專業暗色調）*/
--cyan: #06b6d4;            →     --blue: #2563EB;
--purple: 各種               →     --blue-deep: #0F2A47;
--emerald: #10b981;          →     --gold: #C9A227; /* 面積 < 10% */
--bg: #080c14;               →     --bg: #0A0E14;
--surface: #0f172a;          →     --surface: #131A24;

/* 霓虹光暈效果 */            →     /* 乾淨邊框與微妙陰影 */
box-shadow: 0 0 20px cyan;  →     border: 1px solid rgba(37,99,235,0.2);

/* 新增字型 */
+ font-family: 'Noto Sans TC'（子集化）用於中文文字
```

---

## 導覽重構

```
之前（Tab 式 SPA）：
  [指揮中心] [AI Agents] [IoT 分析] [安全架構]

之後（Router 式，5+1 區段）：
  [Work] [Reference] [Tools] [Capabilities] [About]  [🧪 Lab]  [聯絡 →]
```

實作方式：
```bash
npm install react-router-dom
```

---

## 需要建立的內容

### P0 — 必須有（Sprint 1–2）
1. **冰水主機 OT 監控案例研究** — 基於 `case-study-chiller-v0.9.md` 的完整 8 段式撰寫
2. **首頁** — 新的專業 Hero，10 秒定位展示
3. **Modbus 位址轉換器工具** — 互動式，附 3+ 個靜態預渲染範例
4. **Modbus Float 解碼器工具** — 互動式，4 種 Word/Byte Order 組合

### P1 — 應該有（Sprint 3–4）
5. **Reference：Modbus PDU 偏移量錯誤** — 技術文章
6. **Reference：32-bit Float 組裝矩陣** — 參考表格
7. **Capabilities 頁面** — 5 項買方語言服務描述
8. **About 頁面** — 資歷 + 聯絡方式
9. **案例研究 2 & 3** — 多租戶維修管理系統、軌道網通設備選型

### P2 — 加分項（Sprint 5+）
10. **設備比較資料頁** — 可排序表格 + CSV 下載
11. **Lab：訪客地球儀** — 隱私導向分析視覺化
12. **雙語支援** — zh/en i18n 路由（在 React 中比 Astro 困難）

---

## Sprint 時程表

| Sprint | 期程 | 交付項目 |
| :--- | :--- | :--- |
| **Sprint 1** | 1.5 週 | 安裝 react-router-dom、重構導覽、新首頁 Hero、設計系統更新（配色/字型）、將現有元件移至 `/lab/` 路由 |
| **Sprint 2** | 2 週 | 冰水主機案例研究頁面、CaseStudyCard 元件、P0 Modbus 工具（位址轉換器 + Float 解碼器）、修復 wrangler.json |
| **Sprint 3** | 2 週 | 2 篇 Reference 文章、Capabilities 頁面、About 頁面、SecurityArchitecture 更新（Tailscale） |
| **Sprint 4** | 1.5 週 | 案例研究 2 & 3、ContactCTA、SEO Meta 標籤 + JSON-LD |
| **Sprint 5** | 持續 | 設備資料頁、訪客地球儀、i18n、NAS 備份設定 |

---

## SEO 限制與應對措施

> [!WARNING]
> React SPA 在 SEO 方面有先天劣勢。以下應對措施有幫助，但無法完全彌補與 Astro SSG 的差距。

| 問題 | 應對措施 |
| :--- | :--- |
| 客戶端渲染 = 爬蟲難以抓取 | 使用 `react-snap` 或 `vite-plugin-ssr` 進行預渲染 |
| 無原生 Content Collections | 使用 `gray-matter` + `react-markdown` 建構簡易 Markdown 載入器 |
| JS 打包 > 100 KB 預算 | 使用 `React.lazy()` 和路由導向的程式碼分割 |
| 無原生 i18n 路由 | 手動 `/en/` 和 `/zh/` 路由前綴 + Context Provider |
| 無伺服器端 JSON-LD | 透過 `react-helmet-async` 在各頁面元件中注入 JSON-LD |

---

## 需要更新的資安項目

| 項目 | 目前 | 需改為 |
| :--- | :--- | :--- |
| NAS 存取架構圖 | CF Tunnel | **Tailscale**（零開放埠） |
| 「CF TUNNEL ACTIVE」徽章 | 顯示中 | **移除**或改為「TAILSCALE MESH」 |
| 資料流方向 | 入站至 NAS | **NAS 僅出站**（推送至 R2/B2） |
| 資料分級 | 未顯示 | 在架構圖中加入 C0/C1/C2/C3 標籤 |
| 備份策略 | 通用建議 | 顯示 3-2-1-1-0 雙 NAS + B2 架構 |

---

## `/lab/` 區段 — 獨特優勢

`/lab/` 區段是方案 B 相對於方案 A 的**關鍵差異化因素**，其功能定位為：

1. **技術證明**：「我不只是寫文章 — 這裡有一個即時終端機、即時圖表、和在您瀏覽器中運行的 Agent 編排。」
2. **案例來源**：Lab 本身可成為案例研究（例如：*「建構隱私導向的訪客分析地球儀」*）。
3. **互動黏著**：互動展示讓訪客停留更久，提升頁面停留時間指標。
4. **面試資產**：向獵頭展示 React、資料視覺化與即時系統能力。

### Lab 頁面結構
```
/lab/
├── Hero：「實驗室 — 互動式技術實驗」
├── 卡片網格：
│   ├── 終端機展示 → /lab/terminal
│   ├── AI Agent 編排 → /lab/ai-agents
│   ├── IoT 儀表板 → /lab/iot-dashboard
│   ├── 訪客地球儀 → /lab/visitor-globe
│   └── 安全架構 → /lab/security-architecture
└── 頁尾：「這些實驗展示真實世界的技術能力。
     看看它們如何應用於生產環境 → /work/」
```

---

## 方案 A 與方案 B 取捨比較

| 面向 | 方案 A（Astro） | 方案 B（React + Lab） |
| :--- | :--- | :--- |
| **SEO** | ★★★★★ 原生 SSG | ★★★☆☆ 需要預渲染補丁 |
| **JS 預算** | ★★★★★ 預設零 JS | ★★★☆☆ 需積極分割 |
| **i18n** | ★★★★★ Astro 原生 | ★★☆☆☆ 手動路由 |
| **內容管理** | ★★★★★ Markdown Collections | ★★★☆☆ 自製 Markdown 載入器 |
| **互動展示** | ★★☆☆☆ 需重建為 Islands | ★★★★★ 已經建好 |
| **上市時間** | ★★★☆☆ 約 8-10 週 | ★★★★★ 約 5-7 週 |
| **`cloudmd/` 合規度** | ★★★★★ 100% 對齊 | ★★★☆☆ 約 70% 對齊 |
| **維運** | ★★★★★ 簡單靜態 | ★★★☆☆ SPA 複雜度 |

---

## 預估工時

**總計：約 5–7 週**（Sprint 1–5，單人開發者）

| 階段 | 週數 | 優先級 |
| :--- | :--- | :--- |
| 導覽重構 + 設計系統 + 首頁 | 1.5 | P0 |
| 冰水主機案例 + P0 工具 | 2 | P0 |
| Reference + Capabilities + About | 2 | P1 |
| 更多案例 + SEO + 資料頁 | 1.5 | P1 |
| i18n + Lab 完善 | 持續 | P2 |
