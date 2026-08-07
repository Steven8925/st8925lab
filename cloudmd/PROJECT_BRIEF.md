# 專業作品集網站 — 專案 Brief / AI Prompt

> **文件用途**:本文件是這個網站專案的單一事實來源(single source of truth)。
> 貼給 Claude Code / Cowork / 其他 AI 作為完整 context,或放在 repo 根目錄並由 `CLAUDE.md` 引用。
> **版本**:v1.0 · 建立日期:2026-07-30
> **狀態標記**:`[定案]` 不要重新討論 · `[待決]` 需使用者回答 · `[Phase 2/3]` 暫不實作

---

## 0. 給 AI 的角色與行為指令

你是一位資深 IT 專案經理與系統架構師,具備 IT 基礎架構、網路、資訊安全與企業專案交付的深度經驗,並熟悉 OT/IT 整合與工業 IoT 領域。

**行為守則**

1. **不盲從指令。** 主動分析、質疑假設、指出風險與缺口。在執行前提出關鍵追問或替代方案。
2. **範圍紀律。** 本專案最大風險是範圍膨脹。任何超出本文件「內容架構」章節的新功能提案,先問「這一項對『10 秒內證明專業能力』有貢獻嗎?」若沒有,建議延後至 Phase 2/3。
3. **安全優先於便利。** 涉及 secret 管理、檔案上傳、對外連線、個資處理的實作,**先列出控制項清單,再寫程式**。
4. **每個 session 開始時,明確說明:這個 session 結束後,真實世界會多存在什麼東西。** 不接受「又一份分析文件」作為 session 產出。
5. **英文寫作輔助。** 產出對外文案時使用清楚、專業的商業英文,並標註值得使用者留意的英文寫法差異(正式書面 vs 口語)。
6. **不做的事**:不重新設計已定案項目;不在未確認 `[待決]` 事項前寫下依賴它們的程式碼。

---

## 1. 專案目標與定位 `[定案]`

| 項目 | 內容 |
|---|---|
| **定位** | 專業作品集 / 能力宣傳。**少而精** |
| **不是** | 個人知識庫、部落格、興趣分享站 |
| **目標讀者** | 企業客戶、系統整合商、採購/技術決策者、獵頭。**以國際讀者為主** |
| **核心敘事** | OT/IT 跨層整合能力 + 交付紀律(文件、測試、驗收) |
| **成功定義** | ① 首頁 10 秒內回答:你是誰 / 你解決什麼問題 / 證據在哪 ② 4–5 篇有結構的 case study ③ 2 個工業向獨家工具上線 |

### 明確排除項 `[定案]`

- ❌ **紫微斗數 / 易經 / 八字** — 與專業定位訊號衝突。移出本專案(未來如需要,另開獨立 subdomain)
- ❌ **Blog / 最新文章** — 最後更新在數月前的 blog 對專業形象是負分。改用無時效壓力的 Reference 頁
- ❌ **公開發布金融市場分析** — 定位衝突 + 監理灰色地帶。留在私密區自用
- ❌ **原生手機 App 開發** — 需求已被 PWA + Nextcloud 官方 app 完全覆蓋
- ❌ **每個 APP 都掛 live demo** — 等於同時維運 N 個應用。用截圖 + 短片 + 說明取代

---

## 2. 架構分區 `[定案]`

三個安全等級不同的系統,**不得共用程式碼與 auth**。

```
                 Cloudflare (DNS + CDN + Zero Trust)
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
  Zone A 公開內容        Zone B API 層         Zone C 私密區
  Astro 靜態站          Cloudflare Workers     NAS (Docker)
  → Cloudflare Pages    ├ AI proxy            ├ Nextcloud
                        ├ 網路工具 API          ├ 檔案 + 手機照片備份
                        ├ 訪客統計 ingest       └ 存取:Tailscale
                        └ R2 presigned URL         (對外零開放 port)
```

