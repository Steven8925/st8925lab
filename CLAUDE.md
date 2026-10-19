# 11_st8925lab
- 定位：st8925lab.com 作品集網站。首頁是夜間地球與 6 個專案軌道，每個子專案一個頁面；Cloudflare Worker 同時供應靜態資產與 `/api/*`。
- 技術棧：靜態 HTML／CSS／JS（首頁、02–05）、React＋Vite 建置產物（01 前端）、Cloudflare Worker（`worker/`）、Render.com 後端（01 為 Node.js；03、06 為 FastAPI）、NVIDIA NIM。
- 架構圖：`PROMPT.md`「9. 全系統架構」。
- 使用的共用模組：無（`_shared/` 尚無模組）。站內共用元件在 `shared/`（wordmark、fontscale），沒有版本號。
- 本專案 Hook 門檻：大規模重構＝一次異動超過 3 個核心模組檔。核心模組檔指 `config.js`、`app.js`、`index.html`、`worker/*.js`、`shared/*`、`tools/build_alarm_frontend.py`，以及各子專案的 `index.html`／`app.js`／`style.css`。任何會改變 `.assetsignore` 發佈範圍的變更，先問山姆哥。
- 相關專案：`12_App_notification`（告警領域）；`130_Travel-Planning-tool`、`07_travel-plan`（旅遊領域）。
- 本專案特有：GitHub repo 是 public，`Travel-Assistance` 是私有 submodule。repo 根目錄就是網站根目錄：`.assetsignore` 管「會不會被發佈」，`.gitignore` 管「會不會進 git」。push 到 main 會自動部署。所有文字檔維持 CRLF。
