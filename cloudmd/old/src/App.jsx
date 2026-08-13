import React, { useState } from 'react';
import Navbar from './components/Navbar';
import TerminalHero from './components/TerminalHero';
import AIAgentShowcase from './components/AIAgentShowcase';
import IoTAnalytics from './components/IoTAnalytics';
import SecurityArchitecture from './components/SecurityArchitecture';
import Footer from './components/Footer';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-cyber-grid flex flex-col justify-between">
      <div>
        {/* Navigation Header */}
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Tab-based View Switching */}
        <main>
          {activeTab === 'overview' && (
            <>
              <TerminalHero setActiveTab={setActiveTab} />
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8">
                <div className="p-1 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-emerald-500/20">
                  <div className="glass-panel p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white font-heading">
                        Ready to deploy to Cloudflare Pages?
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Your project is optimized for static export and instant Cloudflare Pages deployment for st8925lab.com.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('security')}
                      className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition-colors shrink-0 shadow-lg shadow-cyan-500/20"
                    >
                      View NAS Security Blueprint →
                    </button>
                  </div>
                </div>
              </div>
              <AIAgentShowcase />
            </>
          )}

          {activeTab === 'agents' && <AIAgentShowcase />}

          {activeTab === 'iot' && <IoTAnalytics />}

          {activeTab === 'security' && <SecurityArchitecture />}
        </main>
      </div>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