| Zone | 內容 | 風險等級 | 落點 |
|---|---|---|---|
| **A** | Case studies、Capabilities、Reference、About | 低(無使用者輸入) | Cloudflare Pages,Markdown in Git |
| **B** | AI 助理、網路工具、訪客分析、IoT 彙總展示 | 中(有 API、有成本) | Cloudflare Workers |
| **C** | 私密檔案區、手機照片備份 | 高 | NAS,**不上公網** |

**關鍵原則**

- Zone C **不使用隱藏路徑**作為安全機制(會從 referrer、瀏覽器同步、TLS CT log 洩漏)
- Zone C 一律使用**現成成熟軟體**,不自寫檔案上傳/管理邏輯
- Zone B 與 Zone C **不共用資料庫**

---

## 3. Repo 策略 `[定案]`

| Repo | 可見性 | 內容 |
|---|---|---|
| `site` | **Private** | Astro 專案、Markdown 內容、設計系統 |
| `api` | **Private** | Worker 程式碼、rate limit 閾值、D1 schema、AI prompt 設計 |
| `tools-*` | **Public**(挑選) | 1–2 個乾淨、自我完備、README 完整的小工具,作為公開技術證據 |

**因私有 repo 而必須補強的控制項**

- GitHub secret scanning 在私有 repo 通常需付費方案 → **本機 `gitleaks` pre-commit hook 為必要項,非選項**
- 單人開發無 code review → 加輕量 CI(GitHub Actions:build 檢查 + link check + `gitleaks` scan)
- **Git history 永久性**:任何 secret 一旦 commit,唯一補救是輪替金鑰,刪檔案無效

---

## 4. 內容架構 `[定案]`

### 導覽(最多 5 項,不得增加)

`Work` · `Capabilities` · `Reference` · `Tools` · `About` + Contact CTA

### 4.1 Work — Case Studies(核心,4–5 篇,上限 6)

建議候選(全部須去識別化):

1. **冰水主機 OT 監控改造** — ESP32 + Modbus,不動既有 BMS ← **第一篇**
2. **多租戶售後維修管理系統** — 多表架構、RBAC、UAT 體系
3. **軌道等級網通設備選型** — EN50155 合規性比較與決策依據
4. **Dashboard 自動化管線** — 無人化擷取 + OCR + 通報

### 4.2 Capabilities — 用買方語言,不用技術語言

> 寫「OT/IT 網段整合與 Purdue 模型分層規劃」,不要寫「熟悉 Modbus/BACnet」。
> 判準:客戶會用這句話搜尋嗎?會用這句話編預算嗎?

- OT/IT 網段整合與 Purdue 模型分層規劃
- 既有設備通訊整合(Modbus / BACnet / SNMP),不動原有 BMS
- 廠務/機電監控平台導入與交付
- 網通設備選型與規格合規性審查(EN50155 / IEC 61850-3 / 工業級溫寬)
- 專案交付文件體系建置(FAT / SAT / UAT / 移交)

### 4.3 Reference — 技術參考頁(非 blog),5–8 頁

三重效益:展示深度 / SEO 幾乎零競爭 / 自己天天會查。

- Modbus RTU/TCP:function code 對照 + **table address 與 PDU offset 的差一錯誤**
- 32-bit float 在 Modbus 上的組裝:word order / byte order 四種組合對照表
- IEC 62443 zone & conduit 模型:一個實際廠區的分區範例
- 工業網通環境規格對照:EN50155 vs IEC 61850-3 vs 一般工業級(溫度/振動/EMC)
- BACnet 物件類型與 instance 編號慣例快查
- **Vendor Comparison 頁**:結構化、可篩選的設備比較資料表(中文網路上幾乎不存在,採購與 SI 正在搜這個)

### 4.4 Tools — 差異化在工業向,不在通用工具

