# AI Diagnostic Knowledge Base (Project 03) — 功能成果展示與驗證報告 / Walkthrough & Verification Report

> **Project ID**: `03`
> **Display Label**: `AI DIAGNOSTIC KB`
> **Folder / Slug**: `ai-diagnostic-kb`
> **Date**: 2026-08-18
> **Live URL**: `https://st8925lab.com/ai-diagnostic-kb/`

---

## 1. 系統建置總覽 / System Overview

本專案成功建置了 **AI Diagnostic Knowledge Base（工業冷卻水與冰水機組智慧診斷知識庫平台）**。
系統完美彌補了工業物聯網（IoT）場域中「僅有超限閾值告警」而「缺乏漸進劣化預警與根本原因診斷」的巨大缺口。

```
┌────────────────────────────────┐     ┌────────────────────────────────┐     ┌────────────────────────────────┐
│  iot-gen2-simulator-monitor    │     │   ai-diagnostic-kb (Project 03)│     │  alarm-notification-simulator  │
│  (Project 02)                  │     │   [本專案中央智慧腦]           │     │  (Project 01)                  │
│                                │     │                                │     │                                │
│  • 21 台機組 Modbus 遙測       │────▶│  • 統計基線 (Moving Avg/Std)   │────▶│  • 告警分發與推播帳本          │
│  • TimescaleDB 時序儲存        │     │  • 雙向 Tabular CUSUM 漂移偵測 │     │  • 附帶 AI 診斷與處置建議     │
│  • Prophet 預測 & 異常評分     │     │  • RAG 語義檢索 & 故障決策樹   │     │  • LINE / FCM / 手機模擬       │
│                                │     │  • Gemini LLM 智慧根因診斷     │     │                                │
└────────────────────────────────┘     └────────────────────────────────┘     └────────────────────────────────┘
```

---

## 2. 核心功能亮點與截圖 / Key Features Walkthrough

### 2.1 全機隊 AI 健康總覽 (Fleet Health Dashboard)
- **21 台實體機組**（8 大園區客戶）即時狀態網格。
- **AI 綜合健康分數（0~100）**，以綠（Healthy）、黃（Warning）、紅（Critical）動態燈號標示。
- **7 天即時 Sparkline 迷你趨勢圖**，快速捕捉水溫與高壓走勢。
- **故障注入測試按鈕**：可現場一鍵注入「冷凝器結垢」或「冷媒慢速洩漏」，立即觸發 AI 預警。

### 2.2 單機深度 AI 診斷 (Machine Deep Diagnosis)
- **Modbus 點位 vs 30天基線儀表板**：直觀展示 8 大核心指標之當前讀值、基準值（Mean ± 1σ）與 Z-Score 偏差幅度。
- **Gemini RAG 智慧根因診斷報告**：
  - **診斷摘要 (Summary)**：自然語言精準敘述異常狀態。
  - **根本原因排行 (Root Cause Ranking)**：列出可能原因、機率百分比與判斷依據。
  - **建議處置行動 (Prescriptive Actions)**：依優先順序提供步驟、所需工具、預估耗時與急迫度。
  - **惡化預警 (Risk Escalation)**：預估若不處置將於多少小時內觸發跳脫。
- **72 小時連續運轉趨勢曲線圖**（Chart.js 雙 Y 軸展示溫度與冷媒壓力）。

### 2.3 統計品管與 CUSUM 控制圖 (Multi-Scale Trends & CUSUM)
- 視覺化展示 **雙向 Tabular CUSUM 累積和演算法**。
- **傳統閾值 vs CUSUM**：傳統告警需等到水溫突破 36.5°C 才會響鈴；CUSUM 在水溫微升至 35.2°C 時即提前突破決策閾值 $h = 4.5\sigma$，**為維運團隊爭取 72 小時黃金預防處置期**。

### 2.4 冷卻水系統智慧知識庫 (Knowledge Base Browser & RAG Search)
- 頂部支援**自然語言即時語義檢索**（例如輸入「冷卻水出水溫度升高」、「散熱片結垢」、「能效劣化」）。
- 四大維運知識分類：
  1. **故障診斷決策樹 (15 條)**
  2. **歷史維修工單紀錄 (20 筆)**
  3. **原廠與現場 FAQ (30 條)**
  4. **零件壽命與保養排程 (12 項)**

---

## 3. 測試與驗證結果 / Verification Results

### 3.1 後端測試套件 (`python tests/test_backend.py`)
```
Running backend tests...
  [PASS] test_baseline_calculator
  [PASS] test_cusum_detector
  [PASS] test_drift_detector
  [PASS] test_knowledge_base_seeded
  [PASS] test_rag_retriever
  [PASS] test_diagnostic_engine_flow
=== ALL 6 BACKEND TESTS PASSED ===
```

### 3.2 全站一致性驗證 (`python verify.py`)
```
==================================================================
 ALL CHECKS PASSED / 全部檢查通過
==================================================================
```
全站幾何角度、配色對比度（WCAG AAA $\ge 7.26$）、單一資料源 `config.js` 與 URL 色相傳遞完全合規。
