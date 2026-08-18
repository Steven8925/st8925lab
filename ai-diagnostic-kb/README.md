# AI Diagnostic Knowledge Base — 開發歷程與決策紀錄 / Development History & Decision Log

> **Project ID**: `03`
> **Display Label**: `AI DIAGNOSTIC KB`
> **Folder / Slug**: `ai-diagnostic-kb`
> **Repository**: `Steven8925/st8925lab`
> **Live URL**: `https://st8925lab.com/ai-diagnostic-kb/`
> **Created**: 2026-08-18
> **Last Updated**: 2026-08-18
> **Status**: 設計與實作完成 / Design & Implementation Complete

---

## 0. 本文件的定位 / What this document is

### 中文
本檔記錄 Project 03（AI Diagnostic Knowledge Base）的**完整開發歷程**——包含需求起源、10 輪設計訪談（Q1~Q14）的決策細節、技術選型理由、系統實作架構、數學演算法推導、以及所有交付檔案的索引。

**與其他文件的關係：**
| 文件 | 用途 | 何時看它 |
|---|---|---|
| **README.md**（本檔）| 開發歷程與決策紀錄 | 要了解「為什麼這樣設計」「當初決策的依據與討論過程」 |
| `PROMPT.md` | 現行系統唯一權威重建規格 | 要了解系統完整規格、重新建置或進行新功能擴充時 |
| `task.md` | 任務實施進度清單 | 要追蹤 P0~P7 各項工程里程碑的完成狀態 |
| `walkthrough.md` | 功能展示與測試驗證報告 | 要檢視系統功能展示、測試數據與驗證結果 |
| `implementation_plan.md` | 系統實施計畫架構圖 | 要宏觀審視系統架構與各模組依賴關係 |

### English
This document records the **complete development history and decision log** of Project 03 (AI Diagnostic Knowledge Base) — including initial requirements, 10 rounds of structured design interviews (Q1–Q14), technology rationale, system implementation architecture, mathematical derivations, and project deliverables.

---

## 1. 專案起源與痛點分析 / Project Origin & Pain Point Analysis

### 1.1 需求提出 / User Problem Statement
使用者（身兼資深設備維運工程師與資深資料分析師）提出核心願景：
> 工業物聯網（IoT）設備收集的 raw data 應透過 AI 進行時序分析以降低潛在風險。例如冰水機組之冷卻水溫經觀察在正常基準線浮動，當溫度逐漸升高或週平均持續攀升時，AI 應主動發出預警通知，並依據原廠故障排除指南（Troubleshooting Guide）、FAQ 及長年維修紀錄（Work Orders），精確指出潛在根本原因與處置方案。

### 1.2 現有系統三大缺口 / Three Major Existing Gaps
1. **只有超限閾值告警，缺乏漸進漂移預警 (Lack of Trend Drift Detection)**：傳統監控系統僅在數值突破固定上限（如水溫 > 36.5°C 或冷媒高壓 > 18.0 kg/cm²）時才響鈴。此時設備往往已嚴重結垢或面臨跳脫停機，錯失最佳維護時機。
2. **告警只報異常現象，無法指出根本原因 (Lack of Prescriptive Root Cause Diagnosis)**：現場人員收到「冷媒高壓偏高」之警報，但無法迅速判斷究竟是冷卻水塔散熱片結垢、水泵濾網堵塞、不凝結氣體混入還是冷媒充填過量。
3. **維運知識資產未結構化 (Unstructured Maintenance Knowledge)**：原廠技術手冊散落為 PDF、維修日誌散落於 Excel、資深技師經驗留存於腦中，無法被自動化 AI 模型即時檢索與推理利用。

---

## 2. 結構化設計訪談完整紀錄 / Design Interview & Decision Log

在 2026-08-18 進行了 10 輪結構化設計訪談（`/grill-me` 模式），逐項確認所有系統邊界與架構決策：

### Q1: 設備類型 / Equipment Type
- **問題**：系統監控的核心設備類型為何？
- **決策**：**工業冷卻水與冰水機組系統 (Industrial Chiller & Cooling Tower Systems)**。
- **理由**：使用者的業務核心為冰水主機（Chiller）維運服務，橫跨 8 大客戶廠區共 21 台實體機組。