| 優先 | 工具 | 存取 | 說明 |
|---|---|---|---|
| **P0** | Modbus 位址轉換器(table ↔ PDU offset ↔ 廠商慣例) | 公開 | **護城河**。市面幾乎無好用版本 |
| **P0** | Modbus float/int32 組裝解碼器(貼 4 個 register,列出 4 種 word/byte order 解讀) | 公開 | 現場除錯神器 |
| P1 | BACnet instance 編號計算 | 公開 | 冷門但精準 |
| P1 | IP 攝影機頻寬/儲存計算 | 公開 | 弱電專案常用 |
| P1 | 電壓降 / 線徑計算 | 公開 | 同上 |
| P2 | CIDR/Subnet 計算、MAC OUI 查詢、Base64/JWT decode、hash、cron 解析、我的 IP | 公開 | Commodity,補齊用,非賣點 |
| P2 | DNS lookup / propagation、TLS 憑證檢查、HTTP header 檢視、Whois、Port 連通性 | **需登入** | 有對外連線 → 見 §6.3 |

P0 兩項做完後,**單獨開公開 repo + 完整 README**,本身即是作品集。

### 4.5 About — 三段

定位一句話 · 可驗證資歷與證照(IEC 62443 進行狀態標註 "in progress" 優於不提) · 聯絡方式與合作模式

### 4.6 `[Phase 2]` 加分項

- **Live IoT Demo** — 一顆真實感測器 → 公開儀表板。一個裝置就夠,誠實標註技術棧。與生產環境完全隔離
- **交付文件範例(去識別化)** — UAT 測試計畫結構、I/O point list 範本、FAT/SAT checklist、驗收報告格式。對 PM 定位,**展示文件本身的可信度強度超過程式碼**

---

## 5. 設計系統 `[定案]`

### 色票

```css
--bg:        #0A0E14;  /* near-black。不用純黑,純黑在螢幕上偏死 */
--surface:   #131A24;  /* 卡片 / 區塊 */
--blue:      #2563EB;  /* 主色:互動元素、連結 */
--blue-deep: #0F2A47;  /* 漸層、hero 底色 */
--gold:      #C9A227;  /* 強調色 */
--text:      #E6EDF5;
--text-dim:  #8B98A9;
```

**金色使用規則(硬性)**

- ❌ **不得用於正文** — `#C9A227` 對深底在小字級過不了 WCAG AA
- ✅ 僅用於標題、分隔線、圖表 accent、hover 狀態
- ✅ **面積控制在 10% 以下** — 這是「專業」與「俗氣」的分界線

### 字體

- 英文:Inter 或 IBM Plex Sans
- 中文:Noto Sans TC
- **必須做 subsetting**。中文全字集 2–4 MB,不處理會直接毀掉載入速度。用 unicode-range 切分或 Fontsource subset 版本

### JARVIS 訪客儀表板

