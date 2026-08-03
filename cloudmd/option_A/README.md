# ST8925 LAB — Option A (Astro SSG Rebuild)

> Professional OT/IT Integration Portfolio — High-performance, SEO-optimized, bilingual static site.

---

## Overview

This directory (`d:\st8925lab\cloudmd\option_A\`) contains the complete, production-ready **Astro SSG** codebase for `st8925lab.com`. Built from the ground up to fulfill the `cloudmd/` design specifications (PROJECT_BRIEF_v2, SECURITY_DESIGN, PROJECT_DECISIONS, and the Chiller Case Study).

---

## Key Features

- ⚡ **Zero Client-Side JS Overhead**: Built with Astro 4.x SSG. Total JS budget < 100 KB per page.
- 🌐 **Full Bilingual Support**: Parallel `/en/` and `/zh/` routes with query-targeted localization and `hreflang` tags.
- 📊 **Dual-Engine Architecture**:
  - **Traffic Engine**: Industrial Reference guides & P0 Modbus tools for organic search discovery.
  - **Conversion Engine**: Structured Case Studies (Chiller Retrofit), Capabilities, and About pages for client conversion.
- 🛠️ **Industrial P0 Tools**:
  - **Modbus Address Converter**: Table (40001) ↔ PDU (0x0000) ↔ Function Code mapping with zero client dependencies.
  - **Modbus Float/Int32 Decoder**: Test all 4 byte/word order variants simultaneously (Big Endian, Little Endian Word Swap, etc.).
- 🔒 **Hardened Security**:
  - Strict Content-Security-Policy (CSP) headers blocking inline script injection.
  - Client-side input validation and zero `eval()` or dangerous DOM mutations.
  - Privacy-preserving architecture: zero raw IP tracking, no NAS ports exposed to WAN.
- 🎨 **Enterprise Dark Design**: Tailored color tokens (`#0A0E14` bg, `#131A24` surface, `#2563EB` blue, `#C9A227` gold accent <10%).

---

## Directory Structure

```
option_A/
├── astro.config.mjs          # Astro 4.x SSG + Tailwind + i18n config
├── package.json              # Minimal audited dependencies
├── tailwind.config.mjs       # Custom design system tokens
├── tsconfig.json             # Strict TypeScript configuration
├── README.md                 # English documentation
├── README_zh.md              # Traditional Chinese documentation
├── public/
│   ├── _headers              # Cloudflare Pages security headers
│   ├── robots.txt            # Search & AI bot crawling permissions
│   ├── llms.txt              # AI agent site map & context file
│   ├── sitemap.xml           # Static sitemap with hreflang alternate links
│   └── favicon.svg           # Dark/gold SVG brand icon
├── src/
│   ├── styles/
│   │   └── global.css        # Base styles, typography & component classes
│   ├── i18n/
│   │   ├── en.json           # English UI strings
│   │   ├── zh.json           # Traditional Chinese UI strings
│   │   └── index.ts          # Language utilities & translation helper
│   ├── layouts/
│   │   └── BaseLayout.astro  # Master HTML shell with meta & JSON-LD
│   ├── components/
│   │   ├── Navbar.astro      # Sticky 5-section nav + mobile menu
│   │   ├── Footer.astro      # Site footer & copyright
│   │   ├── CaseStudyCard.astro # Card component with result chips
│   │   ├── ContactCTA.astro  # Primary contact button
│   │   └── LanguageSwitcher.astro # EN ↔ 中文 language toggle
│   ├── content/
│   │   ├── config.ts         # Content Collections type schemas
│   │   ├── work/             # Case studies (en/ & zh/)
│   │   └── reference/        # Technical reference articles (en/ & zh/)
│   └── pages/
│       ├── index.astro       # Root redirect to /en/
│       ├── en/               # English page routes
│       └── zh/               # Traditional Chinese page routes
└── reports/
    ├── completion_report_en.md # Comprehensive English completion report
    └── completion_report_zh.md # Comprehensive Chinese completion report
```

---

## Getting Started

### Prerequisites

- Node.js 18.x or 20.x
- npm 9.x or later

### Installation

```bash
cd d:\st8925lab\cloudmd\option_A
npm install
```

### Development Server

```bash
npm run dev
```
Open [http://localhost:4321](http://localhost:4321) in your browser.

### Type Check & Audit

```bash
npm run check
```

### Production Build

```bash
npm run build
```
Outputs static HTML/CSS/JS files into `dist/` (23 pages built in ~2.6s).

### Preview Build

```bash
npm run preview
```

---

## Deployment (Cloudflare Pages)

1. Connect your private GitHub repository to **Cloudflare Pages**.
2. Set build parameters:
   - **Framework Preset**: Astro
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `cloudmd/option_A/dist` (or set Root Directory to `cloudmd/option_A` and Output to `dist`)
3. Environment variables: None required for static SSG build.

---

## Security Verification

- [x] **Zero High/Critical Audit Vulnerabilities**: `npm audit` clean.
- [x] **CSP Protection**: Strict CSP in `public/_headers`.
- [x] **Input Validation**: All tool inputs sanitized via regex & strict radix parsing.
- [x] **Privacy First**: Zero raw IP storage, zero external data leaks.
