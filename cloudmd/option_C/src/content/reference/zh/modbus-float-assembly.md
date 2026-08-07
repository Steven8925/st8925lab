---
title: '32-bit Float Assembly in Modbus: The 4 Word Order Combinations'
description: '探討 32 位元浮點數如何橫跨兩個 16 位元的 Modbus 暫存器進行編碼，以及必須測試的 4 種字節/字組順序變體。'
lastReviewed: '2025-07'
relatedCaseStudy: '在冰水主機監控專案中，字節順序不匹配是互相疊加的四個錯誤之一。'
relatedCaseStudySlug: 'chiller-ot-monitoring'
order: 2
lang: zh
translationKey: modbus-float-assembly
draft: false
---

## Modbus 中的 IEEE 754

Modbus 最初是為 16 位元字組設計的。當傳輸 32 位元浮點數 (IEEE 754) 時，它必須被拆分到兩個 16 位元暫存器中。因為規範沒有規定多暫存器數值該如何排序，製造商實作了四種不同的字節 (Byte)/字組 (Word) 順序方案。

假設浮點數的 4 個位元組為 `A`、`B`、`C` 和 `D`（其中 A 為最高有效位元，D 為最低有效位元）。

## 4 種組合

1. **Big Endian (ABCD)**：標準格式。高位字組在前，高位位元組在前。
2. **Little Endian Word Swap (CDAB)**：極其常見。低位字組在前，高位位元組在前。
3. **Big Endian Byte Swap (BADC)**：高位字組在前，低位位元組在前。
4. **Little Endian (DCBA)**：低位字組在前，低位位元組在前。

## 實務測試建議

如果你的感測器讀數為 25.5 度，但軟體顯示為 `3.57e-43` 或是 `-NaN`，這代表你的端序 (endianness) 錯誤。最快的除錯方法是：
1. 確保感測器當下保持一個已知且非零的浮點數值。
2. 直接讀取兩個暫存器的原始十六進位數值（例如，代表 25.5 的 `0x41CC`, `0x0000`）。
3. 在軟體中套用 4 種解析變體，直到輸出的數值與實際相符。
