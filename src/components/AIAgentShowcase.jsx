import React, { useState } from 'react';
import { Bot, Sparkles, Code2, Play, Terminal, CheckCircle2, Copy, RefreshCw, Zap, Cpu } from 'lucide-react';

export default function AIAgentShowcase() {
  const [selectedAgent, setSelectedAgent] = useState('agent-sec');
  const [promptInput, setPromptInput] = useState('Analyze docker container permissions on QNAP TS-473A for security risks.');
  const [isRunning, setIsRunning] = useState(false);
  const [agentOutput, setAgentOutput] = useState(null);

  const agents = [
    {
      id: 'agent-sec',
      name: 'Cyber Sentinel Agent',
      role: 'Automated Security Auditor',
      model: 'Claude 3.5 / Gemini Pro',
      status: 'ONLINE',
      desc: 'Scans Docker container configs, environment variables, and network bindings to prevent root leaks.',
      color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-400'
    },
    {
      id: 'agent-vibe',
      name: 'Vibe Architect Agent',
      role: 'AI Vibe Coding Engine',
      model: 'DeepSeek R1 / GPT-4o',
      status: 'READY',
      desc: 'Transforms high-level natural language ideas into production-ready React & Tailwind UI components.',
      color: 'border-purple-500/40 bg-purple-950/20 text-purple-400'
    },
    {
      id: 'agent-iot',
      name: 'IoT Telemetry Synthesizer',
      role: 'Time-Series Anomaly Detector',
      model: 'Custom Edge Model',
      status: 'IDLE',
      desc: 'Ingests home sensor metrics every 5 seconds and predicts hardware thermal throttles or fan failures.',
      color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400'
    }
  ];

  const vibeProjects = [
    {
      title: 'Zero-Trust Cloudflare Tunnel Deployer',
      category: 'Vibe Coding',
      tags: ['Bash', 'Cloudflare API', 'Docker'],
      desc: 'Auto-scaffolds outbound cloudflared container configs with read-only volume mounts.',
      code: `docker run -d --name cloudflared \\
  --restart unless-stopped \\
  cloudflare/cloudflared:latest tunnel --no-autoupdate run \\
  --token $CLOUDFLARE_TUNNEL_TOKEN`
    },
    {
      title: 'AI IoT Telemetry Anomaly Parser',
      category: 'AI Pipeline',
      tags: ['Python', 'Pandas', 'OpenAI'],
      desc: 'Streams temperature and power draw metrics to compute hardware failure probabilities.',
      code: `def predict_anomaly(metrics: dict) -> float:
    # Evaluate CPU temp & fan speed delta
    score = (metrics["cpu_temp"] / 100.0) * 0.6 + (metrics["fan_rpm"] / 4000.0) * 0.4
    return round(score, 4)`
    }
  ];

  const handleRunAgent = () => {
    setIsRunning(true);
    setAgentOutput(null);

    setTimeout(() => {
      setIsRunning(false);
      if (selectedAgent === 'agent-sec') {
        setAgentOutput({
          status: 'SUCCESS',
          findings: [
            'Checked 14 Container Volumes: 0 root access leaks detected.',
            'QNAP Photo Vault (/share/Pictures): SAFE (Not mounted in any container).',
            'Cloudflare Tunnel Token: Valid & Encrypted in memory.',
            'Recommendation: Enable automatic image digest tagging for cloudflared updates.'
          ]
        });
      } else if (selectedAgent === 'agent-vibe') {
        setAgentOutput({
          status: 'SUCCESS',
          codeGenerated: `<div className="glass-panel p-4 rounded-xl border border-cyan-500/30">
  <h4 className="text-cyan-400 font-mono">⚡ AI Generated Component</h4>
  <p className="text-xs text-slate-300">Clean vibes created in 1.2s</p>
</div>`
        });
      } else {
        setAgentOutput({
          status: 'SUCCESS',
          telemetryResult: 'Average CPU Temperature: 42.1°C | Power Draw: 34W | Anomaly Risk Index: 0.02 (Optimal)'
        });
      }
    }, 1200);
  };

  return (
    <section className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono mb-3">
            <Bot className="w-3.5 h-3.5" />
            <span>AUTONOMOUS AGENTS & VIBE CODING</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            AI Agent Showcase & Playground
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl">
            Explore how autonomous AI agents and prompt-driven vibe coding accelerate development, automate security audits, and analyze complex hardware data.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Powered by Gemini & DeepSeek R1</span>
        </div>
      </div>

      {/* Grid: Agent Cards Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {agents.map((agent) => {
          const isSelected = selectedAgent === agent.id;
          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={`glass-panel p-5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                isSelected
                  ? 'border-cyan-400 bg-slate-900/90 shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-400'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${agent.color}`}>
                  {agent.status}
                </span>
                <span className="text-xs font-mono text-slate-500">{agent.model}</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                {agent.name}
              </h3>
              <p className="text-xs font-mono text-cyan-400/90 mb-3">{agent.role}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{agent.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Interactive Agent Simulator Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 mb-12">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-mono text-white">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Agent Execution Console</span>
            <span className="text-xs text-slate-500">[{selectedAgent}]</span>
          </div>
          <span className="text-xs font-mono text-slate-400">Ready to accept instructions</span>
        </div>

        {/* Input Prompt Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2">Prompt / Instruction for Agent:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                placeholder="Enter prompt..."
              />
              <button
                onClick={handleRunAgent}
                disabled={isRunning}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono text-sm font-medium flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run Agent</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Execution Result Box */}
          {agentOutput && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-emerald-500/40 font-mono text-xs text-slate-200">
              <div className="flex items-center justify-between text-emerald-400 mb-2 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> AGENT VERIFICATION COMPLETE
                </span>
                <span className="text-[10px] text-slate-500">Execution Time: 1.18s</span>
              </div>
              
              {agentOutput.findings && (
                <ul className="space-y-1.5 text-slate-300">
                  {agentOutput.findings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-cyan-400">►</span> {f}
                    </li>
                  ))}
                </ul>
              )}

              {agentOutput.codeGenerated && (
                <pre className="p-3 rounded bg-slate-900 text-purple-300 overflow-x-auto">
                  {agentOutput.codeGenerated}
                </pre>
              )}

              {agentOutput.telemetryResult && (
                <p className="text-sky-300">{agentOutput.telemetryResult}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vibe Coding Showcase Section */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Code2 className="w-5 h-5 text-purple-400" />
          Featured Vibe Coding Experiments & Snippets
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vibeProjects.map((proj, idx) => (
            <div key={idx} className="glass-panel p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-purple-300 bg-purple-950/80 px-2.5 py-0.5 rounded border border-purple-800/60">
                  {proj.category}
                </span>
                <div className="flex gap-1.5">
                  {proj.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <h4 className="text-base font-bold text-white mb-2">{proj.title}</h4>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">{proj.desc}</p>

              <div className="relative bg-slate-950 p-3.5 rounded-xl border border-slate-800/90 font-mono text-xs text-cyan-300 overflow-x-auto">
                <pre>{proj.code}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
