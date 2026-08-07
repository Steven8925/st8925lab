# ST8925 LAB — 方案 A（Astro SSG 全面重建）

> 專業 OT/IT 整合作品集 — 高效能、SEO 優化、雙語靜態網站。

---

## 專案概述

本目錄 (`d:\st8925lab\cloudmd\option_A\`) 包含 `st8925lab.com` 完整的生產級 **Astro SSG** 程式碼。本專案從零開始建構，100% 滿足 `cloudmd/` 設計規格書（PROJECT_BRIEF_v2、SECURITY_DESIGN、PROJECT_DECISIONS 及冰水主機案例研究）要求。

---

## 核心功能與特色

- ⚡ **零客戶端開銷**：採用 Astro 4.x 靜態生成 (SSG)，每頁客戶端 JS 預算控制在 100 KB 以內。
- 🌐 **完整雙語支援**：平行 `/en/` 與 `/zh/` 路由，支援搜尋意圖在地化與 `hreflang` 標籤。
- 📊 **雙引擎內容架構**：
  - **流量引擎**：工業技術參考文章與 P0 Modbus 工具，用於擷取自然搜尋流量。
  - **轉換引擎**：結構化案例研究（冰水主機改造）、服務能力頁與關於頁，用於商務諮詢轉換。
- 🛠️ **P0 工業級線上工具**：
  - **Modbus 位址轉換器**：Table (40001) ↔ PDU (0x0000) ↔ 功能碼對照，無需外部依賴。
  - **Modbus Float/Int32 解碼器**：同時解析 4 種 Word/Byte Order 組合 (Big Endian, Little Endian Word Swap 等)。
- 🔒 **嚴格資安防護**：
  - 嚴格的內容安全策略 (CSP) 標頭，封鎖腳本注入風險。
  - 純客戶端輸入驗證，禁止使用 `eval()` 或危險 DOM 操作。
  - 隱私保護設計：不記錄 Raw IP，NAS 對外零開放 Port。
- 🎨 **企業級暗色視覺設計**：精確的色票控制 (`#0A0E14` 背景, `#131A24` 卡片, `#2563EB` 主色, `#C9A227` 強調金 <10%)。

---

## 目錄結構

```
option_A/
├── astro.config.mjs          # Astro 4.x SSG + Tailwind + i18n 設定檔
├── package.json              # 依賴套件管理
├── tailwind.config.mjs       # 客製化設計系統 Token
├── tsconfig.json             # TypeScript 嚴格模式設定
├── README.md                 # 英文說明文件
├── README_zh.md              # 繁體中文說明文件
├── public/
│   ├── _headers              # Cloudflare Pages 資安標頭設定
│   ├── robots.txt            # 搜尋引擎與 AI 爬蟲存取權限
│   ├── llms.txt              # AI Agent 網站結構說明
│   ├── sitemap.xml           # 包含 hreflang 的靜態 Sitemap
│   └── favicon.svg           # 品牌 SVG 圖示
├── src/
│   ├── styles/
│   │   └── global.css        # 全域樣式與組件類別
│   ├── i18n/
│   │   ├── en.json           # 英文介面文字
│   │   ├── zh.json           # 繁體中文介面文字
│   │   └── index.ts          # 語言工具與翻譯輔助函式
│   ├── layouts/
│   │   └── BaseLayout.astro  # 主 HTML 框架 (含 Meta 與 JSON-LD)
│   ├── components/
│   │   ├── Navbar.astro      # 5 段式導覽列與行動選單
│   │   ├── Footer.astro      # 頁尾與版權宣告
│   │   ├── CaseStudyCard.astro # 案例研究卡片組件
│   │   ├── ContactCTA.astro  # 聯絡按鈕組件
│   │   └── LanguageSwitcher.astro # EN ↔ 中文 切換按鈕
│   ├── content/
│   │   ├── config.ts         # Content Collections 結構定義
│   │   ├── work/             # 案例研究 Markdown (en/ 與 zh/)
│   │   └── reference/        # 技術文章 Markdown (en/ 與 zh/)
│   └── pages/
│       ├── index.astro       # 根目錄重導向至 /en/
│       ├── en/               # 英文頁面路由
│       └── zh/               # 繁體中文頁面路由
└── reports/
    ├── completion_report_en.md # 英文完成報告
    └── completion_report_zh.md # 繁體中文完成報告
```

---

## 本地開發與建構指令

### 系統需求

- Node.js 18.x 或 20.x
- npm 9.x 或更新版本

### 安裝依賴

```bash
cd d:\st8925lab\cloudmd\option_A
npm install
```

### 啟動開發伺服器

```bash
npm run dev
```
瀏覽器開啟 [http://localhost:4321](http://localhost:4321)。

### 類型檢查與稽核

```bash
npm run check
```

### 生產環境建構

```bash
npm run build
```
靜態 HTML/CSS/JS 將輸出至 `dist/` 目錄 (2.6 秒內完成 23 個頁面建構)。

---

## 部署說明 (Cloudflare Pages)

1. 將您的 GitHub 私有儲存庫連接至 **Cloudflare Pages**。
2. 設定建構參數：
   - **Framework Preset**: Astro
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `cloudmd/option_A/dist`
3. 環境變數：純靜態 SSG 無需特殊環境變數。
