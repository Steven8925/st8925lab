# ⚡ ST8925 LAB (`st8925lab.com`)

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-f38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![React](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20Tailwind-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Security](https://img.shields.io/badge/Security-Zero%20Trust%20%7C%20QNAP%20NAS-10b981?style=for-the-badge&logo=shield&logoColor=white)](#-qnap-ts-473a-zero-trust-security-architecture)

> **ST8925 LAB** is a modern, cyber-themed personal web platform and research hub exploring **AI Autonomous Agents, AI Vibe Coding, IoT Telemetry Analytics, and Zero-Trust Homelab Hardening**.

---

## 🚀 Key Features

### 1. ⚡ Interactive Terminal Command Center
* Web-based CLI terminal simulating live system telemetry, agent status, and QNAP security modes.
* Interactive command runner (`help`, `status`, `agents`, `nas-security`, `iot-stats`, `vibe-coding`, `clear`).

### 2. 🤖 Autonomous AI Agent & Vibe Coding Showcase
* Interactive AI Agent simulator showcasing:
  * **Cyber Sentinel Agent**: Automated container & environment security auditor.
  * **Vibe Architect Agent**: Prompt-driven UI & code generator.
  * **IoT Telemetry Synthesizer**: Hardware time-series anomaly predictor.
* Curated collection of **Vibe Coding** experiment snippets.

### 3. 📊 IoT Telemetry & AI Analytics Dashboard
* Responsive SVG time-series charts tracking hardware CPU temperatures, power consumption (W), and edge bandwidth (Mbps).
* Filterable time ranges (`1H`, `24H`, `7D`) paired with automated AI anomaly insight summaries.

### 4. 🛡️ QNAP TS-473A Zero-Trust Security Architecture
* Detailed security topology documenting how to expose cloud edge services **without opening router inbound ports (0 Port Forwarding)**.
* **Family Photo Protection Guarantee**: Demonstrates strict permission boundaries ensuring public containers inside QNAP Container Station have **zero filesystem access** to `/share/Pictures`.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18 / 19, Vite 5, JavaScript (ES Module) |
| **Styling & UI** | Tailwind CSS v4, Custom Glassmorphism, Lucide React Icons |
| **Hosting & Edge CDN** | Cloudflare Pages, Cloudflare DNS (`st8925lab.com`) |
| **Zero-Trust Network** | Cloudflare Tunnel (`cloudflared` daemon in Docker) |
| **Hardware Lab** | QNAP TS-473A (AMD Ryzen V1500B, 8GB RAM, Container Station) |

---

## 💻 Local Development Setup

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **Git**: Installed on your system

### 1. Clone the Repository
```bash
git clone https://github.com/Steven8925/st8925lab.git
cd st8925lab
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to view the application.

### 4. Build for Production
```bash
npm run build
```
The optimized static bundle will be generated inside the `dist/` directory.

---

## ☁️ Deployment to Cloudflare Pages

### Option A: Automatic Git Deployment (Recommended)
1. Push this repository to your GitHub account (`Steven8925/st8925lab`).
2. Open **Cloudflare Dashboard** -> **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
3. Select `st8925lab`.
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`
4. Click **Save and Deploy**.
5. Assign your custom domain: `st8925lab.com`.

### Option B: Wrangler CLI Direct Deployment
```bash
# Build the project
npm run build

# Deploy dist folder directly to Cloudflare Pages
npx wrangler pages deploy dist --project-name=st8925lab
```

---

## 🔒 Security & Privacy Notice

* **Zero Inbound Router Ports**: No ports (80/443/8080) are open on the home router.
* **Encrypted Edge Data**: All public site data is handled at the Cloudflare Edge.
* **Family Photo Vault Safety**: Private storage volumes on QNAP TS-473A remain completely air-gapped from public container networks.

---

## 📄 License

Created by **Steven8925** for **st8925lab.com**. Released under the [MIT License](LICENSE).
