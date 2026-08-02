import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, Cpu, Activity, ArrowRight, Play, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';

export default function TerminalHero({ setActiveTab }) {
  const [inputVal, setInputVal] = useState('');
  const [terminalLogs, setTerminalLogs] = useState([
    { type: 'system', text: 'ST8925 LAB OS v2.4.0 (x86_64-cloudflare-edge) initialized.' },
    { type: 'success', text: '[OK] Cloudflare Tunnel (st8925lab.com) connected. Zero Trust active.' },
    { type: 'info', text: '[INFO] QNAP TS-473A isolated in private subnet. Router inbound ports: 0 OPEN.' },
    { type: 'system', text: 'Type "help" or click sample commands below to query the lab.' }
  ]);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  const handleCommand = (cmdStr) => {
    const cmd = cmdStr.trim().toLowerCase();
    if (!cmd) return;

    const newLogs = [...terminalLogs, { type: 'user', text: `st8925lab@edge:~$ ${cmdStr}` }];

    switch (cmd) {
      case 'help':
        newLogs.push({
          type: 'system',
          text: 'Available Commands: status, agents, nas-security, iot-stats, clear, vibe-coding'
        });
        break;
      case 'status':
        newLogs.push({
          type: 'success',
          text: '[STATUS] All 4 Lab Subsystems Operational. Edge CDN: 100% | NAS Vault: Encrypted | AI Router: Ready'
        });
        break;
      case 'agents':
        newLogs.push({
          type: 'info',
          text: '[AI AGENTS] Active: 3 (Security Auditor Agent, Vibe Code Generator, Telemetry Anomaly Detector)'
        });
        break;
      case 'nas-security':
        newLogs.push({
          type: 'warning',
          text: '[SECURITY] QNAP TS-473A photos protected by Zero-Trust Tunnel. Inbound Ports 80/443 blocked at WAN.'
        });
        break;
      case 'iot-stats':
        newLogs.push({
          type: 'info',
          text: '[IoT] Telemetry Nodes: 12 Online | Sampling Interval: 5s | CPU Temp Avg: 41.2°C'
        });
        break;
      case 'vibe-coding':
        newLogs.push({
          type: 'success',
          text: '[VIBE CODING] Stack: React + Tailwind + Cloudflare D1 + AI Prompt Engineering.'
        });
        break;
      case 'clear':
        setTerminalLogs([]);
        setInputVal('');
        return;
      default:
        newLogs.push({
          type: 'error',
          text: `Command not recognized: "${cmdStr}". Type "help" for a list of valid commands.`
        });
    }

    setTerminalLogs(newLogs);
    setInputVal('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleCommand(inputVal);
  };

  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      
      {/* Background Neon Accent Glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-40 right-10 w-[400px] h-[250px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Header Tagline */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>AI AGENT & IT SECURITY LAB</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4">
            Innovating at the Edge of <br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              AI, IoT & Cyber Security
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            Welcome to <strong className="text-white font-mono">st8925lab.com</strong>. A personal research hub exploring autonomous AI agents, vibe coding techniques, IoT telemetry analytics, and zero-trust home network hardening.
          </p>
        </div>

        {/* Hero Interactive Terminal & Quick Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Interactive Terminal Window */}
          <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden terminal-scanline">
            {/* Terminal Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors" />
                <span className="ml-2 text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  bash - st8925lab@edge:~$
                </span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400/80 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                CF ZERO-TRUST
              </span>
            </div>

            {/* Terminal Body */}
            <div className="p-4 sm:p-5 font-mono text-xs sm:text-sm h-72 sm:h-80 overflow-y-auto space-y-2.5 bg-slate-950/90">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  {log.type === 'user' && <span className="text-cyan-300 font-semibold">{log.text}</span>}
                  {log.type === 'system' && <span className="text-slate-400">{log.text}</span>}
                  {log.type === 'success' && <span className="text-emerald-400">{log.text}</span>}
                  {log.type === 'info' && <span className="text-sky-300">{log.text}</span>}
                  {log.type === 'warning' && <span className="text-amber-300">{log.text}</span>}
                  {log.type === 'error' && <span className="text-rose-400">{log.text}</span>}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Terminal Command Input Form */}
            <form onSubmit={handleSubmit} className="flex items-center px-4 py-3 bg-slate-900/95 border-t border-slate-800">
              <span className="text-cyan-400 font-mono text-sm mr-2.5">$&gt;</span>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Type 'help', 'status', 'nas-security', or 'agents'..."
                className="flex-1 bg-transparent border-none outline-none font-mono text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:ring-0"
              />
              <button
                type="submit"
                className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-colors border border-cyan-500/40"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick Command Suggestions */}
            <div className="flex flex-wrap gap-1.5 px-4 py-2.5 bg-slate-950 border-t border-slate-800/60 text-[11px] font-mono">
              <span className="text-slate-500 mr-1">Quick Run:</span>
              {['status', 'agents', 'nas-security', 'iot-stats', 'vibe-coding', 'clear'].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => handleCommand(cmd)}
                  className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/80 border border-slate-800 transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Hub Metric Cards & Shortcut Links */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Card 1: Security Shield */}
            <div
              onClick={() => setActiveTab('security')}
              className="glass-panel glass-panel-hover p-5 rounded-2xl cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" /> ZERO INBOUND PORTS
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center justify-between">
                QNAP TS-473A Security Vault
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Family photos are 100% isolated. Zero-Trust Cloudflare Tunnel prevents external scanner access.
              </p>
            </div>

            {/* Card 2: AI Agents & Vibe Coding */}
            <div
              onClick={() => setActiveTab('agents')}
              className="glass-panel glass-panel-hover p-5 rounded-2xl cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-purple-300 bg-purple-950/80 border border-purple-800 px-2 py-0.5 rounded-full">
                  3 ACTIVE AGENTS
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center justify-between">
                AI Agent & Vibe Coding Lab
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Exploring LLM prompt engineering, autonomous code generation, and rapid vibe coding workflows.
              </p>
            </div>

            {/* Card 3: IoT Telemetry */}
            <div
              onClick={() => setActiveTab('iot')}
              className="glass-panel glass-panel-hover p-5 rounded-2xl cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Activity className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded-full">
                  12 SENSOR NODES
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center justify-between">
                IoT Telemetry & AI Analytics
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Real-time time-series visualization and AI anomaly detection across home lab hardware.
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
