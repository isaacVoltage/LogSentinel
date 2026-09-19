import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Shield, LayoutDashboard, Terminal, ShieldAlert, Sliders, AlertTriangle, AlertCircle, BarChart3 } from 'lucide-react';

import DashboardPage from './pages/DashboardPage';
import LiveLogsPage from './pages/LiveLogsPage';
import AnomaliesPage from './pages/AnomaliesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

import AnomalyDetailModal from './components/AnomalyDetailModal';
import AttackScenarioInjector from './components/AttackScenarioInjector';
import FalsePositiveRulesModal from './components/FalsePositiveRulesModal';

export default function App() {
  const [metrics, setMetrics] = useState({
    logs_per_second: 0,
    total_logs_processed: 0,
    total_anomalies_detected: 0,
    active_anomalies_count: 0,
    current_risk_status: 'NORMAL',
    latest_risk_score: 0
  });

  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [attackToast, setAttackToast] = useState(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const socketRef = useRef(null);

  // Fetch initial API metrics & anomalies
  const fetchMetricsAndAnomalies = async () => {
    try {
      const [resMetrics, resAnomalies] = await Promise.all([
        fetch('/api/metrics'),
        fetch('/api/anomalies?limit=10')
      ]);

      if (resMetrics.ok) {
        const metricsData = await resMetrics.json();
        setMetrics(metricsData);
      }

      if (resAnomalies.ok) {
        const anomaliesData = await resAnomalies.json();
        setAnomalies(anomaliesData);
      }
    } catch (err) {
      console.error("Error fetching initial API data:", err);
    }
  };

  useEffect(() => {
    fetchMetricsAndAnomalies();
    const interval = setInterval(fetchMetricsAndAnomalies, 3000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/stream`;

    const connectWebSocket = () => {
      console.log(`Connecting WebSocket to ${wsUrl}...`);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected.");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (e) {
          console.error("Failed to parse WS message:", e);
        }
      };

      ws.onclose = () => {
        console.warn("WebSocket disconnected. Reconnecting in 3s...");
        setIsConnected(false);
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const handleWebSocketMessage = (message) => {
    const { type, data } = message;

    if (type === 'log_entry') {
      setLogs((prev) => {
        const updated = [...prev, data];
        return updated.slice(-100); // Keep last 100 logs in memory
      });

      // Update Chart Data
      const timeStr = data.timestamp ? data.timestamp.substring(11, 19) : new Date().toLocaleTimeString();
      setChartData((prev) => {
        const updated = [...prev, { time: timeStr, score: data.risk_score || 0 }];
        return updated.slice(-30); // Keep last 30 data points for smooth line graph
      });
    } else if (type === 'anomaly_alert') {
      setAnomalies((prev) => [data, ...prev]);
      // Auto open detail modal for critical anomaly
      if (data.risk_score >= 80.0) {
        setSelectedAnomaly(data);
      }
    } else if (type === 'anomaly_acknowledged') {
      setAnomalies((prev) =>
        prev.map((item) =>
          item.id === data.id ? { ...item, is_acknowledged: true, status: 'ACKNOWLEDGED' } : item
        )
      );
    } else if (type === 'anomalies_cleared') {
      setAnomalies([]);
      setSelectedAnomaly(null);
    }
  };

  const handleClearAllAnomalies = async () => {
    try {
      const res = await fetch('/api/anomalies/clear/all', {
        method: 'DELETE',
      });
      if (res.ok) {
        setAnomalies([]);
        setSelectedAnomaly(null);
        fetchMetricsAndAnomalies();
      }
    } catch (err) {
      console.error("Failed to clear anomalies:", err);
    }
  };

  const handleAcknowledge = async (anomalyId) => {
    try {
      const res = await fetch(`/api/anomalies/${anomalyId}/acknowledge`, {
        method: 'POST',
      });
      if (res.ok) {
        setAnomalies((prev) =>
          prev.map((item) =>
            item.id === anomalyId ? { ...item, is_acknowledged: true, status: 'ACKNOWLEDGED' } : item
          )
        );
        if (selectedAnomaly && selectedAnomaly.id === anomalyId) {
          setSelectedAnomaly({ ...selectedAnomaly, is_acknowledged: true, status: 'ACKNOWLEDGED' });
        }
      }
    } catch (err) {
      console.error("Failed to acknowledge anomaly:", err);
    }
  };

  const handleTrainModel = async () => {
    setIsTraining(true);
    try {
      await fetch('/api/ml/train', { method: 'POST' });
      setTimeout(() => setIsTraining(false), 2000);
    } catch (err) {
      console.error("Error triggering training:", err);
      setIsTraining(false);
    }
  };

  const handleAttackTriggered = (toastData) => {
    setAttackToast(toastData);
    fetchMetricsAndAnomalies();
    setTimeout(() => {
      setAttackToast(null);
    }, 6000);
  };

  return (
    <div className="min-h-screen pb-12 bg-dark-950 text-gray-100 font-sans">
      {/* Top Header Navbar */}
      <header className="glass-panel sticky top-0 z-40 border-b border-gray-800 bg-dark-900/90 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyber-blue to-cyber-purple text-dark-900 font-bold shadow-lg shadow-cyber-blue/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                LogSentinel
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/30 font-normal">
                  v1.0 AI-Driven
                </span>
              </h1>
              <p className="text-[11px] text-gray-400 font-mono">
                Drain3 Parser & PyTorch LSTM Anomaly Detector
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 bg-dark-950/80 p-1 rounded-xl border border-gray-800/80">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/40 font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-dark-900'
                }`
              }
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/logs"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/40 font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-dark-900'
                }`
              }
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Live Console</span>
            </NavLink>

            <NavLink
              to="/anomalies"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/40 font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-dark-900'
                }`
              }
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Threat Analysis</span>
            </NavLink>

            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/40 font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-dark-900'
                }`
              }
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/40 font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-dark-900'
                }`
              }
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Settings</span>
            </NavLink>
          </nav>

          {/* Controls & Connection Indicator */}
          <div className="flex items-center gap-3">
            <AttackScenarioInjector onAttackTriggered={handleAttackTriggered} />

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-950 border border-gray-800 text-xs font-mono">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-cyber-green animate-pulse' : 'bg-red-500'}`} />
              <span className={isConnected ? 'text-cyber-green font-bold' : 'text-red-400'}>
                {isConnected ? 'STREAM ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container with Page Routes */}
      <main className="max-w-7xl mx-auto px-6 pt-6">
        {/* Attack Injection Toast Banner */}
        {attackToast && (
          <div className={`mb-6 p-4 rounded-xl flex items-center justify-between border shadow-lg backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-3 ${
            attackToast.success
              ? 'bg-red-950/40 border-red-500/50 text-red-200'
              : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              {attackToast.success ? (
                <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 animate-bounce" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
              )}
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider font-mono flex items-center gap-2">
                  <span>THREAT SCENARIO INJECTED: {attackToast.title}</span>
                  {attackToast.peakRisk && (
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs border border-red-500/40 font-normal">
                      Peak Risk: {attackToast.peakRisk.toFixed(1)}
                    </span>
                  )}
                </h4>
                <p className="text-xs font-mono opacity-90 mt-0.5">
                  {attackToast.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setAttackToast(null)}
              className="text-xs font-mono px-3 py-1 rounded bg-black/40 hover:bg-black/60 text-gray-300 hover:text-white transition-all shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Critical Alert Banner */}
        {metrics.current_risk_status === 'CRITICAL' && (
          <div className="mb-6 p-4 rounded-xl glass-panel-danger flex items-center justify-between border border-cyber-red/50 animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-cyber-red" />
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  CRITICAL ANOMALY ALERT DISPATCHED
                </h4>
                <p className="text-xs text-gray-300 font-mono mt-0.5">
                  Reconstruction risk score crossed 75.0 threshold! Inspect sequence root-cause breakdown.
                </p>
              </div>
            </div>
            {anomalies.length > 0 && (
              <button
                onClick={() => setSelectedAnomaly(anomalies[0])}
                className="px-4 py-1.5 rounded-lg bg-cyber-red text-white text-xs font-mono font-bold hover:bg-red-600 transition-all shrink-0"
              >
                Inspect Latest Anomaly
              </button>
            )}
          </div>
        )}

        {/* Page Routes */}
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                metrics={metrics}
                isConnected={isConnected}
                chartData={chartData}
                logs={logs}
                anomalies={anomalies}
                onSelectAnomaly={setSelectedAnomaly}
              />
            }
          />
          <Route
            path="/logs"
            element={
              <LiveLogsPage
                logs={logs}
                onSelectAnomaly={setSelectedAnomaly}
                onClearLogs={() => setLogs([])}
              />
            }
          />
          <Route
            path="/anomalies"
            element={
              <AnomaliesPage
                anomalies={anomalies}
                onSelectAnomaly={setSelectedAnomaly}
                onAcknowledge={handleAcknowledge}
                onClearAllAnomalies={handleClearAllAnomalies}
              />
            }
          />
          <Route
            path="/analytics"
            element={
              <AnalyticsPage
                chartData={chartData}
                logs={logs}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                isTraining={isTraining}
                handleTrainModel={handleTrainModel}
                setIsRulesOpen={setIsRulesOpen}
                isConnected={isConnected}
                metrics={metrics}
              />
            }
          />
        </Routes>
      </main>

      {/* Anomaly Detail Inspection Modal */}
      <AnomalyDetailModal
        anomaly={selectedAnomaly}
        onClose={() => setSelectedAnomaly(null)}
        onAcknowledge={handleAcknowledge}
      />

      {/* False Positive Rules Management Modal */}
      <FalsePositiveRulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
    </div>
  );
}
