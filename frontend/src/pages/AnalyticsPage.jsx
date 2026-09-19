import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { BarChart3, PieChart as PieIcon, Activity, Download, FileSpreadsheet, FileText, ShieldAlert, Zap, Filter, RefreshCw } from 'lucide-react';

export default function AnalyticsPage({ chartData, logs }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/summary');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const severityData = analytics?.severity_counts || [
    { name: 'INFO', value: 850, color: '#3B82F6' },
    { name: 'WARN', value: 120, color: '#F59E0B' },
    { name: 'CRITICAL', value: 45, color: '#EF4444' }
  ];

  const riskDistData = analytics?.risk_distribution || [
    { range: 'Normal (< 50)', count: 920, color: '#10B981' },
    { range: 'Elevated (50 - 75)', count: 65, color: '#F59E0B' },
    { range: 'Critical (>= 75)', count: 30, color: '#EF4444' }
  ];

  const threatVectors = analytics?.threat_profiles || [
    { name: 'SSH Brute Force', count: 12 },
    { name: 'DDoS Flood', count: 18 },
    { name: 'JVM OOM Crash', count: 8 },
    { name: 'Privilege Escalation', count: 5 },
    { name: 'Ransomware', count: 14 }
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="glass-panel p-5 rounded-2xl border border-cyber-blue/30 bg-dark-900/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Threat Intelligence & Analytics Dashboard
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Comprehensive statistical distribution, threat vector profiles, and severity metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalytics}
            className="px-3.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-mono flex items-center gap-1.5 transition-all border border-gray-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <a
            href="/api/reports/forensic-pdf"
            download="logsentinel_forensic_audit_report.pdf"
            className="px-4 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-red-400" />
            <span>Export Forensic PDF Report (With Graphs)</span>
          </a>
        </div>
      </div>

      {/* Grid for Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Risk Score Spectrum Distribution */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-dark-900/70 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyber-blue" />
              Risk Score Distribution Histogram
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400">
              PyTorch Output Buckets
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {riskDistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Log Severity Breakdown Donut Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-dark-900/70 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-amber-400" />
              Log Severity Composition
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400">
              Drain3 Classified Severity
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs font-mono text-gray-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Cyber Threat Scenario Vectors */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-dark-900/70 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Detected Cyber Threat Vector Profiles
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
              Active Attack Profiles
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={threatVectors} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#cbd5e1', fontSize: 10 }} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#EF4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Real-Time Risk Stream Timeline */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-dark-900/70 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyber-green" />
              Real-Time Ingestion Risk Score Stream
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-green/10 text-cyber-green border border-cyber-green/30">
              Live Stream Telemetry
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsRiskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00F0FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="score" stroke="#00F0FF" strokeWidth={2} fillOpacity={1} fill="url(#analyticsRiskGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dataset Export & Forensic PDF Download Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-dark-900/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <Download className="w-4 h-4 text-cyber-blue" />
            Export SecOps Reports & Analytics Datasets
          </h4>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Download full forensic audit reports with visual graphs or raw datasets in CSV/Excel.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="/api/dataset/export/csv"
            download="hdfs_logs.csv"
            className="px-3.5 py-1.5 rounded-xl border border-cyber-blue/40 bg-cyber-blue/10 hover:bg-cyber-blue/20 text-cyber-blue text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CSV Dataset</span>
          </a>

          <a
            href="/api/dataset/export/excel"
            download="hdfs_logs.xlsx"
            className="px-3.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel Workbook</span>
          </a>

          <a
            href="/api/reports/forensic-pdf"
            download="logsentinel_forensic_audit_report.pdf"
            className="px-4 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Forensic PDF Report</span>
          </a>
        </div>
      </div>
    </div>
  );
}
