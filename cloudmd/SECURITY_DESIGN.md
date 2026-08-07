# 安全 · 隱私 · 備份 完整設計 (SECURITY_DESIGN.md)

> **文件定位**:PROJECT_BRIEF v2 的姊妹文件,專責安全、隱私、備份。兩份文件一起放 repo 根目錄。
> **版本**:v1.1 · 2026-07-30
> **NAS 已確認**:QNAP TS-473(A)-8G(主力機)+ QNAP TS-659 Pro II(EOL,僅限 LAN 內備份接收端)。實機配置見 §7.4。全文工具名以 QNAP 為準:備份 = HBS 3、快照 = 快照(Storage & Snapshots)、容器 = Container Station。
> **待確認**:473 是否為 "A" 版(TS-473 vs TS-473A)— 不影響架構,僅影響文件標註。

---

## 0. 設計原則(先讀這個)

1. **威脅模型優先。** 不是「加越多安全越好」,而是針對真實威脅配置對應控制。過度設計的安全 = 你三個月後就不會再遵守的安全。
2. **資料分級決定一切。** 每一份資料先分級,分級決定它能放哪裡、怎麼加密、怎麼備份。
3. **信任方向單一化:NAS 只出不進。** NAS 主動往外拉(pull)與往外推(push),網際網路上沒有任何東西能主動連進 NAS。
4. **備份的定義是「驗證過可還原」。** 沒做過還原演練的備份只是一種心理安慰。
5. **單人維運的現實**:所有機制必須能在「你三個月沒碰它」之後仍然自動運作,並且在失敗時主動通知你。

---

## 1. 威脅模型

| # | 威脅 | 可能性 | 衝擊 | 主要防線 |
|---|---|---|---|---|
| T1 | **勒索軟體加密 NAS**(家人照片、備份一起完蛋) | 中 | 極高 | 不上公網 + 不可變快照 + 離機加密備份 |
| T2 | **Secret 洩漏**(API key 進 Git、進瀏覽器) | 高(最常見的實際事故) | 高 | gitleaks + secret store + 金鑰輪替程序 |
| T3 | **NAS/家用 IP 被掃描與入侵** | 高(自動化掃描是常態) | 高 | 零開放 port + Tailscale + 韌體更新 |
| T4 | **雲端帳號被接管**(Cloudflare / GitHub / Google) | 低–中 | 極高(等於拿到全部) | 硬體金鑰/TOTP + 復原碼離線保存 |
| T5 | **公開網站洩漏客戶/案場資訊** | 中(人為疏忽) | 高(商譽+合約) | 去識別化檢查表 + 發布前 checklist + 定期 Google 自查(§8) |
| T6 | **AI 助理被濫用**(帳單攻擊、prompt injection 套資料) | 中 | 中 | 支出硬上限 + 不給 AI 存取私有資料 |
| T7 | 硬體故障(NAS 硬碟、Ubuntu SSD) | 必然發生 | 中 | RAID + 3-2-1 備份 |
| T8 | 你自己誤刪 | 必然發生 | 中 | 版本化 + 快照 + soft delete |

**不在範圍內**(明確不防):國家級攻擊者、針對性 APT、物理入侵。個人站台防這些是資源錯置。

---

## 2. 資料分級 — 本設計的核心

| 級別 | 定義 | 例子 | 規則 |
|---|---|---|---|
| **C0 公開** | 設計上就是給全世界看的 | 網站內容、公開 repo、CSV 資料集 | 可放任何地方;唯一要求是**發布前過 §5.4 檢查** |
| **C1 內部** | 洩漏不致命但不想公開 | 私有 repo 程式碼、草稿、AI prompt 設計、rate limit 閾值 | 私有 repo / NAS;不需額外加密 |
| **C2 私密** | 洩漏會造成實質傷害 | **家人照片**、**Talk 對話紀錄與通話中傳送的檔案**、個人文件、投資紀錄、命理資料 | 只存 NAS;離機備份**必須 client-side 加密**;絕不經過 Zone A/B |
| **C3 機密** | 洩漏 = 立即事故 | API keys、密碼、TOTP seed、復原碼、憑證私鑰 | 只存 secret store(§4);**永不進 Git、永不進備份明文、永不進聊天記錄** |

**判斷不了就往上分一級。**

### 分級 × 空間對照表(哪些東西允許放哪裡)

