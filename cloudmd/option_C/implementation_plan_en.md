# Option A — Full Astro SSG Rebuild
## Implementation Plan (English)

> Aligns 100% with `cloudmd/` PROJECT_BRIEF_v2 and PROJECT_DECISIONS

---

## Overview

Rebuild the entire `st8925lab.com` website from scratch using **Astro SSG**, replacing the current React/Vite SPA. This option fully implements the professional OT/IT portfolio vision defined in the `cloudmd/` design documents.

---

## Architecture

```
st8925lab.com (Cloudflare Pages)
├── Zone A: Public Site (Astro SSG)
│   ├── / (Homepage — 10-second professional pitch)
│   ├── /work/ (4–5 structured case studies)
│   ├── /reference/ (Modbus pillar + cluster pages)
│   ├── /tools/ (P0 industrial Modbus tools)
│   ├── /capabilities/ (buyer-language service list)
│   └── /about/ (credentials + contact CTA)
│
├── Zone B: API Layer (Cloudflare Workers)
│   ├── AI proxy (on-demand, single page)
│   ├── Analytics ingest (aggregated, no raw IP)
│   └── R2 presigned URLs
│
└── Zone C: Private (NAS + Tailscale)
    ├── Nextcloud (family files/photos)
    ├── Nextcloud Talk + coturn
    └── 3-2-1 backup pipeline
```

---

## Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | Astro 4.x + Tailwind CSS | Zero JS by default, Content Collections, native i18n |
| **Interactive Islands** | Vanilla JS / Alpine.js | JS budget < 100 KB gzipped per page |
| **Hosting** | Cloudflare Pages | Free tier, auto-deploy from private GitHub repo |
| **API** | Cloudflare Workers (TypeScript) | AI proxy, tool APIs, analytics ingest |
| **Database** | Cloudflare D1 + KV | D1 for aggregated stats; KV for rate limiting |
| **Storage** | Cloudflare R2 | Zero egress fees for media/CSV/PDF assets |
| **CMS** | Git as CMS (Markdown in repo) | Version-controlled content, no external CMS |
| **NAS Access** | Tailscale | Zero open WAN ports, native mobile backup |
| **Backup** | QNAP TS-473A → TS-659 → Backblaze B2 | 3-2-1-1-0 strategy with client-side encryption |
| **Secrets** | Bitwarden + `wrangler secret put` | C3 data never in Git |

---

## Design System

```css
/* Color Tokens */
--bg:        #0A0E14;   /* Near-black background */
--surface:   #131A24;   /* Card / section background */
--blue:      #2563EB;   /* Primary: interactive elements, links */
--blue-deep: #0F2A47;   /* Gradients, Hero base */
--gold:      #C9A227;   /* Accent (< 10% surface, titles/borders only) */
--text:      #E6EDF5;   /* Primary text */
--text-dim:  #8B98A9;   /* Secondary text */

/* Typography */
English: Inter or IBM Plex Sans
Chinese: Noto Sans TC (MUST be subsetted)
Code:    IBM Plex Mono
```

---

## Navigation (Max 5 Items)

```
Work · Reference · Tools · Capabilities · About  [Contact CTA]
```

---

## Content Strategy: Dual Engine

### Traffic Engine (SEO & AI Discovery)
| Section | Purpose | Content |
| :--- | :--- | :--- |
| **Reference** | Long-tail search capture | Modbus pillar page + 5–6 cluster articles |
| **Tools** | Competitive moat + backlinks | P0: Modbus Address Converter, Float Decoder |
| **Data** | Proprietary dataset authority | Vendor comparison matrix (CSV download) |

### Conversion Engine (Business Inquiries)
| Section | Purpose | Content |
| :--- | :--- | :--- |
| **Work** | Proof of competence | 4–5 structured case studies |
| **Capabilities** | Buyer-language services | OT/IT integration, protocol bridging, delivery docs |
| **About** | Trust & contact | Credentials, certifications, contact CTA |

### Mandatory Cross-Link Rule
Every Reference/Tool page footer **must** link to a Case Study with causal context:
> *"This Modbus register offset error caused a 3-day debug in a real chiller retrofit project → [View full case study](/work/chiller-ot-monitoring)"*

---

## Sprint Roadmap

