# ST8925 LAB — Project 02: Rebuild & Maintenance Prompt

> **Project ID**: `02`  
> **Display Label**: `IOT GEN2 SIMULATOR & MONITOR`  
> **Folder / Slug**: `iot-gen2-simulator-monitor`  
> **Last Updated**: 2026-08-17

---

## 1. Directory Structure

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
├── README.md                   # 專案架構與操作說明
└── PROMPT.md                   # 維護與重建規範
```

---

## 2. Invariants & Rules

1. **`MY_ID` 定義**: `index.html` 內必須宣告 `const MY_ID = '02';`。
2. **單一資料源**: 必須引入 `../config.js` 與 `../shared/wordmark.js`。
3. **驗證指令**: 修改後必須執行 `$env:PYTHONIOENCODING="utf-8"; python verify.py` 確認通過所有測試。