| 空間 | C0 | C1 | C2 | C3 |
|---|---|---|---|---|
| Cloudflare Pages / 公開網站 | ✅ | ❌ | ❌ | ❌ |
| GitHub 私有 repo | ✅ | ✅ | ❌ | ❌ |
| GitHub 公開 repo | ✅ | ❌ | ❌ | ❌ |
| Cloudflare R2(公開 bucket) | ✅ | ❌ | ❌ | ❌ |
| Cloudflare R2(私有 bucket) | ✅ | ✅ | ⚠️ 僅加密後 | ❌ |
| Cloudflare D1 / KV | ✅ 彙總統計 | ✅ | ❌ | ❌ |
| NAS | ✅ | ✅ | ✅ | ⚠️ 僅密碼管理器加密庫 |
| Ubuntu 開發機 | ✅ | ✅ | ❌(會重裝) | ⚠️ 僅暫存的開發 token |
| Backblaze B2(離機備份) | ✅ | ✅ | ⚠️ 僅 client-side 加密後 | ❌ |
| 密碼管理器 | — | — | — | ✅ 唯一合法位置 |

這張表是全文件最重要的一張。任何「這個檔案該放哪」的問題,先分級,再查表。

---

## 3. 空間配置總覽

```
┌─────────────────────────── 網際網路 ───────────────────────────┐
│                                                                │
│  Cloudflare Pages      Cloudflare Workers      GitHub          │
│  (Zone A, C0)          (Zone B, C0/C1)         (private: C1)   │
│  網站靜態內容            工具API/AI proxy         (public: C0)    │
│         │                    │                      │          │
│         │              D1 / KV (彙總統計)            │          │
│         │              R2 (素材+加密備份中繼)         │          │
│         │                    │                      │          │
└─────────┼────────────────────┼──────────────────────┼──────────┘
          │                    │ ▲ 只有 outbound       │
          │                    │ │ 或 NAS pull         │
┌─────────┼────────────────────┼─┼────────────────────┼──────────┐
│  家內網  ▼                    ▼ │                    ▼          │
│  ┌──────────────────────── NAS (C0–C2) ─────────────────────┐  │
│  │  Docker: Nextcloud │ 備份任務(pull) │ 不可變快照          │  │
│  │  存取: Tailscale only, 零開放 port                        │  │
│  └───────────────┬──────────────────────────┬───────────────┘  │
│                  │ Tailscale                │ push (加密)      │
│        手機/家人裝置                          ▼                 │
│        Ubuntu 開發機(C0–C1)          Backblaze B2 (加密後 C2)  │
└────────────────────────────────────────────────────────────────┘
```

角色分工(重申 v2 §9,不變):

- **NAS** = 儲存 + 24/7 服務(Nextcloud、備份中樞)。C2 資料的唯一常駐地
- **Ubuntu** = 開發、實驗、會重裝。**永遠假設它明天會消失**,所以 C2 不落地
- **Cloudflare** = 公開服務與備份中繼。C2 只以加密形式短暫經過
- **GitHub** = 程式碼真相來源(source of truth),NAS 持有鏡像

---

## 4. Secret 管理(C3)

### 4.1 唯一合法儲存位置:密碼管理器

- **建議 Bitwarden(官方雲端版)**。刻意**不建議**自架 Vaultwarden——自架密碼庫等於給自己多一個必須完美維運的高價值標的,與單人維運原則衝突
- 開啟 2FA(TOTP 或硬體金鑰),**復原碼列印後放實體安全處**(不是存在同一個密碼管理器裡——雞生蛋問題)
- 家人各自獨立帳號;共享項目用 Bitwarden 的分享功能,不要共用主帳號

### 4.2 各平台 2FA 策略(T4 防線)

| 帳號 | 2FA 方式 | 備註 |
|---|---|---|
| Cloudflare | TOTP + 復原碼離線 | 拿到它 = 拿到 DNS + Pages + R2 + D1,**最高價值標的** |
| GitHub | TOTP(有預算就上 passkey/硬體金鑰) | 拿到它 = 改你的網站程式碼 |
| Google | TOTP;家人帳號也要開 | Nextcloud 若接 Google 登入,這是入口 |
| Backblaze | TOTP | 拿到它 = 刪你的離機備份(勒索軟體標準動作) |
| NAS 帳號 | DSM/QTS 內建 2FA | admin 預設帳號停用,另建具名管理帳號 |

