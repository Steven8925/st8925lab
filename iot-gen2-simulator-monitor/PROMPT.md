# ST8925 LAB — Project 02: Rebuild & Maintenance Specification

> **Project ID**: `02`  
> **Display Label**: `IOT GEN2 SIMULATOR & MONITOR`  
> **Folder / Slug**: `iot-gen2-simulator-monitor`  
> **Last Updated**: 2026-08-18  
> **Authority**: 本檔為 Project 02 的維護與重建規格書 / Sole rebuild spec for Project 02

---

## 1. 系統架構與檔案結構 / Directory Structure

```
iot-gen2-simulator-monitor/
├── index.html                  # 主頁面：整合 Topbar、圖表、Modbus 矩陣與警報列表
├── app.js                      # 前端控制器：整合機隊模擬、動態規則求值與 Chart.js
├── style.css                   # 深色科技毛玻璃設計系統
├── modules/
│   ├── fleet-simulator.js      # 21 台機組熱力學遙測循環與故障注入
│   ├── rule-engine.js          # 動態 JSON 條件樹警報規則引擎
│   └── ai-predictor.js         # Prophet 48h 趨勢預測與孤立森林異常檢測
├── vps/                        # VPS 生產環境部署完整套件
├── README.md                   # 專案架構與操作說明 (Bilingual Dev Guide)
└── PROMPT.md                   # 維護與重建規範 (本檔)
```

---

## 2. 核心契約與不變量 / Core Invariants & Rules

1. **`MY_ID` 宣告**: `index.html` 內必須包含 `const MY_ID = '02';`。
2. **單一資料源**: 必須引入 `../config.js` 與 `../shared/wordmark.js`，站名與顏色遵循全站體系。
3. **三專案互聯導覽**: 頂部導覽列必須保留跨專案快速按鈕：
   - 前往 P03: `../ai-diagnostic-kb/index.html` (`🤖 AI 智慧診斷 (P03)`)
   - 前往 P01: `../alarm-notification-simulator/index.html` (`🔔 告警推播模擬 (P01)`)
   - 返回首頁: `../index.html` (`&larr; BACK TO ORBIT`)
4. **命名同步**: 若 `config.js` 的 `PROJECTS[1].label` 變動，必須使用 `python tools/rename_project.py 02 "<New Label>"` 同步修改 slug 與資料夾。
5. **遙測數據契約 (Modbus Registers Data Contract)**:
   - `AAA0001`: 冰水出水溫度 (°C)
   - `AAA0002`: 冰水回水溫度 (°C)
   - `AAA0003`: 冷卻水回水溫度 (°C)
   - `AAA0004`: 冷卻水出水溫度 (°C)
   - `AAA0018`: 壓縮機電流 (A)
   - `AAA0036`: 冷媒高壓 (kg/cm²)
   - `AAA0037`: 冷媒低壓 (kg/cm²)
   - `AAA0050`: 總功耗 (kW)
   - `COP`: 能效比 = $(AAA0002 - AAA0001) \times \text{FlowRate} \times 0.3024 / AAA0050$
6. **驗證指令**: 任何修改後必須執行 `$env:PYTHONIOENCODING="utf-8"; python verify.py` 確認通過所有測試。

---

## 3. 三大專案互聯與機隊規範 / 3-Project Triad & Fleet Specifications

1. **機隊統一性 (Fleet Invariant)**:
   - `modules/fleet-simulator.js` 定義的 21 台實體機組（8 大客戶廠區）為全站統一標準。
   - `alarm-notification-simulator` (`source/apps/web/src/constants/fleet.ts`) 與 `ai-diagnostic-kb` (`source/backend/app/db/database.py`) 之機組定義必須與此嚴格同步。
2. **數據輸出契約 (Upstream Data Feed)**:
   - **至 P03 (`ai-diagnostic-kb`)**: 定期推送 21 台機組 14 項核心遙測數據時序流（`sensor_data`），作為 P03 移動平均基線與 72h CUSUM 漂移分析之原始資料源。
   - **至 P01 (`alarm-notification-simulator`)**: 當動態規則引擎判定發生突發臨界值超限（如 `AAA0018` 壓縮機過電流或 `AAA0012` 水流開關中斷）時，即時向 P01 Webhook 發出告警事件。
3. **頂部導覽列規範 (Navigation Invariant)**:
   - 頂部導覽列必須具備統一樣式，右側包含至 P03 (`../ai-diagnostic-kb/index.html`)、P01 (`../alarm-notification-simulator/index.html`) 與首頁 (`../index.html`) 的快速切換連結。