### Q2: 監控子系統範圍 / Subsystem Scope
- **問題**：AI 監控涵蓋哪些子系統？
- **決策**：**全子系統整合監控**（冰水主機、冷卻塔、泵浦系統、管路系統、水處理、電氣馬達與控制系統）。
- **理由**：參考 `iot-gen2-simulator-monitor` 之 14 項 Modbus 暫存器（AAA0001~AAA0059），涵蓋溫度、壓力、功率、COP 與運行狀態。

### Q3: 知識庫現況 / Knowledge Base Status
- **問題**：原廠 troubleshooting 手冊與維修紀錄之現況？
- **決策**：**從零建立完整的結構化知識庫**，涵蓋故障決策樹、維修工單、原廠 FAQ 與零件壽命週期。

### Q4: 優先順序與 Demo 策略 / Priority & Demo Strategy
- **問題**：趨勢漂移偵測與根因診斷之優先級？
- **決策**：**兩者並重同時實施**。建立 3 個月模擬時序數據（正常期 → 漸進劣化期 → 突發故障期），使 Demo 平台具備強大說服力。

### Q5: 架構定位 / Architectural Placement
- **問題**：本專案應置於何處？
- **決策**：**獨立為 Project 03 (`ai-diagnostic-kb`)**，作為中央智慧診斷微服務，供 `iot-gen2-simulator-monitor`（資料源）與 `alarm-notification-simulator`（通知鏈）共同使用。

### Q6: 知識庫結構規範 / Knowledge Base Schema
- **決策**：結構化收錄以下 4 大知識範疇：
  1. **故障診斷決策樹 (`kb_troubleshooting`)**：症狀代碼、可能原因排序、處置步驟、所需工具與耗時。
  2. **歷史維修工單 (`kb_work_orders`)**：故障現象、根本原因、修復動作、更換料件、停機時數。
  3. **維運規範與 FAQ (`kb_faq`)**：逼近溫差計算、水質控制標準、低溫差症候群解法、冷凍機油規範。
  4. **零件壽命與保養排程 (`kb_parts_lifecycle`)**：過濾網、皮帶、軸封、感測器等預期壽命與預警門檻。

### Q7: AI 演算法與模型選型 / AI & Algorithmic Stack
- **決策**：**混合式架構 (Hybrid Architecture)**：
  - 基線計算：移動平均 (Moving Average) + 標準差 ($\sigma$)。
  - 漂移偵測：雙向 Tabular CUSUM 累積和控制圖 + 線性回歸斜率分析。
  - 根因診斷：Google Gemini 1.5/2.0 LLM + pgvector RAG 語義關聯檢索（支援 OpenAI 及本地專家引擎抽象切換）。

### Q8: 語系規範 / Language Standard
- **決策**：**繁體中文為主，關鍵技術術語附註英文**（符合台灣在地設備工程師之閱讀習慣與專業要求）。

### Q9: 全棧技術棧 / Technology Stack
- **前端**：React / Vanilla JS / Chart.js / Cyber Dark Glassmorphism 設計系統。
- **後端**：FastAPI (Python 3.11+) + Pydantic v2 + asyncpg。
- **資料庫**：PostgreSQL 16 + TimescaleDB + pgvector 擴展。

### Q10: 部署拓撲 / Deployment Topology
- **後端**：Render Web Service (`st8925lab-ai-diagnostic-kb`)。
- **前端**：Cloudflare Pages（與全站整合部屬）。

### Q11~Q14: 命名與設計授權 / Project Naming & Design
- **專案代碼**：`03`
- **顯示名稱 (Label)**：`AI DIAGNOSTIC KB`
- **目錄與 URL (Slug)**：`ai-diagnostic-kb`
- **UI 風格授權**：完全授權專業設計，以高可讀性、資訊充足、深色科技感為唯一標準。

---

## 3. 核心演算法與數學推導 / Core Algorithms & Mathematical Foundations

### 3.1 統計基線 (Statistical Baseline Profile)
對於各感測器監測點位 $x$，在指定時序視窗 $W$ 內計算均值 $\mu$ 與標準差 $\sigma$：
$$\mu = \frac{1}{N} \sum_{i=1}^{N} x_i, \quad \sigma = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (x_i - \mu)^2}$$
若偏差滿足 $Z = \frac{|x_{\text{current}} - \mu|}{\sigma} \ge 2.0$，標記為統計異動。

