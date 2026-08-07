# Option B — Evolve React Site + `/lab/` Interactive Section
## Implementation Plan (English)

> Keeps the current React/Vite stack while aligning content and navigation with `cloudmd/` vision. Interactive terminal and agent demos preserved as `/lab/` showcase.

---

## Overview

Instead of a full rebuild, **Option B evolves the existing React/Vite site** to match the `cloudmd/` content strategy while retaining the interactive components (TerminalHero, AI Agent cards, IoT charts) as a dedicated `/lab/` section — a living technical playground that demonstrates coding ability.

---

## Architecture

```
st8925lab.com (Cloudflare Pages)
│
├── Main Site (React SPA with react-router-dom)
│   ├── / (Homepage — professional OT/IT pitch)
│   ├── /work/ (Case studies)
│   ├── /work/chiller-ot-monitoring (Anchor case study)
│   ├── /reference/ (Technical reference articles)
│   ├── /tools/ (Industrial Modbus tools)
│   ├── /tools/modbus-address-converter
│   ├── /tools/modbus-float-decoder
│   ├── /capabilities/ (Buyer-language services)
│   ├── /about/ (Credentials + contact)
│   │
│   └── /lab/ ★ PRESERVED INTERACTIVE SECTION ★
│       ├── /lab/terminal (TerminalHero demo)
│       ├── /lab/ai-agents (Agent showcase cards)
│       ├── /lab/iot-dashboard (Live IoT charts)
│       ├── /lab/visitor-globe (Privacy-preserving analytics)
│       └── /lab/security-architecture (NAS + Zero Trust diagram)
│
├── Zone B: API Layer (Cloudflare Workers)
│   ├── AI proxy
│   ├── Analytics ingest
│   └── Tool APIs
│
└── Zone C: Private (NAS + Tailscale)
    ├── Nextcloud
    └── 3-2-1 backup
```

---

## What Changes vs. Current Site

### ✅ Kept (Moved to `/lab/`)
| Component | Current Location | New Location |
| :--- | :--- | :--- |
| TerminalHero | Homepage hero | `/lab/terminal` |
| AIAgentShowcase | Main tab "AI Agents" | `/lab/ai-agents` |
| IoTAnalytics | Main tab "IoT Analytics" | `/lab/iot-dashboard` |
| SecurityArchitecture | Main tab "Security" | `/lab/security-architecture` (updated diagram) |

### 🔄 Modified
| Item | Change |
| :--- | :--- |
| **Navigation** | Replace tab system → `react-router-dom` with 5-section nav + `/lab/` link |
| **Homepage** | New professional hero: 10-second OT/IT pitch, result chips, case study links |
| **Design System** | Cyan `#06b6d4` → Blue `#2563EB`; neon glows → clean professional; add Gold `#C9A227` accent |
| **NAS Diagram** | CF Tunnel → Tailscale; update SecurityArchitecture component |
| **Typography** | Add Noto Sans TC for Chinese content support |
| **wrangler.json** | `"blue-butterfly-f996"` → `"st8925lab"` |

### 🆕 New Components to Build
| Component | Priority | Description |
| :--- | :--- | :--- |
| **CaseStudyPage** | P0 | 8-section structured layout (Context → Problem → Options → Build → Hard Part → Outcome → Reflection → Role) |
| **CaseStudyCard** | P0 | Above-the-fold card with meta bar, result chips, summary |
| **ModbusAddressConverter** | P0 | Table ↔ PDU Offset ↔ Vendor convention converter |
| **ModbusFloatDecoder** | P0 | 4 word/byte order variant decoder |
| **ReferencePage** | P1 | Markdown-rendered technical article layout |
| **CapabilitiesPage** | P1 | Buyer-language service cards |
| **DataTable** | P1 | Sortable/filterable vendor comparison table |
| **ContactCTA** | P0 | Floating/fixed contact button |

---

## Design System Update

```css
/* BEFORE (Cyber Neon) */          /* AFTER (Professional Dark) */
--cyan: #06b6d4;            →     --blue: #2563EB;
--purple: various            →     --blue-deep: #0F2A47;
--emerald: #10b981;          →     --gold: #C9A227; /* < 10% surface */
--bg: #080c14;               →     --bg: #0A0E14;
--surface: #0f172a;          →     --surface: #131A24;

/* Neon glow effects */      →     /* Clean borders & subtle shadows */
box-shadow: 0 0 20px cyan;  →     border: 1px solid rgba(37,99,235,0.2);

/* Typography additions */
+ font-family: 'Noto Sans TC' (subsetted) for Chinese text
```

---

## Navigation Refactor

```
BEFORE (Tab-based SPA):
  [Command Center] [AI Agents] [IoT Analytics] [Security]

AFTER (Router-based with 5+1 sections):
  [Work] [Reference] [Tools] [Capabilities] [About]  [🧪 Lab]  [Contact →]
```

Implementation:
```bash
npm install react-router-dom
```

---

## Content to Create

### P0 — Must Have (Sprint 1–2)
1. **Chiller OT Monitoring Case Study** — Full 8-section write-up based on `case-study-chiller-v0.9.md`
2. **Homepage** — New professional hero with 10-second pitch
3. **Modbus Address Converter Tool** — Interactive, with 3+ static pre-rendered examples
4. **Modbus Float Decoder Tool** — Interactive, 4 word/byte order combinations

