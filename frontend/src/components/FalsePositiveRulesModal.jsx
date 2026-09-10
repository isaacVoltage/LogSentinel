import React, { useState, useEffect } from 'react';
import { X, ThumbsDown, Trash2, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';

export default function FalsePositiveRulesModal({ isOpen, onClose }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feedback/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Error fetching False Positive rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen]);

  const handleDeleteRule = async (templateId) => {
    setDeletingId(templateId);
    try {
      const res = await fetch(`/api/feedback/rules/${templateId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.template_id !== templateId));
      }
    } catch (err) {
      console.error('Error deleting False Positive rule:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-3xl rounded-2xl border border-amber-500/40 bg-dark-900/95 overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ThumbsDown className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                False Positive Rules & Active Learning Manager
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-normal">
                  {rules.length} Active Rules
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Suppresses false alarm alerts by applying dampening factors to registered Drain3 log templates.
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

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between bg-dark-950 p-3 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 text-gray-300">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Active Scoring Multiplier: <strong className="text-amber-300">0.25x (75% Risk Dampening)</strong></span>
            </div>
            <button
              onClick={fetchRules}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center gap-1.5 text-[11px] transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="p-8 text-center bg-gray-900/50 rounded-2xl border border-gray-800 text-gray-400 space-y-2">
              <AlertCircle className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="font-bold text-gray-300">No False Positive Rules Registered</p>
              <p className="text-[11px] text-gray-500">
                Mark any flagged anomaly as a "False Positive" in the Anomaly Inspection modal to register a dampening rule here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-amber-500/40 transition-all flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[11px]">
                        Template ID: T{rule.template_id}
                      </span>
                      <span className="text-gray-400 text-[11px]">
                        Dampener: {(rule.dampening_factor * 100).toFixed(0)}% score weight
                      </span>
                      <span className="text-gray-500 text-[10px]">
                        {new Date(rule.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-gray-200 text-xs bg-dark-900 p-2.5 rounded border border-gray-800/80 truncate">
                      {rule.raw_template_str || 'Raw log template string unavailable'}
                    </p>

                    {rule.notes && (
                      <p className="text-[11px] text-amber-400/90 italic">
                        Note: "{rule.notes}"
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteRule(rule.template_id)}
                    disabled={deletingId === rule.template_id}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all shrink-0 self-center"
                    title="Revoke false positive dampening rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all text-xs font-mono"
          >
            Close Manager
          </button>
        </div>
      </div>
    </div>
  );
}
