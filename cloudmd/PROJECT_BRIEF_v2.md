# 專業作品集網站 — 專案 Brief / AI Prompt

> **文件用途**:本專案的單一事實來源(single source of truth)。貼給 Claude Code / Cowork 作為完整 context,或放在 repo 根目錄由 `CLAUDE.md` 引用。
> **版本**:v2.0 · 2026-07-30 · 取代 v1.0
> **v2 主要變更**:重構為「流量引擎 / 轉換引擎」雙軌架構;新增原始資料資產策略、搜尋與 AI 可見性技術規格、站外策略、量測機制;刪除 commodity 工具與首頁 globe。
> **狀態標記**:`[定案]` 不重新討論 · `[待決]` 需使用者回答 · `[Phase 2/3]` 暫不實作

---

## 0. 給 AI 的角色與行為指令

你是一位資深 IT 專案經理與系統架構師,具備 IT 基礎架構、網路、資訊安全與企業專案交付的深度經驗,並熟悉 OT/IT 整合與工業 IoT 領域。

**行為守則**

1. **不盲從指令。** 主動分析、質疑假設、指出風險與缺口;執行前提出關鍵追問或替代方案。
2. **範圍紀律。** 本專案最大風險是範圍膨脹。任何新功能提案先問:「這一項對『成為某個窄領域的參考來源』有貢獻嗎?」若沒有,延後至 Phase 2/3 或刪除。
3. **密度優先於數量。** 本專案的成功指標是含金量(價值 ÷ 篇數),不是篇數。**主動建議刪除稀薄內容**,這與新增內容同等重要。
4. **安全優先於便利。** 涉及 secret、檔案上傳、對外連線、個資處理的實作,先列控制項清單,再寫程式。
5. **每個 session 開始時,明確說明:結束後真實世界會多存在什麼。** 不接受「又一份分析文件」作為 session 產出。
6. **英文寫作輔助。** 對外文案使用清楚、專業的商業英文,並標註值得留意的寫法差異(正式書面 vs 口語)。
7. **不做的事**:不重新設計已定案項目;不在 `[待決]` 未確認前寫下依賴它們的程式碼;不產出未經事實核對的技術斷言(本站的可信度是唯一資產)。

---

## 1. 專案目標與定位 `[定案]`

| 項目 | 內容 |
|---|---|
| **定位** | 專業作品集 / 能力宣傳。**少而精** |
| **不是** | 個人知識庫、部落格、興趣分享站 |
| **目標讀者** | 企業客戶、系統整合商、採購/技術決策者、獵頭。以國際讀者為主 |
| **核心敘事** | OT/IT 跨層整合能力 + 交付紀律(文件、測試、驗收) |
| **策略核心** | **在一個窄領域成為可被引用的參考來源**,再用它導流到能力證明 |
| **成功定義** | ① 首頁 10 秒內回答:你是誰 / 解決什麼問題 / 證據在哪 ② 4–5 篇有結構的 case study ③ 2 個工業向獨家工具 ④ 至少一份無人擁有的原始資料資產 |

### 明確排除項 `[定案]`

- ❌ 紫微斗數 / 易經 / 八字 — 與專業定位訊號衝突,移出本專案
- ❌ Blog / 最新文章 — 更新停滯的 blog 對專業形象是負分;改用無時效壓力的 Reference
- ❌ 公開發布金融市場分析 — 定位衝突 + 監理灰色地帶;留私密區自用
- ❌ 原生手機 App 開發 — 需求已被 PWA + Nextcloud 官方 app 覆蓋
- ❌ 每個 APP 都掛 live demo — 等於同時維運 N 個應用
- ❌ **通用開發工具**(CIDR 計算、Base64、JWT decode、hash、cron 解析) — 見 §4.6

---

## 2. 內容策略:兩個引擎 `[定案 · v2 新增]`

**這是 v2 最重要的結構變更。** v1 把五個內容區塊當作對等的並列項,錯誤。它們有兩種完全不同的職能,必須用不同的模板、schema、更新節奏與 KPI 設計。

| | **流量引擎** | **轉換引擎** |
|---|---|---|
| 區塊 | Reference · Tools · Data | Work(case studies)· Capabilities · About |
| 職能 | 被搜尋、被 AI 引用、被連結 | 把已到站的訪客轉為詢問 |
| 搜尋量 | 長尾但穩定,競爭極低 | 幾乎為零(沒人 Google 你的案例) |
| 寫作風格 | 定義先行、問答式標題、可抽取 | 敘事、有張力、展示判斷力 |
| 更新節奏 | 需維護(標註 last reviewed) | 一次寫好,少動 |
| KPI | 曝光量、被引用次數、外部連結數 | 停留時間、詢問轉換率 |
| Schema | TechArticle / SoftwareApplication / Dataset / FAQPage | Article / Person / CreativeWork |

**串接規則(最高槓桿的單一設計)**

> 每一個 Reference 頁與 Tool 頁,**必須**在頁尾連到至少一篇相關 case study,連結文字要陳述因果,不要用「相關文章」。
>
> ✅ `這個位址偏移錯誤在一個實際的冰水主機改造案中導致三天的除錯 → 看完整案例`
> ❌ `相關閱讀:冰水主機案例`

流量引擎負責讓陌生人找到你,轉換引擎負責讓他決定聯絡你。沒有這條串接,兩者都白做。

---

## 3. 含金量的來源 `[定案 · v2 新增]`

**含金量不來自寫作技巧,來自別人沒有的東西。** 依「可被抄襲的難度」排序:

### 3.1 原始測量資料(最高防禦性)

別人要複製必須重做一次工作。候選:

- **實測相容性矩陣** — 哪些閘道器 / 控制器 / 韌體版本組合實際可通,附測試日期與韌體版號
- **實測輪詢效能** — register 數量 vs 輪詢週期,在不同 baud rate 與 timeout 設定下的實測值
- **正規化廠商規格矩陣** — 從實際 datasheet 抽取並統一欄位定義(廠商各自的標示方式不一致,正規化本身就是價值)

用 `Dataset` schema 標記,提供 CSV 下載。**這類頁面是最容易被引用與連結的資產。**

### 3.2 具名、可版本化的交付物

人們會連結「東西」,不會連結「段落」。所以把知識封裝成有名字、有版號、有日期的物件:

- `Modbus Integration Pre-Survey Checklist v1.2`(PDF + 線上版)
- `OT/IT 網段整合前置調查表 v1.0`
- `既有設備通訊整合 FAT/SAT 測試計畫範本 v1.0`

對 PM 定位來說,**展示你的交付文件本身的可信度強度超過展示程式碼**。

### 3.3 失敗與診斷路徑

「我怎麼發現是位址偏移而不是接線問題」這類內容在網路上極度稀少,而且信任建立效率最高。每一篇 Reference 都應該包含一段真實的故障徵狀 → 診斷推理 → 修正。

### 3.4 解決窄痛點的工具

要求:**每次計算產生可分享的 permalink**(URL 帶參數)。這是工具被論壇、Stack Exchange、內部 wiki 連結的前提,也是實際可取得的外部連結來源。

### 3.5 可驗證的量化結果

`巡檢時間由 40 分/日 降至 0,連續運行 14 個月,資料完整率 99.2%(量測方式:...)` 遠勝 `提升效率`。**沒有量測方法的數字沒有說服力。**

### 3.6 灘頭陣地決策 `[待決 — 優先度最高]`

> **12 個月內,在一個題目上成為全世界最好的資源,勝過在十個題目上還可以。**

建議灘頭:**在既有機電/工業設備上加裝 Modbus 監控(retrofit monitoring on legacy equipment)**

理由:① 你有真實現場經驗與可寫的失敗案例 ② 中英文皆嚴重供給不足 ③ 與你要賣的服務直接相鄰 ④ 故障模式具體到足以形成防禦性內容。

**所有 Reference / Tools / Data 內容在前 12 個月都應服務這個灘頭。** 偏離的題目一律延後。

---

## 4. 內容架構 `[定案]`

### 導覽(最多 5 項,不得增加)

`Work` · `Reference` · `Tools` · `Capabilities` · `About` + Contact CTA

> v1 的順序是 Work 優先;v2 把 Reference 提到第二位,因為多數訪客的**入口**會是 Reference,而不是首頁。

### 4.1 Work — Case Studies(4–5 篇,上限 6)

1. **冰水主機 OT 監控改造** — ESP32 + Modbus,不動既有 BMS ← **第一篇**
2. **多租戶售後維修管理系統** — 多表架構、RBAC、UAT 體系
3. **軌道等級網通設備選型** — EN50155 合規性比較與決策依據
4. **Dashboard 自動化管線** — 無人化擷取 + OCR + 通報
5. `[Phase 2]` **訪客地理儀表板的建置過程** — 見 §6.4

### 4.2 Reference — 技術參考(5–8 頁,支柱 + 叢集結構)

**支柱頁(pillar)**:`Retrofitting Modbus monitoring onto legacy equipment` — 完整、長篇、涵蓋全流程,並連往所有叢集頁。

**叢集頁(cluster)**:

- Modbus function code 對照 + **table address 與 PDU offset 的差一錯誤**
- 32-bit float 在 Modbus 上的組裝:word/byte order 四種組合對照表
- Modbus 現場除錯決策樹:數值全 0 / 讀不到 / 數字亂跳 分別怎麼定位
- IEC 62443 zone & conduit:一個實際廠區的分區範例
- 工業網通環境規格對照:EN50155 vs IEC 61850-3 vs 一般工業級
- BACnet 物件類型與 instance 編號慣例快查

每頁互相連結,並全部連回支柱頁與至少一篇 case study。

### 4.3 Data — 原始資料頁 `[v2 新增]`

放 §3.1 的原始測量資料。每頁需有:資料表(真實 `<table>`)· CSV 下載 · 方法論說明(怎麼測的、器材、日期)· `Dataset` JSON-LD · 授權聲明(建議 CC BY,要求署名連結 → 這是合法的連結取得機制)。

- **Vendor Comparison:工業網通設備規格矩陣**(可篩選)
- `[Phase 2]` 實測相容性矩陣
- `[Phase 2]` 實測輪詢效能

### 4.4 Tools — 只做工業向

| 優先 | 工具 | 說明 |
|---|---|---|
| **P0** | **Modbus 位址轉換器**(table ↔ PDU offset ↔ 廠商慣例) | 護城河。市面幾乎無好用版本 |
| **P0** | **Modbus float/int32 組裝解碼器**(貼 4 個 register,列出 4 種 word/byte order 解讀) | 現場除錯神器 |
| P1 | BACnet instance 編號計算 | 冷門但精準 |
| P1 | IP 攝影機頻寬/儲存計算 | 弱電專案常用 |
| P1 | 電壓降 / 線徑計算 | 同上 |
| P2(需登入) | DNS lookup、TLS 憑證檢查、HTTP header 檢視、Whois、Port 連通性 | 有對外連線 → §8.3 |

