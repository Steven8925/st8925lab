# System Architecture & Engineering Patterns

## 1. Technical Stack
- **Frontend**: Vanilla HTML5 + CSS3 (Glassmorphism Cyber Dark theme) + Tailwind CSS + Phosphor Icons.
- **Dual-File Frontend Parity**: `index.html` and `prototype.html` must be kept in exact bitwise synchronization.
- **Backend**: Python 3.11+ / FastAPI (Port 8001, Async REST API).
- **Tool Layer**: FastMCP microservices for structured server-side data extraction, avoiding context window bloat.
- **AI Core**: NVIDIA NIM API with two purpose-specific models (Sam's ruling, 2026-09-24): `nvidia/nemotron-3-ultra-550b-a55b` for offline knowledge-base extraction and `nvidia/nemotron-3-super-120b-a12b` for interactive chat. No other model is permitted.
  - Parameters: `temperature=0.5`, `top_p=1.0`, `max_tokens=1024`, `stream=false`.
  - Mandates: Strict bilingual output (Traditional Chinese + English), followed by execution telemetry:
    `本次共用 {tokens} token, 耗時 {duration} sec, YYYY-MM-DD_HH:MM:SS`.

## 2. Documentation Invariants (ST-Development Skill)
- **`PROMPT.md`**: The Single Source of Truth (SOT) for functional specifications and architecture. Any new engineer or AI can reproduce the project from this document alone.
- **`README.md` (Reverse-Chronological Mandate)**:
  - Must strictly be written in **reverse-chronological order (newest timestamp first, oldest at the bottom)**.
  - Every entry must begin with standard timestamp and model metadata:
    `[YYYY-MM-DD_HH:MM:SS] [Model: <Model_Name> (Thinking: <Level>)]`
  - Bilingual (Traditional Chinese / English).
  - Mandatory two blank lines between separate entries.
- **Write-Verification Principle**:
  - Tools returning "success" is not evidence of file modification on disk. Always verify by reading back content markers or testing with automated test suites.
- **Default to Action**:
  - Non-blocking execution. Silently resolve engineering details, test, verify, and document without prompting unnecessary confirmations.

## 3. Ground Transit & Flight Decision Engine Pattern
- `flight_matrix.py`:
  - `tw_mainland_allowed_flight_routes`: Whitelist restricting domestic mainland flights strictly to `(RMQ, HUN)` and `(TSA, TTT)`.
  - `APPROX_FLIGHT_HOURS`: Only stores genuine flight durations.
- `planner.py`:
  - `assess_feasibility()`: Dynamically calculates rail travel hours for domestic routes and generates calibrated travel-time semantics.
- `index.html` & `prototype.html`:
  - `generateFallbackPlan()`: Dynamically routes domestic trips to ground rail/bus transit, suppresses airfare costs, and injects train numbers and multi-modal transfer alerts.
  - `renderPlan()`: Modal branching for Card 1 action buttons (Official TRA/THSRC portals for rail, Google Flights/Skyscanner for flights).
