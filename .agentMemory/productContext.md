# Product Context & Common Sense Boundaries

## 1. Product Philosophy & Zero-Guessing Axiom
- **Honesty & Ground Truth**: The system must never hallucinate fake flights, synthetic airlines, non-existent train connections, or imaginary subway networks.
- **If missing, fetch; if found, store**: When knowledge base data is thin, immediately query real-world sources and persist the findings, never shrink product specs to accommodate missing data.

## 2. Taiwan Domestic Travel Realities (Mainland Transit Ground Truth)
- **Ground Transit Priority**: Within mainland Taiwan, travel between cities must prioritize ground transportation:
  - Taiwan Railway (TRA / 國營台鐵) Intercity Express (EMU3000 新自強號, 普悠瑪號, 太魯閣號)
  - Taiwan High-Speed Rail (THSRC / 台灣高鐵)
  - Regional & Highway Buses (國光、統聯、和欣、台灣好行)
  - Local City Buses & YouBike 2.0
  - Taxis / Ride-hailing
- **Zero Flight Fabrication on Mainland**:
  - Commercial flights between mainland cities in Taiwan are strictly limited:
    * ONLY Taichung Ching-Chuan-Kang (RMQ) to Hualien (HUN) via Mandarin Airlines (AE731/AE732, ATR 72-600).
    * ONLY Taipei Songshan (TSA) to Taitung (TTT) via Mandarin/Uni Air.
  - There are ZERO commercial flights between Taipei (TPE/TSA) and Hualien (HUN).
  - There are ZERO commercial flights between Kaohsiung (KHH) and Hualien (HUN).
  - Intra-city flights (e.g. Taichung to Taichung) are strictly prohibited (`flight_cost = NT$ 0`).
- **Hualien Corridor Specifics**:
  - From Taipei/Taoyuan: 100% assigned to TRA EMU3000 New Tze-Chiang (e.g. 408次, 423次), single full fare NT$ 440, travel time ~2h 10m.
  - Carrier: "國營台灣鐵路 (TRA 台鐵公司)". Vehicle: "台鐵 EMU3000 新自強號 (城際列車)".
  - Action buttons must link directly to official booking portals:
    * `[🚆 國營台鐵線上訂票 (railway.gov.tw)]` (https://www.railway.gov.tw/tra-tip-web/tip)
    * `[🚄 台灣高鐵官網 (thsrc.com.tw)]` (https://www.thsrc.com.tw/)
    * Skyscanner and Google Flights buttons are completely suppressed for rail trips.
  - Multi-modal guidance for Taoyuan Airport arrivals: Taoyuan Airport MRT (~36 mins to Taipei Main Station) + TRA EMU3000 (~2h 10m to Hualien).
  - Semantics: Always state "Train travel time / 車程時間" instead of "Flight duration / 飛行時間".
- **Local Transit Fact-Checking**:
  - **Tainan**: Currently has NO operational MRT/subway system. Recommend Tainan City Bus (大台南公車 2384.tainan.gov.tw), TRA Shalun branch line (connecting THSRC Tainan Station to Downtown), and YouBike 2.0. NEVER recommend Taipei Metro (metro.taipei) in southern Taiwan.
  - **Taichung**: Taichung MRT Green Line + Taichung City Bus + YouBike 2.0.
  - **Kaohsiung**: Kaohsiung MRT (Red/Orange) + Light Rail (LRT) + City Bus + YouBike 2.0.
  - **Taipei/New Taipei**: Taipei Metro (TRTC) + New Taipei Metro + Danhai/Ankeng LRT + YouBike 2.0.

## 3. UI & Export Standards
- Five-dimensional selectors with mandatory "Other (Custom)" input for every dropdown.
- Triple physical exports: PDF booklet (ReportLab / client-side), Excel budget spreadsheet (.xlsx), and iCalendar schedule (.ics).