### 3.2 雙向 Tabular CUSUM 累積和控制圖 (Cumulative Sum Control Chart)
用以即時捕捉微弱而持續的均值漂移（例如水溫每日微升 0.05°C）：
$$S_{\text{hi}}[n] = \max(0, S_{\text{hi}}[n-1] + (x_n - \mu - k))$$
$$S_{\text{lo}}[n] = \max(0, S_{\text{lo}}[n-1] + (\mu - k - x_n))$$
其中參考值（Slack value）設為 $k = 0.5\sigma$，決策閾值設為 $h = 4.5\sigma$。當 $S_{\text{hi}} > h$ 時立即觸發漂移預警，比傳統閾值告警提前 72 小時爭取黃金處置期。

### 3.3 線性回歸趨勢斜率 (OLS Linear Regression Slope)
針對近 72 小時連續運轉點位計算最小平方法斜率：
$$\text{Slope} = \frac{\sum (t_i - \bar{t})(x_i - \bar{x})}{\sum (t_i - \bar{t})^2}, \quad R^2 = \frac{[\sum (t_i - \bar{t})(x_i - \bar{x})]^2}{\sum (t_i - \bar{t})^2 \sum (x_i - \bar{x})^2}$$
當 $\text{Slope} > 0.003$ 且 $R^2 > 0.40$ 時判定為 `gradual_increase` 漸進劣化。

---

## 4. 系統交付檔案與結構 / Project Deliverables

```
ai-diagnostic-kb/
├── index.html                    ← 整合全站 Topbar 之現代化前端入口
├── style.css                     ← Cyber Dark Glassmorphism 完整樣式表
├── app.js                        ← 前端核心控制器 (即時模擬、Chart.js、診斷聯動)
├── modules/
│   ├── fleet-data.js             ← 21 台機組資料庫、暫存器定義、時序歷史產生器
│   ├── ai-engine.js              ← 前端 AI 診斷引擎 (基線比對、CUSUM、RAG 檢索)
│   └── kb-store.js               ← 結構化知識庫 (15 故障樹、20 工單、30 FAQ、12 零件)
├── README.md                     ← 本檔：開發歷程與決策紀錄
├── PROMPT.md                     ← 系統唯一權威重建規格
├── task.md                       ← 工程里程碑任務追蹤清單
├── walkthrough.md                ← 功能成果展示與驗證報告
├── implementation_plan.md        ← 實施計畫與架構圖
└── source/
    └── backend/                  ← FastAPI Python 後端微服務
        ├── main.py               ← 應用程式主入口
        ├── config.py             ← 環境變數與 Provider 配置
        ├── requirements.txt      ← 依賴清單
        ├── Dockerfile            ← 容器化建置腳本
        ├── baseline/             ← 基線計算器、CUSUM 與漂移檢測模組
        ├── knowledge_base/       ← 知識庫管理器、Embedder 抽象層、RAG 檢索器
        ├── diagnosis/            ← LLM Provider (Gemini/OpenAI/Mock)、Prompt 模板、診斷引擎
        ├── simulator/            ← 3 個月真實物理熱力學數據產生器
        ├── routes/               ← RESTful 路由 (fleet, baseline, drift, diagnosis, kb, health)
        └── tests/                ← 單元與整合測試套件 (test_backend.py)
```

---

## 5. 驗證與測試總結 / Verification & Testing Summary

1. **後端單元與整合測試 (`test_backend.py`)**：
   - `test_baseline_calculator` — 統計基線與百分位數計算通過。
   - `test_cusum_detector` — 累積和向上偏移偵測通過。
   - `test_drift_detector` — 漸進上升漂移判別通過。
   - `test_knowledge_base_seeded` — 種子資料載入驗證通過。
   - `test_rag_retriever` — 語義相似度檢索比對通過。
   - `test_diagnostic_engine_flow` — 全流程 AI 根因診斷報告生成通過。
   - **測試結果**：`ALL 6 BACKEND TESTS PASSED`。

2. **全站一致性檢查 (`verify.py`)**：
   - 幾何角度、WCAG AAA 配色、單一資料源 `config.js` 與 URL 傳遞檢驗全數通過。
   - **檢查結果**：`ALL CHECKS PASSED / 全部檢查通過`。
