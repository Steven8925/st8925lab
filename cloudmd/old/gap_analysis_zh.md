# ST8925 LAB — 差距分析報告（中文版）
## 現有網站 vs. `cloudmd/` 設計文件

在完整審閱 `cloudmd/` 資料夾中的全部 5 份文件後，發現目前網站實作與您精煉過的設計願景之間存在**重大落差**。`cloudmd/` 文件代表的是一個更加成熟、以專業形象為導向的方向。

---

## ⚠️ 核心發現：專案願景已經轉向

> [!IMPORTANT]
> 您的 `cloudmd/` 文件描述的是一個**專業 OT/IT 作品集網站**（Astro 靜態生成、工業工具、Modbus 案例研究、面向企業買家），而**不是**我們最初建構的通用 AI/IoT 興趣實驗室儀表板（React SPA、模擬遙測、Vibe Coding 展示）。
>
> **目前的程式碼庫與 `cloudmd/` 規格書是根本上不同的兩個專案。**

---

## 🔴 重大差距（必須處理）

### 差距 1：框架錯誤 — React/Vite vs. Astro SSG

| 面向 | 目前網站 | `cloudmd/` 決策 (DEC-001) |
| :--- | :--- | :--- |
| **框架** | React 18 + Vite（純客戶端 SPA） | **Astro（完全靜態 SSG）**+ Tailwind CSS |
| **JS 預算** | ~194 KB（目前打包大小） | **每頁 < 100 KB gzipped** |
| **渲染方式** | 僅客戶端渲染，無 SEO | 預渲染靜態 HTML，SEO 極佳 |
| **理由** | 快速原型展示 | INP 安全性、零水合開銷、原生 i18n、Markdown Content Collections |

> [!CAUTION]
> `PROJECT_BRIEF_v2` 明確指出：**「不使用 React/Vue」**，以強制執行 JS 預算並保護 Core Web Vitals（INP < 200ms）。目前的 React SPA 違反了這項規定。

---

### 差距 2：定位錯誤 — 興趣實驗室 vs. 專業作品集

| 面向 | 目前網站 | `cloudmd/` 願景 |
| :--- | :--- | :--- |
| **身份定位** | 「AI Agent & IoT 興趣實驗室」 | **OT/IT 專業作品集**，面向企業客戶 |
| **目標受眾** | 一般技術愛好者 | 企業客戶、系統整合商 (SI)、採購決策者、獵頭 |
| **導覽結構** | 指揮中心 / AI Agents / IoT / 資安 | **Work · Reference · Tools · Capabilities · About**（最多 5 項） |
| **內容類型** | 模擬終端機、Demo 代理程式 | 結構化案例研究、Modbus 參考文件、工業工具 |

---

### 差距 3：缺失 — 雙引擎內容策略

`cloudmd/` 規格書定義了**流量引擎 + 轉換引擎**模型：

- **流量引擎**（Reference / Tools / Data）：長尾 SEO 內容（Modbus 指南、工業規格、設備比較），吸引自然搜尋流量。
- **轉換引擎**（Work / Capabilities / About）：透過結構化案例研究，將訪客轉換為業務諮詢。
- **強制因果連結規則**：每個 Reference 頁面必須連結到一個 Case Study，並附帶因果語境，例如*「這個位址偏移錯誤導致了 3 天的除錯 → 查看完整案例」*。

**目前網站完全沒有這些內容。**

---

### 差距 4：缺失 — 冰水主機案例研究（核心內容）

