import React, { useState } from 'react';
import ComparisonPanel from '../components/ComparisonPanel';
import { ShieldAlert, AlertTriangle, CheckCircle2, Search, Eye, Trash2 } from 'lucide-react';

export default function AnomaliesPage({ anomalies, onSelectAnomaly, onAcknowledge, onClearAllAnomalies }) {
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAnomalies = anomalies.filter((item) => {
    const matchesFilter =
      filter === 'ALL' ? true :
      filter === 'CRITICAL' ? item.risk_score >= 75 :
      filter === 'UNACKNOWLEDGED' ? !item.is_acknowledged : true;

    const matchesSearch =
      (item.block_id && item.block_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.top_contributing_template && item.top_contributing_template.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.status && item.status.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-red-500/20 bg-dark-900/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-cyber-red">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Threat Intelligence & Anomaly Root Cause Analysis
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              PyTorch LSTM reconstruction error breakdown & normal vs. anomalous sequence comparison.
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
              filter === 'ALL'
                ? 'bg-cyber-blue/20 text-cyber-blue border-cyber-blue/40 font-bold'
                : 'bg-dark-950 text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            All ({anomalies.length})
          </button>

          <button
            onClick={() => setFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
              filter === 'CRITICAL'
                ? 'bg-red-500/20 text-red-400 border-red-500/40 font-bold'
                : 'bg-dark-950 text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            Critical (Score &ge; 75)
          </button>

          <button
            onClick={() => setFilter('UNACKNOWLEDGED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
              filter === 'UNACKNOWLEDGED'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                : 'bg-dark-950 text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            Unacknowledged
          </button>

          {onClearAllAnomalies && (
            <button
              onClick={onClearAllAnomalies}
              disabled={anomalies.length === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center gap-1.5 disabled:opacity-40"
              title="Clear all recorded anomalies from database"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Sequence Comparison Panel */}
      <ComparisonPanel latestAnomaly={anomalies.length > 0 ? anomalies[0] : null} />

      {/* 2. Anomaly History Table */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-dark-900/70 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-cyber-red" />
            Detected Anomaly Log Sequences History
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by block ID or template..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-dark-950 border border-gray-800 rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-800/80 bg-dark-950/60">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-dark-900 border-b border-gray-800 text-gray-400">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Block ID</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Top Root Cause Template</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-gray-300">
              {filteredAnomalies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No anomalies match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredAnomalies.map((anom, idx) => (
                  <tr key={anom.id || idx} className="hover:bg-dark-900/60 transition-colors">
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                      {anom.timestamp ? anom.timestamp.substring(11, 19) : 'STREAM'}
                    </td>
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {anom.block_id || 'N/A'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        anom.risk_score >= 80 ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                        anom.risk_score >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        {anom.risk_score ? anom.risk_score.toFixed(1) : 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-gray-400" title={anom.top_contributing_template}>
                      {anom.top_contributing_template || 'Sequence Reconstruction Delta'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {anom.is_acknowledged ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 text-[11px] font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" /> New Alert
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectAnomaly(anom)}
                        className="px-2.5 py-1 rounded-lg bg-cyber-blue/10 hover:bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30 text-[11px] flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3 h-3" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
