import React from 'react';
import { GitCompare, CheckCircle2, AlertOctagon, ArrowRight } from 'lucide-react';

export default function ComparisonPanel({ latestAnomaly }) {
  // Baseline normal sequence workflow
  const baselineSequence = [
    { step: 1, template: "T1", message: "Receiving block blk_1001 src: /10.251.43.159:55123", status: "NORMAL" },
    { step: 2, template: "T2", message: "BLOCK* NameSystem.allocateBlock: /user/hadoop/datafile.txt", status: "NORMAL" },
    { step: 3, template: "T3", message: "Received block blk_1001 of size 67108864", status: "NORMAL" },
    { step: 4, template: "T4", message: "PacketResponder 1 for block blk_1001 terminating", status: "NORMAL" },
    { step: 5, template: "T5", message: "Verification succeeded for blk_1001", status: "NORMAL" }
  ];

  // Current anomalous sequence workflow (or sample if no active anomaly)
  const currentSequence = latestAnomaly?.root_cause_chain ? latestAnomaly.root_cause_chain.slice(0, 5) : [
    { step: 1, template: "T1", message: "Receiving block blk_1001 src: /10.251.43.159:55123", status: "NORMAL" },
    { step: 2, template: "T2", message: "BLOCK* NameSystem.allocateBlock: /user/hadoop/datafile.txt", status: "NORMAL" },
    { step: 3, template: "T99", message: "FATAL: OutOfMemoryError in NameNode thread heap dump created", status: "ANOMALY" },
    { step: 4, template: "T98", message: "CRITICAL: Connection refused from 10.251.43.159 DataNode Dead!", status: "ANOMALY" },
    { step: 5, template: "T97", message: "EMERGENCY: Cascade failure! 45% of cluster blocks unreachable!", status: "ANOMALY" }
  ];

  return (
    <div className="glass-panel p-5 rounded-xl border border-gray-800 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-cyber-purple" />
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
            Sequence Baseline vs Anomalous Stream Comparison
          </h2>
        </div>
        <span className="text-xs font-mono text-gray-400">
          Sliding Window N=5
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        {/* Baseline Panel */}
        <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-800">
            <span className="font-bold text-cyber-green flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Learned Baseline Pattern (Normal)
            </span>
            <span className="text-[10px] text-gray-500">Loss ~ 0.12</span>
          </div>

          <div className="space-y-2">
            {baselineSequence.map((item, idx) => (
              <div key={idx} className="p-2.5 rounded bg-dark-900 border border-gray-800/80 flex items-start gap-2">
                <span className="text-gray-500 text-[10px] shrink-0 mt-0.5">#{item.step}</span>
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-cyber-green/10 text-cyber-green border border-cyber-green/20 shrink-0">
                  {item.template}
                </span>
                <span className="text-gray-300 truncate">{item.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Anomalous Stream Panel */}
        <div className="p-4 rounded-xl bg-gray-900/60 border border-cyber-red/30 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-cyber-red/20">
            <span className="font-bold text-cyber-red flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 animate-pulse" /> Anomalous Window Pattern
            </span>
            <span className="text-[10px] text-cyber-red font-bold">
              Loss: {latestAnomaly?.risk_score ? (latestAnomaly.risk_score / 20).toFixed(2) : '3.85'}
            </span>
          </div>

          <div className="space-y-2">
            {currentSequence.map((item, idx) => {
              const isAnomaly = item.status === "ANOMALY" || (item.reconstruction_error && item.reconstruction_error > 1.5);
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded border transition-all flex items-start gap-2 ${
                    isAnomaly 
                      ? 'bg-cyber-red/15 border-cyber-red/40 text-cyber-red font-bold' 
                      : 'bg-dark-900 border-gray-800/80 text-gray-300'
                  }`}
                >
                  <span className="text-gray-500 text-[10px] shrink-0 mt-0.5">#{idx + 1}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded shrink-0 ${
                    isAnomaly ? 'bg-cyber-red text-white' : 'bg-gray-800 text-cyber-blue'
                  }`}>
                    {item.template_id ? `T${item.template_id}` : item.template}
                  </span>
                  <span className="truncate flex-1">
                    {item.raw_message || item.message}
                  </span>
                  {isAnomaly && (
                    <span className="text-[10px] text-cyber-amber font-mono shrink-0">
                      DEVIATION
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
