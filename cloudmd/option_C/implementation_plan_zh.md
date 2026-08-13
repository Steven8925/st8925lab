# 方案 A — Astro SSG 全面重建
## 實施計畫（中文版）

> 100% 對齊 `cloudmd/` PROJECT_BRIEF_v2 與 PROJECT_DECISIONS

---

## 概述

使用 **Astro SSG** 從零開始重建整個 `st8925lab.com` 網站，取代目前的 React/Vite SPA。此方案完整實現 `cloudmd/` 設計文件中定義的專業 OT/IT 作品集願景。

---

## 架構

```
st8925lab.com (Cloudflare Pages)
├── Zone A：公開網站（Astro SSG）
│   ├── / （首頁 — 10 秒專業定位展示）
│   ├── /work/ （4–5 篇結構化案例研究）
│   ├── /reference/ （Modbus 支柱頁 + 子群頁面）
│   ├── /tools/ （P0 工業 Modbus 工具）
│   ├── /capabilities/ （買方語言服務清單）
│   └── /about/ （資歷 + 聯絡 CTA）
│
├── Zone B：API 層（Cloudflare Workers）
│   ├── AI 代理（按需載入，單一頁面）
│   ├── 訪客統計收集（聚合資料，不存 Raw IP）
│   └── R2 預簽名 URL
│
└── Zone C：私密區（NAS + Tailscale）
    ├── Nextcloud（家庭檔案/照片）
    ├── Nextcloud Talk + coturn
    └── 3-2-1 備份管線
```

---

## 技術選型

| 系統層級 | 技術 | 理由 |
| :--- | :--- | :--- |
| **前端** | Astro 4.x + Tailwind CSS | 預設零 JS、Content Collections、原生 i18n |
| **互動島嶼** | 原生 JS / Alpine.js | JS 預算 < 每頁 100 KB gzipped |
| **託管** | Cloudflare Pages | 免費方案，從私有 GitHub Repo 自動部署 |
| **API** | Cloudflare Workers（TypeScript） | AI 代理、工具 API、訪客統計收集 |
| **資料庫** | Cloudflare D1 + KV | D1 存聚合統計；KV 處理速率限制 |
| **物件儲存** | Cloudflare R2 | 零對外流量費，存放媒體/CSV/PDF |
| **內容管理** | Git as CMS（Markdown 進版控） | 版本控制內容，無需外部 CMS |
| **NAS 存取** | Tailscale | 零開放 WAN 埠，原生手機備份 |
| **備份** | QNAP TS-473A → TS-659 → Backblaze B2 | 3-2-1-1-0 策略，客戶端加密 |
| **金鑰管理** | Bitwarden + `wrangler secret put` | C3 資料絕不進 Git |

---

## 設計系統

```css
/* 色票 Token */
--bg:        #0A0E14;   /* 近黑色背景 */
--surface:   #131A24;   /* 卡片/區塊背景 */
--blue:      #2563EB;   /* 主色：互動元素、連結 */
--blue-deep: #0F2A47;   /* 漸層、Hero 底色 */
--gold:      #C9A227;   /* 強調金（面積 < 10%，僅用於標題/邊框） */
--text:      #E6EDF5;   /* 主文字 */
--text-dim:  #8B98A9;   /* 次要文字 */

/* 字型 */
英文：Inter 或 IBM Plex Sans
中文：Noto Sans TC（必須進行子集化）
程式碼：IBM Plex Mono
```

---

## 導覽結構（最多 5 項）

```
Work · Reference · Tools · Capabilities · About  [聯絡 CTA]
```

---

## 內容策略：雙引擎模型

### 流量引擎（SEO & AI 探索）
| 區段 | 目的 | 內容 |
| :--- | :--- | :--- |
| **Reference** | 長尾搜尋流量捕獲 | Modbus 支柱頁 + 5–6 篇子群文章 |
| **Tools** | 競爭護城河 + 反向連結 | P0：Modbus 位址轉換器、Float 解碼器 |
| **Data** | 獨家資料集權威 | 設備比較矩陣（CSV 下載） |

### 轉換引擎（業務諮詢）
| 區段 | 目的 | 內容 |
| :--- | :--- | :--- |
| **Work** | 能力證明 | 4–5 篇結構化案例研究 |
| **Capabilities** | 買方語言服務 | OT/IT 整合、協議橋接、交付文件 |
| **About** | 信任與聯絡 | 資歷、證照、聯絡 CTA |

### 強制因果連結規則
每個 Reference/Tool 頁面頁尾**必須**連結到 Case Study，並附帶因果語境：
> *「這個 Modbus 暫存器偏移量錯誤導致了一個真實冰水主機改造專案中 3 天的除錯 → [查看完整案例](/work/chiller-ot-monitoring)」*

