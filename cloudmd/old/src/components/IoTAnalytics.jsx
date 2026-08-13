import React, { useState } from 'react';
import { LineChart, Activity, HardDrive, Cpu, Zap, Wifi, AlertCircle, RefreshCw, Sparkles, Server } from 'lucide-react';

export default function IoTAnalytics() {
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedMetric, setSelectedMetric] = useState('temp');

  // Simulated Time-Series Telemetry Data
  const telemetryData = [
    { time: '00:00', temp: 38.5, power: 28, bandwidth: 4.2 },
    { time: '04:00', temp: 37.2, power: 26, bandwidth: 2.1 },
    { time: '08:00', temp: 41.0, power: 34, bandwidth: 12.8 },
    { time: '12:00', temp: 44.8, power: 42, bandwidth: 28.5 },
    { time: '16:00', temp: 42.3, power: 38, bandwidth: 18.2 },
    { time: '20:00', temp: 40.1, power: 32, bandwidth: 9.4 },
    { time: '23:59', temp: 39.0, power: 29, bandwidth: 5.6 }
  ];

  // SVG Chart Calculation Helpers
  const maxVal = selectedMetric === 'temp' ? 60 : selectedMetric === 'power' ? 60 : 40;
  const svgWidth = 600;
  const svgHeight = 180;

  const points = telemetryData.map((d, i) => {
    const x = (i / (telemetryData.length - 1)) * svgWidth;
    const val = d[selectedMetric];
    const y = svgHeight - (val / maxVal) * svgHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <section className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-3">
            <Activity className="w-3.5 h-3.5" />
            <span>TIME-SERIES TELEMETRY & AI ANALYTICS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            IoT Sensor Dashboard & AI Insights
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl">
            Monitoring hardware health, environmental sensors, and power consumption with AI-driven anomaly detection.
          </p>
        </div>

        {/* Time Range Filter Buttons */}
        <div className="mt-4 md:mt-0 flex items-center gap-1.5 p-1.5 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs">
          {['1h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                timeRange === range
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Hardware Node Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* Node 1: QNAP TS-473A */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Server className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              ONLINE
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400">QNAP TS-473A (AMD V1500B)</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-white font-mono">39.0 °C</span>
            <span className="text-xs font-mono text-emerald-400">Normal</span>
          </div>
          <div className="mt-3 w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div className="bg-cyan-400 h-full rounded-full" style={{ width: '42%' }}></div>
          </div>
        </div>

        {/* Node 2: Power Draw */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
              SMART PLUG 01
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400">Total Lab Load</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-white font-mono">32.4 W</span>
            <span className="text-xs font-mono text-purple-300">~0.78 kWh/day</span>
          </div>
          <div className="mt-3 w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div className="bg-purple-400 h-full rounded-full" style={{ width: '35%' }}></div>
          </div>
        </div>

        {/* Node 3: Network Bandwidth */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Wifi className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              TUNNEL WAN
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400">Cloudflare Edge Rate</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-white font-mono">5.6 Mbps</span>
            <span className="text-xs font-mono text-emerald-400">0 Dropped</span>
          </div>
          <div className="mt-3 w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full" style={{ width: '22%' }}></div>
          </div>
        </div>

        {/* Node 4: AI Anomaly Index */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
              AI MODEL
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400">Health Anomaly Score</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-white font-mono">0.02</span>
            <span className="text-xs font-mono text-sky-400">Optimal (99.8%)</span>
          </div>
          <div className="mt-3 w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div className="bg-sky-400 h-full rounded-full" style={{ width: '98%' }}></div>
          </div>
        </div>

      </div>

      {/* Main Interactive Chart Box */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 mb-8">
        
        {/* Metric Selector Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white font-mono">
              Telemetry Tele-Stream [{selectedMetric.toUpperCase()}]
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setSelectedMetric('temp')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                selectedMetric === 'temp'
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              CPU Temperature (°C)
            </button>
            <button
              onClick={() => setSelectedMetric('power')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                selectedMetric === 'power'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              Power Draw (W)
            </button>
            <button
              onClick={() => setSelectedMetric('bandwidth')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                selectedMetric === 'bandwidth'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              Bandwidth (Mbps)
            </button>
          </div>
        </div>

        {/* Responsive SVG Chart */}
        <div className="w-full h-56 relative bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 flex flex-col justify-between">
          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            {/* Grid Lines */}
            <line x1="0" y1="0" x2={svgWidth} y2="0" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
            <line x1="0" y1={svgHeight / 2} x2={svgWidth} y2={svgHeight / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
            <line x1="0" y1={svgHeight} x2={svgWidth} y2={svgHeight} stroke="rgba(255,255,255,0.1)" />

            {/* Gradient Fill under Line */}
            <defs>
              <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={selectedMetric === 'temp' ? '#06b6d4' : selectedMetric === 'power' ? '#a855f7' : '#10b981'} stopOpacity="0.35" />
                <stop offset="100%" stopColor="#090d16" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Polygon Area */}
            <polygon
              points={`0,${svgHeight} ${points} ${svgWidth},${svgHeight}`}
              fill="url(#chartGlow)"
            />

            {/* Polyline Chart */}
            <polyline
              fill="none"
              stroke={selectedMetric === 'temp' ? '#06b6d4' : selectedMetric === 'power' ? '#a855f7' : '#10b981'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />

            {/* Point Markers */}
            {telemetryData.map((d, i) => {
              const x = (i / (telemetryData.length - 1)) * svgWidth;
              const val = d[selectedMetric];
              const y = svgHeight - (val / maxVal) * svgHeight;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="4"
                  className="fill-slate-950 stroke-cyan-400 stroke-2 hover:r-6 transition-all"
                />
              );
            })}
          </svg>

          {/* Time Labels */}
          <div className="flex justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-900">
            {telemetryData.map((d, i) => (
              <span key={i}>{d.time}</span>
            ))}
          </div>
        </div>

      </div>

      {/* AI Telemetry Insights Box */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/30 flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white font-mono mb-1">
            AI Automated Telemetry Summary (Updated 2m ago)
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            All telemetry streams match expected baseline models. CPU temperatures peak during midday data indexing at 44.8°C, remaining well within safe thermal thresholds (max limit 85°C). No fan degradation or unexpected power surges detected.
          </p>
        </div>
      </div>

    </section>
  );
}
