import React from 'react';
import { Activity, AlertTriangle, ShieldCheck, Zap, Database } from 'lucide-react';

export default function MetricCards({ metrics, isConnected }) {
  const {
    logs_per_second = 0,
    total_logs_processed = 0,
    total_anomalies_detected = 0,
    active_anomalies_count = 0,
    current_risk_status = 'NORMAL',
    latest_risk_score = 0
  } = metrics || {};

  const getStatusColor = (status) => {
    switch (status) {
      case 'CRITICAL':
        return 'text-cyber-red bg-cyber-red/10 border-cyber-red/30 animate-pulse-glow';
      case 'ELEVATED':
        return 'text-cyber-amber bg-cyber-amber/10 border-cyber-amber/30';
      default:
        return 'text-cyber-green bg-cyber-green/10 border-cyber-green/30';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Metric 1: Logs / Sec */}
      <div className="glass-panel p-5 rounded-xl border border-gray-800 relative overflow-hidden group hover:border-cyber-blue/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ingest Rate</span>
          <div className="p-2 rounded-lg bg-cyber-blue/10 text-cyber-blue">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono text-white">{logs_per_second}</span>
          <span className="text-xs text-gray-400">logs / sec</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>Total Logs:</span>
          <span className="font-mono text-gray-200">{total_logs_processed.toLocaleString()}</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyber-blue to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Metric 2: Current Risk Status */}
      <div className={`glass-panel p-5 rounded-xl border relative overflow-hidden transition-all ${
        current_risk_status === 'CRITICAL' ? 'border-cyber-red/50 shadow-cyber-red/20' : 'border-gray-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Risk Level</span>
          <div className={`p-2 rounded-lg ${current_risk_status === 'CRITICAL' ? 'bg-cyber-red/20 text-cyber-red' : 'bg-cyber-purple/10 text-cyber-purple'}`}>
            <Zap className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(current_risk_status)}`}>
            {current_risk_status}
          </span>
          <span className="text-2xl font-bold font-mono text-white">{latest_risk_score.toFixed(1)} <span className="text-xs font-sans text-gray-400">/ 100</span></span>
        </div>
        <div className="mt-2 text-xs text-gray-400 flex justify-between">
          <span>ML Threshold:</span>
          <span className="font-mono text-cyber-red">75.0</span>
        </div>
      </div>

      {/* Metric 3: Total Anomalies */}
      <div className="glass-panel p-5 rounded-xl border border-gray-800 relative overflow-hidden group hover:border-cyber-amber/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Anomalies Detected</span>
          <div className="p-2 rounded-lg bg-cyber-amber/10 text-cyber-amber">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono text-white">{total_anomalies_detected}</span>
          <span className="text-xs text-gray-400">events</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>Active Unacknowledged:</span>
          <span className={`font-mono font-bold ${active_anomalies_count > 0 ? 'text-cyber-red' : 'text-cyber-green'}`}>
            {active_anomalies_count}
          </span>
        </div>
      </div>

      {/* Metric 4: System Connection & Stream Status */}
      <div className="glass-panel p-5 rounded-xl border border-gray-800 relative overflow-hidden group hover:border-cyber-green/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Stream Health</span>
          <div className={`p-2 rounded-lg ${isConnected ? 'bg-cyber-green/10 text-cyber-green' : 'bg-red-500/10 text-red-400'}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-block w-3 h-3 rounded-full ${isConnected ? 'bg-cyber-green animate-ping' : 'bg-red-500'}`} />
          <span className="text-lg font-semibold text-white">
            {isConnected ? 'LIVE WEBSOCKET' : 'DISCONNECTED'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>Engine:</span>
          <span className="font-mono text-cyber-blue">FastAPI + Drain3 + PyTorch</span>
        </div>
      </div>
    </div>
  );
}
