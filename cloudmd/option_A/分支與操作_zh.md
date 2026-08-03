# ST8925 LAB — Git 分支策略與環境部署指南

> 本文件說明如何遵循 **Lab（測試環境）與 Production（生產環境）隔離原則**，利用單一 GitHub 儲存庫的多分支機制，在 Cloudflare Pages 上安全地測試並無縫升級網站。

---

## 1. 專業建議與架構抉擇

### 核心結論：採用「單一 Repo + Git 分支策略 (Branching Strategy)」

**無需新建 GitHub Repo**。繼續保留 `Steven8925/st8925lab`，透過建立 `lab` 測試分支與 `main` 生產分支進行環境隔離。

---

### 方案比較表

| 評估面向 | 方案 A：單一 Repo + 分支策略 (推薦 ⭐⭐⭐⭐⭐) | 方案 B：新建獨立 Repo (不推薦) |
| :--- | :--- | :--- |
| **Cloudflare Pages 支援度** | **100% 原生支援**。Cloudflare Pages 天生具備 Preview/Production 分支環境綁定功能。 | 需要維護兩個獨立的 Cloudflare Pages 專案與設定。 |
| **正式上線 (Promote) 難易度** | **極致簡單**。測試 OK 後，只需 `git merge lab main`，10 秒內自動發布至正式網域。 | 需要跨 Repo 手動複製檔案或重拉 Remote，容易遺漏檔案。 |
| **版本歷史與稽核** | 所有開發歷程、測試、修改記錄集中在同一個 Git 歷史中，清晰可追溯。 | 歷史紀錄分散在兩個 Repo，未來難以追蹤演進過程。 |
| **維運成本** | **零額外成本**。單一權限控制，單一 Secrets 與 Webhook 管理。 | 需維護多個 Repo 與多套平台認證金鑰。 |

---

## 2. 環境與分支對應架構 (Environment Mapping)

```
[ Git 分支 ]                    [ Cloudflare Pages 環境 ]            [ 綁定自訂網域 ]

  lab 分支 (Option A 測試碼) ───▶ Preview / Lab Environment ───────▶ lab.st8925lab.com
        │
        │ (測試驗證通過後執行 git merge)
        ▼
  main 分支 (生產正式碼)    ───▶ Production Environment      ───────▶ st8925lab.com
```

---

## 3. 詳細實務操作步驟指南

### 步驟一：在本機建立並推送 `lab` 測試分支

開啟終端機（CMD 或 PowerShell），執行以下指令：

```cmd
d:
cd \st8925lab

:: 1. 從目前的 main 分支建立並切換至 lab 分支
git checkout -b lab

:: 2. 將 lab 分支推送到 GitHub 遠端儲存庫
git push -u origin lab
```

---

### 步驟二：在 Cloudflare Pages 設定 `lab.st8925lab.com` 測試環境

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ 進入 **Workers & Pages** ➔ **Create Application** ➔ **Pages** ➔ **Connect to Git**。
2. 選擇 GitHub 儲存庫 **`Steven8925/st8925lab`**。
3. **設定建構參數**：
   - **Project name**: `st8925lab-lab`（或直接使用專案名稱）
   - **Production branch**: `lab`（將預設生產環境暫時指向 lab 分支）
   - **Framework preset**: `Astro`
   - **Root directory**: `cloudmd/option_A`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. 點擊 **Save and Deploy** 部署測試站。
5. 部署完成後，進入專案設定中的 **Custom Domains (自訂網域)** 分頁：
   - 點擊 **Set up a custom domain**。
   - 輸入 **`lab.st8925lab.com`**。
   - Cloudflare 會自動新增 DNS CNAME 記錄並為測試子網域簽發免費 TLS 憑證。

---

### 步驟三：在 `lab.st8925lab.com` 進行驗證

開啟瀏覽器前往 `https://lab.st8925lab.com`，進行完整功能與資安驗證：
- [ ] 測試中英文切換 (`/en/` 與 `/zh/`)
- [ ] 測試 Modbus 位址轉換器與 Float 解碼器計算邏輯
- [ ] 驗證手機與桌面端響應式版面
- [ ] 檢查 Security Headers（CSP、X-Frame-Options）

---

### 步驟四：驗證通過後，一鍵升級至正式主網域 (`st8925lab.com`)

當 Option A 在 `lab.st8925lab.com` 測試完美，決定替換正式主網域時：

```cmd
d:
cd \st8925lab

:: 1. 切換回 main 分支
git checkout main

:: 2. 將 lab 分支的成果合併至 main
git merge lab

:: 3. 推送至 GitHub
git push origin main
```

#### 在 Cloudflare Pages 上將正式網域綁定至 `main`：
1. 進入 Cloudflare Pages 專案設定。
2. 將 **Production branch** 修改為 `main`（或新增第二個 Pages 專案連至 `main`）。
3. 將自訂網域 **`st8925lab.com`** 綁定至 `main` 生產環境。
4. Cloudflare Pages 偵測到推送後，將在 10 秒內實現**無縫零停機時間 (Zero-Downtime Deployment)** 正式上線！
