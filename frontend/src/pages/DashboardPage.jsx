import React from 'react';
import { Link } from 'react-router-dom';
import MetricCards from '../components/MetricCards';
import RiskScoreChart from '../components/RiskScoreChart';
import { Activity, ShieldAlert, ArrowRight, Terminal } from 'lucide-react';

export default function DashboardPage({ metrics, isConnected, chartData, logs, anomalies, onSelectAnomaly }) {
  const recentAnomalies = anomalies.slice(0, 3);
  const recentLogs = logs.slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-5 border border-cyber-blue/20 rounded-2xl bg-dark-900/60">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyber-blue" />
            Security Operations Center (SOC) Overview
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Real-time Drain3 template parsing & PyTorch LSTM reconstruction risk monitoring dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/logs"
            className="px-3.5 py-1.5 rounded-xl bg-cyber-blue/10 hover:bg-cyber-blue/20 border border-cyber-blue/30 text-cyber-blue text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Open Console</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </Link>
          <Link
            to="/anomalies"
            className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Inspect Threat Root Cause</span>
          </Link>
        </div>
      </div>

      {/* 1. Metric Cards */}
      <MetricCards metrics={metrics} isConnected={isConnected} />

      {/* 2. Risk Score Chart */}
      <RiskScoreChart data={chartData} />

      {/* Grid layout for Recent Anomalies & Quick Console Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Threat Anomalies Card */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-dark-900/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyber-red" />
                Recent Detected Anomalies
              </h3>
              <Link
                to="/anomalies"
                className="text-xs font-mono text-cyber-blue hover:underline flex items-center gap-1"
              >
                View all ({anomalies.length}) <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentAnomalies.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-gray-500 bg-dark-950/40 rounded-xl border border-gray-800/50">
                No anomalies detected yet. System risk levels normal.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentAnomalies.map((anom, idx) => (
                  <div
                    key={anom.id || idx}
                    onClick={() => onSelectAnomaly(anom)}
                    className="p-3 rounded-xl bg-dark-950/60 border border-gray-800/80 hover:border-cyber-blue/40 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-white">
                          Block: {anom.block_id || 'HDFS Block'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          anom.risk_score >= 80 ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                          anom.risk_score >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}>
                          Score: {anom.risk_score ? anom.risk_score.toFixed(1) : 0}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-gray-400 truncate max-w-sm">
                        {anom.top_contributing_template || 'Anomaly pattern breakdown'}
                      </p>
                    </div>
                    <span className="text-xs text-cyber-blue font-mono hover:underline">
                      Inspect &rarr;
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Stream Quick Console */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-dark-900/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyber-green" />
                Live Log Stream Preview
              </h3>
              <Link
                to="/logs"
                className="text-xs font-mono text-cyber-blue hover:underline flex items-center gap-1"
              >
                Open Full Console <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-dark-950 rounded-xl p-3 border border-gray-800 font-mono text-[11px] space-y-2 h-44 overflow-hidden">
              {recentLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Waiting for log entries...
                </div>
              ) : (
                recentLogs.map((log, idx) => (
                  <div key={idx} className="truncate flex items-center gap-2">
                    <span className="text-gray-500 text-[10px]">
                      [{log.timestamp ? log.timestamp.substring(11, 19) : 'STREAM'}]
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      log.level === 'ERROR' ? 'bg-red-500/20 text-red-400' :
                      log.level === 'WARN' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-cyber-blue/20 text-cyber-blue'
                    }`}>
                      {log.level || 'INFO'}
                    </span>
                    <span className="text-gray-300 truncate">
                      {log.content || log.log_content}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
