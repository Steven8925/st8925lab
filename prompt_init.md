在這目錄下, c:\Claude Projects\11_st8925lab\ 是我的網站 , 部屬在cloudflare, st8925lab.com 裡

這個網站可看作是展現我個人的成果的網站, 因此, 每個project 下, 都是一個個獨立的頁面, 內容
未來我可以個別管理每個目錄下的頁面內容 

本網站開發時, 若python功能可以勝任, 則優先考量python, 但若其他工具效果, 能力比python 佳, 則使用之, 過程中請以專業的角度給我建議與規劃 


在目前的基礎下, 我有新需求

如附截圖, 有6個 projects,  (請先分析此目錄下所有檔案, 了解我做過什麼)
1) 在本目錄下, 建立6個sub-folders, 為index.html 中的每個 project 有個相對應的folder

2) 為各別的project 建立一個index.html, 並且在頁面左上角有個名字,st8925lab. 當click it, 就回到主頁(首頁 , st8625lab.com), home. 且這名字一樣套用 在主頁st8925lab 的動態效果

3) project 下的 index.html : "this is "Project XX" home page. Welcome to "Project XX" , XX= 01~06, project的編號. 

4) 方便網頁編輯與管理 : sub folder name 與project name 1:1 對應. 現在是 project 01, 02..., 但未來, 當我更改網站上的project name , 在程式裡, 對應的sub-folder name 要做同步名字更新, 請注意, 且寫進memory 中 , 與相關 md file

5) prompt.md : 文件目的是讓AI工具, 只要讀了這file就可以做出一樣的結果. 

6) readme.md : 文件目的是讓AI工具, 知道開發過程中的變化, 如有需要, 也將我在過程中的要求一一記錄下來. 可加入日期, 知道整個開發歷程與時間軸

7) 上述 sub folder 內也會有各自的 readme.md, prompt.md, 文件要求規範與既有的文件相同

8) 先分析我的需求, 確認後再製作. 製作完成時, 自己先檢查確認, 沒問題後再讓我驗證, 我驗證過後, 將summary 寫入 README.md, PROMPT.md 中, 嚴謹, 仔細, 中英文描述 - 這原則是不變的, 全部適用各個project , 請記住, 寫進memory 中

========================================================================

一、 目錄與資料夾架構 (Directory Structure)
6 個專案子資料夾：對應首頁附圖中的 6 個專案 (PROJECT 01 至 PROJECT 06)，將於根目錄建立 6 個對應的子資料夾（名稱與專案名稱維持 1:1 對應）。

未來維護機制：若未來更改網站上的專案名稱，對應的子資料夾名稱與程式設定將同步更新，並確實記錄於記憶與相關 Markdown 文件中。

二、 頁面內容與互動設計 (Page Design & Interaction)
首頁返回與動態效果：各專案子資料夾內的 index.html，其頁面左上角皆須放置 st8925lab 字樣：

點擊該字樣可導向主頁 (st8925lab.com)。

該字樣必須完整套用與主頁 st8925lab 相同的動態效果。

頁面文字規範：各專案 index.html 內文需統一包含以下格式：

this is "Project XX" home page. Welcome to "Project XX" (其中 XX 為 01 到 06 的專案編號)。

三、 文件規範與管理 (Documentation Standards)
根目錄與子資料夾文件：

prompt.md：記錄完整提示詞與規範，確保 AI 工具能依此重現相同結果。

readme.md：記錄開發過程中的變更、需求與時間軸（包含日期）。

語言與品質要求：全面採用中英文雙語描述，維持高度嚴謹與細緻。

四、 執行工作流程 (Execution Workflow)
現階段：已完成需求分析與確認（即目前步驟）。

製作階段：確認無誤後，將開始著手建立子資料夾、各專案 index.html、動態連結效果，以及相對應的 prompt.md 與 readme.md。

驗證與交付：製作完成後會進行自我檢查，確認無誤後再交由您進行驗證。

歸檔階段：經您驗證通過後，會將最終 summary 寫入各層級的 README.md 與 PROMPT.md 中。