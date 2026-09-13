import React from 'react';
import { Cpu, ThumbsDown, FileText, FileSpreadsheet, Download, Sliders, CheckCircle2, ShieldCheck, Activity } from 'lucide-react';

export default function SettingsPage({
  isTraining,
  handleTrainModel,
  setIsRulesOpen,
  isConnected,
  metrics
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-dark-900/80 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple">
          <Sliders className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">
            System Diagnostics & AI Model Management
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Configure Drain3 parsing, trigger PyTorch LSTM retraining, manage FP suppression rules, and export forensic reports.
          </p>
        </div>
      </div>

      {/* Grid for Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Model Controls */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-dark-900/70 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-cyber-purple" />
              PyTorch LSTM Autoencoder Retraining
            </h3>
            <p className="text-xs text-gray-400 font-mono leading-relaxed">
              Trigger background training on newly collected normal HDFS log sequences to update baseline reconstruction thresholds and decrease false positives over time.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleTrainModel}
              disabled={isTraining}
              className={`w-full py-2.5 px-4 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ${
                isTraining
                  ? 'bg-cyber-purple/20 border-cyber-purple text-cyber-purple animate-pulse cursor-wait'
                  : 'bg-cyber-purple/10 hover:bg-cyber-purple/20 border-cyber-purple/40 text-cyber-purple shadow-sm'
              }`}
            >
              <Cpu className={`w-4 h-4 ${isTraining ? 'animate-spin' : ''}`} />
              {isTraining ? 'Retraining PyTorch LSTM Model...' : 'Trigger Model Retraining Now'}
            </button>
          </div>
        </div>

        {/* Active Learning FP Rules */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-dark-900/70 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2 mb-2">
              <ThumbsDown className="w-4 h-4 text-amber-400" />
              Active Learning False Positive Rules Manager
            </h3>
            <p className="text-xs text-gray-400 font-mono leading-relaxed">
              Manage custom log template dampening rules configured via active human feedback to automatically suppress benign operational spikes.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setIsRulesOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <ThumbsDown className="w-4 h-4 text-amber-400" />
              <span>Open False Positive Rules Manager</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forensic Export & Data Operations */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-dark-900/70 space-y-4">
        <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
          <Download className="w-4 h-4 text-cyber-blue" />
          Data Export & SecOps Audit Reports
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="/api/dataset/export/csv"
            download="hdfs_logs.csv"
            className="p-4 rounded-xl border border-cyber-blue/40 bg-cyber-blue/10 hover:bg-cyber-blue/20 text-cyber-blue transition-all flex flex-col items-center justify-center text-center gap-2 group"
          >
            <FileText className="w-6 h-6 text-cyber-blue group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-mono font-bold">Export Raw CSV</div>
              <div className="text-[10px] opacity-75 font-mono">HDFS log dataset</div>
            </div>
          </a>

          <a
            href="/api/dataset/export/excel"
            download="hdfs_logs.xlsx"
            className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all flex flex-col items-center justify-center text-center gap-2 group"
          >
            <FileSpreadsheet className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-mono font-bold">Export Excel Workbook</div>
              <div className="text-[10px] opacity-75 font-mono">Formatted dataset</div>
            </div>
          </a>

          <a
            href="/api/reports/forensic-pdf"
            download="logsentinel_forensic_audit_report.pdf"
            className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all flex flex-col items-center justify-center text-center gap-2 group"
          >
            <Download className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-mono font-bold">Export Forensic PDF Report</div>
              <div className="text-[10px] opacity-75 font-mono">SecOps Incident Audit</div>
            </div>
          </a>
        </div>
      </div>

      {/* Real-time Telemetry Status */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-dark-900/70 space-y-4">
        <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyber-green" />
          Real-Time System Telemetry & Pipeline Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-3 bg-dark-950 rounded-xl border border-gray-800/80">
            <div className="text-gray-400 text-[10px] uppercase">WebSocket Link</div>
            <div className={`mt-1 font-bold flex items-center gap-1.5 ${isConnected ? 'text-cyber-green' : 'text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyber-green animate-pulse' : 'bg-red-400'}`} />
              {isConnected ? 'ONLINE & ACTIVE' : 'DISCONNECTED'}
            </div>
          </div>

          <div className="p-3 bg-dark-950 rounded-xl border border-gray-800/80">
            <div className="text-gray-400 text-[10px] uppercase">Log Ingestion Speed</div>
            <div className="mt-1 font-bold text-white">
              {metrics.logs_per_second || 0} logs/sec
            </div>
          </div>

          <div className="p-3 bg-dark-950 rounded-xl border border-gray-800/80">
            <div className="text-gray-400 text-[10px] uppercase">Drain3 Parser State</div>
            <div className="mt-1 font-bold text-cyber-blue flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> ONLINE
            </div>
          </div>

          <div className="p-3 bg-dark-950 rounded-xl border border-gray-800/80">
            <div className="text-gray-400 text-[10px] uppercase">Active Risk Status</div>
            <div className={`mt-1 font-bold ${
              metrics.current_risk_status === 'CRITICAL' ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {metrics.current_risk_status || 'NORMAL'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
