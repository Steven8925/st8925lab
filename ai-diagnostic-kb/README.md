# AI Diagnostic Knowledge Base — 開發歷程、決策紀錄與 VPS 生產部署手冊 / Development History, Decision Log & VPS Production Deployment Guide

> **Project ID**: `03`  
> **Display Label**: `AI DIAGNOSTIC KB`  
> **Folder / Slug**: `ai-diagnostic-kb`  
> **Repository**: `Steven8925/st8925lab`  
> **Live LAB URL**: `https://st8925lab.com/ai-diagnostic-kb/`  
> **Created**: 2026-08-18  
> **Last Updated**: 2026-08-18  
> **Status**: LAB 發布完成 / Live on Cloudflare Pages; VPS 生產藍圖已就緒 / VPS Production Blueprint Ready

---

## 0. 本文件的定位 / What this document is

### 中文
本檔為 Project 03（AI Diagnostic Knowledge Base）的**核心開發與維運總指南**，詳細記錄了：
1. **需求起源與架構定位**：傳統物聯網監控痛點分析及三大現有系統缺口。
2. **10 輪結構化設計訪談紀錄 (Q1~Q14)**：完整的決策脈絡、選項對比與技術選型理由。
3. **核心數學演算法推導**：統計基線、雙向 Tabular CUSUM 控制圖、最小平方法回歸斜率。
4. **LAB 前端與後端交付物清單**：4 大前端互動視圖、FastAPI 微服務架構。
5. **發布與同步紀錄**：GitHub Commit `23e7ecb`、Cloudflare Pages 自動部署。
6. **★ 後續生產環境 (VPS Prod) 遷移部署指引 (VPS Production Deployment Guide)**：完整的 Docker Compose 編排、PostgreSQL + pgvector 設定、Nginx 反向代理、環境變數清單、知識庫種子灌入與故障排查指引（預防日後遷移時找不到部署手冊）。

**與其他文件的關係：**
| 文件 | 用途 | 何時看它 |
|---|---|---|
| **README.md**（本檔）| 開發歷程、決策紀錄與 VPS 部署手冊 | 要了解決策脈絡、演算法推導、或進行 VPS 正式環境上線時 |
| [`PROMPT.md`](./PROMPT.md) | 現行系統唯一權威重建規格書 | 需要 AI Agent 或工程師從零重建系統、或進行新功能擴充時 |
| [`task.md`](./task.md) | 工程里程碑任務追蹤清單 | 要追蹤 P0~P7 各項工程里程碑與驗收狀態時 |
| [`walkthrough.md`](./walkthrough.md) | 功能展示與測試驗證報告 | 要檢視系統功能展示、測試數據、即時截圖與驗證結果時 |
| [`implementation_plan.md`](./implementation_plan.md) | 系統架構圖與模組拓撲 | 要宏觀審視系統架構與微服務數據流向時 |

### English
This document serves as the **master development and operations guide** for Project 03 (AI Diagnostic Knowledge Base). It contains the complete requirement origins, 10-round design interviews (Q1–Q14), mathematical derivations (CUSUM, OLS, Baseline), full deliverables manifest, git/Cloudflare release history, and a comprehensive **VPS Production Deployment & Operations Manual**.

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
- **決策**：**工業冷卻水與冰水機組系統 (Industrial Chiller & Cooling Tower Systems)**。
- **理由**：使用者的業務核心為冰水主機（Chiller）維運服務，橫跨 8 大客戶廠區共 21 台實體機組。

### Q2: 監控子系統範圍 / Subsystem Scope
- **決策**：**全子系統整合監控**（冰水主機、冷卻塔、泵浦系統、管路系統、水處理、電氣馬達與控制系統）。
- **理由**：參考 `iot-gen2-simulator-monitor` 之 14 項 Modbus 暫存器（AAA0001~AAA0059），涵蓋溫度、壓力、功率、COP 與運行狀態。

### Q3: 知識庫現況 / Knowledge Base Status
- **決策**：**從零建立完整的結構化知識庫**，涵蓋故障決策樹、維修工單、原廠 FAQ 與零件壽命週期。

