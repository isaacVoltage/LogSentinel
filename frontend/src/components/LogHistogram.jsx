import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';

export default function LogHistogram({ logs }) {
  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    // Bucket logs into 10 time slots based on index / timestamp
    const bucketCount = 12;
    const chunkSize = Math.max(1, Math.ceil(logs.length / bucketCount));
    const buckets = [];

    for (let i = 0; i < logs.length; i += chunkSize) {
      const slice = logs.slice(i, i + chunkSize);
      const normalCount = slice.filter((l) => !l.is_anomaly).length;
      const anomalyCount = slice.filter((l) => l.is_anomaly).length;
      const firstTime = slice[0]?.timestamp ? slice[0].timestamp.substring(11, 19) : `#${i + 1}`;

      buckets.push({
        time: firstTime,
        normal: normalCount,
        anomaly: anomalyCount,
        total: slice.length,
        hasAnomaly: anomalyCount > 0
      });
    }

    return buckets;
  }, [logs]);

  if (!logs || logs.length === 0) return null;

  return (
    <div className="p-3 bg-dark-950/80 border-b border-gray-800 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-gray-400">
        <BarChart3 className="w-3.5 h-3.5 text-cyber-blue" />
        <span className="font-bold text-gray-300">Traffic Volume Histogram:</span>
        <span>{logs.length} events buffered</span>
      </div>

      <div className="h-10 flex-1 max-w-xl">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="time" hide />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-dark-900 border border-gray-700 p-2 rounded text-[11px] font-mono text-gray-200 shadow-lg">
                      <p className="font-bold text-cyber-blue">{data.time}</p>
                      <p className="text-gray-300">Normal logs: {data.normal}</p>
                      {data.anomaly > 0 && (
                        <p className="text-cyber-red font-bold">Anomalies: {data.anomaly}</p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="normal" stackId="a" fill="#3B82F6" radius={[2, 2, 0, 0]} />
            <Bar dataKey="anomaly" stackId="a" fill="#EF4444" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-400">Normal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 font-bold">Anomaly Burst</span>
        </div>
      </div>
    </div>
  );
}