### 4.3 程式面規則(重申並固定)

- Secret 進 `wrangler secret put` / Pages encrypted env vars,**任何 `.env` 不進版控**
- `gitleaks` pre-commit hook(兩個 repo 都裝)+ CI 再掃一次
- **輪替程序寫成文件**:每把 key 記錄「在哪些地方被使用」,洩漏時 10 分鐘內能全部換掉。放在密碼管理器的 secure note
- AI API key 分兩把:正式用 + 開發用,開發那把設更低的支出上限

---

## 5. 隱私設計

### 5.1 訪客資料(公開網站)

重申 v2 §8.2,固定為政策:

- **只存彙總 `(date, country, region, count)`,不存 raw IP**;unique visitor 用每日輪替 salt 的 hash
- 地理資訊用 Cloudflare header,不自建 GeoIP DB
- 隱私聲明頁載明:收集什麼、不收集什麼、保留多久 — 對資安定位這是可信度資產
- AI 助理:不存逐字稿,只存結構化標籤;保留 90 天;IP 與內容不同筆

### 5.2 家人資料(Nextcloud)

- 每位家人**獨立帳號**,依需要開資料夾權限;不共用帳號
- Nextcloud 本身再開 TOTP(Tailscale 之後的第二層)
- 對外分享連結:預設**停用公開連結功能**。真需要分享給外人時,單次開啟 + 密碼 + 到期日
- 手機 app 自動上傳目的地設為各自的私人資料夾

### 5.3 你自己的敏感資料(投資紀錄、命理研究、C2 文件)

- 存 NAS 的獨立共享資料夾,與家人照片分開
- 其中特別敏感的子集(例:完整投資交易紀錄),建議再用 **Cryptomator** 建加密保險庫放在 Nextcloud 內——即使 NAS 被完整拿走,這一層仍是密文
- **絕不放進任何會被 AI 工具讀取的路徑**(見 5.5)

### 5.4 公開內容的發布前檢查(T5 防線)

每篇 case study / reference / 截圖發布前:

```
□ 客戶名、案場名、地址 → 已換成產業描述?
□ domain / 內網 IP / 序號 / 帳號 → 截圖已遮蔽?
□ EXIF:照片已去除 GPS 與機器資訊?(exiftool -all= 或 Astro 圖片處理管線自動處理)
□ 架構圖是自繪,不是客戶文件?
□ 文中數字是可對外的?(合約可能限制揭露 KPI)
□ Git history 裡沒有這篇的未去識別化早期版本?(草稿在本機寫,去識別化後才進 repo)
```

最後一條最容易漏:**草稿階段不要 commit**。Git history 是永久的,去識別化前的版本一旦進了 repo,補救成本很高。

### 5.5 AI 工具與隱私的邊界

你大量使用 AI 工具(Claude Code 等),必須畫一條線:

- AI coding 工具的工作目錄**只在 Ubuntu 的專案目錄**,不掛載 NAS 的 C2 資料夾
- `CLAUDE.md` / prompt 檔案分級為 C1:可進私有 repo,但檢查裡面沒有寫死的 key 或客戶名
- 網站的 AI 助理(Zone B)**只餵公開內容的索引**,任何情況下不接 D1 以外的資料源

---

## 6. 備份架構(核心章節)

### 6.1 原則:3-2-1-1-0

3 份副本 · 2 種媒介 · 1 份離機 · **1 份不可變(immutable/版本化)** · **0 = 還原演練零錯誤**。最後兩項是對抗勒索軟體(T1)與「備份心理安慰」的關鍵。

### 6.2 備份矩陣 — 每一類資料的完整路徑