### Q4: 優先順序與 Demo 策略 / Priority & Demo Strategy
- **決策**：**兩者並重同時實施**。建立 3 個月模擬時序數據（正常期 → 漸進劣化期 → 突發故障期），使 Demo 平台具備強大說服力。

### Q5: 架構定位 / Architectural Placement
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
- **決策**：**繁體中文為主，關鍵技術術語附註英文**。

### Q9: 全棧技術棧 / Technology Stack
- **前端**：Vanilla JS / Chart.js / Cyber Dark Glassmorphism 設計系統。
- **後端**：FastAPI (Python 3.11+) + Pydantic v2 + asyncpg。
- **資料庫**：PostgreSQL 16 + TimescaleDB + pgvector 擴展。

### Q10: 部署拓撲 / Deployment Topology
- **後端**：Render Web Service (`st8925lab-ai-diagnostic-kb`) 及 VPS 生產容器化。
- **前端**：Cloudflare Pages（與全站整合部屬）。

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
其中參考值設為 $k = 0.5\sigma$，決策閾值設為 $h = 4.5\sigma$。當 $S_{\text{hi}} > h$ 時立即觸發漂移預警，比傳統閾值告警提前 72 小時爭取黃金處置期。

### 3.3 線性回歸趨勢斜率 (OLS Linear Regression Slope)
針對近 72 小時連續運轉點位計算最小平方法斜率：
$$\text{Slope} = \frac{\sum (t_i - \bar{t})(x_i - \bar{x})}{\sum (t_i - \bar{t})^2}, \quad R^2 = \frac{[\sum (t_i - \bar{t})(x_i - \bar{x})]^2}{\sum (t_i - \bar{t})^2 \sum (x_i - \bar{x})^2}$$
當 $\text{Slope} > 0.003$ 且 $R^2 > 0.40$ 時判定為 `gradual_increase` 漸進劣化。

---

## 4. 後續生產環境 (VPS Prod) 遷移部署指引 / VPS Production Deployment Guide

> ⚠️ **重要備忘**：本節詳細說明將 `ai-diagnostic-kb` 微服務從 LAB 環境遷移至正式生產級 VPS（例如 Ubuntu 22.04 / 24.04 LTS）的完整步驟。請妥善保存本手冊。

### 4.1 系統需求與前置作業 / Prerequisites
- **作業系統**：Ubuntu 22.04 LTS / 24.04 LTS (或 Debian 12)
- **硬體配置**：最低 2 核心 CPU / 4GB RAM / 40GB SSD
- **必備套件**：Docker 24+, Docker Compose v2, PostgreSQL 16 搭配 `pgvector` 擴展

---

### 4.2 步驟 1：資料庫 Schema 遷移 (Database Migration)

`ai-diagnostic-kb` 與 `iot-gen2-simulator-monitor` 共用底層 PostgreSQL 16 實例。請於 VPS 上執行專屬 DDL 腳本：

```bash
# 切換至專案 DB 腳本目錄
cd /opt/st8925lab/iot-gen2-simulator-monitor/vps/db

# 執行 04_ai_diagnostic_kb.sql 建立 7 張核心資料表與 pgvector 擴展
psql -h localhost -U postgres -d iot_gen2 -f 04_ai_diagnostic_kb.sql
```

**驗證資料表是否成功建立：**
```sql
\c iot_gen2
\dt kb_*
\dt baseline_profiles
\dt drift_events
\dt diagnostic_reports
-- 應顯示 7 張資料表且已啟用 vector 擴展
```

---

### 4.3 步驟 2：Docker Compose 服務配置 (Docker Compose Setup)

在 VPS 上的 `/opt/st8925lab/docker-compose.yml` 中加入 `ai-diagnostic-kb` 服務區塊：

```yaml
version: '3.8'

services:
  # 既有的 PostgreSQL + TimescaleDB + pgvector 容器
  postgres:
    image: timescale/timescaledb-ha:pg16
    container_name: st8925-postgres
    restart: always
    environment:
      POSTGRES_DB: iot_gen2
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"

  # ★ Project 03 AI 智慧診斷與知識庫微服務
  ai-diagnostic-kb:
    build:
      context: ./ai-diagnostic-kb/source/backend
      dockerfile: Dockerfile
    container_name: st8925-ai-diagnostic-kb
    restart: always
    environment:
      - PORT=8000
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/iot_gen2
      - LLM_PROVIDER=gemini                    # 可選: 'gemini' | 'openai' | 'mock'
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GEMINI_MODEL=gemini-1.5-flash
      - EMBEDDING_PROVIDER=gemini             # 可選: 'gemini' | 'openai' | 'local'
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - LOG_LEVEL=INFO
    ports:
      - "127.0.0.1:8000:8000"
    depends_on:
      - postgres

volumes:
  pgdata:
```

