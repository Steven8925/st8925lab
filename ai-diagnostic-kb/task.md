# AI Diagnostic Knowledge Base — 任務追蹤清單 / Task Tracker

> **Project ID**: `03`
> **Display Label**: `AI DIAGNOSTIC KB`
> **Folder / Slug**: `ai-diagnostic-kb`
> **Last Updated**: 2026-08-18

---

## P0: 基礎設定 / Base Configuration
- [x] 使用 `rename_project.py` 將 `project-03/` 更名為 `ai-diagnostic-kb/` (Renamed project folder)
- [x] 驗證 `config.js` 中 label (`AI DIAGNOSTIC KB`) 和 slug (`ai-diagnostic-kb`) 已原子化同步更新
- [x] 更新 `render.yaml` 新增 `st8925lab-ai-diagnostic-kb` 後端部署藍圖 (Added Render backend blueprint)
- [x] 執行 `verify.py` 確認全站幾何、配色與架構一致性檢查通過 (`ALL CHECKS PASSED`)

---

## P1: 資料庫 Schema 與知識庫種子資料 / DB Schema & Knowledge Base Seed Data
- [x] 建立 `04_ai_diagnostic_kb.sql`（含 `baseline_profiles`, `drift_events`, `kb_troubleshooting`, `kb_work_orders`, `kb_faq`, `kb_parts_lifecycle`, `diagnostic_reports` 與 pgvector 擴展）
- [x] 建立 `seed_data.py`（15 條故障決策樹、20 筆工單、30 條 FAQ、12 項零件壽命排程）
- [x] 建立前端即時知識庫模組 `modules/kb-store.js`（含快速關鍵字與語義比對檢索器）

---

## P2: FastAPI 後端骨架與基線/漂移引擎 / FastAPI Backend & Baseline/Drift Engine
- [x] 建立 FastAPI 後端架構（`main.py`, `config.py`, `requirements.txt`, `Dockerfile`）
- [x] 實作非同步 DB 連接池（`db/connection.py` 支援 PostgreSQL / asyncpg 及高可用 Mock 模式）
- [x] 實作 Pydantic DTO 驗證模組（`db/models.py`）
- [x] 實作統計基線計算器（`baseline/calculator.py` 支援均值、標準差、置信區間）
- [x] 實作雙向 Tabular CUSUM 控制圖檢測演算法（`baseline/cusum.py`）
- [x] 實作多維度漂移與線性回歸斜率檢測器（`baseline/drift_detector.py`）
- [x] 建立 `/api/baseline` 與 `/api/drift` RESTful 路由

---

## P3: LLM 抽象層、RAG 檢索與 AI 診斷引擎 / LLM Abstraction, RAG & Diagnosis Engine
- [x] 實作 LLM Provider 抽象介面（`diagnosis/llm_provider.py` 支援 Gemini 1.5/2.0, OpenAI GPT-4o, 本地專家引擎）
- [x] 實作 Embedding Provider 抽象層（`knowledge_base/embedder.py` 支援 Gemini / OpenAI / 本地特徵向量）
- [x] 實作 RAG 跨知識庫語義檢索器（`knowledge_base/retriever.py`）
- [x] 實作工業熱力學 Prompt 工程模板（`diagnosis/prompt_templates.py`）
- [x] 實作診斷核心引擎（`diagnosis/engine.py` 串接感測快照、基線統計、RAG 知識與 LLM 推理）
- [x] 建立 `/api/diagnosis`, `/api/kb`, `/api/health-report`, `/api/fleet` 路由

---

## P4: 模擬歷史數據產生器 / Telemetry History Simulator
- [x] 實作 3 個月歷史時序數據產生器（`simulator/history_generator.py` 與 `modules/fleet-data.js`）
- [x] 注入三大劣化與故障情境（機組15 水塔散熱片結垢、機組6 冷媒微漏、機組23 蒸發器結垢）
- [x] 驗證日週期負載曲線（Diurnal Load Curve）與熱力學連鎖計算

---

## P5 & P6: 互動式前端介面 / Interactive Web Dashboard
- [x] 建立現代 Cyber Dark Glassmorphism 設計系統（`style.css`）
- [x] 實作全機隊健康總覽視圖（`view-dashboard`，含 21 台機組卡片、健康評分、即時 Sparkline 迷你圖）
- [x] 實作單機深度 AI 診斷視圖（`view-diagnosis`，含側邊欄切換、Modbus vs 基線對比表、Gemini RAG 診斷報告、72h 連續運轉曲線）
- [x] 實作統計品管與 CUSUM 控制圖視圖（`view-trends`，展示提前 72 小時抓出微弱漸進漂移）
- [x] 實作知識庫瀏覽與即時語義檢索視圖（`view-knowledge`，支援自然語言搜索、故障樹/工單/FAQ/零件切換）
- [x] 實作前端故障注入與即時測試按鈕（`app.js`）

---

## P7: 整合測試與全站驗證 / Integration Testing & Site Verification
- [x] 執行後端單元與整合測試套件（`python tests/test_backend.py` 6 項測試全數通過）
- [x] 執行全站驗證工具（`python verify.py` 獲得 `ALL CHECKS PASSED`）
- [x] 產出中英雙語權威規格 `PROMPT.md` 與開發歷程 `README.md`
- [x] 歸檔相關實施與驗證紀錄至專案目錄
