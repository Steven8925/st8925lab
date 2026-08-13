---
title: 'Modbus Table Address vs. PDU Offset: The Off-by-One Error'
description: '為什麼 Modbus 暫存器 40001 在傳輸線上會變成 PDU 地址 0x0000 — 探討這個常見的差一錯誤如何導致數天的除錯地獄。'
lastReviewed: '2025-07'
relatedCaseStudy: '此偏移量錯誤在實際的冰水主機監控專案中導致了三天的除錯。'
relatedCaseStudySlug: 'chiller-ot-monitoring'
order: 1
lang: zh
translationKey: modbus-pdu-offset
draft: false
---

## 理解 Modbus 資料模型

Modbus 協定定義了四個主要的資料表：

1. **離散輸入 (Discrete Inputs)** (唯讀位元): 1xxxx
2. **線圈 (Coils)** (讀寫位元): 0xxxx
3. **輸入暫存器 (Input Registers)** (唯讀 16 位元字組): 3xxxx
4. **保持暫存器 (Holding Registers)** (讀寫 16 位元字組): 4xxxx

當文件列出如 `40001` 的暫存器時，它同時描述了表格（保持暫存器，由開頭的 `4` 表示）和該表格中從 1 開始的項目編號 (`0001`)。

## 表地址與 PDU 的相減法則

Modbus 應用協定（在線路上的 PDU）僅使用從 0 開始的偏移量（0 到 65535）來定址項目。它**不會**包含表格指定符，因為功能碼本身就指定了表格。

例如，要讀取 `40001`：
- 你使用功能碼 03 (`Read Holding Registers`)。
- 項目地址為 `40001 - 40001 = 0`。所以你在線路上送出 `0x0000`。

如果沒有減去這個偏移量，控制器將回傳例外錯誤或無效資料。

## 實務除錯技巧

當 PLC 手冊寫著「溫度在暫存器 40015」時：
1. 確認供應商指的是 `40015` 還是偏移量 `15` (意味著 `40016`)。各家廠商的標示方式出奇地不一致。
2. 如果請求偏移量 14 回傳錯誤，嘗試偏移量 15。差一錯誤 (off-by-one error) 是工業通訊協定整合中最常見的陷阱。
