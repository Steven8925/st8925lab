# PROMPT.md — 系統重建、開發規格與 VPS 生產部署指引 / System Specification & VPS Deployment Guide

> **專案名稱 Project Name:** AI Diagnostic Knowledge Base — 工業冷卻水與冰水機組智慧診斷與知識庫平台
> **專案代碼 Project ID:** `03`
> **顯示名稱 Label:** `AI DIAGNOSTIC KB`
> **資料夾目錄 Slug:** `ai-diagnostic-kb`
> **版本 Version:** v1.0 權威完整版 / Authoritative Specification v1.0, 2026-08-18
> **狀態 Status:** 實作完成 / Implemented & Verified; VPS 藍圖就緒 / VPS Blueprint Ready

---

## 0. 本文件的定位 / What this document is

### 中文
**本文件為 Project 03 的唯一權威規格書。** 任何 AI Agent 或開發工程師僅需研讀本檔案，即可完整重建出等價且功能完備的工業 AI 智慧診斷與知識庫系統，並能在日後依循本規格將系統順利部署至 VPS 生產環境。

本文件詳細規範了：
1. 系統架構與業務定位
2. 全棧技術架構與抽象層設計
3. 7 張 PostgreSQL 16 + pgvector 資料表完整 DDL
4. 17 個 RESTful API 端點協議與資料交換格式 (DTO)
5. 統計基線、雙向 Tabular CUSUM 與線性回歸斜率之數學公式
6. 工業熱力學 Prompt Engineering 模板
7. 知識庫種子資料庫規範 (15 故障樹、20 工單、30 FAQ、12 零件壽命)
8. 前端 4 大互動式視圖規格
9. **★ VPS 生產環境部署與運維規格 (VPS Production Deployment Specification)**
10. 全站整合規則與 Invariants

> 開發決策歷史與訪談紀錄請參閱 [`README.md`](./README.md)。
> 功能展示報告請參閱 [`walkthrough.md`](./walkthrough.md)。
> 任務進度清單請參閱 [`task.md`](./task.md)。

### English
**This document serves as the sole authoritative specification for Project 03.** An AI agent or engineer reading only this document possesses all the necessary architectural, algorithmic, database, interface contracts, and **VPS Production Deployment Guides** required to reconstruct and operate the complete system.

---

## 1. 系統架構與業務定位 / System Architecture & Positioning

### 1.1 業務痛點與定位 / Business Context
在工業冷凍空調（HVAC/R）與冷卻水系統維運中，傳統物聯網監控面臨：
- **只有超限閾值告警**（如水溫 > 36.5°C），無法在水溫每天微升 0.05°C 時及早發現散熱片結垢或冷媒慢漏。
- **告警只報異常現象**，無法指出根本原因，依賴資深技師到場排查。
- **維運經驗未結構化**，原廠 PDF 手冊與歷史維修紀錄無法被 AI 利用。

**AI Diagnostic Knowledge Base** 作為中央智慧腦，串聯 `iot-gen2-simulator-monitor`（數據源）與 `alarm-notification-simulator`（通知鏈）：

```
┌────────────────────────────────┐     ┌────────────────────────────────┐     ┌────────────────────────────────┐
│  iot-gen2-simulator-monitor    │     │   ai-diagnostic-kb (Project 03)│     │  alarm-notification-simulator  │
│  (Project 02)                  │     │   [中央智慧診斷微服務]         │     │  (Project 01)                  │
│                                │     │                                │     │                                │
│  • 21 台機組 Modbus 遙測       │────▶│  • 統計基線 (Moving Avg/Std)   │────▶│  • 告警通知分發帳本            │
│  • TimescaleDB 時序儲存        │     │  • 雙向 Tabular CUSUM 漂移偵測 │     │  • 附帶 AI 診斷與處置步驟      │
│  • 原始 sensor_data (14暫存器) │     │  • RAG 語義檢索 & 故障決策樹   │     │  • LINE / FCM / 手機模擬       │
│                                │     │  • Gemini LLM 智慧根因診斷     │     │                                │
└────────────────────────────────┘     └────────────────────────────────┘     └────────────────────────────────┘
```

---

## 2. 全棧技術架構 / Full-Stack Technology Stack