| Sprint | Duration | Deliverables |
| :--- | :--- | :--- |
| **Sprint 0** | 2 days | Domain DNS, Google Search Console, Bing Webmaster, `site` repo + CI + gitleaks |
| **Sprint 1** | 2 weeks | Astro + Design System + i18n skeleton + Cloudflare Pages deploy + **Homepage live** + **Chiller Case Study** |
| **Sprint 2** | 1.5 weeks | NAS + Nextcloud + Tailscale + Talk + coturn + 3-2-1 backup + photo upload test |
| **Sprint 3** | 2 weeks | Reference pillar page + 2 cluster pages + JSON-LD + sitemap + RSS + hreflang |
| **Sprint 4** | 2 weeks | P0 Tools (Modbus Address Converter + Float Decoder) + public repo + static examples + FAQ |
| **Sprint 5** | 2 weeks | Vendor Comparison data page + Case Studies 2 & 3 |
| **Sprint 6** | Ongoing | AI Assistant (single page) + Visitor Globe `/lab/` + analytics case study |

### Sprint 1 Definition of Done
> A stranger opens the URL in a browser and within 10 seconds understands your professional positioning and can read one complete case study.

---

## SEO & AI Visibility

- JSON-LD schemas: `Person`, `TechArticle`, `SoftwareApplication`, `Dataset`, `FAQPage`
- `llms.txt` for Perplexity/Claude agents
- AI bot crawling: allow GPTBot, ClaudeBot, PerplexityBot
- Tool pages: at least 3 pre-rendered static HTML examples before interactive widget
- `sitemap.xml`, `robots.txt`, `hreflang` (zh/en)
- Definition-first writing, Q&A headings, answer-first blocks

---

## Bilingual i18n

- Routes: `/en/...` and `/zh/...`
- Strategy: **Query-targeted localization** (not literal translation)
- Chinese font: Noto Sans TC with mandatory subsetting (prevent 2–4 MB font load)
- Astro native i18n + `hreflang` tags

---

## Security Controls

- **Data Classification**: C0 (Public) → C1 (Internal) → C2 (Private, NAS only) → C3 (Confidential, Bitwarden only)
- **Pre-commit**: `gitleaks` hook + CI scanning
- **Visitor Privacy**: Aggregated counts only `(date, country, region, count)`, no raw IP
- **AI Assistant**: Worker proxy (keys server-side), Turnstile, per-session token limits, monthly hard cap
- **Case Studies**: Full de-identification checklist (mask clients, strip EXIF, redact IPs)
- **Quarterly Audits**: Google dorks, crt.sh, Shodan/Censys, Have I Been Pwned

---

## Repository Structure

```
site/ (Private GitHub repo)
├── astro.config.mjs
├── .gitleaks.toml
├── .github/workflows/ci.yml
├── src/
│   ├── content/
│   │   ├── work/en/ & work/zh/        # Case Studies
│   │   ├── reference/en/ & reference/zh/
│   │   └── data/
│   ├── components/
│   ├── layouts/
│   ├── pages/en/ & pages/zh/
│   └── styles/tokens.css
├── public/
│   ├── robots.txt
│   ├── llms.txt
│   └── favicon/

api/ (Separate Private repo)
├── src/ (ai-proxy, tools, analytics)
├── schema/d1.sql
└── wrangler.toml

modbus-tools/ (Public repo — P0 moat)
├── src/
├── README.md (comprehensive, backlink-worthy)
└── LICENSE
```

---

## What Gets Deleted from Current Site

- ❌ React 18 + Vite + all React components
- ❌ TerminalHero with typing animation
- ❌ AIAgentShowcase with simulated agent cards
- ❌ IoTAnalytics with fake telemetry SVG charts
- ❌ SecurityArchitecture with CF Tunnel diagram
- ❌ Cyber neon design system (cyan/purple/emerald glows)
- ❌ Tab-based SPA navigation

---

## Estimated Effort

**Total: ~8–10 weeks** (Sprints 0–6, solo developer)

| Phase | Weeks | Priority |
| :--- | :--- | :--- |
| Infrastructure + Homepage + First Case Study | 2.5 | P0 |
| NAS + Backup | 1.5 | P0 |
| Reference + SEO | 2 | P0 |
| P0 Tools | 2 | P0 |
| Data + More Case Studies | 2 | P1 |
| AI Assistant + Lab | Ongoing | P2 |