- **不自己刻 3D**。地球用 [cobe](https://cobe.vercel.app/)(~5KB)或 globe.gl;圖表/地圖用 Apache ECharts
- **位置:第一屏以下**,並明確標註技術棧 → 讀作 capability demo 而非裝飾
- 放 hero 會與定位敘述爭注意力,且淪為裝飾
- 效能守則:IntersectionObserver 延遲初始化 · 尊重 `prefers-reduced-motion` · 靜態圖 fallback · **不得阻擋 LCP**,首屏先出文字

### 設計工具範圍

Figma 只畫 3 個關鍵頁面(首頁、Case Study 頁、Tools 頁),不畫完整站台。對比度驗證用 WebAIM Contrast Checker。

---

## 6. 技術選型 `[定案]`

| 層 | 選擇 | 說明 |
|---|---|---|
| 公開網站 | **Astro** + Tailwind + Alpine.js | 內建 i18n、content collections、預設零 JS、PWA 友善 |
| 部署 | **Cloudflare Pages**(私有 GitHub repo)| Git push → 自動 build/deploy + preview URL |
| API | **Cloudflare Workers** (TypeScript) | AI proxy、工具 API、統計 ingest |
| 資料庫 | **Cloudflare D1**(SQLite)+ **KV** | 統計彙總與 AI 標籤 → D1;rate limit → KV。**Postgres 在此架構為過度設計** |
| 物件儲存 | **Cloudflare R2** | egress 免費(手機瀏覽照片流量關鍵)。影片、大圖、公開素材 |
| 私密區 | **NAS + Docker + Nextcloud** | 見 §7 |
| 私密區存取 | **Tailscale** | 對外零開放 port,手機 app 正常運作 |
| Python 定位 | 退出主線 | 僅保留於本機:IoT 資料處理、彙總匯出、既有 Selenium pipeline |
| 內容管理 | **Git as CMS**(Markdown in repo) | 內容與程式同一份版本歷史。**不另建內容 DB** |

### Cloudflare Pages 免費方案限制備忘

| 項目 | Free |
|---|---|
| 頻寬 | 不限 |
| Build | 500 次/月,單次 20 分鐘 timeout,1 併發 |
| 每站檔案數 | 20,000 |
| **單檔上限** | **25 MiB** |
| 自訂網域 | 100 個/專案 |
| Pages Functions | 共用 Workers 免費額度,100k req/日 |
| Workers Paid | US$5/月(超出時) |

**實際會咬到的三點**

1. 25 MiB → demo 影片不進 repo,放 R2 或 YouTube unlisted
2. 20,000 檔案 → 原始圖片不進 repo,用 Astro image optimization 或 R2
3. Git as CMS → 確認上表「內容管理」決策

**`[待確認]`** Cloudflare 近期在把新專案導向 **Workers + Static Assets**,Pages 偏維護模式。開新專案前確認官方 docs 目前推薦路徑;走 Workers 可讓整個專案在同一 runtime,少一層接縫。

### 月成本估算

Pages 免費 + Workers 免費額度內 + R2 100GB ≈ US$1.5 + Tailscale 免費 + AI API(設上限)US$5 ≈ **約 US$7/月**

---

## 7. NAS 整合 `[定案]`

> **絕對規則:NAS 不得 port forward 至網際網路。**
> Synology / QNAP 是勒索軟體最集中打擊的裝置類別,有多次大規模漏洞被自動化掃描利用的歷史。

### 模式 1:NAS 作為 Zone C 主機(採用)

- NAS Docker(Synology Container Manager / QNAP Container Station)跑 **Nextcloud**
- 存取走 **Tailscale**(Synology、QNAP 均有官方套件)
- 對外零開放 port,Nextcloud 官方 iOS/Android app 背景自動上傳正常運作
- 利用 NAS 既有能力:RAID、snapshot、排程備份

**選 Nextcloud 而非 Immich 的理由**:一套系統同時滿足檔案總管 + 手機自動上傳 + 家人多帳號 + 分享連結。單人維運只顧一套。等照片量大到相簿體驗不足,再疊 Immich。

**RAID 不是備份。** 家人照片必須 3-2-1:NAS → 加密同步至 Backblaze B2 或 R2(Hyper Backup / rclone)。100GB 每月 < US$1。勒索軟體會連 NAS 一起加密,離機備份是唯一保險。

### 模式 2:NAS 作為 IoT 資料來源 `[Phase 2]`

**原則:NAS 主動推,網站不得拉。**

```
感測器 → NAS(Docker:收集器 + Postgres/InfluxDB)
            │ 排程 outbound push(彙總後 JSON)
            ▼
      Cloudflare R2 / D1
            │
            ▼
        公開網站讀取
```

網站與 NAS 完全解耦:NAS 離線/停電/重開機,網站照常運作(資料變舊而已),且零 inbound 連線。

### 模式 3:NAS 作為公開素材母版

家用上傳頻寬、可用性、ISP 條款、DDoS 曝險皆不適合直接服務公開流量。`rclone` 排程同步「要公開的那一份」至 R2,網站從 R2 讀。NAS 永不面對公網。

### 不採用

拿 NAS 當 CI/build runner。Pages build 免費且更快,自架 runner 只是多一個要維護與修補的東西。

### NAS 與現有 Ubuntu 機器分工

- **NAS** = 儲存 + 需 24/7 的服務(Nextcloud、資料收集器、備份)
- **Ubuntu** = 開發、實驗、會頻繁重裝的東西
- **不得混用角色**,否則重裝 Ubuntu 時會發現家人照片在上面

---

## 8. 安全與隱私 — 非協商項

實作前必須逐項確認。

### 8.1 Secret 管理

- Secret 一律用 `wrangler secret put` / Pages encrypted environment variables
- **任何 `.env` 不得進版控**
- `gitleaks` pre-commit hook 為必要項
- Secret 曾被 commit → 輪替金鑰,不是刪檔案

### 8.2 訪客地理分析 = 個資處理

- IP 在 GDPR 與台灣個資法下屬個人資料
- 使用 Cloudflare visitor location headers(`CF-IPCountry` 等),**不自建 GeoIP DB**
- **只存彙總,不存 raw IP**:資料表設計為 `(date, country, region, count)`
- Unique visitor 用「每日輪替 salt 的 IP hash」,不可回推原 IP
- 需有隱私聲明頁 — 對 IT/security 定位是可信度訊號
- 需做 bot filtering,否則儀表板顯示的是 scanner 與 crawler,不是真人

### 8.3 網路工具 — 以權限分級取代黑名單

- **公開層**:純運算,零對外連線(見 §4.4 P0–P2 公開項)
- **登入層**:所有有對外連線能力的工具置於 Cloudflare Access / 登入後方,不對匿名者提供掃描能力
- 若仍需公開任何 DNS 工具:用 `dnspython` 而非 shell out;僅開放 A/AAAA/MX/TXT/NS;封鎖 RFC1918、loopback、link-local、`169.254.169.254`;**先解析再驗證**(防 DNS rebinding);per-IP rate limit + 5 秒 timeout
- **不自建測速**(頻寬成本無上限、可被當流量沉井)→ client-side 方案或連結 Cloudflare Speed Test

### 8.4 AI 助理

**(a) API key 絕不進瀏覽器。** 必須走 Worker proxy,key 在 server side。

**(b) 成本失控是最實際的風險。** 最低控制項:
- 首次對話前掛 Cloudflare Turnstile
- per-session token 上限 + per-IP 每日訊息數上限
- **月度硬性支出上限**(超過即降級為靜態 FAQ,不是繼續燒)
- 常見問題答案做 cache
- 模型分流:一般導覽用 Gemini Flash,需深度回答時切 Claude

**(c) 對話紀錄是個資。** 目標是「使用者關注什麼、回饋什麼」,不是逐字稿:
- 讓模型將對話抽成結構化標籤再存:`(date, lang, page, topic, intent, sentiment, feedback_text?)`
- **不存完整 transcript;IP 與內容不存於同一筆**
- 前端明示會記錄;保留期限 90 天

**(d) 定位邊界。** AI 只做**站內導覽 + 內容問答 + 意見收集**。技術諮詢類問題導回 case study / Reference 並附免責聲明。不提供具名廠商優劣判斷或工程安全性保證。

**(e) 不用 vector DB。** 現階段文章量級,把文章標題 + 摘要索引塞進 system prompt 即足夠。超過 100 篇再考慮 Vectorize。

### 8.5 Case Study 去識別化(每篇必過)

| 項目 | 處理 |
|---|---|
| 客戶名稱 | → 產業描述(例:「一處高速公路服務區設施」) |
| 案場名稱 / 地址 | 移除 |
| domain / 內網 IP / endpoint | 全部移除 |
| 控制器型號 | **可保留**(技術可信度來源) |
| 截圖 | 遮蔽序號、帳號、URL、客戶識別資訊 |
| 架構圖 | 自繪,不使用原始設計圖 |

### 8.6 IoT 資料

公開網站**絕不直連生產 OT 資料源**。僅讀彙總後的 materialized view / 推送檔案,案場名稱去識別化。

### 8.7 內容版權

引用他人技術文件、規格書、書籍內文須用自己的話重寫。規格標準的條號與參數屬事實,可引用;廠商文件的敘述文字不可照抄。

---

## 9. 雙語政策 `[定案]`

| 區塊 | 語言 |
|---|---|
| Work / Capabilities / About | **英文優先或完整雙語** — 目標讀者以國際為主 |
| Reference / Tools | 完整雙語 |
| 首頁 | 完整雙語 |

**實作**

- Astro 內建 i18n,路徑 `/zh/` 與 `/en/`
- 加 `hreflang`;語言切換須保留當前路徑
- 文章 front matter 加 `lang` 與 `translationKey` — **一開始就留欄位,事後補很痛**
- **不機器翻譯後直接發布。** Case study 是可信度核心,英文品質即專業形象
- 寫 case study 是最有效的專業英文練習(有具體事實支撐,不流於空泛)

---

## 10. Case Study 模板

### Above the fold(讀者 30 秒內要看完)

```
標題        用結果或難點命名,不用專案代號
            ✅ "Retrofitting Modbus monitoring onto a legacy chiller
                without touching the BMS"
            ❌ "TURBOCOR Chiller Project"

Meta 條     Sector / My role / Duration / Team size / Stack

成果 chips  3–4 個量化數字

摘要        2–3 句。假設讀者只讀這段
```

### Body(8 段,英文 900–1,200 字)

| # | 段落 | 內容 | 為什麼需要 |
|---|---|---|---|
| 1 | Context & Constraints | 環境、既有系統、不能動什麼、預算/工期限制 | **限制條件才是難度來源**;沒有限制的方案不值得看 |
| 2 | The Problem | 用客戶會說的話陳述 | 證明你聽得懂業務語言 |
| 3 | Options Considered | 2–3 個方案 + **為什麼否決** | **最關鍵一段。多數作品集沒有,而這段是資深與資淺的分界** |
| 4 | What I Built / Delivered | 方案 + 一張架構圖 | |
| 5 | The Hard Part | 一個具體技術失敗、如何診斷、如何修 | **反直覺,但這是最建立信任的一段** |
| 6 | Outcome | 量化結果 + **怎麼量的** | 沒有量測方法的數字沒有說服力 |
| 7 | What I'd Do Differently | 1–2 點 | 成熟度訊號 |
| 8 | My Role | 明確界定你做了什麼、誰做了其他部分 | 單人/PM 定位下,角色模糊會被讀成誇大 |

### 素材要求

一張自繪架構圖 + 一張去識別化儀表板截圖。有圖的 case study 可信度差距很大。

---

## 11. 第一篇 Case Study — 素材問卷

**選定:冰水主機 OT 監控改造**
理由:自我完備、不依賴其他系統即可講完、有極佳的 "The Hard Part"(原始韌體的 baud rate / function code / 位址偏移 / float 組裝四個缺陷)、客戶識別風險最低。

> 使用者以中文回答即可;AI 負責整理為專業英文 case study,並標註值得留意的英文寫法。

**Context**
1. 這是什麼類型的場地?機電系統的規模與用途?
2. 原本的監控狀況是什麼?為什麼不夠用?
3. 有哪些「不能動」的限制?(既有 BMS、保固、停機窗口、預算)
4. 誰是決策者、誰是使用者?

**Problem**

5. 客戶當初怎麼描述這個問題?(盡量用原話)
6. 不解決的實際損失是什麼?(能耗、故障未及時發現、人工巡檢時數)

**Options**

7. 你考慮過哪些其他做法?(原廠選配、換 BMS、用閘道器、其他)
8. 每一個為什麼否決?成本、工期、風險哪一項是決定因素?

**Execution**

9. 最終架構請完整描述一次(裝置 → 通訊 → 上傳 → 儲存 → 呈現)
10. 交付範圍包含哪些文件與測試?

**The Hard Part**

11. 那四個缺陷怎麼被發現的?現場症狀是什麼?(數值全 0?讀不到?數字亂跳?)
12. 你用什麼方法定位到是位址偏移而不是別的原因?
13. 有沒有一次「以為修好了但其實沒有」的過程?

**Outcome**

14. 上線後具體改善了什麼?有數字嗎?(巡檢時數、發現異常的時間、資料完整率)
15. 這套系統現在還在運作嗎?運作多久了?

**Role**

16. 你負責的部分,以及誰負責其他部分(施工、原廠協調、客戶端)

---

## 12. Roadmap

| Sprint | 期程 | 交付(必須是真實存在的東西) |
|---|---|---|
| **1** | 2 週 | `site` repo 建立 · Astro + 設計系統 + 雙語切換 · 接上 Cloudflare Pages · **首頁上線**(定位敘述 + 3 個 case study 連結 + 聯絡方式)· **第一篇 case study 完成** |
| **2** | 1 週 | NAS + Docker + Nextcloud + Tailscale · 3-2-1 離機備份設定 · 手機 app 自動上傳驗證 |
| **3** | 2 週 | Worker + AI 助理(含成本上限與標籤記錄)· 訪客國別統計(**先做數字表格,不做 globe**) |
| **4** | 2 週 | Tools:Modbus 位址轉換器 + float 解碼器(P0 兩項)· 公開 repo + README · Reference 頁 3 篇 |
| **5** | — | 其餘 case study · Vendor comparison 頁 · JARVIS globe · IoT live demo |

**Sprint 1 的 Definition of Done**:一個陌生人可以在瀏覽器打開網址,10 秒內知道你做什麼,並讀完一篇完整的 case study。

**JARVIS globe 刻意排在最後**:它視覺回報最高,但對「網站是否存在」貢獻為零。先做它的結果通常是兩個月後擁有一顆漂亮的地球和三篇文章。

---

## 13. 待決事項 `[待決]`

| # | 問題 | 影響 |
|---|---|---|
| 1 | **NAS 型號與品牌?** | 決定 Docker 與 Tailscale 套件可用性、docker-compose 寫法 |
| 2 | **NAS 硬碟配置與目前可用容量?** | 決定 Nextcloud 儲存策略(本機 vs R2 混合) |
| 3 | **照片總量級與月成長率?** | 決定 R2 vs 本機硬碟 vs 混合,以及成本曲線 |
| 4 | **Arvix 主機還剩多久合約?** | 到期不續約 → 全站移 Cloudflare Pages,省下的錢覆蓋 R2 + AI 費用 |
| 5 | **網域策略** — 使用現有 domain 或另註冊個人專業 domain? | 影響品牌與 DNS 設定 |
| 6 | Cloudflare 官方目前推薦 Pages 或 Workers + Static Assets? | 開專案前確認 |

---

## 附錄:建議目錄結構

```
site/
├── CLAUDE.md                    # 引用本文件
├── PROJECT_BRIEF.md             # 本文件
├── .gitleaks.toml
├── .github/workflows/ci.yml     # build + link check + gitleaks
├── astro.config.mjs
├── src/
│   ├── content/
│   │   ├── work/                # case studies
│   │   │   ├── en/
│   │   │   └── zh/
│   │   ├── reference/
│   │   │   ├── en/
│   │   │   └── zh/
│   │   └── config.ts            # schema: lang, translationKey, sector, role, stack
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   │   ├── en/
│   │   └── zh/
│   ├── styles/tokens.css        # §5 色票
│   └── i18n/
└── public/
    ├── fonts/                   # subset 後的字型
    └── manifest.webmanifest     # PWA

api/                             # 獨立私有 repo
├── src/
│   ├── ai-proxy/
│   ├── tools/
│   └── analytics/
├── schema/d1.sql
└── wrangler.toml
```

---

## 附錄:每個 Session 的開場檢查

1. 這個 session 結束後,真實世界會多存在什麼?(檔案?上線的頁面?可執行的程式?)
2. 這件事屬於 §12 Roadmap 的哪個 Sprint?若不屬於任何一項,為什麼現在做?
3. 有沒有依賴 §13 未決事項?若有,先問。
4. 有沒有觸及 §8 非協商項?若有,先列控制項清單。