| 層級 Layer | 技術選型 Technology | 版本 Version | 說明 Description |
|---|---|---|---|
| **後端框架 Backend** | FastAPI (Python) | ≥ 0.110.0 | 高效非同步 API，支援自動 OpenAPI 文件生成 |
| **資料驗證 Validation** | Pydantic v2 | ≥ 2.6.0 | 強型別 Request / Response DTO 定義 |
| **資料庫 Database** | PostgreSQL + pgvector + TimescaleDB | PG ≥ 15 | 與 iot-gen2 共用實例，支援時序超表與 768 維向量檢索 |
| **資料庫驅動 Driver** | asyncpg | ≥ 0.29.0 | 高效能非同步 PostgreSQL 連接池 |
| **數理演算法 Math** | NumPy / SciPy / Pure Python fallback | — | 支援移動平均、百分位數、OLS 線性回歸、CUSUM 控制圖 |
| **LLM 診斷模型** | Google Gemini (預設 1.5 Flash) | — | 抽象 Provider 支援 OpenAI GPT-4o 及本地專家引擎 |
| **向量嵌入 Embedding** | Google `text-embedding-004` (768維) | — | 抽象 Provider 支援 OpenAI `text-embedding-3-small` |
| **前端設計 Frontend** | Vanilla JS / Chart.js 4 / CSS3 | — | Cyber Dark Glassmorphism 設計系統，無外部框架重負擔 |
| **全站整合 Integration** | ST8925 LAB 統一 Topbar / `config.js` | — | 單一資料源，支援動態色相傳遞與 WCAG AAA 配色 |

---

## 3. 資料庫 Schema DDL / Database Schema Specification

以下 7 張核心資料表與 pgvector 擴展定義於 `04_ai_diagnostic_kb.sql`：

