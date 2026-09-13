import React from 'react';
import LiveLogFeed from '../components/LiveLogFeed';
import { Terminal } from 'lucide-react';

export default function LiveLogsPage({ logs, onSelectAnomaly, onClearLogs }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between glass-panel p-4 rounded-xl border border-gray-800 bg-dark-900/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-mono tracking-wide">
              Live Interactive Log Feed
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Parsed log entries ingested via WebSocket with real-time Drain3 template classification & anomaly scoring.
            </p>
          </div>
        </div>
      </div>

      <LiveLogFeed
        logs={logs}
        onSelectAnomaly={onSelectAnomaly}
        onClearLogs={onClearLogs}
      />
    </div>
  );
}
