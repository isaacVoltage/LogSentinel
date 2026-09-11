import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const score = data.score;
    const isAnomaly = score >= 55;

    return (
      <div className="glass-panel p-3 rounded-lg border border-gray-700 shadow-xl text-xs font-mono">
        <p className="text-gray-400 mb-1">{data.time}</p>
        <div className="flex items-center gap-2">
          <span className="text-gray-300">Risk Score:</span>
          <span className={`font-bold ${isAnomaly ? 'text-cyber-red' : 'text-cyber-blue'}`}>
            {score.toFixed(1)} / 100
          </span>
        </div>
        {isAnomaly && (
          <div className="mt-1 text-cyber-red font-semibold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> ANOMALY DETECTED
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function RiskScoreChart({ data }) {
  return (
    <div className="glass-panel p-5 rounded-xl border border-gray-800 mb-6 relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyber-blue" />
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
            Real-Time Anomaly Risk Score (0-100)
          </h2>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-cyber-blue" />
            <span className="text-gray-400">Risk Stream</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyber-red" />
            <span className="text-cyber-red font-semibold">Threshold (55.0)</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 font-mono text-xs">
            Waiting for live log stream...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7000FF" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="dangerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF0055" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#FF0055" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis dataKey="time" stroke="#4B5563" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis domain={[0, 100]} stroke="#4B5563" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={55} 
                stroke="#FF0055" 
                strokeDasharray="4 4" 
                strokeWidth={2} 
                label={{ value: 'CRITICAL THRESHOLD (55.0)', fill: '#FF0055', fontSize: 10, position: 'top' }} 
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#00F0FF"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#riskGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
