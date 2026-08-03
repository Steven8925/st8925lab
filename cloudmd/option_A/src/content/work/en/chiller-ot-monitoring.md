---
title: 'Retrofitting Real-Time Monitoring onto a Legacy Chiller'
summary: 'Built a custom ESP32 Modbus RTU monitoring system for a five-star hotel chiller — achieving ~80% faster fault detection without touching the existing BMS controller.'
sector: 'Hospitality — Five-Star Hotel'
role: 'End-to-end solo delivery (product design, circuit, firmware, backend, operations)'
duration: '14+ months continuous operation'
stack:
  - ESP32
  - RS-485
  - Modbus RTU
  - Siemens Climatix POL687
  - Arduino Core
  - OTA Updates
  - Time-Series DB
results:
  - metric: 'Fault Detection Time'
    value: '~80% reduction'
  - metric: 'Inspection Hours'
    value: '~50% reduction'
  - metric: 'Continuous Operation'
    value: '14+ months'
  - metric: 'Unhandled Failures'
    value: 'Zero'
order: 1
lang: en
translationKey: chiller-ot-monitoring
draft: false
---

## Context & Constraints
A Turbocor centrifugal chiller managed by a Siemens Climatix POL687 controller provides comfort cooling for an entire five-star hotel. The ONLY visibility interface was the PLC display and a physical alarm lamp. No historical data, no remote alerts.

Strict constraints: (1) Zero modifications to the OEM controller (warranty), (2) No shutdown windows (24/7 hotel ops), (3) Budget 8-10x below OEM/BMS quotes.

## The Problem
Faults at 2 AM went unnoticed until building temperature rose and guests complained. Technicians spent hours daily on manual inspection rounds. Minor anomalies escalated into catastrophic shutdowns with zero data trail.

## Options Considered & Why Rejected
- **OEM Remote Monitoring Package**: Rejected — 8-10x the budget, potential vendor lock-in. [GAP: exact quote multiplier to be confirmed]
- **Full BMS Retrofit**: Rejected — over-scoped for single asset, long lead time, high cost.
- **Custom ESP32 Retrofit (Chosen)**: Low hardware cost, no vendor lock-in, client retains full data ownership.

## What I Built
Architecture:
```text
Turbocor Chiller (Siemens Climatix POL687)
       │  RS-485, Modbus RTU (read-only)
       ▼
ESP32 Custom PCB (Arduino core, OTA-updatable)
       │  Outbound HTTPS
       ▼
Backend + Time-Series Database
       ├──▶ Web Dashboard (historical trends)
       ├──▶ Mobile Dashboard (live status)
       └──▶ Alert Engine ──▶ Push Notifications
```
Monitored parameters: compressor speed, chilled water supply/return temperatures, condenser water temps, system pressures, fault/alarm codes.

## The Hard Part
Initial firmware brought up the communication link but returned only zeros across all registers. Debugging revealed **four independent, stacked defects** masking each other:

1. **Wrong Baud Rate**: Firmware defaulted to 9600; PLC was configured at 19200. [GAP: confirm exact values]
2. **Wrong Function Code**: Used FC03 (Read Holding Registers) when the PLC exposed data on FC04 (Read Input Registers).
3. **Table Address vs. PDU Offset**: Vendor docs listed register 40001; code sent 40001 on the wire instead of subtracting the 40001 base to get PDU address 0x0000.
4. **Float32 Word Order**: 32-bit floats spanned two registers. Firmware assumed Big Endian word order; PLC used Little Endian word swap — yielding garbage values even when addressed correctly.

Each bug independently produced the same symptom (all zeros or garbage), making isolation extremely difficult.

## Outcome
- **~80% cut in fault detection time**: Automated push alerts reduced response from hours to minutes.
- **~50% reduction in inspection hours**: Digital status monitoring replaced routine physical rounds.
- **Continuous historical record**: From zero data to seconds/minutes resolution time-series logging.
- **14+ months continuous operation**: Zero unhandled site failures.
[GAP: exact pre-retrofit baseline numbers to be confirmed]

## What I'd Do Differently
- Build a Modbus register map verification tool before writing firmware — would have caught the address offset and function code issues in minutes instead of days.
- Add a field-swappable RS-485 transceiver module for faster baud rate testing.

## My Role
End-to-end solo delivery: product concept, circuit design, PCB specification, firmware development, backend service, dashboard UI, deployment, and ongoing operations support. [GAP: confirm if physical wiring was self-performed or outsourced]
