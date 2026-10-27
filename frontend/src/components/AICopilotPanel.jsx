import React, { useState, useEffect } from 'react';
import { 
  Bot, Sparkles, ShieldAlert, Terminal, Copy, Check, Send, 
  RefreshCw, AlertTriangle, ExternalLink, Layers, ArrowRight, 
  CheckCircle2, Info, MessageSquare
} from 'lucide-react';

export default function AICopilotPanel({ anomaly }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [selectedOS, setSelectedOS] = useState('windows');
  
  // Interactive Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (anomaly?.id) {
      fetchAnalysis(anomaly.id);
      setChatMessages([
        {
          role: 'assistant',
          text: `LogSentinel AI Copilot active for Anomaly #${anomaly.id}. Ask me any question regarding root cause, firewall rules, forensic memory triage, or MITRE ATT&CK mitigation.`
        }
      ]);
    }
  }, [anomaly?.id]);

  const fetchAnalysis = async (id, force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/copilot/analyze/${id}`;
      const method = force ? 'POST' : 'GET';
      const res = await fetch(url, { method });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Copilot analysis fetch failed:', err);
      setError('Failed to load AI Copilot analysis. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCommand = (cmd, index) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || chatLoading) return;

    const userText = userInput.trim();
    setUserInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anomaly_id: anomaly.id,
          question: userText,
          chat_history: chatMessages.slice(-4).map((m) => ({ role: m.role, content: m.text }))
        })
      });
      if (!res.ok) throw new Error(`Chat error ${res.status}`);
      const data = await res.json();

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.answer,
          suggestedCommands: data.suggested_commands || []
        }
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Unable to query AI Copilot. Check backend logs for details.'
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading && !analysis) {
    return (
      <div className="p-8 rounded-2xl bg-dark-950/80 border border-cyber-blue/30 text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 rounded-2xl bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue animate-spin">
            <RefreshCw className="w-8 h-8" />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-bold text-white font-mono flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-cyber-blue animate-pulse" />
            Synthesizing Deep Forensic Analysis & MITRE ATT&CK Mapping...
          </h4>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            Correlating LSTM reconstruction error with adversary tactics and generating customized containment runbooks.
          </p>
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 space-y-3 font-mono text-xs">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
        <button
          onClick={() => fetchAnalysis(anomaly.id, true)}
          className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* 1. Header Engine Badge & Category Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyber-blue/15 via-dark-900 to-indigo-950/40 border border-cyber-blue/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/40 shadow-lg shadow-cyber-blue/10">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">
                {analysis.threat_category}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                analysis.severity_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                analysis.severity_level === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/40'
              }`}>
                {analysis.severity_level}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
              <span>Engine: <strong className="text-cyber-blue">{analysis.ai_provider_used}</strong></span>
              <span>•</span>
              <span>Confidence: <strong className="text-emerald-400">{(analysis.confidence_score * 100).toFixed(0)}%</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchAnalysis(anomaly.id, true)}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-cyber-blue/10 hover:bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30 font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 text-[11px]"
          title="Force fresh AI generation"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Regenerate Diagnosis</span>
        </button>
      </div>

      {/* 2. Plain-English Executive Summary */}
      <div className="p-4 rounded-xl bg-dark-950/70 border border-gray-800 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-cyber-blue flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyber-blue" />
          Executive Incident Summary
        </h4>
        <p className="text-gray-200 leading-relaxed font-sans text-xs">
          {analysis.executive_summary}
        </p>

        <div className="pt-2 border-t border-gray-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
          <div>
            <span className="text-gray-400 uppercase text-[10px] font-bold block">Technical Root Cause:</span>
            <span className="text-gray-300 font-sans">{analysis.technical_root_cause}</span>
          </div>
          <div>
            <span className="text-gray-400 uppercase text-[10px] font-bold block">Estimated Blast Radius:</span>
            <span className="text-rose-300 font-sans">{analysis.blast_radius}</span>
          </div>
        </div>
      </div>

      {/* 3. MITRE ATT&CK Matrix Mapping */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyber-red" />
            MITRE ATT&CK&reg; Matrix Correlation
          </h4>
          <span className="text-[10px] text-gray-500">Framework v14.1 Enterprise Matrix</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysis.mitre_attack?.map((tech, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-dark-950/80 border border-gray-800 hover:border-red-500/40 transition-all space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                    {tech.id}
                  </span>
                  <span className="text-gray-300 font-bold text-xs">
                    {tech.name}
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                  {tech.tactic}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                {tech.description}
              </p>
              <div className="flex items-center justify-between pt-1 text-[10px] text-gray-500">
                <span>Correlation Confidence</span>
                <span className="text-cyber-green font-bold">{(tech.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-cyber-green h-full rounded-full"
                  style={{ width: `${tech.confidence * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Automated Containment & Remediation Runbook */}
      <div className="p-4 rounded-xl bg-dark-950/80 border border-gray-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800/80 pb-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Automated Incident Remediation Runbook
            </h4>
            <p className="text-[11px] text-gray-400 font-sans mt-0.5">
              Prescriptive containment playbooks with executable defensive command lines.
            </p>
          </div>

          {/* OS Switcher */}
          <div className="flex items-center gap-1 p-1 bg-dark-900 rounded-lg border border-gray-800">
            <button
              onClick={() => setSelectedOS('windows')}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                selectedOS === 'windows'
                  ? 'bg-cyber-blue text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Windows PowerShell
            </button>
            <button
              onClick={() => setSelectedOS('linux')}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                selectedOS === 'linux'
                  ? 'bg-cyber-blue text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Linux / POSIX Bash
            </button>
          </div>
        </div>

        {/* Action Steps */}
        <div className="space-y-3">
          {analysis.remediation_steps?.map((step, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-gray-900/60 border border-gray-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                    {step.step || idx + 1}
                  </span>
                  <span className="font-bold text-white text-xs">{step.title}</span>
                </div>
                {step.os_target && (
                  <span className="text-[10px] text-gray-500 uppercase">
                    Target: {step.os_target}
                  </span>
                )}
              </div>
              <p className="text-gray-300 font-sans text-xs">{step.action}</p>

              {step.command && (
                <div className="relative group mt-1.5">
                  <div className="bg-dark-950 p-2.5 rounded-lg border border-gray-800 text-emerald-300 text-[11px] pr-10 overflow-x-auto whitespace-pre">
                    <code>{step.command}</code>
                  </div>
                  <button
                    onClick={() => handleCopyCommand(step.command, `step-${idx}`)}
                    className="absolute right-2 top-2 p-1.5 rounded bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-all"
                    title="Copy command to clipboard"
                  >
                    {copiedIndex === `step-${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-cyber-green" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick OS CLI Command Snippets */}
        <div className="mt-4 pt-3 border-t border-gray-800/80">
          <span className="text-gray-400 text-[11px] font-bold block mb-2">
            One-Shot {selectedOS === 'windows' ? 'PowerShell Runbook' : 'Bash Containment Script'}:
          </span>
          <div className="space-y-2">
            {(selectedOS === 'windows' ? analysis.windows_commands : analysis.linux_commands)?.map((cmd, idx) => (
              <div key={idx} className="relative group">
                <div className="bg-black/60 p-2 rounded border border-gray-800 text-emerald-400 text-[11px] font-mono pr-10 overflow-x-auto">
                  <code>{cmd}</code>
                </div>
                <button
                  onClick={() => handleCopyCommand(cmd, `os-${idx}`)}
                  className="absolute right-2 top-1.5 p-1 rounded bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
                  title="Copy command"
                >
                  {copiedIndex === `os-${idx}` ? (
                    <Check className="w-3 h-3 text-cyber-green" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Interactive "Ask Security Copilot" Assistant */}
      <div className="p-4 rounded-xl bg-dark-950/80 border border-gray-800 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          Interactive Incident Q&amp;A Assistant
        </h4>
        <p className="text-[11px] text-gray-400 font-sans">
          Ask specific questions about this anomaly (e.g. *“What firewall rule drops this IP?”*, *“How do I inspect Event Viewer for PID?”*).
        </p>

        {/* Chat History */}
        <div className="max-h-48 overflow-y-auto space-y-2 p-2.5 rounded-lg bg-dark-900/80 border border-gray-800/80 text-xs">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-2.5 rounded-xl text-xs font-sans leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyber-blue/20 text-white border border-cyber-blue/40'
                    : 'bg-gray-800/80 text-gray-200 border border-gray-700/60'
                }`}
              >
                {msg.text}

                {msg.suggestedCommands && msg.suggestedCommands.length > 0 && (
                  <div className="mt-2 space-y-1 font-mono text-[10px]">
                    <span className="text-emerald-400 font-bold block">Suggested command:</span>
                    {msg.suggestedCommands.map((c, i) => (
                      <div key={i} className="p-1 bg-black/40 rounded border border-gray-700 text-emerald-300">
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-xs animate-pulse">
              <Bot className="w-3.5 h-3.5 text-cyber-blue" />
              <span>Copilot is formulating response...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask Copilot a question about this incident..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={chatLoading}
            className="flex-1 bg-dark-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-sans text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!userInput.trim() || chatLoading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}