| 資料 | 級別 | 主要位置 | 第 2 份 | 離機(第 3 份) | 頻率 | 工具 |
|---|---|---|---|---|---|---|
| **網站/API 程式碼** | C1 | GitHub(真相來源) | NAS git mirror | B2(隨 NAS 備份) | 每日 pull | cron + `git remote update` |
| **網站內容**(Markdown) | C0/C1 | 同上(內容即程式碼,Git as CMS 的紅利) | 同上 | 同上 | 同上 | 同上 |
| **D1 資料庫**(統計、AI 標籤) | C1 | Cloudflare D1 | R2 私有 bucket(SQL dump) | NAS pull → 隨 NAS 進 B2 | 每日 | Worker Cron Trigger → R2;NAS rclone pull |
| **R2 素材**(圖、影片、CSV、PDF) | C0 | R2 | NAS(rclone pull) | B2(隨 NAS 備份) | 每日 | rclone sync(R2 → NAS) |
| **Nextcloud 檔案 + 照片** | **C2** | NAS | NAS 快照(不可變) | **B2,client-side 加密** | 檔案即時;快照每日;離機每日 | Btrfs/ZFS snapshot + Hyper Backup(QNAP: HBS 3) |
| **Nextcloud 設定 + DB** | C1/C2 | NAS(Docker volume) | NAS 快照 | B2(同上) | 每日 | 備份前 `occ maintenance:mode --on` → dump → off,腳本化 |
| **NAS 系統設定** | C1 | NAS | 設定匯出檔 | B2 | 每月 + 每次改動後 | DSM 設定備份(QNAP:設定匯出) |
| **Ubuntu 開發機** | C1 | 本機 | — | **NAS**(它的離機就是 NAS) | 每日 | restic → NAS(SFTP over Tailscale) |
| **IoT 時序資料**(NAS 上的收集器) | C1 | NAS DB | NAS 快照 | B2 | 每日 dump | pg_dump / influx backup → 備份資料夾 |
| **密碼庫** | C3 | Bitwarden 雲端 | 每月加密匯出 → 放 Cryptomator 保險庫 | 隨 NAS 進 B2 | 每月 | 手動(設月度提醒) |

### 6.3 三條關鍵流程的細節

**A. 程式碼:GitHub → NAS 鏡像(NAS 主動 pull)**

```bash
# NAS 上的排程任務(每日 03:00)
# 初次:git clone --mirror git@github.com:you/site.git
cd /volume1/backup/git/site.git && git remote update
cd /volume1/backup/git/api.git && git remote update
```

- 用**唯讀 deploy key**(每 repo 一把,不用你的個人 SSH key)——NAS 被入侵時,攻擊者拿到的 key 不能寫入 GitHub
- 方向是 NAS 拉 GitHub,不是 GitHub push NAS(維持「NAS 只出不進」)

**B. D1:Worker 定時 dump → R2 → NAS 拉回**

```
Worker Cron Trigger(每日)
  → D1 export(SQL 文字)
  → 寫入 R2 私有 bucket:backups/d1/site-YYYYMMDD.sql
  → R2 lifecycle rule:保留 30 天自動刪
NAS 排程(每日,錯開時間)
  → rclone sync r2-private:backups /volume1/backup/cloudflare/
```

- NAS 上的 rclone 使用**唯讀 R2 API token**(scoped:僅該 bucket、僅 read)
- 為什麼不讓 Worker 直接推 NAS:違反「NAS 只出不進」,且 Worker 到家用網路的通道本身就是新攻擊面

**C. Nextcloud(C2)→ B2:唯一的絕對規則是 client-side 加密**

- Synology **Hyper Backup**:選 client-side encryption,密碼存 Bitwarden + 列印一份與復原碼同放(**密碼丟失 = 備份全滅,這是最常見的自己坑自己**)
- QNAP 對應:HBS 3,同樣開 client-side encryption
- 或工具無關的做法:`rclone sync` + `crypt` remote → B2
- B2 開啟 **Object Lock / 版本保留 ≥ 30 天**:勒索軟體推上去的加密垃圾不會覆蓋掉可還原的舊版 — 這就是 3-2-1-1-0 裡的「1 份不可變」

### 6.4 快照策略(對抗 T1 + T8)

- NAS 檔案系統快照(Btrfs/ZFS):**每日,保留 30 天;每週,保留 12 週**
- Synology:開啟 Snapshot Replication 的 **immutable snapshot**(WriteOnce);QNAP:快照 + 鎖定
- 快照對 Nextcloud 資料夾與 Docker volume 都要涵蓋
- 注意:快照在同一台 NAS 上,防誤刪與勒索,但**不防 NAS 整台死掉**——那是 TS-659(異機第二份)與 B2(離機第三份)的工作
- 實際的三層鏈:**TS-473A(即時 + 快照)→ TS-659 Pro II(LAN 內異機,版本保留)→ B2(client-side 加密,離機,版本鎖定)**,詳見 §7.4

