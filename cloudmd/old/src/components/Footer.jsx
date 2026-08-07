import React from 'react';
import { ShieldCheck, Cpu, GitBranch, Terminal, Globe, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full glass-panel border-t border-slate-800/80 bg-slate-950/90 py-10 mt-16 text-slate-400 font-mono text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-slate-800/80">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span className="font-heading font-extrabold text-base text-white">
                ST8925 <span className="text-cyan-400">LAB</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-sm">
              Personal research laboratory exploring AI agents, vibe coding techniques, IoT time-series analytics, and zero-trust homelab security architecture under <span className="text-cyan-300 font-mono">st8925lab.com</span>.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Research Topics</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li className="hover:text-cyan-300 transition-colors">► IT & Homelab Security</li>
              <li className="hover:text-cyan-300 transition-colors">► AI Agent Workflows</li>
              <li className="hover:text-cyan-300 transition-colors">► AI Vibe Coding</li>
              <li className="hover:text-cyan-300 transition-colors">► IoT Telemetry Analytics</li>
            </ul>
          </div>

          {/* Infrastructure Specs */}
          <div className="space-y-2">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Edge Deployment</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Cloudflare Pages</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cloudflare Tunnel Active</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>QNAP TS-473A (Isolated)</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <div>
            © {new Date().getFullYear()} ST8925 LAB. Built with React & Tailwind CSS. Ready for Cloudflare Pages.
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">
              st8925lab.com
            </span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              ALL SYSTEMS ONLINE
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
