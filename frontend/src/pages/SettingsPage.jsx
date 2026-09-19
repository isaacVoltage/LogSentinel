import React, { useState, useEffect } from 'react';
import { Cpu, ThumbsDown, FileText, FileSpreadsheet, Download, Sliders, CheckCircle2, ShieldCheck, Activity, Bell, Send, Mail, Globe, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function SettingsPage({
  isTraining,
  handleTrainModel,
  setIsRulesOpen,
  isConnected,
  metrics
}) {
  // Alert Config State
  const [alertConfig, setAlertConfig] = useState({
    webhook_enabled: false,
    webhook_url: '',
    webhook_provider: 'discord',
    email_enabled: false,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    alert_email_recipient: 'secops-alerts@logsentinel.com'
  });

  const [savingAlerts, setSavingAlerts] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Fetch current alert settings
  useEffect(() => {
    fetch('/api/alerts/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setAlertConfig(data);
      })
      .catch((err) => console.error('Error loading alert config:', err));
  }, []);

  const handleSaveAlertConfig = async (updatedConfig = alertConfig) => {
    setSavingAlerts(true);
    try {
      const res = await fetch('/api/alerts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
      if (res.ok) {
        const data = await res.json();
        setAlertConfig(data);
        setTestResult({ success: true, message: 'Alert notification settings saved successfully!' });
        setTimeout(() => setTestResult(null), 4000);
      }
    } catch (err) {
      console.error('Error saving alert settings:', err);
    } finally {
      setSavingAlerts(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!alertConfig.webhook_url) {
      setTestResult({ success: false, message: 'Please enter a valid Webhook URL first.' });
      return;
    }
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/alerts/test/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_url: alertConfig.webhook_url,
          webhook_provider: alertConfig.webhook_provider
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.detail || 'Webhook dispatch failed.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Network error reaching API backend.' });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleTestEmail = async () => {
    if (!alertConfig.smtp_host || !alertConfig.alert_email_recipient) {
      setTestResult({ success: false, message: 'Please enter SMTP Host and Recipient Email first.' });
      return;
    }
    setTestingEmail(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/alerts/test/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_host: alertConfig.smtp_host,
          smtp_port: Number(alertConfig.smtp_port) || 587,
          smtp_user: alertConfig.smtp_user,
          smtp_password: alertConfig.smtp_password,
          recipient: alertConfig.alert_email_recipient
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.detail || 'Email dispatch failed.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Network error reaching API backend.' });
    } finally {
      setTestingEmail(false);
    }
  };

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
            Configure Drain3 parsing, trigger PyTorch LSTM retraining, manage FP suppression rules, and set up Webhook & Email alerts.
          </p>
        </div>
      </div>

      {/* SecOps Incident Alert & Notification Channels Card */}
      <div className="glass-panel p-5 rounded-2xl border border-cyber-blue/30 bg-dark-900/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono tracking-wide">
                Automated Incident Alert & Notification Channels
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Dispatch real-time security alerts to Discord, Slack, Webhooks, or SMTP Email when risk &ge; 75.0.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleSaveAlertConfig()}
            disabled={savingAlerts}
            className="px-4 py-2 rounded-xl bg-cyber-blue text-dark-900 font-mono text-xs font-bold hover:bg-cyan-400 transition-all shadow-md shadow-cyber-blue/20 flex items-center gap-2 self-start sm:self-auto"
          >
            {savingAlerts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>{savingAlerts ? 'Saving...' : 'Save Alert Settings'}</span>
          </button>
        </div>

        {/* Test Result Feedback Banner */}
        {testResult && (
          <div className={`p-3 rounded-xl flex items-center gap-3 border font-mono text-xs animate-in fade-in slide-in-from-top-2 ${
            testResult.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
            <span className="flex-1">{testResult.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Webhook Channel Config */}
          <div className="p-4 rounded-xl bg-dark-950/60 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
                <Globe className="w-4 h-4 text-cyber-blue" />
                <span>Webhook Alert Channel (Discord / Slack / Generic)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertConfig.webhook_enabled}
                  onChange={(e) => {
                    const updated = { ...alertConfig, webhook_enabled: e.target.checked };
                    setAlertConfig(updated);
                    handleSaveAlertConfig(updated);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyber-blue"></div>
              </label>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1">Webhook Provider:</label>
                <select
                  value={alertConfig.webhook_provider}
                  onChange={(e) => setAlertConfig({ ...alertConfig, webhook_provider: e.target.value })}
                  className="w-full bg-dark-900 border border-gray-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyber-blue"
                >
                  <option value="discord">Discord Webhook (Rich Embed)</option>
                  <option value="slack">Slack Incoming Webhook</option>
                  <option value="generic">Generic JSON Webhook Payload</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Webhook Target URL:</label>
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/..."
                  value={alertConfig.webhook_url}
                  onChange={(e) => setAlertConfig({ ...alertConfig, webhook_url: e.target.value })}
                  className="w-full bg-dark-900 border border-gray-800 rounded-lg px-3 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue"
                />
              </div>

              <button
                onClick={handleTestWebhook}
                disabled={testingWebhook || !alertConfig.webhook_url}
                className="w-full mt-1 py-2 px-3 rounded-lg border border-cyber-blue/30 bg-cyber-blue/10 hover:bg-cyber-blue/20 text-cyber-blue text-xs font-mono flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {testingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{testingWebhook ? 'Sending Test Payload...' : 'Send Test Webhook Alert'}</span>
              </button>
            </div>
          </div>

          {/* 2. SMTP Email Channel Config */}
          <div className="p-4 rounded-xl bg-dark-950/60 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>SMTP Email Alert Channel</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertConfig.email_enabled}
                  onChange={(e) => {
                    const updated = { ...alertConfig, email_enabled: e.target.checked };
                    setAlertConfig(updated);
                    handleSaveAlertConfig(updated);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-gray-400 block mb-1">SMTP Host:</label>
                  <input
                    type="text"
                    placeholder="smtp.gmail.com"
                    value={alertConfig.smtp_host}
                    onChange={(e) => setAlertConfig({ ...alertConfig, smtp_host: e.target.value })}
                    className="w-full bg-dark-900 border border-gray-800 rounded-lg px-3 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Port:</label>
                  <input
                    type="number"
                    placeholder="587"
                    value={alertConfig.smtp_port}
                    onChange={(e) => setAlertConfig({ ...alertConfig, smtp_port: e.target.value })}
                    className="w-full bg-dark-900 border border-gray-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 block mb-1">SMTP User:</label>
                  <input
                    type="text"
                    placeholder="alerts@domain.com"
                    value={alertConfig.smtp_user}
                    onChange={(e) => setAlertConfig({ ...alertConfig, smtp_user: e.target.value })}
                    className="w-full bg-dark-900 border border-gray-800 rounded-lg px-3 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">SMTP Password:</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={alertConfig.smtp_password}
                    onChange={(e) => setAlertConfig({ ...alertConfig, smtp_password: e.target.value })}
                    className="w-full bg-dark-900 border border-gray-800 rounded-lg px-3 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">SecOps Alert Recipient Email:</label>
                <input
                  type="email"
                  placeholder="secops-team@company.com"
                  value={alertConfig.alert_email_recipient}
                  onChange={(e) => setAlertConfig({ ...alertConfig, alert_email_recipient: e.target.value })}
                  className="w-full bg-dark-900 border border-gray-800 rounded-lg px-3 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={handleTestEmail}
                disabled={testingEmail || !alertConfig.smtp_host || !alertConfig.alert_email_recipient}
                className="w-full mt-1 py-2 px-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {testingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{testingEmail ? 'Sending Test Email...' : 'Send Test HTML Email Alert'}</span>
              </button>
            </div>
          </div>
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
