import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Filter, ArrowDownCircle, Search, AlertCircle, Trash2, HelpCircle } from 'lucide-react';
import LogHistogram from './LogHistogram';

export default function LiveLogFeed({ logs, onSelectAnomaly, onClearLogs }) {

  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    const matchesSeverity = filterSeverity === 'ALL' || log.severity === filterSeverity || (filterSeverity === 'ANOMALY' && log.is_anomaly);
    if (!searchTerm) return matchesSeverity;

    const term = searchTerm.trim().toLowerCase();

    // Elastic-Style Key-Value Query Parsing (severity:ERROR, block:blk_1001, risk:>75, template:T35)
    if (term.startsWith('severity:')) {
      const val = term.replace('severity:', '').toUpperCase();
      return matchesSeverity && log.severity.includes(val);
    }
    if (term.startsWith('block:')) {
      const val = term.replace('block:', '');
      return matchesSeverity && log.block_id.toLowerCase().includes(val);
    }
    if (term.startsWith('template:')) {
      const val = term.replace('template:', '').replace('t', '');
      return matchesSeverity && String(log.template_id) === val;
    }
    if (term.startsWith('risk:>')) {
      const val = parseFloat(term.replace('risk:>', '')) || 0;
      return matchesSeverity && (log.risk_score || 0) > val;
    }

    const matchesSearch = log.raw_message.toLowerCase().includes(term) || log.block_id.toLowerCase().includes(term);
    return matchesSeverity && matchesSearch;
  });

  const getSeverityBadge = (severity, isAnomaly) => {
    if (isAnomaly) {
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyber-red/20 text-cyber-red border border-cyber-red/40 animate-pulse">ANOMALY</span>;
    }
    switch (severity) {
      case 'ERROR':
      case 'CRITICAL':
      case 'FATAL':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-400 border border-red-500/30">ERROR</span>;
      case 'WARNING':
      case 'WARN':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">WARN</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/20">INFO</span>;
    }
  };

  return (
    <div className="glass-panel rounded-xl border border-gray-800 overflow-hidden flex flex-col h-[520px]">
      {/* Header & Controls */}
      <div className="p-4 border-b border-gray-800 bg-gray-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyber-blue" />
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
            Live Stream Log Console
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-mono rounded-full bg-gray-800 text-gray-400 border border-gray-700">
            {filteredLogs.length} items
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative" title="Elastic Syntax: severity:ERROR, block:blk_1001, risk:>75, template:T35">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-500" />
            <input
              type="text"
              placeholder="Query: severity:ERROR risk:>75 block:blk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 bg-dark-900 border border-gray-700 rounded-lg text-xs font-mono text-gray-200 focus:outline-none focus:border-cyber-blue w-56"
            />
          </div>

          {/* Severity Dropdown */}
          <div className="flex items-center gap-1 bg-dark-900 border border-gray-700 rounded-lg p-1 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-gray-400 ml-1" />
            {['ALL', 'ANOMALY', 'INFO', 'WARN', 'ERROR'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterSeverity(type)}
                className={`px-2 py-0.5 rounded transition-all ${
                  filterSeverity === type
                    ? type === 'ANOMALY' ? 'bg-cyber-red text-white' : 'bg-cyber-blue text-dark-900 font-bold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
              autoScroll ? 'bg-cyber-blue/10 border-cyber-blue/40 text-cyber-blue' : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
            title="Toggle Auto Scroll"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span className="hidden sm:inline font-mono text-[11px]">{autoScroll ? 'Auto-Scroll ON' : 'Paused'}</span>
          </button>

          {/* Clear Console button */}
          <button
            onClick={onClearLogs}
            className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs flex items-center gap-1 transition-all"
            title="Clear Live Console Feed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono text-[11px]">Clear</span>
          </button>
        </div>
      </div>

      {/* Log Traffic Volume & Anomaly Histogram Bar Chart */}
      <LogHistogram logs={logs} />

      {/* Console Feed */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1.5 scanline bg-dark-900/90">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-xs">
            No matching log events in buffer.
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div
              key={log.id || idx}
              onClick={() => log.is_anomaly && onSelectAnomaly(log)}
              className={`p-2 rounded border transition-all flex flex-wrap items-start justify-between gap-2 ${
                log.is_anomaly
                  ? 'bg-cyber-red/10 border-cyber-red/40 hover:bg-cyber-red/20 cursor-pointer shadow-sm shadow-cyber-red/20'
                  : 'bg-gray-900/40 border-gray-800/80 hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <span className="text-gray-500 text-[10px] shrink-0 font-mono">
                  {log.timestamp ? log.timestamp.substring(11, 19) : ''}
                </span>

                {getSeverityBadge(log.severity, log.is_anomaly)}

                <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-800 text-cyber-blue border border-gray-700 shrink-0">
                  T{log.template_id}
                </span>

                <span className="text-gray-300 break-all font-mono leading-relaxed">
                  {log.raw_message}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-[11px]">
                <span className="text-gray-500 font-mono">
                  {log.block_id}
                </span>

                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-[10px]">Risk:</span>
                  <span className={`font-bold ${log.is_anomaly ? 'text-cyber-red' : 'text-gray-400'}`}>
                    {log.risk_score ? log.risk_score.toFixed(1) : '0.0'}
                  </span>
                </div>

                {log.is_anomaly && (
                  <span className="text-cyber-red hover:underline text-[10px] font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Inspect Cause
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