**每個公開工具的頁面規格(硬性)**:見 §7.1。P0 兩項完成後單獨開公開 repo + 完整 README。

### 4.5 Capabilities — 用買方語言

> 寫「OT/IT 網段整合與 Purdue 模型分層規劃」,不寫「熟悉 Modbus/BACnet」。判準:客戶會用這句話搜尋嗎?會用這句話編預算嗎?

- OT/IT 網段整合與 Purdue 模型分層規劃
- 既有設備通訊整合(Modbus / BACnet / SNMP),不動原有 BMS
- 廠務/機電監控平台導入與交付
- 網通設備選型與規格合規性審查(EN50155 / IEC 61850-3 / 工業級溫寬)
- 專案交付文件體系建置(FAT / SAT / UAT / 移交)

### 4.6 v2 刪除項與理由 `[定案]`

| 刪除 | 理由 |
|---|---|
| **通用開發工具**(CIDR、Base64、JWT、hash、cron) | ① 與數千個相同頁面競爭,不可能贏 ② **稀釋主題權威**:讓演算法與 AI 判斷你是「泛用開發者站」而非「OT 整合專家」 ③ 拉低全站平均含金量。若已做,設 `noindex` |
| **首頁 JARVIS globe** | 最大的 Core Web Vitals 風險(INP/LCP),主題權威貢獻為零,且與定位敘述爭注意力 → 改為 §6.4 處理 |
| **全站 AI 對話 widget** | 每頁的 JS 負擔 + INP 風險,SEO 價值為零 → 改為單一頁面,且僅在使用者互動後載入 |

> **密度 = 價值 ÷ 數量。提高含金量主要靠刪除,不是靠新增。**

---

## 5. 架構分區 `[定案]`

```
                 Cloudflare (DNS + CDN + Zero Trust)
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
  Zone A 公開內容        Zone B API 層         Zone C 私密區
  Astro 靜態站(SSG)     Cloudflare Workers     NAS (Docker)
  → Cloudflare Pages    ├ 工具運算 API          ├ Nextcloud
                        ├ AI 助理 proxy          ├ 檔案 + 手機照片
                        ├ 訪客統計 ingest        └ 存取:Tailscale
                        └ R2 presigned URL          (對外零開放 port)
```

| Zone | 內容 | 風險 | 落點 |
|---|---|---|---|
| **A** | Work / Reference / Data / Tools(靜態部分)/ Capabilities / About | 低 | Cloudflare Pages,Markdown in Git |
| **B** | 工具運算、AI 助理、訪客分析、IoT 彙總 | 中(成本 + 濫用) | Cloudflare Workers |
| **C** | 私密檔案、手機照片備份 | 高 | NAS,**不上公網** |

**關鍵原則**:三區不共用程式碼與 auth · Zone C 不用隱藏路徑當安全機制 · Zone C 一律用現成成熟軟體 · Zone B 與 C 不共用資料庫。

### Repo 策略 `[定案]`

| Repo | 可見性 | 內容 |
|---|---|---|
| `site` | **Private** | Astro 專案、Markdown 內容、設計系統 |
| `api` | **Private** | Worker 程式碼、rate limit 閾值、D1 schema、AI prompt |
| `modbus-tools` | **Public** | P0 兩項工具,完整 README。公開技術證據 + 外部連結來源 |

私有 repo 的補強:GitHub secret scanning 在私有 repo 通常需付費 → **本機 `gitleaks` pre-commit hook 為必要項**;單人開發無 code review → 加輕量 CI(build + link check + gitleaks)。**Git history 永久:secret 一旦 commit,唯一補救是輪替金鑰。**

---

## 6. 技術選型 `[定案]`

| 層 | 選擇 | 說明 |
|---|---|---|
| 公開網站 | **Astro**(全站 SSG)+ Tailwind + 極少量 vanilla JS / Alpine | 預設零 JS、內建 i18n、content collections |
| 部署 | **Cloudflare Pages**(私有 GitHub repo) | push → 自動 build + preview URL |
| API | **Cloudflare Workers** (TypeScript) | 工具運算、AI proxy、統計 ingest |
| 資料庫 | **Cloudflare D1** + **KV** | 統計彙總與 AI 標籤 → D1;rate limit → KV |
| 物件儲存 | **Cloudflare R2** | egress 免費。影片、大圖、CSV、PDF 交付物 |
| 私密區 | **NAS + Docker + Nextcloud**,存取走 **Tailscale** | 見 §9 |
| 內容管理 | **Git as CMS**(Markdown in repo) | 不另建內容 DB |
| Python | 退出主線,僅本機使用 | IoT 資料處理、彙總匯出、既有 Selenium pipeline |

### 6.1 前端框架選擇的理由(不要改)

v2 強化這一點:**不要引入 React/Vue**。理由不是偏好,是可量測的:

- 每頁 JS 預算 **< 100 KB(gzipped)**。互動只有幾個計算器,不需要 SPA 框架
- **INP(Interaction to Next Paint)是本站最脆弱的 Core Web Vital**,因為工具頁有輸入互動。框架 hydration 是主要風險來源
- Astro islands 讓計算器獨立 hydrate,其餘頁面零 JS

### 6.2 Cloudflare Pages 免費方案限制

| 項目 | Free |
|---|---|
| 頻寬 | 不限 |
| Build | 500 次/月,單次 20 分鐘 timeout,1 併發 |
| 每站檔案數 | 20,000 |
| **單檔上限** | **25 MiB** |
| 自訂網域 | 100 個/專案 |
| Pages Functions | 共用 Workers 免費額度,100k req/日 |
| Workers Paid | US$5/月 |