### P1 — Should Have (Sprint 3–4)
5. **Reference: Modbus PDU Offset Errors** — Technical article
6. **Reference: 32-bit Float Assembly Matrix** — Reference table
7. **Capabilities Page** — 5 service descriptions in buyer language
8. **About Page** — Credentials + contact
9. **Case Studies 2 & 3** — Multi-tenant maintenance system, Rail networking selection

### P2 — Nice to Have (Sprint 5+)
10. **Vendor Comparison Data Page** — Sortable table + CSV download
11. **Lab: Visitor Globe** — Privacy-preserving analytics visualization
12. **Bilingual Support** — i18n routing for zh/en (harder in React vs. Astro)

---

## Sprint Roadmap

| Sprint | Duration | Deliverables |
| :--- | :--- | :--- |
| **Sprint 1** | 1.5 weeks | Install react-router-dom, refactor navigation, new homepage hero, design system update (colors/typography), move existing components to `/lab/` routes |
| **Sprint 2** | 2 weeks | Chiller Case Study page, CaseStudyCard component, P0 Modbus tools (Address Converter + Float Decoder), fix wrangler.json |
| **Sprint 3** | 2 weeks | 2 Reference articles, Capabilities page, About page, SecurityArchitecture update (Tailscale) |
| **Sprint 4** | 1.5 weeks | Case Studies 2 & 3, ContactCTA, SEO meta tags + JSON-LD |
| **Sprint 5** | Ongoing | Vendor data page, Visitor Globe, i18n, NAS backup setup |

---

## SEO Limitations & Mitigations

> [!WARNING]
> React SPA has inherent SEO disadvantages compared to Astro SSG. These mitigations help but cannot fully close the gap.

| Issue | Mitigation |
| :--- | :--- |
| Client-side rendering = poor crawlability | Use `react-snap` or `vite-plugin-ssr` for pre-rendering |
| No native Content Collections | Build a simple Markdown loader with `gray-matter` + `react-markdown` |
| JS bundle > 100 KB budget | Aggressive code splitting with `React.lazy()` and route-based chunks |
| No native i18n routing | Manual `/en/` and `/zh/` route prefixes with context provider |
| No server-side JSON-LD | Inject JSON-LD via `react-helmet-async` in each page component |

---

## Security Updates Required

| Item | Current | Required |
| :--- | :--- | :--- |
| NAS Access diagram | CF Tunnel | **Tailscale** (zero open ports) |
| "CF TUNNEL ACTIVE" badge | Displayed | **Remove** or change to "TAILSCALE MESH" |
| Data flow direction | Inbound to NAS | **NAS outbound only** (push to R2/B2) |
| Data classification | Not shown | Add C0/C1/C2/C3 labels to architecture diagram |
| Backup strategy | Generic tips | Show 3-2-1-1-0 with dual NAS + B2 |

---

## `/lab/` Section — The Unique Advantage

The `/lab/` section is Option B's **key differentiator** over Option A. It serves as:

1. **Technical Proof**: "I don't just write about code — here's a live terminal, real-time charts, and agent orchestration running in your browser."
2. **Case Study Source**: The Lab itself becomes a case study (e.g., *"Building a privacy-preserving visitor analytics globe"*).
3. **Engagement Hook**: Interactive demos keep visitors on-site longer, improving time-on-page metrics.
4. **Interview Asset**: Demonstrates React, data visualization, and real-time systems capabilities for headhunters.

### Lab Page Structure
```
/lab/
├── Hero: "The Lab — Interactive Technical Experiments"
├── Card Grid:
│   ├── Terminal Demo → /lab/terminal
│   ├── AI Agent Orchestration → /lab/ai-agents
│   ├── IoT Dashboard → /lab/iot-dashboard
│   ├── Visitor Globe → /lab/visitor-globe
│   └── Security Architecture → /lab/security-architecture
└── Footer: "These experiments showcase real-world skills.
     See them applied in production → /work/"
```

---

## Trade-offs vs. Option A

| Dimension | Option A (Astro) | Option B (React + Lab) |
| :--- | :--- | :--- |
| **SEO** | ★★★★★ Native SSG | ★★★☆☆ Requires pre-rendering hacks |
| **JS Budget** | ★★★★★ Zero by default | ★★★☆☆ Requires aggressive splitting |
| **i18n** | ★★★★★ Native Astro i18n | ★★☆☆☆ Manual routing |
| **Content Management** | ★★★★★ Markdown Collections | ★★★☆☆ Custom Markdown loader |
| **Interactive Demos** | ★★☆☆☆ Must rebuild as islands | ★★★★★ Already built |
| **Time to Market** | ★★★☆☆ ~8-10 weeks | ★★★★★ ~5-7 weeks |
| **`cloudmd/` Compliance** | ★★★★★ 100% aligned | ★★★☆☆ ~70% aligned |
| **Maintenance** | ★★★★★ Simple static | ★★★☆☆ SPA complexity |

---

## Estimated Effort

**Total: ~5–7 weeks** (Sprints 1–5, solo developer)

| Phase | Weeks | Priority |
| :--- | :--- | :--- |
| Navigation refactor + Design system + Homepage | 1.5 | P0 |
| Chiller Case Study + P0 Tools | 2 | P0 |
| Reference + Capabilities + About | 2 | P1 |
| More Case Studies + SEO + Data | 1.5 | P1 |
| i18n + Lab polish | Ongoing | P2 |