### 6.5 監控:備份失敗要主動告訴你

沉默失敗的備份系統比沒有備份更危險(你以為有)。

- 所有排程任務結尾 ping **healthchecks.io**(免費):`curl -fsS https://hc-ping.com/<uuid>`
- 任務**沒有**在預期時間 ping → healthchecks 寄 email/推播給你
- 涵蓋:git mirror、rclone pull、Hyper Backup、restic、D1 dump(Worker 端也 ping)

### 6.6 還原演練(3-2-1-1-0 的「0」)

| 週期 | 演練 |
|---|---|
| 每季 | 從 B2 抽 3 個檔案(含 1 張照片)解密還原,驗證內容正確 |
| 每季 | 從 NAS 的 D1 dump 在本機 SQLite 開起來,查一筆資料 |
| 每半年 | 從 NAS git mirror clone 出來,`npm install && npm run build` 成功 |
| 每年 | 紙上推演:「NAS 今天被偷走」— 從 B2 + GitHub 重建的步驟清單走一遍,更新文件 |

行事曆設定重複提醒。**沒排進行事曆的演練等於不存在。**

---

## 7. NAS 與網路加固清單

### 7.1 NAS 本體

```
□ 停用預設 admin/administrator 帳號,另建具名管理帳號 + 2FA
□ 停用不用的服務:SMB1、Telnet、SSH(不用時)、UPnP(路由器端也關)
□ QuickConnect / myQNAPcloud:停用(你有 Tailscale,不需要廠商中繼)
□ 自動安裝安全性更新;訂閱該廠牌 security advisory
□ 防火牆:僅允許內網網段 + Tailscale 介面(100.64.0.0/10)
□ 帳號鎖定:登入失敗 5 次鎖 30 分鐘
□ 移除/停用所有不用的套件(每個套件都是攻擊面)
□ 開啟操作稽核 log
```

### 7.2 網路

```
□ 路由器:關 UPnP、關 WPS、韌體更新
□ 確認零 port forward(用手機 4G 從外部掃自家 IP 驗證,或 §8 的 Shodan 自查)
□ IoT 裝置(感測器、攝影機)放獨立 VLAN/訪客網段,不與 NAS 同段
□ Tailscale ACL:家人裝置只能到 Nextcloud 的 port,不能到 DSM 管理介面
□ Tailscale:開啟 key expiry;離開家庭的裝置立即從 tailnet 移除
```

### 7.3 Ubuntu 開發機

```
□ 全碟加密(重裝時順手做)
□ ufw 預設 deny incoming;SSH 只聽 Tailscale 介面
□ unattended-upgrades 開啟
□ restic 每日備份 home 與 /etc → NAS
```

### 7.4 實機配置:TS-473(A)-8G + TS-659 Pro II

#### 角色分工(硬性)

| | **TS-473(A)-8G(主力機)** | **TS-659 Pro II(備援機)** |
|---|---|---|
| OS | QTS 5.x,持續更新 | QTS 4.2.6(**EOL,永遠不會再有修補**) |
| 角色 | Nextcloud、Tailscale、備份中樞、IoT 收集器、rclone | **純 LAN 內備份接收端,別無其他** |
| 網路 | 內網 + Tailscale | **不設定 gateway 與 DNS** + 路由器防火牆封鎖其對外 → 物理上到不了網際網路 |
| 服務 | 依 §7.1 加固 | 只開 rsync/RTRR 接收;SMB、Web File Station、多媒體、myQNAPcloud 全部停用 |
| 禁止事項 | — | ❌ Nextcloud ❌ Tailscale(舊 QTS 無套件)❌ 任何對外服務 ❌ 存放任何資料的**唯一**副本 |

**理由**:TS-659 Pro II 的韌體停在 QTS 4.2.6 且已 EOL,上面存在已知且永不修補的漏洞(QTS 4.x 正是 Qlocker/DeadBolt 世代勒索軟體的主要標的)。它唯一安全的用法是與網際網路完全隔離的單一用途裝置。但它讓 3-2-1 的「第二份」從同機快照升級為**真正的異機副本**,價值明確。

#### 備份鏈(最終版)