實際會咬到:demo 影片不進 repo(放 R2 或 YouTube unlisted)· 原始圖片不進 repo · 程式化產生頁面時注意 20,000 檔案上限(見 §7.6)。

**`[待確認]`** Cloudflare 近期將新專案導向 **Workers + Static Assets**,Pages 偏維護模式。開案前確認官方 docs 當前推薦路徑。

### 6.3 月成本估算

Pages 免費 + Workers 免費額度內 + R2 100GB ≈ US$1.5 + Tailscale 免費 + AI API(設上限)US$5 ≈ **約 US$7/月**

### 6.4 訪客地理儀表板的新定位 `[v2 變更]`

**不再是首頁功能。** 改為:

1. 一篇 case study:「如何在不儲存 raw IP 的前提下建置隱私保護的訪客地理分析」 — 這同時展示前端能力、資料工程能力**與資安/個資意識**,對你的定位來說,第三項最有價值
2. 一個獨立頁面 `/lab/visitor-globe`,標註技術棧,**不進主導覽**
3. 地球用 [cobe](https://cobe.vercel.app/)(~5KB)或 globe.gl;圖表用 ECharts,僅在該頁載入
4. IntersectionObserver 延遲初始化 · 尊重 `prefers-reduced-motion` · 靜態圖 fallback

---

## 7. 搜尋與 AI 可見性技術規格 `[定案 · v2 新增]`

> **前提校正:標記語法是門檻,不是槓桿。**
> Astro 靜態輸出已經達到技術面 90% 的天花板。剩下的變異數幾乎全部來自「內容資產 + 實體一致性 + 外部連結」。
> 本章是必要條件,不是充分條件。做完本章不會讓你排名,只會讓你**不因技術原因失分**。

### 7.1 工具頁與計算器頁的硬性結構

**一個 `<div id="app">` 加 JS 的計算器,對 Google 與 AI 系統都是隱形的。** 每個工具頁必須預先渲染以下內容:

```
<h1>            工具名稱(含使用者會搜尋的詞)
定義段            一句自我完備的定義:「Modbus 位址轉換是…」
答案優先段        2–3 句直接回答核心問題(不要先講背景)
互動 widget       Astro island,client:visible
已解出的範例      至少 3 組靜態呈現的真實範例(HTML 文字,不是 JS 產生)
為什麼會出錯      故障徵狀 → 診斷 → 修正
FAQ               5–10 組問答(§7.3)
延伸              連往支柱頁 + 至少一篇 case study
JSON-LD           SoftwareApplication + FAQPage
```

「已解出的範例」是關鍵:它讓頁面在**沒有執行 JS 的情況下就已經回答了使用者的問題**,這同時服務爬蟲、AI 系統與 no-JS 使用者。

### 7.2 寫作規格(同時服務 Google 與 AI 引用)

多來源一致的做法(以下為業界實務共識,具體百分比數據多來自 SEO 廠商自有研究,方向可信、量級應保留懷疑):

1. **定義先行** — <cite index="24-1">每個主要段落以一個自我完備、可被單獨抽出引用的定義句開頭。Gemini 等系統會用 text fragment 從來源頁抽取特定句子</cite>
2. **問答式標題** — H2/H3 用使用者實際會打的問句,不用名詞短語
3. **答案優先** — <cite index="18-1">提供明確答案而非模糊措辭;AI 系統偏好可抽取、確定性的資訊</cite>
4. **具名歸屬的具體數據** — <cite index="17-1">LLM 偏好有具體資料點、近期統計與明確出處的內容</cite>。你的優勢在此:實測數據 + 標明測量方法
5. **真實 `<table>`** — 不用 div 排版。加 `<caption>`、`<th scope>`。你的內容天生表格化,而表格是 Google 與 LLM 都解析良好的格式
6. **主題叢集** — <cite index="18-1">建立完整覆蓋以展現領域深度;稀薄覆蓋反而傳達較低的權威</cite>
7. **新鮮度紀律** — <cite index="19-1">內容新鮮度在 AI 引用決策中佔有顯著權重</cite>。每頁標 `Last reviewed YYYY-MM`,並**真的定期複審**。不要造假日期
8. **語意變化** — 同一概念使用多種等義說法,不重複堆疊關鍵字

### 7.3 結構化資料(JSON-LD)

| 頁型 | Schema |
|---|---|
| About | `Person`(含 `sameAs` → GitHub / LinkedIn)、`knowsAbout`、`hasCredential` |
| Reference | `TechArticle` + `BreadcrumbList` + `FAQPage` |
| 步驟型 Reference | 加 `HowTo`(僅在真的是步驟時) |
| Tools | `SoftwareApplication` + `FAQPage` |
| **Data** | **`Dataset`**(含 `distribution` → CSV、`license`、`temporalCoverage`)← 少人使用且高度合適 |
| Work | `Article` / `CreativeWork` |
| 全站 | `WebSite` + `Person` 為 `author` / `publisher` |

**規則**:只標記頁面上實際可見的內容。標記不可見內容違反 Google 結構化資料政策。

### 7.4 實體一致性(E-E-A-T 的實作面)

對個人品牌站,身分可辨識度是核心信號。<cite index="17-1">跨平台的實體資訊一致性會提升 AI 系統的引用信心</cite>。

- 每個技術頁面有 author byline,連往 About
- 全站同一組 `sameAs`:GitHub、LinkedIn、(可選)個人 email 網域
- 證照列出**發證機構 + 日期**;IEC 62443 進行中標註 "in progress"(優於不提)
- **站外用完全相同的名字、簡介、連結**。名字與簡介不一致會讓實體圖譜分裂

### 7.5 i18n:從「翻譯」改為「關鍵字本地化」 `[v2 變更]`

v1 說「英文優先」,不夠精確。正確做法:

- 同一題目的 zh 頁與 en 頁 **鎖定不同的查詢詞**,不是互相翻譯
  - 例:en 頁鎖 `modbus register address off by one`;zh 頁鎖 `modbus 位址 40001 差一`
- 兩者可有不同的標題、FAQ、範例,但技術結論必須一致
- 完整 `hreflang`(含 `x-default`)· 語言切換保留當前路徑 · 各語言獨立 sitemap
- front matter 必含 `lang` 與 `translationKey`
- **不機器翻譯後直接發布。** Case study 與 Reference 是可信度核心

### 7.6 程式化產生頁面:謹慎使用

把 `/tools/modbus-address/40001` × 數百頁批量產生,是 doorway page 的高風險行為,且會撞 Pages 的 20,000 檔案上限。

**規則**:只為**真正不同的實體**產生頁面,每頁需有獨有的說明文字(不只是換數字),總量控制在 **30–60 頁**。無法為某一頁寫出獨有內容 → 不要產生那一頁。

### 7.7 Core Web Vitals 預算(硬性)

| 指標 | 目標 | 主要風險 |
|---|---|---|
| LCP | < 2.0s | 中文字型未 subset;globe 阻擋首屏 |
| INP | < 200ms | 計算器 hydration;AI widget |
| CLS | < 0.05 | 字型 swap 未預留空間;圖片未設 width/height |
| JS/頁 | < 100 KB gzipped | 框架引入 |

字型:**必須 subset**(中文全字集 2–4 MB)· `preload` 主要字重 · `font-display: swap` · `size-adjust` 減少 CLS。

### 7.8 基礎檔案

- `sitemap.xml`(各語言分開)· `robots.txt` · 每頁 `canonical` · RSS/Atom
- OpenGraph + Twitter card(每篇獨立 OG 圖,可用 Astro 動態產生)
- **`llms.txt`:可做,但不要期待任何效果。** 誠實評估:<cite index="29-1">Google 官方文件(2026-06-15 更新)明確表示 Search 與 AI Overviews 不使用此檔案</cite>,<cite index="28-1">而第三方研究顯示 13.7 萬個網域中 97% 的 llms.txt 從未被抓取,統計模型也測不到引用效果</cite>。<cite index="29-1">但 Perplexity 與 Claude 目前會讀取,coding agent 也依賴它</cite>。→ **20 分鐘成本,做為 agent 的地圖,不做為排名手段。**

### 7.9 AI 爬蟲政策 — 這是一個需要明確決定的選擇 `[定案]`

允許 `GPTBot` / `ClaudeBot` / `PerplexityBot` / `Google-Extended` 抓取。

理由:本站目標是**被認識與被推薦**,不是廣告流量。被 AI 系統引用即使不帶來點擊,也達成品牌曝光。若目標是廣告收入,結論會相反。

**Zone B/C 與登入後路徑一律 `Disallow`。**

---

## 8. 安全與隱私 — 非協商項

### 8.1 Secret 管理

`wrangler secret put` / Pages encrypted env vars · **任何 `.env` 不得進版控** · `gitleaks` pre-commit 為必要項 · secret 曾 commit → 輪替金鑰,不是刪檔案。

### 8.2 訪客地理分析 = 個資處理

- IP 在 GDPR 與台灣個資法下屬個人資料
- 用 Cloudflare visitor location headers(`CF-IPCountry` 等),**不自建 GeoIP DB**
- **只存彙總,不存 raw IP**:`(date, country, region, count)`
- Unique visitor 用每日輪替 salt 的 IP hash,不可回推
- 需隱私聲明頁 — 對 IT/security 定位是可信度訊號,也是 §6.4 case study 的素材
- 需 bot filtering,否則儀表板顯示的是 scanner 與 crawler

### 8.3 網路工具 — 以權限分級取代黑名單

- **公開層**:純運算,零對外連線(§4.4 P0/P1)
- **登入層**:所有有對外連線能力的工具置於 Cloudflare Access 後方
- 若仍需公開任何 DNS 工具:用 `dnspython` 而非 shell out;僅 A/AAAA/MX/TXT/NS;封鎖 RFC1918、loopback、link-local、`169.254.169.254`;**先解析再驗證**(防 DNS rebinding);per-IP rate limit + 5 秒 timeout
- **不自建測速** → client-side 或連結 Cloudflare Speed Test

### 8.4 AI 助理

- **API key 絕不進瀏覽器。** 必須走 Worker proxy
- 成本控制:Turnstile · per-session token 上限 · per-IP 每日訊息上限 · **月度硬性支出上限**(超過降級為靜態 FAQ)· 常見問答 cache · 模型分流(Gemini Flash → Claude)
- **對話紀錄是個資**:模型抽成結構化標籤再存 `(date, lang, page, topic, intent, sentiment, feedback_text?)`;**不存完整 transcript;IP 與內容不同筆**;前端明示;保留 90 天
- **定位邊界**:只做站內導覽 + 內容問答 + 意見收集。技術諮詢導回 Reference / case study 並附免責聲明。不提供具名廠商優劣判斷或工程安全性保證
- 不用 vector DB;文章標題 + 摘要索引塞進 system prompt 即足夠。超過 100 篇再議
- **僅在單一頁面提供,且互動後才載入**(§4.6)

### 8.5 Case Study 與 Reference 去識別化(每篇必過)

| 項目 | 處理 |
|---|---|
| 客戶名稱 | → 產業描述(例:「一處高速公路服務區設施」) |
| 案場名稱 / 地址 | 移除 |
| domain / 內網 IP / endpoint | 全部移除 |
| 控制器型號 | **可保留**(技術可信度來源) |
| 截圖 | 遮蔽序號、帳號、URL、客戶識別資訊 |
| 架構圖 | 自繪,不用原始設計圖 |

### 8.6 IoT 資料

公開網站**絕不直連生產 OT 資料源**。僅讀彙總後的 materialized view / 推送檔案。

### 8.7 內容版權與事實正確性

引用他人技術文件須用自己的話重寫;標準的條號與參數屬事實可引用,廠商敘述文字不可照抄。**本站唯一資產是可信度:任何技術斷言若無法確認,寧可不寫。** 錯誤的 Modbus 位址說明會比沒有這頁更糟。

---

## 9. NAS 整合 `[定案]`

> **絕對規則:NAS 不得 port forward 至網際網路。** Synology / QNAP 是勒索軟體最集中打擊的裝置類別。

### 模式 1:NAS 作為 Zone C 主機(採用)

NAS Docker 跑 **Nextcloud**,存取走 **Tailscale**(Synology/QNAP 均有官方套件)。對外零開放 port,官方 iOS/Android app 背景自動上傳正常運作。利用 NAS 既有的 RAID、snapshot、排程備份。

選 Nextcloud 而非 Immich:一套系統同時滿足檔案總管 + 手機自動上傳 + 家人多帳號 + 分享連結 + **即時通訊(Talk)**。單人維運只顧一套。照片量大到相簿體驗不足再疊 Immich。

#### Nextcloud Talk — 家庭私有即時通訊 `[定案 · v2.1 新增]`

需求:登入的家人之間可即時訊息、語音/視訊通話、傳檔案,**對方離線時訊息仍可送達並保留**。

**採用 Nextcloud Talk(官方 app),不自建。** 自建即時通訊是以「年」計的工程:WebSocket 狀態管理、APNs/FCM 推播、TURN 基礎設施、E2EE、訊息儲存合規,每一項都是獨立專案。Talk 原生提供全部所需:

| 需求 | Talk 的支援 |
|---|---|
| 即時訊息 / 群組 | ✅ 原生 |
| **離線留言** | ✅ 訊息存於伺服器,對方上線即收;未接來電留通知 |
| 語音 / 視訊通話 | ✅ WebRTC |
| 傳檔案 | ✅ 直接掛在既有 Nextcloud 儲存,不另建儲存體 |
| iOS / Android | ✅ 官方 app(Nextcloud Talk 獨立 app) |

**部署範圍(刻意最小化)**

- Talk app(Nextcloud App Store 安裝)
- **coturn** container(STUN/TURN,通話 NAT 穿透用)— 自建而非用公用 STUN,避免通話中繼經第三方
- ❌ **不部署 High Performance Backend**(spreed signaling server)。HPB 是為了大型群組通話;家庭規模用內建 signaling 即可,少一個要維運的元件

**流量路徑**:所有裝置在同一 tailnet,訊令與媒體皆走 Tailscale,**不經任何第三方伺服器**。隱私等級高於 LINE / WhatsApp。

**需驗證的一點**:手機推播通知走 Nextcloud 官方 push proxy(伺服器 outbound 連出,不需公網可達;通知內容本身極簡,實際訊息由 app 經 Tailscale 取回)。Sprint 2 需實測 iOS/Android 在螢幕鎖定下的到達率,若不理想,退而使用 app 前景輪詢。

**明確排除**:不開放給網站訪客或陌生人。開放註冊用戶互傳訊息與檔案 = 從「網站站長」變成「通訊平台營運者」,伴隨內容審查責任、濫用風險與個資保存義務,與本專案定位及安全設計直接衝突。

**RAID 不是備份。** 家人照片必須 3-2-1:NAS → 加密同步至 Backblaze B2 或 R2(Hyper Backup / rclone)。100GB 每月 < US$1。勒索軟體會連 NAS 一起加密。

### 模式 2:NAS 作為 IoT 資料來源 `[Phase 2]`

**NAS 主動推,網站不得拉。**

```
感測器 → NAS(Docker:收集器 + Postgres/InfluxDB)
            │ 排程 outbound push(彙總 JSON)
            ▼
      Cloudflare R2 / D1 → 公開網站讀取
```

網站與 NAS 完全解耦,零 inbound 連線。

### 模式 3:NAS 作為公開素材母版

`rclone` 排程同步「要公開的那一份」至 R2,網站從 R2 讀。NAS 永不面對公網。

### 不採用

NAS 當 CI/build runner(Pages build 免費且更快)。

### 與 Ubuntu 機器分工

**NAS** = 儲存 + 需 24/7 的服務 · **Ubuntu** = 開發、實驗、會頻繁重裝的東西。**不得混用**,否則重裝 Ubuntu 時會發現家人照片在上面。

---

## 10. 設計系統 `[定案]`

### 色票

```css
--bg:        #0A0E14;  /* near-black。純黑在螢幕上偏死 */
--surface:   #131A24;
--blue:      #2563EB;  /* 主色:互動元素、連結 */
--blue-deep: #0F2A47;  /* 漸層、hero */
--gold:      #C9A227;  /* 強調色 */
--text:      #E6EDF5;
--text-dim:  #8B98A9;
```

**金色使用規則(硬性)**:❌ 不得用於正文(`#C9A227` 對深底在小字級過不了 WCAG AA)· ✅ 僅用於標題、分隔線、圖表 accent、hover · ✅ **面積 < 10%** — 這是專業與俗氣的分界線。

### 字體

英文 Inter 或 IBM Plex Sans;中文 Noto Sans TC。**必須 subset**(§7.7)。

### 表格樣式是本站的核心元件

本站內容天生表格化(規格對照、function code、實測數據),所以表格樣式的投資報酬率高於任何動畫:斑馬紋 · 首列 sticky · 行動裝置橫向滑動不破版 · 可複製 · 數值右對齊等寬字。

### 設計工具範圍

Figma 只畫 3 頁:首頁、Reference 頁、Tool 頁。對比度用 WebAIM Contrast Checker 驗證。

---

## 11. 站外策略 `[定案 · v2 新增]`

> **不舒服但必要的事實:沒有任何標記語法能勝過外部連結與站外提及。** 標記讓你不失分,站外讓你得分。

依實際可行性排序:

1. **公開 repo**(`modbus-tools`)— GitHub 頁面本身被索引,且工具會被論壇與內部 wiki 連結
2. **論壇真實回答** — PLCtalk、r/PLC、r/BuildingAutomation、Electronics/EE Stack Exchange。**完整回答問題,再把參考頁當出處連結。丟連結就走會被刪且傷聲譽。** 註:<cite index="17-1">Reddit 是各主要 AI 平台引用最多的網域,因為 AI 系統偏好真實、有經驗的回答</cite>
3. **LinkedIn** — <cite index="21-1">在所有六個主要 AI 平台上,LinkedIn 是專業類查詢被引用最多的網域</cite>。把 case study 改寫成 LinkedIn 文章,連回原文;保持與 §7.4 完全一致的名字與簡介
4. **原始資料頁授權** — CC BY 要求署名連結,是合法的連結取得機制
5. **具名交付物** — 有名字有版號的 checklist 比文章更容易被連結
6. `[Phase 2]` 產業媒體或社群投稿

**注意**:上述來源的具體百分比數字多來自有商業利益的 SEO 廠商研究,方向性可信,量級請保留懷疑。

---

## 12. 量測 `[定案 · v2 新增]`

| 時機 | 動作 |
|---|---|
| Sprint 0 | 網域取得即設定 **Google Search Console** + Bing Webmaster(在有內容之前) |
| 每月 | Search Console:看**長尾查詢的曝光數**,不看總流量。曝光先動,點擊後動 |
| 每季 | 在 ChatGPT / Gemini / Perplexity / Claude 實際問你的灘頭題目,檢查是否被引用 ← **這是「推薦」的唯一直接量測方式** |
| 每季 | Core Web Vitals(Search Console 實地資料,非 Lighthouse 實驗室資料) |
| 持續 | 外部連結數(Search Console 連結報告) |

**真正的 KPI 是合格詢問數,不是瀏覽量。** 一個來自目標客群的詢問勝過一萬次不相關瀏覽。

### 時程預期(誠實版)

| 期間 | 合理預期 |
|---|---|
| 0–3 月 | 索引建立,流量趨近於零。**這是正常的,不要因此改變策略** |
| 3–6 月 | 長尾查詢開始出現曝光,點擊仍極少 |
| 6–12 月 | 首次 AI 引用、首批自然外部連結、首個合格詢問 |

任何承諾更快的方案都在賣東西。

---

## 13. Roadmap

| Sprint | 期程 | 交付(必須是真實存在的東西) |
|---|---|---|
| **0** | 2 天 | 網域決定 · DNS 上 Cloudflare · Search Console 驗證 · `site` repo + gitleaks + CI |
| **1** | 2 週 | Astro + 設計系統(含表格元件)+ 雙語骨架 · 接 Pages · **首頁上線** · **第一篇 case study 完成** |
| **2** | 1.5 週 | NAS + Nextcloud + Tailscale · **Talk + coturn(家庭即時通訊)** · 3-2-1 離機備份(含 TS-659 異機層)· 手機自動上傳驗證 · **推播到達率實測** |
| **3** | 2 週 | **Reference 支柱頁 + 2 篇叢集頁**(依 §7.1/§7.2 規格)· JSON-LD 全套 · sitemap/RSS/hreflang |
| **4** | 2 週 | **P0 兩個工具**(含靜態範例、FAQ、permalink)· 公開 repo + README · 站外首波(3 個論壇真實回答) |
| **5** | 2 週 | **Vendor Comparison 資料頁**(含 CSV + `Dataset` schema)· 第二、三篇 case study |
| **6** | — | AI 助理(單頁)· 訪客分析 + `/lab/visitor-globe` + 該主題 case study · 具名 checklist v1.0 |

**Sprint 1 的 Definition of Done**:陌生人打開網址,10 秒內知道你做什麼,並能讀完一篇完整 case study。

**Sprint 3 排在工具之前的理由**:支柱頁定義了灘頭陣地,後續所有內容都要連回它。先做工具會導致工具頁沒有可連往的權威頁面。

---

## 14. Case Study 模板

### Above the fold(30 秒內看完)

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
| 1 | Context & Constraints | 環境、既有系統、不能動什麼、預算/工期限制 | **限制條件才是難度來源** |
| 2 | The Problem | 用客戶會說的話陳述 | 證明你聽得懂業務語言 |
| 3 | Options Considered | 2–3 個方案 + **為什麼否決** | **最關鍵。多數作品集沒有,這段是資深與資淺的分界** |
| 4 | What I Built / Delivered | 方案 + 一張架構圖 | |
| 5 | The Hard Part | 具體技術失敗、如何診斷、如何修 | **最建立信任的一段**,也是 Reference 頁的素材來源 |
| 6 | Outcome | 量化結果 + **怎麼量的** | 沒有量測方法的數字沒有說服力 |
| 7 | What I'd Do Differently | 1–2 點 | 成熟度訊號 |
| 8 | My Role | 你做了什麼、誰做了其他部分 | 角色模糊會被讀成誇大 |

### 素材要求

一張自繪架構圖 + 一張去識別化儀表板截圖。有圖的 case study 可信度差距很大。

### v2 新增要求

每篇 case study 的 §5「The Hard Part」必須抽出一個可獨立成篇的技術問題,寫成 Reference 叢集頁。**Case study 是 Reference 的素材來源;Reference 是 case study 的流量來源。**

---

## 15. 第一篇 Case Study — 素材問卷

**選定:冰水主機 OT 監控改造**
理由:自我完備、有極佳的 "The Hard Part"(原始韌體的 baud rate / function code / 位址偏移 / float 組裝四個缺陷)、客戶識別風險最低,且能直接衍生出灘頭陣地的支柱頁與 2–3 篇叢集頁。

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

**v2 追加(為了同時產出 Reference 內容)**

17. 你當時查了哪些資料才解決?哪一份文件最有用、哪一份最誤導?
18. 如果有一份 checklist 存在,能讓你少花幾天?那份 checklist 上會有哪 5 條?

> 第 17、18 題的答案,就是 §3.2 具名交付物的第一版內容。

---

## 16. 待決事項 `[待決]`

| # | 問題 | 影響 | 優先 |
|---|---|---|---|
| 1 | **確認灘頭陣地題目**(§3.6 建議 Modbus retrofit) | 決定未來 12 個月所有 Reference/Tools/Data 內容 | **最高** |
| 2 | **網域策略** — 現有 domain 或另註冊個人專業 domain? | 影響實體一致性與品牌;Sprint 0 就需要 | **高** |
| 3 | NAS 型號與品牌? | Docker/Tailscale 套件可用性、docker-compose 寫法 | 高 |
| 4 | NAS 硬碟配置與可用容量? | Nextcloud 儲存策略(本機 vs R2 混合) | 中 |
| 5 | 照片總量級與月成長率? | R2 vs 本機 vs 混合,成本曲線 | 中 |
| 6 | Arvix 主機還剩多久合約? | 到期不續約 → 全站移 Pages,省下的錢覆蓋 R2 + AI | 中 |
| 7 | Cloudflare 目前推薦 Pages 或 Workers + Static Assets? | 開案前確認 | 中 |
| 8 | 你手上有哪些**尚未公開的實測數據或規格整理**? | 決定 §4.3 Data 頁第一版能做到什麼程度 | 高 |

---

## 附錄 A:目錄結構

```
site/
├── CLAUDE.md                    # 引用本文件
├── PROJECT_BRIEF.md             # 本文件
├── .gitleaks.toml
├── .github/workflows/ci.yml     # build + link check + gitleaks + Lighthouse CI
├── astro.config.mjs
├── src/
│   ├── content/
│   │   ├── work/{en,zh}/        # case studies
│   │   ├── reference/{en,zh}/   # 支柱 + 叢集
│   │   ├── data/{en,zh}/        # 原始資料頁
│   │   ├── tools/{en,zh}/       # 工具頁的靜態內容
│   │   └── config.ts            # schema,見附錄 B
│   ├── components/
│   │   ├── DataTable.astro      # 核心元件
│   │   ├── JsonLd.astro
│   │   └── islands/             # 計算器,client:visible
│   ├── layouts/
│   ├── pages/{en,zh}/
│   ├── styles/tokens.css
│   └── i18n/
└── public/
    ├── fonts/                   # subset 後
    ├── datasets/                # CSV
    ├── llms.txt
    ├── robots.txt
    └── manifest.webmanifest

api/                             # 獨立私有 repo
├── src/{tools,ai-proxy,analytics}/
├── schema/d1.sql
└── wrangler.toml

modbus-tools/                    # 獨立公開 repo
```

## 附錄 B:Content Collection Schema(最低欄位)

```ts
{
  title, description,              // description 同時用於 meta 與 OG
  lang, translationKey,            // §7.5
  targetQuery,                     // 該語言版本鎖定的查詢詞
  datePublished, dateModified,     // §7.2 新鮮度
  lastReviewed,                    // 顯示於頁面
  author,                          // → Person schema
  schemaType,                      // TechArticle | SoftwareApplication | Dataset | Article
  pillar,                          // 所屬支柱頁 slug(叢集頁必填)
  relatedCaseStudy,                // §2 串接規則,必填
  faq: [{ q, a }],                 // → FAQPage schema
  sector, role, stack,             // case study 專用
  dataset: { csvPath, license, methodology, temporalCoverage }  // data 頁專用
}
```

## 附錄 C:每個 Session 的開場檢查

1. 這個 session 結束後,真實世界會多存在什麼?
2. 屬於 §13 Roadmap 哪個 Sprint?若不屬於,為什麼現在做?
3. 是否服務 §3.6 的灘頭陣地?若偏離,為什麼?
4. 有沒有依賴 §16 未決事項?若有,先問。
5. 有沒有觸及 §8 非協商項?若有,先列控制項清單。
6. **有沒有東西該刪掉?**