```sql
-- 1. 啟用 pgvector 擴展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 設備與型號統計基線表 (Baseline Profiles)
CREATE TABLE IF NOT EXISTS baseline_profiles (
    id              SERIAL PRIMARY KEY,
    machine_id      INT NULL REFERENCES machines(id) ON DELETE CASCADE,
    model           VARCHAR(60) NULL,
    field_code      VARCHAR(20) NOT NULL,            -- e.g. 'AAA0028', 'AAA0030', 'AAA0036', 'AAA0045'
    period_type     VARCHAR(20) NOT NULL,            -- 'weekly' | 'monthly' | 'quarterly'
    avg_value       NUMERIC(10,3) NOT NULL,
    std_value       NUMERIC(10,3) NOT NULL,
    min_value       NUMERIC(10,3) NULL,
    max_value       NUMERIC(10,3) NULL,
    sample_count    INT NOT NULL,
    calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_from      TIMESTAMPTZ NULL,
    valid_to        TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_bp_machine_field ON baseline_profiles (machine_id, field_code, period_type);

-- 3. 漂移與趨勢事件表 (Drift Events)
CREATE TABLE IF NOT EXISTS drift_events (
    id              BIGSERIAL PRIMARY KEY,
    machine_id      INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    field_code      VARCHAR(20) NOT NULL,
    drift_type      VARCHAR(30) NOT NULL,            -- 'gradual_increase' | 'gradual_decrease' | 'sudden_shift' | 'cusum_alert'
    baseline_value  NUMERIC(10,3) NOT NULL,
    current_value   NUMERIC(10,3) NOT NULL,
    deviation_pct   NUMERIC(6,2) NOT NULL,
    severity        VARCHAR(20) NOT NULL DEFAULT 'warning', -- 'info' | 'warning' | 'critical'
    trend_slope     NUMERIC(10,6) NULL,
    trend_r_squared NUMERIC(5,4) NULL,
    cusum_value     NUMERIC(10,3) NULL,
    sensor_snapshot JSONB NULL,
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_resolved     BOOLEAN DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ NULL,
    resolution_note TEXT NULL
);
CREATE INDEX IF NOT EXISTS idx_drift_machine_time ON drift_events (machine_id, detected_at DESC);

-- 4. 故障診斷決策樹知識庫 (Troubleshooting Knowledge Base)
CREATE TABLE IF NOT EXISTS kb_troubleshooting (
    id                  SERIAL PRIMARY KEY,
    symptom_code        VARCHAR(64) NOT NULL UNIQUE,
    symptom_desc        TEXT NOT NULL,
    possible_causes     JSONB NOT NULL,              -- [{rank, cause, probability, evidence_pattern}]
    recommended_actions JSONB NOT NULL,              -- [{step, action, tools_needed, estimated_time, difficulty}]
    applicable_models   TEXT[] NULL,
    severity            VARCHAR(20) NOT NULL DEFAULT 'medium',
    category            VARCHAR(40) NOT NULL,        -- 'thermal' | 'pressure' | 'electrical' | 'mechanical' | 'water_flow' | 'refrigerant'
    related_alarm_codes TEXT[] NULL,
    tags                TEXT[] NULL,
    embedding           vector(768) NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 維修工單歷史紀錄知識庫 (Work Orders Knowledge Base)
CREATE TABLE IF NOT EXISTS kb_work_orders (
    id                SERIAL PRIMARY KEY,
    machine_id        INT NULL REFERENCES machines(id) ON DELETE SET NULL,
    work_order_no     VARCHAR(30) UNIQUE NOT NULL,
    fault_phenomenon  TEXT NOT NULL,
    root_cause        TEXT NULL,
    repair_actions    TEXT NOT NULL,
    parts_replaced    JSONB NULL,                    -- [{part_name, part_no, qty, cost}]
    labor_hours       NUMERIC(5,1) NULL,
    downtime_hours    NUMERIC(5,1) NULL,
    technician_name   VARCHAR(60) NULL,
    repair_date       DATE NOT NULL,
    alarm_codes       TEXT[] NULL,
    symptom_codes     TEXT[] NULL,
    effectiveness     VARCHAR(20) DEFAULT 'resolved',
    notes             TEXT NULL,
    embedding         vector(768) NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 原廠與維運 FAQ 問答知識庫 (FAQ Knowledge Base)
CREATE TABLE IF NOT EXISTS kb_faq (
    id                SERIAL PRIMARY KEY,
    question          TEXT NOT NULL,
    answer            TEXT NOT NULL,
    category          VARCHAR(40) NOT NULL,
    applicable_models TEXT[] NULL,
    source            VARCHAR(100) NOT NULL DEFAULT 'field_experience',
    tags              TEXT[] NULL,
    embedding         vector(768) NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 耗材與零件壽命週期管理 (Parts Lifecycle Management)
CREATE TABLE IF NOT EXISTS kb_parts_lifecycle (
    id                      SERIAL PRIMARY KEY,
    part_name               VARCHAR(100) NOT NULL,
    part_category           VARCHAR(40) NOT NULL,     -- 'filter' | 'bearing' | 'belt' | 'valve' | 'sensor' | 'oil' | 'gasket' | 'motor'
    expected_life_hours     INT NOT NULL,
    warning_threshold_hours INT NOT NULL,
    expected_life_years     NUMERIC(4,1) NULL,
    applicable_models       TEXT[] NULL,
    pm_interval_desc        TEXT NULL,
    replacement_procedure   TEXT NULL,
    estimated_cost_range    VARCHAR(60) NULL,
    failure_symptoms        TEXT[] NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AI 診斷報告歷史表 (Diagnostic Reports)
CREATE TABLE IF NOT EXISTS diagnostic_reports (
    id                  BIGSERIAL PRIMARY KEY,
    machine_id          INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    report_type         VARCHAR(30) NOT NULL,        -- 'drift_analysis' | 'anomaly_diagnosis' | 'periodic_health' | 'manual_request'
    trigger_event_id    BIGINT NULL,
    trigger_source      VARCHAR(30) NULL,
    diagnosis_summary   TEXT NOT NULL,
    possible_causes     JSONB NOT NULL,
    recommended_actions JSONB NOT NULL,
    further_checks      JSONB NULL,
    risk_assessment     JSONB NULL,
    confidence_score    NUMERIC(4,2) NULL,
    llm_model_used      VARCHAR(60) NULL,
    llm_tokens_used     INT NULL,
    rag_context_used    JSONB NULL,
    sensor_snapshot     JSONB NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dr_machine_time ON diagnostic_reports (machine_id, created_at DESC);
```

---

## 4. 核心數學演算法與漂移判定準則 / Mathematical Foundations