[case-study-chiller-v0.9.md](file:///d:/st8925lab/cloudmd/case-study-chiller-v0.9.md) 是一份詳細的實務案例，內容涵蓋：
- **在 Turbocor 冰水主機上加裝 Modbus 監控**（Siemens Climatix POL687），場景為五星級飯店。
- **硬體**：自製 ESP32 PCB + RS-485 Modbus RTU（唯讀、非侵入式）。
- **成果**：故障偵測時間減少約 80%、巡檢工時減少約 50%、持續運行超過 14 個月。
- **技術難點**：4 個堆疊的 Modbus 缺陷（鮑率、功能碼、PDU 偏移量、浮點數位元組順序）。

這是**核心案例研究**，也是網站最重要的內容素材。目前網站完全沒有案例研究基礎設施。

---

### 差距 5：缺失 — 工業 Modbus 工具（P0 護城河）

規格書指定了兩個 **P0 優先級**的開源工具：
1. **Modbus 位址轉換器**（Table ↔ PDU Offset ↔ 各廠商慣例轉換）
2. **Modbus Float/Int32 組裝解碼器**（4 種 Word/Byte Order 組合解析）

這些工具被設計為網站的**競爭護城河** — 託管在公開 GitHub 儲存庫中，附完整 README，用以吸引外部反向連結並建立技術權威。

---

### 差距 6：設計系統錯誤 — 賽博霓虹風格 vs. 專業暗色調

| 面向 | 目前網站 | `cloudmd/` 設計 Token |
| :--- | :--- | :--- |
| **背景色** | `#080c14`，搭配霓虹光暈 | `#0A0E14`（接近，但更精煉） |
| **主色** | 青色 Cyan `#06b6d4` | **藍色 Blue `#2563EB`**（專業感） |
| **強調色** | 紫色/翡翠綠霓虹光暈 | **金色 Gold `#C9A227`**（面積嚴格控制 < 10%，僅用於標題/邊框） |
| **字型** | Inter + Outfit + Fira Code | **Inter/IBM Plex Sans** + **Noto Sans TC**（雙語，必須子集化） |
| **風格** | 賽博龐克遊戲終端機 | **乾淨、權威、企業級質感** |

---

### 差距 7：缺失 — 雙語 i18n（中/英）

`cloudmd/` 規格書要求：
- 完整雙語支援（`/zh/` 和 `/en/` 路由）。
- **搜尋意圖導向的在地化**（非逐字翻譯 — 各語言版本鎖定不同的搜尋關鍵字）。
- Astro 原生 i18n + `hreflang` 標籤。
- 中文字型子集化（Noto Sans TC），避免 2-4MB 字型檔案拖垮 LCP。

---

### 差距 8：NAS 存取方式錯誤 — Cloudflare Tunnel vs. Tailscale

| 面向 | 目前網站 | `cloudmd/` 決策 |
| :--- | :--- | :--- |
| **NAS 存取** | Cloudflare Tunnel (`cloudflared`) | **Tailscale**（零開放埠） |
| **理由** | 透過 Tunnel 暴露公開 API | Tailscale 僅供**家庭私人存取**；原生手機 App 照片備份可正常運作（CF Access SSO 會中斷背景上傳） |
| **公開網站** | 透過 Tunnel 從 NAS 拉取資料 | **100% 與 NAS 解耦**；NAS 主動向外推送資料至 R2/B2 |

> [!WARNING]
> `SECURITY_DESIGN.md` 指定 Zone C（NAS）使用 Tailscale，而非 Cloudflare Tunnel。目前網站的「CF TUNNEL ACTIVE」徽章和安全架構圖需要修正。

---

### 差距 9：缺失 — 結構化 SEO 與 AI 可見度

`cloudmd/` 規格書指定：
- JSON-LD 結構化資料（`Person`、`TechArticle`、`SoftwareApplication`、`Dataset`、`FAQPage`）
- `llms.txt` 供 Perplexity/Claude 代理程式使用
- 明確的 AI 爬蟲允許策略（允許 GPTBot、ClaudeBot、PerplexityBot）
- 定義優先的寫作風格、Q&A 標題、答案優先段落
- 工具頁面必須包含至少 3 個預渲染靜態 HTML 範例
- `sitemap.xml`、`robots.txt`、`hreflang` 標籤

---

### 差距 10：缺失 — 3-2-1-1-0 備份架構

`SECURITY_DESIGN.md` 詳述了精密的雙 NAS 備份策略：
- **主要 NAS**：QNAP TS-473A（即時資料 + 快照，每日保留 30 天 + 每週保留 12 週）
- **次要 NAS**：QNAP TS-659 Pro II（EOL 停產機型，僅限區網，排程開機 02:00–06:00 執行 rsync）
- **異地備份**：Backblaze B2（客戶端 AES 加密，Object Lock ≥ 30 天）
- **監控**：所有排程腳本 ping `healthchecks.io`

目前的安全頁面僅提及通用的強化建議。

---

### 差距 11：缺失 — 資料分級制度

`SECURITY_DESIGN.md` 定義了 4 個分級層級：
- **C0（公開）**：網站內容、公開儲存庫
- **C1（內部）**：私人儲存庫、草稿、Prompt 設計
- **C2（私密）**：家庭照片、財務記錄 — **僅限 NAS，絕不上 Cloudflare**
- **C3（機密）**：API 金鑰、密碼 — **僅限 Bitwarden**

---

### 差距 12：`wrangler.json` 名稱錯誤

目前的 [wrangler.json](file:///d:/st8925lab/wrangler.json) 中 `"name"` 為 `"blue-butterfly-f996"`，應改為 `"st8925lab"`。

---

## 🟡 已符合的項目

| 功能 | 狀態 |
| :--- | :--- |
| Cloudflare Pages 部署目標 | ✅ 正確 |
| 暗色主題方向 | ✅ 正確（配色需調整） |
| 零入站埠原則 | ✅ 理念正確 |
| 家庭照片隔離概念 | ✅ 原則正確 |
| 自製 SVG 圖表（無外部函式庫） | ✅ 符合 DEC-003 |

---

## 📋 建議行動方案

鑑於差距規模，您有**兩條路線可選**：

### 方案 A：使用 Astro 全面重建（完全符合 `cloudmd/` 規格書）
- 使用 **Astro SSG** 建構新專案，採用 5 段式導覽（Work / Reference / Tools / Capabilities / About）。
- 實作雙引擎內容策略，搭配 Markdown Content Collections。
- 以冰水主機案例研究作為第一個真實內容頁面。
- 建構兩個 P0 Modbus 工具。
- 實作雙語 i18n、JSON-LD、及專業設計系統。
- **預估工時**：約 2-3 週（規格書中的 Sprint 1-4）。

### 方案 B：在現有 React 網站上漸進式演進
- 保留 React/Vite 技術棧，但將導覽重構為 5 段式模型。
- 新增案例研究頁面、參考文件、及工業工具。
- 將設計系統從賽博霓虹風格更新為專業暗色調。
- 加入冰水主機案例研究內容。
- 修正 NAS 存取描述（Tailscale，非 CF Tunnel）。
- **預估工時**：約 1-2 週，但仍會有 JS 預算和 SEO 的先天限制。

> [!IMPORTANT]
> **您希望走哪條路線？** `cloudmd/` 文件強烈傾向 **方案 A（Astro 全面重建）**，但方案 B 可以讓您保留互動式終端機和 AI Agent 展示，作為 `/lab/` 子頁面使用。
