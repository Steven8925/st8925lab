import React from 'react';
import { ShieldCheck, Lock, Globe, Server, AlertOctagon, CheckCircle2, FileImage, Cpu, ArrowRight, ShieldAlert, Key } from 'lucide-react';

export default function SecurityArchitecture() {
  const securityGuarantees = [
    {
      title: 'Zero Inbound Router Ports (0 Port Forwarding)',
      desc: 'No ports (80, 443, 8080) are exposed on your home router WAN. Automated internet scanners and ransomware bots cannot discover your home IP address.',
      icon: Lock,
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20'
    },
    {
      title: 'Family Photos Strictly Isolated',
      desc: 'The photo folder (/share/CACHEDEV1_DATA/Pictures) is NOT mounted inside Docker. Even if a web app container is compromised, the attacker has zero filesystem permissions to photos.',
      icon: FileImage,
      color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20'
    },
    {
      title: 'Cloudflare Tunnel (Outbound Only)',
      desc: 'The cloudflared daemon inside QNAP Container Station establishes an outbound TLS tunnel to Cloudflare Edge. All public traffic passes through Cloudflare WAF & DDoS mitigation.',
      icon: Globe,
      color: 'text-purple-400 border-purple-500/30 bg-purple-950/20'
    },
    {
      title: 'Cloud Edge Database (Cloudflare D1 / Supabase)',
      desc: 'Public website data lives in Cloudflare D1 or Supabase. The QNAP NAS pulls backups internally via scheduled cron, maintaining 100% data decoupling.',
      icon: Server,
      color: 'text-sky-400 border-sky-500/30 bg-sky-950/20'
    }
  ];

  return (
    <section className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ZERO-TRUST HOMELAB SECURITY ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            QNAP TS-473A Security Topology
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl">
            How st8925lab.com safely connects cloud edge features to home infrastructure while completely insulating family photos from cyber threats.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3.5 py-2 rounded-xl border border-emerald-800/80">
          <Lock className="w-4 h-4" />
          <span>ROUTER WAN PORTS: CLOSED</span>
        </div>
      </div>

      {/* Visual Interactive Architecture Flow Map */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 mb-10 overflow-hidden relative">
        <h3 className="text-base font-bold text-white font-mono mb-6 flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          Data & Traffic Isolation Diagram
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center relative z-10">
          
          {/* Node 1: Web Visitor */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 mx-auto mb-2 flex items-center justify-center text-slate-300">
              <Globe className="w-5 h-5 text-cyan-400" />
            </div>
            <h4 className="text-xs font-mono font-bold text-white">Public Visitors</h4>
            <p className="text-[11px] font-mono text-slate-500 mt-1">st8925lab.com</p>
          </div>

          <div className="hidden md:flex justify-center text-slate-600">
            <ArrowRight className="w-6 h-6 text-cyan-500 animate-pulse" />
          </div>

          {/* Node 2: Cloudflare Edge */}
          <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 text-center shadow-lg shadow-cyan-500/10">
            <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-500/50 mx-auto mb-2 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-mono font-bold text-cyan-300">Cloudflare Edge CDN</h4>
            <p className="text-[11px] font-mono text-slate-400 mt-1">WAF / DDoS / Edge DB</p>
          </div>

          <div className="hidden md:flex justify-center text-slate-600">
            <ArrowRight className="w-6 h-6 text-cyan-500 animate-pulse" />
          </div>

          {/* Node 3: QNAP Container Station (Public App Docker) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/40 text-center">
            <div className="w-10 h-10 rounded-full bg-purple-950 border border-purple-500/50 mx-auto mb-2 flex items-center justify-center text-purple-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-mono font-bold text-purple-300">Container Station</h4>
            <p className="text-[11px] font-mono text-slate-400 mt-1">Docker: cloudflared</p>
          </div>

        </div>

        {/* Separator Line */}
        <div className="my-8 border-t border-dashed border-rose-500/40 relative">
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 px-3 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-mono rounded-full flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            STRICT PERMISSION BOUNDARY (AIR-GAPPED STORAGE)
          </span>
        </div>

        {/* Node 4: Private Family Photos (Protected) */}
        <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <FileImage className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                QNAP Photo Storage (/share/Pictures)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  100% PROTECTED
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                No Docker container or web process has filesystem read/write access to this volume.
              </p>
            </div>
          </div>
          <Lock className="w-6 h-6 text-emerald-400 shrink-0 hidden sm:block" />
        </div>

      </div>

      {/* Security Guarantees Grid */}
      <h3 className="text-xl font-bold text-white mb-6">4 Pillars of Your Homelab Security</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {securityGuarantees.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="glass-panel p-6 rounded-2xl border border-slate-800">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl border ${item.color} shrink-0`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1.5">{item.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QNAP TS-473A Recommended Hardening Checklist */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <h3 className="text-lg font-bold text-white font-mono mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Recommended QNAP TS-473A Hardening Checklist
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-slate-300">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="text-emerald-400">✔</span>
            <span>Disable default `admin` account (Use 2FA MFA).</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="text-emerald-400">✔</span>
            <span>Disable UPnP on Router & QNAP QTS settings.</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="text-emerald-400">✔</span>
            <span>Enable QuFirewall with Geo-IP blocking.</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="text-emerald-400">✔</span>
            <span>Keep QuTS hero / QTS firmware updated automatically.</span>
          </div>
        </div>
      </div>

    </section>
  );
}