```
TS-473A  即時資料 + 每日快照(30天)+ 每週快照(12週)
   │ rsync/RTRR 單向推送(僅備份帳號,含版本保留)· 夜間窗口
   ▼
TS-659 Pro II  異機第二份(LAN-only,排程上電 02:00–06:00)
   
TS-473A ── HBS 3(client-side 加密)──▶ Backblaze B2  離機第三份(版本鎖定 ≥30 天)
```

- 473A → 659 用**專用備份帳號**(非 admin),只授權目標共享資料夾
- 659 端開版本保留:473A 若被勒索,推過去的是加密垃圾的**新版本**,舊版本仍在
- 659 **排程上電**(僅備份窗口):省電 + 縮短曝露時間 + 大部分時間離線的備份標的天然難被勒索軟體觸及
- healthchecks.io:473A 的推送任務完成後 ping(659 本身不能上網,由 473A 代為回報)

#### TS-659 Pro II 啟用前檢查

```
□ 全碟完整 SMART 掃描(機齡 15 年,先確認碟況再託付資料)
□ 韌體確認在 4.2.6 最終版(最後一版含 CVE-2020-2509 等修補)
□ admin 改強密碼、建立 rsync 專用帳號
□ 停用所有非必要服務與套件
□ 靜態 IP、不填 gateway/DNS;路由器防火牆規則:該 IP 拒絕所有 WAN 方向流量
□ 首次全量同步排夜間(Atom D525 的 rsync 吞吐約 40–70 MB/s,需時較長)
□ 排程上電/關機設定完成
```

#### TS-473(A) 具體對應

- 快照:Storage & Snapshots → 對 Nextcloud 資料夾與 Container volume 所在磁碟區啟用排程快照
- Nextcloud:Container Station 3 以 docker-compose 部署
- Tailscale:App Center 安裝官方套件
- 8GB RAM 對 Nextcloud + 收集器 + 備份任務足夠;若後續加 Immich(機器學習功能吃記憶體)再擴充

---

## 8. Google Search 語法 — 定期自查你的曝險面

> 你要求的「google search 語法」在本文件的角色:**用搜尋引擎的眼睛檢查自己漏了什麼**。這是免費、十分鐘、每季一次的曝險稽核。攻擊者用同樣的語法找目標(Google dorking),你要比他先看到。

### 8.1 每季自查清單

**(1) 我的網站被索引了什麼?**

```
site:yourdomain.com
```
逐頁看。出現任何不該公開的頁面(測試頁、草稿、/lab/ 下不想見人的東西)→ 加 `noindex` 並到 Search Console 申請移除。

**(2) 有沒有文件類檔案外洩?**

```
site:yourdomain.com filetype:pdf
site:yourdomain.com filetype:xlsx OR filetype:docx OR filetype:csv
site:yourdomain.com filetype:sql OR filetype:env OR filetype:log OR filetype:bak
```
最後一行任何結果都是事故,立即處理。

**(3) 有沒有不該被索引的路徑?**

```
site:yourdomain.com inurl:admin OR inurl:login OR inurl:backup OR inurl:test
site:yourdomain.com inurl:lab
```

**(4) 我的 domain 被誰提到、被誰連結?**

```
"yourdomain.com" -site:yourdomain.com
```
一石二鳥:資安面看有沒有被冒用/釣魚引用;SEO 面這就是你的站外提及清單(v2 §12 的量測項)。

**(5) 客戶資訊有沒有跟著我外洩?**(每篇 case study 上線後跑一次)

```
"<客戶真實名稱>" site:yourdomain.com        ← 必須零結果
"<案場真實名稱>" "<你的名字>"               ← 檢查關聯是否已建立在別處
```

**(6) 我的 secret 有沒有進到公開 GitHub?**

```
site:github.com "yourdomain.com" api_key OR token OR password
```
加上 GitHub 原生搜尋:`org:yourname AND (AKIA OR sk-ant OR ghp_)`。私有 repo 的防線是 gitleaks,這條查的是你或別人不小心放到公開的部分。

**(7) 我的名字與 email 的整體足跡**

```
"你的英文名" "Taipei" OT OR Modbus
"你的個人email"
```
確認公開足跡與你想建立的專業形象一致(v2 §7.4 實體一致性的稽核面)。

### 8.2 搜尋引擎以外的必查(同一次做完)

