import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Cpu, Zap, Layers, ThumbsDown, ShieldAlert, Check } from 'lucide-react';

export default function AnomalyDetailModal({ anomaly, onClose, onAcknowledge }) {
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState(anomaly?.status || 'ACTIVE');

  if (!anomaly) return null;

  const rootCauses = anomaly.root_cause_chain || [];

  const handleFeedback = async (type) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/anomalies/${anomaly.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback_type: type,
          notes: feedbackNotes,
          dampening_factor: 0.25
        })
      });

      if (res.ok) {
        setFeedbackStatus(type);
        if (onAcknowledge) {
          onAcknowledge(anomaly.id);
        }
      }
    } catch (err) {
      console.error('Error submitting anomaly feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel-danger w-full max-w-3xl rounded-2xl border border-cyber-red/40 overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-5 border-b border-cyber-red/30 bg-cyber-red/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyber-red/20 text-cyber-red border border-cyber-red/30">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Anomaly Inspection & Root Cause Analysis
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyber-red/20 text-cyber-red border border-cyber-red/30">
                  ID #{anomaly.id || 'N/A'}
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Detected at {anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleString() : 'Just now'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto font-sans">
          {/* Top Score Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800">
              <span className="text-xs text-gray-400 uppercase font-semibold">Anomaly Risk Score</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-cyber-red">
                  {anomaly.risk_score ? anomaly.risk_score.toFixed(1) : '88.5'}
                </span>
                <span className="text-xs text-gray-500">/ 100</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800">
              <span className="text-xs text-gray-400 uppercase font-semibold">Status & Feedback</span>
              <div className="mt-2">
                <span className={`px-3 py-1 text-xs font-bold font-mono rounded-full border ${
                  feedbackStatus === 'FALSE_POSITIVE'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : feedbackStatus === 'CONFIRMED'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : anomaly.is_acknowledged 
                    ? 'bg-cyber-green/10 text-cyber-green border-cyber-green/30' 
                    : 'bg-cyber-red/20 text-cyber-red border-cyber-red/40 animate-pulse'
                }`}>
                  {feedbackStatus === 'FALSE_POSITIVE'
                    ? 'FALSE POSITIVE (DAMPENED)'
                    : feedbackStatus === 'CONFIRMED'
                    ? 'CONFIRMED THREAT'
                    : anomaly.is_acknowledged ? 'ACKNOWLEDGED' : 'ACTIVE ALERT'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800">
              <span className="text-xs text-gray-400 uppercase font-semibold">Detection Engine</span>
              <div className="mt-1 text-xs font-mono text-cyber-blue flex items-center gap-1">
                <Cpu className="w-4 h-4 text-cyber-blue" />
                PyTorch LSTM Autoencoder
              </div>
              <div className="text-[11px] text-gray-500 font-mono mt-1">Reconstruction Loss Analysis</div>
            </div>
          </div>

          {/* Root Cause Chain Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyber-red" />
                Root-Cause Sequence Chain (Ranked by Loss Contribution)
              </h4>
              <span className="text-xs font-mono text-gray-500">
                {rootCauses.length} sequence tokens evaluated
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {rootCauses.length === 0 ? (
                <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 text-gray-500 text-center">
                  Raw sequence log unavailable.
                </div>
              ) : (
                rootCauses.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-cyber-red/40 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyber-red/20 text-cyber-red text-[10px] font-bold flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-cyber-blue text-[11px]">
                          Template ID: T{item.template_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-400">Reconstruction Error:</span>
                        <span className="font-bold text-cyber-red">{item.reconstruction_error}</span>
                        <span className="text-cyber-amber font-bold">({item.contribution_percentage}%)</span>
                      </div>
                    </div>

                    <p className="text-gray-200 text-xs bg-dark-900 p-2.5 rounded border border-gray-800/80 leading-relaxed">
                      {item.raw_message}
                    </p>

                    {/* Contribution Progress Bar */}
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyber-amber to-cyber-red h-full rounded-full"
                        style={{ width: `${Math.min(item.contribution_percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Operator Feedback & Active Learning Section */}
          <div className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 space-y-3 font-mono">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-cyber-amber" />
              Active Learning & False Positive Dampening Engine
            </h4>
            <p className="text-[11px] text-gray-400">
              Marking this incident as a <span className="text-amber-300 font-bold">False Positive</span> registers a dampening rule for Template #{rootCauses[0]?.template_id || 'N/A'}, reducing risk scores by 75% for future log occurrences.
            </p>

            <input
              type="text"
              placeholder="Optional operator notes (e.g., Routine database backup job)..."
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              className="w-full bg-dark-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyber-blue"
            />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => handleFeedback('FALSE_POSITIVE')}
                disabled={isSubmitting || feedbackStatus === 'FALSE_POSITIVE'}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                {feedbackStatus === 'FALSE_POSITIVE' ? 'Dampening Rule Active' : 'Mark False Positive'}
              </button>

              <button
                onClick={() => handleFeedback('CONFIRMED')}
                disabled={isSubmitting || feedbackStatus === 'CONFIRMED'}
                className="px-3.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                {feedbackStatus === 'CONFIRMED' ? 'Confirmed Threat' : 'Confirm Real Threat'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all text-xs font-mono"
          >
            Close Modal
          </button>

          {!anomaly.is_acknowledged && (
            <button
              onClick={() => onAcknowledge(anomaly.id)}
              className="px-5 py-2 rounded-xl bg-cyber-green/20 text-cyber-green border border-cyber-green/40 hover:bg-cyber-green/30 transition-all text-xs font-mono font-bold flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Acknowledge Anomaly
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

