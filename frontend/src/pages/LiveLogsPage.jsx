import React from 'react';
import LiveLogFeed from '../components/LiveLogFeed';
import AgentControlPanel from '../components/AgentControlPanel';
import { Terminal } from 'lucide-react';

export default function LiveLogsPage({ logs, onSelectAnomaly, onClearLogs }) {
  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between glass-panel p-4 rounded-xl border border-gray-800 bg-dark-900/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-mono tracking-wide">
              Live Interactive Log Feed & Host Agent
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Stream live host Windows Event logs, system files, or API events into the Drain3 + PyTorch XAI anomaly engine.
            </p>
          </div>
        </div>
      </div>

      {/* Live Host OS Collector Agent Control Panel */}
      <AgentControlPanel />

      {/* Real-time Log Stream Feed */}
      <LiveLogFeed
        logs={logs}
        onSelectAnomaly={onSelectAnomaly}
        onClearLogs={onClearLogs}
      />
    </div>
  );
}