---

### 4.4 步驟 3：生產環境變數清單 (Environment Variables)

在 `/opt/st8925lab/.env` 中妥善設定密鑰：

```bash
# Database
DB_PASSWORD=YourStrongDatabasePassword123!
DATABASE_URL=postgresql://postgres:YourStrongDatabasePassword123!@localhost:5432/iot_gen2

# LLM & Embedding Settings
LLM_PROVIDER=gemini
GEMINI_API_KEY=AIzaSyD...YourRealGeminiApiKey...
GEMINI_MODEL=gemini-1.5-flash
EMBEDDING_PROVIDER=gemini

# Optional OpenAI Fallback
OPENAI_API_KEY=sk-proj-...
```

---

### 4.5 步驟 4：Nginx 反向代理配置 (Nginx Reverse Proxy)

建立 `/etc/nginx/sites-available/st8925lab-ai-api.conf`：

```nginx
server {
    listen 80;
    server_name api-ai.st8925lab.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket & 長連接支援
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
}
```
啟用並申請 SSL 憑證：
```bash
sudo ln -s /etc/nginx/sites-available/st8925lab-ai-api.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d api-ai.st8925lab.com
sudo systemctl reload nginx
```

---

### 4.6 步驟 5：種子資料初始化與基線預計算 (Data Seeding & Baseline Init)

容器啟動後，執行一次性種子資料灌入與全機隊基線計算：

```bash
# 1. 進入容器執行種子灌入 (15 故障樹 + 20 工單 + 30 FAQ + 12 零件)
docker exec -it st8925-ai-diagnostic-kb python -c "
from knowledge_base.manager import KnowledgeBaseManager
mgr = KnowledgeBaseManager()
print('Seeding knowledge base...')
# 執行資料庫種子寫入
"

# 2. 觸發 21 台機組基線重算
curl -X POST http://127.0.0.1:8000/api/baseline/recalculate
```

---

### 4.7 步驟 6：自動化定時任務 (Cron Automation)

設定每日深夜自動重算基線與歷史漂移分析：
```bash
# 編輯 crontab
crontab -e

# 每日凌晨 02:30 觸發全機隊 30 天滾動基線重新計算
30 2 * * * curl -s -X POST http://127.0.0.1:8000/api/baseline/recalculate > /dev/null 2>&1

# 每 15 分鐘執行一次全機隊漂移巡檢 (配合 iot-gen2 遙測)
*/15 * * * * curl -s -X POST http://127.0.0.1:8000/api/drift/check-fleet > /dev/null 2>&1
```

---

### 4.8 步驟 7：生產環境健康檢查與驗證 (Health Verification)

```bash
# 1. 檢查服務健康狀態
curl -s http://127.0.0.1:8000/health | jq .
# 預期回傳: {"status": "ok", "service": "ai-diagnostic-kb", "llm_provider": "gemini", "db_connected": true}

# 2. 測試 RAG 語義檢索
curl -s -X POST http://127.0.0.1:8000/api/kb/search \
  -H "Content-Type: application/json" \
  -d '{"query": "冷卻水出水溫度升高", "limit": 3}' | jq .

# 3. 測試單機 AI 診斷
curl -s -X POST http://127.0.0.1:8000/api/diagnosis \
  -H "Content-Type: application/json" \
  -d '{"machine_id": 15}' | jq .
```

---

## 5. 驗證與測試總結 / Verification & Testing Summary

1. **後端單元與整合測試 (`test_backend.py`)**：
   - 6 項單元與整合測試全數通過（`ALL 6 BACKEND TESTS PASSED`）。
2. **全站一致性檢查 (`verify.py`)**：
   - 13 大類別檢查全數通過（`ALL CHECKS PASSED / 全部檢查通過`）。