| 工具 | 查什麼 | 頻率 |
|---|---|---|
| **crt.sh** | `%.yourdomain.com` 與 `%.jettastic.com` — Certificate Transparency 會列出你**所有申請過憑證的 subdomain**。這正是「隱藏路徑不是安全機制」的原因,也是檢查有沒有忘記的舊服務還掛著的方法 | 每季 |
| **Shodan / Censys** | 搜自家固定 IP — 驗證對外真的零開放 port | 每季 |
| **Have I Been Pwned** | 你與家人的 email — 外洩後立即改密碼 | 訂閱通知 |
| **Search Console** | 索引涵蓋報告 — 有沒有意外被收錄的路徑 | 每月 |

### 8.3 預防面(讓自查永遠乾淨)

- `robots.txt` 對 Zone B 路徑 `Disallow` — 但記住 **robots.txt 是公告不是門鎖**,它本身就會告訴別人「這裡有東西」。真正的私密內容靠 Tailscale/Access,不靠 robots.txt
- 不想被索引但公開可達的頁(如 `/lab/`):HTML `<meta name="robots" content="noindex">`
- R2 公開 bucket 只放 C0;私有 bucket 一律 presigned URL,不開 public access
- 錯誤頁(404/500)不洩漏技術棧版本資訊

---

## 9. 事故應變速查(印出來或放密碼管理器)

| 事故 | 前 30 分鐘 |
|---|---|
| **API key 洩漏** | 依 §4.3 的使用清單全部輪替 → 查 Cloudflare/供應商用量有無異常 → 檢討洩漏路徑 |
| **NAS 疑似被入侵/勒索** | 拔網路線(不關機,保留記憶體狀態)→ 從乾淨裝置改 Backblaze/B2 密碼(**先保住離機備份**)→ 確認 B2 版本保留完好 → 從快照/B2 評估還原點 |
| **GitHub 帳號異常** | 復原碼登入 → 撤銷所有 session 與 PAT → 檢查 repo 有無惡意 commit → 換密碼 + 重設 2FA |
| **網站被掛不明內容** | Pages 直接 rollback 到上一個 deployment → 檢查 GitHub commit 歷史 → 輪替 deploy 相關 token |
| **Cloudflare 帳號異常** | 復原碼登入 → 撤銷所有 API token → 檢查 DNS 記錄有無被改(釣魚常見手法)|

---

## 10. 落地順序(併入主 Roadmap)

| 併入 Sprint | 本文件的工作 |
|---|---|
| **Sprint 0** | Bitwarden 建立 + 全帳號 2FA + 復原碼離線 · gitleaks + CI |
| **Sprint 2**(NAS 週) | §7.1/7.2 加固清單 · Nextcloud + Tailscale · 快照策略 · **Hyper Backup → B2(加密)** · healthchecks.io 全部接上 · git mirror + rclone pull 排程 |
| **Sprint 3** | D1 dump Worker Cron · robots.txt/noindex 政策 · 隱私聲明頁 |
| **Sprint 3 結束時** | **第一次還原演練**(從 B2 還原 3 個檔案)— 不通過不進 Sprint 4 |
| 每季行事曆 | §8 Google 自查 + §6.6 還原演練 |

---

## 附錄:工具清單總表

| 用途 | 工具 | 費用 |
|---|---|---|
| 密碼/Secret(C3) | Bitwarden 雲端版 | 免費(家庭方案 US$40/年 可選) |
| Secret 掃描 | gitleaks(pre-commit + CI) | 免費 |
| 私密網路 | Tailscale | 免費(3 users/100 devices) |
| NAS→離機備份 | Hyper Backup(QNAP: HBS 3)或 rclone+crypt | 免費 |
| 離機儲存 | Backblaze B2(開版本保留) | ~US$6/TB/月 |
| 雲端備份中繼 | Cloudflare R2 私有 bucket | 10GB 內免費 |
| Ubuntu 備份 | restic → NAS | 免費 |
| 額外加密保險庫 | Cryptomator | 免費 |
| 備份監控 | healthchecks.io | 免費(20 checks) |
| 照片 EXIF 清除 | exiftool / Astro 圖片管線 | 免費 |
| 曝險自查 | Google dorks(§8)+ crt.sh + Shodan + HIBP | 免費 |

**新增月成本:B2 依量計,100–200GB 約 US$1–2/月。** 其餘全部免費。合計仍在 v2 §6.3 的 ~US$7–9/月。
