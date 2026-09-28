import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Play,
  Square,
  Terminal,
  FileText,
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  Server
} from 'lucide-react';

const API_BASE = '/api';

export default function AgentControlPanel({ onAgentStateChange }) {
  const [status, setStatus] = useState({
    is_running: false,
    source_type: 'synthetic',
    source_target: 'System',
    poll_interval: 2.0,
    total_ingested: 0,
    uptime_seconds: 0,
    last_log_timestamp: null,
    error_count: 0,
    last_error: null,
    platform: 'Unknown',
    host_name: 'localhost'
  });

  const [sources, setSources] = useState({
    platform: 'Windows',
    is_windows: true,
    windows_channels: ['System', 'Security', 'Application'],
    suggested_file_paths: []
  });

  const [selectedSourceType, setSelectedSourceType] = useState('synthetic');
  const [selectedTarget, setSelectedTarget] = useState('System');
  const [pollInterval, setPollInterval] = useState(2.0);
  const [customFilePath, setCustomFilePath] = useState('');

  const hasSyncedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Fetch Agent Status & Sources on mount and poll status periodically
  useEffect(() => {
    fetchSources();
    fetchStatus();

    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/agent/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (onAgentStateChange) onAgentStateChange(data);

        // Synchronize UI inputs ONLY on initial load
        if (!hasSyncedRef.current) {
          if (data.source_type) {
            setSelectedSourceType(data.source_type);
            if (data.source_type === 'file_tail') {
              setCustomFilePath(data.source_target);
            } else if (data.source_target) {
              setSelectedTarget(data.source_target);
            }
          }
          if (data.poll_interval) {
            setPollInterval(data.poll_interval);
          }
          hasSyncedRef.current = true;
        }
      }
    } catch (err) {
      console.error('Failed to fetch agent status:', err);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch(`${API_BASE}/agent/sources`);
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (err) {
      console.error('Failed to fetch agent sources:', err);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    setActionError(null);
    setActionSuccess(null);

    let target = selectedTarget;
    if (selectedSourceType === 'file_tail') {
      target = customFilePath.trim();
      if (!target) {
        setActionError('Please enter or select a valid target log file path.');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE}/agent/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: selectedSourceType,
          source_target: target,
          poll_interval: parseFloat(pollInterval)
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to start collector agent');
      }

      const updated = await res.json();
      setStatus(updated);
      setActionSuccess(`Agent launched successfully streaming from [${selectedSourceType.toUpperCase()}: ${target}]`);
      if (onAgentStateChange) onAgentStateChange(updated);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/agent/stop`, {
        method: 'POST'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to stop collector agent');
      }

      const updated = await res.json();
      setStatus(updated);
      setActionSuccess('Live collector agent stopped.');
      if (onAgentStateChange) onAgentStateChange(updated);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (secs) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-5 shadow-2xl backdrop-blur-md mb-6 relative overflow-hidden">
      {/* Decorative Top Accent Glow */}
      <div className={`absolute top-0 left-0 right-0 h-1 transition-colors duration-500 ${status.is_running ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 animate-pulse' : 'bg-slate-700'
        }`} />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${status.is_running
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
              : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}>
            <Radio className={`w-5 h-5 ${status.is_running ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-100 tracking-wide">Live Host OS Collector Agent</h3>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.is_running
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                <span className={`w-2 h-2 rounded-full ${status.is_running ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                {status.is_running ? 'LIVE STREAMING' : 'AGENT IDLE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Host: <span className="text-cyan-400 font-mono">{status.host_name}</span> ({status.platform}) | Direct pipeline integration
            </p>
          </div>
        </div>

        {/* Start / Stop Quick Actions */}
        <div className="flex items-center gap-3">
          {!status.is_running ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              {loading ? 'Launching...' : 'Start Collector'}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-900/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Square className="w-4 h-4 fill-white" />
              {loading ? 'Stopping...' : 'Stop Collector'}
            </button>
          )}

          <button
            onClick={fetchStatus}
            title="Refresh Status"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Control Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
        {/* Source Type Selector */}
        <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            1. Select Log Source Type
          </label>
          <div className="space-y-2">
            {sources.is_windows && (
              <label className={`flex items-center justify-between p-2 rounded-md border cursor-pointer text-xs font-medium transition-all ${selectedSourceType === 'windows_events'
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="sourceType"
                    value="windows_events"
                    checked={selectedSourceType === 'windows_events'}
                    onChange={(e) => setSelectedSourceType(e.target.value)}
                    className="accent-cyan-400"
                  />
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>Windows Event Logs</span>
                </div>
                <span className="text-[10px] text-cyan-400/80 font-mono">Win32 Native</span>
              </label>
            )}

            <label className={`flex items-center justify-between p-2 rounded-md border cursor-pointer text-xs font-medium transition-all ${selectedSourceType === 'file_tail'
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceType"
                  value="file_tail"
                  checked={selectedSourceType === 'file_tail'}
                  onChange={(e) => setSelectedSourceType(e.target.value)}
                  className="accent-cyan-400"
                />
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Host File Tailer</span>
              </div>
              <span className="text-[10px] text-emerald-400/80 font-mono">Real-Time Tail</span>
            </label>

            <label className={`flex items-center justify-between p-2 rounded-md border cursor-pointer text-xs font-medium transition-all ${selectedSourceType === 'synthetic'
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceType"
                  value="synthetic"
                  checked={selectedSourceType === 'synthetic'}
                  onChange={(e) => setSelectedSourceType(e.target.value)}
                  className="accent-cyan-400"
                />
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Synthetic Stream</span>
              </div>
              <span className="text-[10px] text-amber-400/80 font-mono">Simulated</span>
            </label>
          </div>
        </div>

        {/* Target Configuration */}
        <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            2. Channel / File Target
          </label>
          {selectedSourceType === 'windows_events' && (
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Select Windows Log Channel:</label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {sources.windows_channels.map((ch) => (
                  <option key={ch} value={ch}>
                    Windows {ch} Channel
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">Reads live Security & System event log records.</p>
            </div>
          )}

          {selectedSourceType === 'file_tail' && (
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Target Log File Path:</label>
              <input
                type="text"
                value={customFilePath}
                onChange={(e) => setCustomFilePath(e.target.value)}
                placeholder="e.g. C:\logs\app.log or /var/log/syslog"
                className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              {sources.suggested_file_paths.length > 0 && (
                <div className="mt-2">
                  <span className="text-[10px] text-slate-400 block mb-1">Detected Host Files:</span>
                  <div className="flex flex-wrap gap-1">
                    {sources.suggested_file_paths.map((path) => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => setCustomFilePath(path)}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-400 px-2 py-0.5 rounded border border-slate-700 font-mono truncate max-w-full"
                      >
                        {path.split(/[\\/]/).pop()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedSourceType === 'synthetic' && (
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Simulated Stream Target:</label>
              <input
                type="text"
                disabled
                value="Host SecOps Telemetry Mix"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-md py-1.5 px-2.5 text-xs text-slate-400 font-mono"
              />
              <p className="text-[11px] text-slate-400">Emits SSHD, Kernel, Systemd, and WinSec event logs.</p>
            </div>
          )}
        </div>

        {/* Polling Interval & Live Metrics */}
        <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              3. Polling Rate & Telemetry
            </label>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-slate-400">Interval:</span>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={pollInterval}
                onChange={(e) => setPollInterval(e.target.value)}
                className="w-full accent-cyan-400"
              />
              <span className="text-xs font-mono text-cyan-400 font-bold min-w-[32px]">{pollInterval}s</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Agent Ingested</span>
              <span className="text-sm font-bold text-cyan-400 font-mono">{status.total_ingested} logs</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Active Uptime</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{formatUptime(status.uptime_seconds)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Status Error / Permission Warning Banner */}
      {status.last_error && !actionError && (
        <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs p-2.5 rounded-lg mt-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span><strong>Agent Notice:</strong> {status.last_error}</span>
        </div>
      )}

      {/* Action Error or Success Banner */}
      {actionError && (
        <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs p-2.5 rounded-lg mt-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs p-2.5 rounded-lg mt-3">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}
    </div>
  );
}