### 4.1 雙向 Tabular CUSUM 累積和控制圖 (Cumulative Sum Control Chart)
用於在統計雜訊中捕捉持續性的微小均值漂移（例如水溫每日微升 0.05°C）：
$$S_{\text{hi}}[n] = \max(0, S_{\text{hi}}[n-1] + (x_n - \mu - k))$$
$$S_{\text{lo}}[n] = \max(0, S_{\text{lo}}[n-1] + (\mu - k - x_n))$$
- 參考基準值（Slack constant）: $k = 0.5 \sigma$
- 決策閾值（Decision interval）: $h = 4.5 \sigma$
- 觸發條件：若 $S_{\text{hi}}[n] > h$ 判定為 `upward_shift`；若 $S_{\text{lo}}[n] > h$ 判定為 `downward_shift`。

### 4.2 最小平方法線性回歸斜率 (OLS Linear Regression Slope)
在近 72 小時連續運轉時序視窗中計算趨勢斜率與判定係數 $R^2$：
$$\text{Slope} = \frac{\sum (t_i - \bar{t})(x_i - \bar{x})}{\sum (t_i - \bar{t})^2}, \quad R^2 = \frac{[\sum (t_i - \bar{t})(x_i - \bar{x})]^2}{\sum (t_i - \bar{t})^2 \sum (x_i - \bar{x})^2}$$
- 漸進上升判定：$\text{Slope} > 0.003$ 且 $R^2 > 0.40$ 且 $Z \ge 1.4\sigma$。
- 漸進下降判定：$\text{Slope} < -0.003$ 且 $R^2 > 0.40$ 且 $Z \ge 1.4\sigma$。

---

## 5. RESTful API 路由合約 / RESTful API Contracts

後端微服務對外開放以下端點（前綴 `/api`）：

| 端點 Endpoint | 方法 | 說明 Description |
|---|---|---|
| `/health` | GET | 微服務健康檢查，回傳 DB 連接狀態與 LLM Provider 資訊 |
| `/api/fleet/overview` | GET | 21 台機組全機隊健康總覽、健康評分（0~100）與 7 天 Sparkline 數列 |
| `/api/baseline/{machine_id}` | GET | 取得指定機組各 Modbus 暫存器之統計基線（均值、標準差、百分位數） |
| `/api/baseline/recalculate` | POST | 觸發重新計算機組歷史基線 |
| `/api/drift/{machine_id}` | GET | 取得指定機組的未解決漂移事件清單 |
| `/api/drift/check` | POST | 輸入即時感測器快照，執行多維度漂移檢測 |
| `/api/diagnosis` | POST | 觸發 Gemini RAG AI 根因診斷，產生結構化處置報告 |
| `/api/diagnosis/{report_id}` | GET | 取得特定診斷報告詳情 |
| `/api/diagnosis/history/{machine_id}` | GET | 取得指定機組歷史診斷紀錄 |
| `/api/diagnosis/for-alarm/{alarm_id}` | GET | 專供 `alarm-notification-simulator` 調用之告警診斷富化介面 |
| `/api/health-report/{machine_id}` | GET | 單機綜合健康報告（基線對比表、活躍漂移、近期工單、零件壽命預警） |
| `/api/kb/troubleshooting` | GET/POST | 故障診斷決策樹 CRUD |
| `/api/kb/work-orders` | GET/POST | 維修工單紀錄 CRUD |
| `/api/kb/faq` | GET/POST | 原廠與現場 FAQ CRUD |
| `/api/kb/parts-lifecycle` | GET | 耗材零件壽命週期與保養排程清單 |
| `/api/kb/search` | POST | 跨知識庫向量語義相似度檢索（RAG Retrieval） |

---

## 6. Prompt Engineering 模板規範 / Prompt Templates

### 6.1 系統提示詞 (System Prompt)
```
你是一位擁有 20 年豐富現場經驗的工業冷凍空調與冷卻水系統資深維護工程師 (Senior HVAC/R Diagnostics Specialist)。
你的職責是根據 IoT 感測器數據分析、基線偏差統計、以及從維修知識庫檢索出來的相關資料，精準診斷設備異常原因並給出具體可行的處置行動方案。

## 專業指導原則
1. 恪守熱力學 (Thermodynamics) 物理連鎖因果關係：例如冷凝出水溫度上升必定牽動冷媒高壓上升；蒸發溫差過小伴隨功耗高代表旁通洩漏。
2. 診斷說明以繁體中文撰寫，關鍵專業術語附註英文。
3. 必須嚴格輸出標準 JSON 格式，包含 diagnosis_summary, possible_causes, recommended_actions, further_checks, risk_assessment, confidence_score。
```

