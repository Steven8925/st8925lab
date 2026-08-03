---
title: 'Modbus Table Address vs. PDU Offset: The Off-by-One Error'
description: 'Why Modbus register 40001 becomes PDU address 0x0000 on the wire — and how this off-by-one trap causes days of debugging.'
lastReviewed: '2025-07'
relatedCaseStudy: 'This exact offset error caused 3 days of debugging in a real chiller monitoring project.'
relatedCaseStudySlug: 'chiller-ot-monitoring'
order: 1
lang: en
translationKey: modbus-pdu-offset
draft: false
---

## Understanding the Modbus Data Model

The Modbus protocol defines four primary data tables:

1. **Discrete Inputs** (Read-Only bits): 1xxxx
2. **Coils** (Read/Write bits): 0xxxx
3. **Input Registers** (Read-Only 16-bit words): 3xxxx
4. **Holding Registers** (Read/Write 16-bit words): 4xxxx

When documentation lists a register like `40001`, it describes both the table (Holding Registers, indicated by the leading `4`) and the 1-indexed item number in that table (`0001`).

## The Table-to-PDU Subtraction Rule

The Modbus application protocol (the PDU on the wire) only addresses items with a 0-indexed offset (0 to 65535). It does **not** include the table designator because the Function Code inherently specifies the table. 

For example, to read `40001`:
- You use Function Code 03 (`Read Holding Registers`).
- The item address is `40001 - 40001 = 0`. So you send `0x0000` on the wire.

Failure to subtract the offset causes the controller to return exceptions or garbage data.

## Practical Debugging

When a PLC manual says "Temperature is at register 40015":
1. Verify if the vendor means `40015` or offset `15` (meaning `40016`). Vendors are notoriously inconsistent.
2. If requesting offset 14 returns an error, try offset 15. The off-by-one error is the most common integration pitfall in industrial protocols.
