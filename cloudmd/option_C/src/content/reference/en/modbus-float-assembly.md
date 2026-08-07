---
title: '32-bit Float Assembly in Modbus: The 4 Word Order Combinations'
description: 'How 32-bit floating-point numbers are encoded across two 16-bit Modbus registers — and the 4 byte/word order variants you must test.'
lastReviewed: '2025-07'
relatedCaseStudy: 'Word order mismatch was one of four stacked bugs in a chiller monitoring project.'
relatedCaseStudySlug: 'chiller-ot-monitoring'
order: 2
lang: en
translationKey: modbus-float-assembly
draft: false
---

## IEEE 754 in Modbus

Modbus was designed for 16-bit words. When transmitting a 32-bit floating point number (IEEE 754), it must be split across two 16-bit registers. Since the specification doesn't dictate how multi-register values should be ordered, manufacturers implemented four different byte/word order schemes.

Assuming the 4 bytes of a float are `A`, `B`, `C`, and `D` (where A is the MSB and D is the LSB).

## The 4 Combinations

1. **Big Endian (ABCD)**: The standard format. High word first, high byte first.
2. **Little Endian Word Swap (CDAB)**: Extremely common. Low word first, high byte first.
3. **Big Endian Byte Swap (BADC)**: High word first, low byte first.
4. **Little Endian (DCBA)**: Low word first, low byte first.

## Practical Testing

If your sensor reads 25.5 degrees but your software shows `3.57e-43` or `-NaN`, you have an endianness mismatch. The fastest debugging method is to:
1. Guarantee the sensor is holding a known, non-zero float value.
2. Read the two hex registers raw (e.g., `0x41CC`, `0x0000` for 25.5).
3. Apply the 4 parsing variants in your software until the value matches reality.