---

## Sprint 時程表

| Sprint | 期程 | 交付項目 |
| :--- | :--- | :--- |
| **Sprint 0** | 2 天 | 網域 DNS、Google Search Console、Bing Webmaster、`site` Repo + CI + gitleaks |
| **Sprint 1** | 2 週 | Astro + 設計系統 + i18n 骨架 + Cloudflare Pages 部署 + **首頁上線** + **冰水主機案例研究** |
| **Sprint 2** | 1.5 週 | NAS + Nextcloud + Tailscale + Talk + coturn + 3-2-1 備份 + 照片上傳測試 |
| **Sprint 3** | 2 週 | Reference 支柱頁 + 2 篇子群頁 + JSON-LD + sitemap + RSS + hreflang |
| **Sprint 4** | 2 週 | P0 工具（Modbus 位址轉換器 + Float 解碼器）+ 公開 Repo + 靜態範例 + FAQ |
| **Sprint 5** | 2 週 | 設備比較資料頁 + 案例研究 2 & 3 |
| **Sprint 6** | 持續 | AI 助理（單一頁面）+ 訪客地球儀 `/lab/` + 分析案例研究 |

### Sprint 1 完成定義 (DoD)
> 一個陌生人在瀏覽器打開網址，10 秒內理解您的專業定位，並可閱讀一篇完整的案例研究。

---

## SEO 與 AI 可見度

- JSON-LD 結構化資料：`Person`、`TechArticle`、`SoftwareApplication`、`Dataset`、`FAQPage`
- `llms.txt` 供 Perplexity/Claude 代理程式使用
- AI 爬蟲策略：允許 GPTBot、ClaudeBot、PerplexityBot
- 工具頁面：互動元件載入前至少 3 個預渲染靜態 HTML 範例
- `sitemap.xml`、`robots.txt`、`hreflang`（zh/en）
- 定義優先寫作、Q&A 標題、答案優先段落

---

## 雙語 i18n

- 路由：`/en/...` 和 `/zh/...`
- 策略：**搜尋意圖導向的在地化**（非逐字翻譯）
- 中文字型：Noto Sans TC，強制子集化（防止 2–4 MB 字型載入）
- Astro 原生 i18n + `hreflang` 標籤

---

## 資安控制項

- **資料分級**：C0（公開）→ C1（內部）→ C2（私密，僅限 NAS）→ C3（機密，僅限 Bitwarden）
- **預提交檢查**：`gitleaks` hook + CI 掃描
- **訪客隱私**：僅聚合計數 `(date, country, region, count)`，不存 Raw IP
- **AI 助理**：Worker 代理（金鑰伺服器端持有）、Turnstile、每 Session Token 上限、月度硬性預算上限
- **案例研究**：完整去識別化清單（遮蔽客戶名、清除 EXIF、遮蔽 IP）
- **季度稽核**：Google dorks、crt.sh、Shodan/Censys、Have I Been Pwned

---

## 儲存庫結構

```
site/（私有 GitHub Repo）
├── astro.config.mjs
├── .gitleaks.toml
├── .github/workflows/ci.yml
├── src/
│   ├── content/
│   │   ├── work/en/ & work/zh/        # 案例研究
│   │   ├── reference/en/ & reference/zh/
│   │   └── data/
│   ├── components/
│   ├── layouts/
│   ├── pages/en/ & pages/zh/
│   └── styles/tokens.css
├── public/
│   ├── robots.txt
│   ├── llms.txt
│   └── favicon/

api/（獨立私有 Repo）
├── src/（ai-proxy、tools、analytics）
├── schema/d1.sql
└── wrangler.toml

modbus-tools/（公開 Repo — P0 護城河）
├── src/
├── README.md（完整、值得反向連結）
└── LICENSE
```

---

## 從目前網站中刪除的項目

- ❌ React 18 + Vite + 所有 React 元件
- ❌ TerminalHero 打字動畫
- ❌ AIAgentShowcase 模擬 Agent 卡片
- ❌ IoTAnalytics 假遙測 SVG 圖表
- ❌ SecurityArchitecture CF Tunnel 架構圖
- ❌ 賽博霓虹設計系統（青色/紫色/翡翠綠光暈）
- ❌ Tab 式 SPA 導覽

---

## 預估工時

**總計：約 8–10 週**（Sprint 0–6，單人開發者）

| 階段 | 週數 | 優先級 |
| :--- | :--- | :--- |
| 基礎設施 + 首頁 + 第一篇案例 | 2.5 | P0 |
| NAS + 備份 | 1.5 | P0 |
| Reference + SEO | 2 | P0 |
| P0 工具 | 2 | P0 |
| 資料頁 + 更多案例 | 2 | P1 |
| AI 助理 + Lab | 持續 | P2 |