### 6.2 診斷輸出 JSON Schema
```json
{
  "diagnosis_summary": "200字以內之繁體中文診斷總結",
  "possible_causes": [
    {
      "rank": 1,
      "cause": "根本原因名稱 (附英文名)",
      "probability": "高 (65%)",
      "reasoning": "判斷依據與熱力學特徵"
    }
  ],
  "recommended_actions": [
    {
      "priority": 1,
      "action": "具體處置步驟說明",
      "tools_needed": "所需檢修工具",
      "estimated_time": "預估耗時",
      "urgency": "immediate | soon | scheduled"
    }
  ],
  "further_checks": [
    {
      "check": "需進一步量測項目",
      "purpose": "排查目的"
    }
  ],
  "risk_assessment": {
    "current_risk": "low | medium | high | critical",
    "if_unresolved": "未處置之惡化後果預估",
    "estimated_escalation_time": "預估惡化時限"
  },
  "confidence_score": 0.92
}
```

---

## 7. 前端視圖架構 / Frontend View Specification

前端採用現代 Cyber Dark Glassmorphism 設計系統，提供 4 大互動視圖：

1. **全機隊健康總覽 (`view-dashboard`)**：
   - 21 台機組網格卡片（0~100 健康分數、即時 7 天 Sparkline 折線圖、燈號狀態）。
   - 故障注入 Demo 按鈕（一鍵注入「水塔散熱片結垢」或「冷媒慢漏」）。
2. **單機深度診斷 (`view-diagnosis`)**：
   - 左側側邊欄機組切換選單。
   - 8 項 Modbus 監測點位 vs 30 天統計基線（Mean ± 1σ）對比儀表板與進度條。
   - Gemini RAG AI 診斷報告區塊（含根本原因排行、行動步驟、惡化預警）。
   - 近 72 小時連續運轉趨勢 Chart.js 雙 Y 軸曲線圖。
3. **多維趨勢與 CUSUM 控制圖 (`view-trends`)**：
   - 雙向 Tabular CUSUM 累積和折線圖與決策閾值 $h = 4.5\sigma$ 警示線。
   - 視覺化證明 CUSUM 如何比傳統閾值告警**提前 72 小時**發出預警。
4. **知識庫檢索瀏覽 (`view-knowledge`)**：
   - 自然語言即時語義檢索輸入框。
   - 分類切換：故障決策樹（15條）、維修工單（20筆）、FAQ（30條）、零件壽命（12項）。

---

## 8. VPS 生產環境部署與維運規格 / VPS Production Deployment Specification

### 8.1 Docker 容器規格
- **Base Image**: `python:3.11-slim`
- **Exposed Port**: `8000`
- **Resource Limits**: 建議 CPU: 1.0 core, Memory: 1024MB

### 8.2 Docker Compose 片段
```yaml
ai-diagnostic-kb:
  build:
    context: ./ai-diagnostic-kb/source/backend
    dockerfile: Dockerfile
  container_name: st8925-ai-diagnostic-kb
  restart: always
  environment:
    - PORT=8000
    - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/iot_gen2
    - LLM_PROVIDER=gemini
    - GEMINI_API_KEY=${GEMINI_API_KEY}
    - GEMINI_MODEL=gemini-1.5-flash
    - EMBEDDING_PROVIDER=gemini
  ports:
    - "127.0.0.1:8000:8000"
  depends_on:
    - postgres
```

### 8.3 部署驗證指令
```bash
# 1. 執行 DDL
psql -h localhost -U postgres -d iot_gen2 -f iot-gen2-simulator-monitor/vps/db/04_ai_diagnostic_kb.sql

# 2. 啟動容器
docker compose up -d ai-diagnostic-kb

# 3. 驗證健康狀態
curl -s http://127.0.0.1:8000/health | jq .
```

---

## 9. Invariants 與全站規範 / Rules & Invariants

1. **`MY_ID` 宣告**：前端 `index.html` 內必須明確宣告 `const MY_ID = '03';`。
2. **單一資料源**：必須引用全站共用之 `../config.js` 與 `../shared/wordmark.js`。
3. **WCAG AAA 配色**：所有文字與背景對比度必須 $\ge 7.26$。
4. **獨立驗證**：任何修改完成後，必須執行 `python verify.py` 確認全站幾何與資料結構完全合規。
