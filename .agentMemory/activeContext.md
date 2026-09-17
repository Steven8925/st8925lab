# Active Context & Current Focus

## 1. Recent Accomplishments (2026-09-17)
- **Milestone 11 (Full 20 Taiwan Counties KB & Ground Transit Engine)**:
  - Built comprehensive knowledge base manifests and JSON files for all 20 administrative counties of Taiwan.
  - Eradicated "Taichung to Taichung" flight hallucinations; set flight cost to NT$ 0 for domestic overland trips.
  - Calibrated Tainan local transit to Tainan City Bus and Shalun line, completely eliminating inappropriate Taipei Metro references.
- **Milestone 12 (Hualien Rail Transit & Official Booking Portals)**:
  - Checked Taiwan domestic civil aviation reality: zero commercial flights exist between Taipei/Taoyuan and Hualien.
  - Grounded Taipei-Hualien route 100% on TRA EMU3000 New Tze-Chiang expresses (Outbound 408次 07:30-09:40; Inbound 423次 16:30-18:45, NT$ 440).
  - Replaced Card 1 flight comparison buttons with official portals:
    * `[🚆 國營台鐵線上訂票 (railway.gov.tw)]`
    * `[🚄 台灣高鐵官網 (thsrc.com.tw)]`
  - Fixed feasibility banner to state train travel time (~2.1h) rather than flight duration.
  - Injected 【✈+🚆 飛機加火車聯運須知】 for Taoyuan Airport arrivals.
- **Documentation Standards Synchronized**:
  - Reverse-chronological README rule updated across `d:\st8925lab\PROMPT.md`, `Travel-Assistance\PROMPT.md`, `st-development-skill.md`, and `d:\st-development-skill.md`.
  - Travel-Assistance `README.md` and root `README.md` updated with Milestone 12 and newest timestamped decision logs at top.

## 2. Verification Status
- Frontend DOM rendering tests (`test_rendered_card1.js`): **100% PASS**.
- Hualien route verification (`verify_hualien_plan.js`): **100% PASS**.
- Backend test suite (`python -m pytest tests/`): **232 passed, 27 subtests passed (38.10s) - 100% PASS**.
- Main website verification (`python verify.py`): **13 categories ALL CHECKS PASSED**.

## 3. Git Status
- `Travel-Assistance` submodule: Clean, committed as `b16562e`, pushed to `origin main`.
- `st8925lab` root repository: Clean, committed as `666442c`, pushed to `origin main`.
