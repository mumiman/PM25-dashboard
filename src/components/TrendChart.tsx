import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface DataPoint {
  date: string;
  value: number;
}

interface TrendChartProps {
  data: DataPoint[];
  stationId: string;
  color?: string; // Kept for API compatibility but overriding in implementation
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
        <p className="text-sm font-semibold text-slate-700">{format(new Date(label), 'MMM dd, yyyy')}</p>
        <div className="space-y-1 mt-1">
            {payload.map((entry: any, idx: number) => (
                <p key={idx} className="text-sm font-medium" style={{ color: entry.color }}>
                  {entry.name}: {entry.value?.toFixed(1)} µg/m³
                </p>
            ))}
        </div>
      </div>
    );
  }
  return null;
};

export function TrendChart({ data, stationId }: TrendChartProps) {
  const [windowSize, setWindowSize] = useState(7);

  // Calculate Moving Average (Simple Moving Average)
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort just in case, though process_data should have handled it
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sorted.map((point, index, array) => {
        let ma = null;
        if (index >= windowSize - 1) {
            let sum = 0;
            for (let i = 0; i < windowSize; i++) {
                sum += array[index - i].value;
            }
            ma = sum / windowSize;
        }
        return {
            ...point,
            ma
        };
    });
  }, [data, windowSize]);

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-xl shadow-sm border border-slate-100">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-800">Long-term Trend: {stationId}</h3>
        <div className="flex items-center gap-2 text-xs">
           <span className="text-slate-500 font-medium">Moving Average:</span>
           <div className="flex bg-slate-100 rounded-lg p-1">
             {[7, 15, 30].map(days => (
               <button
                 key={days}
                 onClick={() => setWindowSize(days)}
                 className={cn(
                   "px-3 py-1 rounded-md transition-all font-medium",
                   windowSize === days 
                     ? "bg-white text-indigo-600 shadow-sm" 
                     : "text-slate-500 hover:text-slate-700"
                 )}
               >
                 {days}D
               </button>
             ))}
           </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 10,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(str) => format(new Date(str), 'yyyy')}
            minTickGap={30}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'µg/m³', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: 12 } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Actual Data - Gray, thinner, maybe slight opacity */}
          <Line
            type="monotone"
            dataKey="value"
            name="Actual PM2.5"
            stroke="#cbd5e1" // slate-300
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
            animationDuration={1000}
          />

          {/* Moving Average - Red, prominent */}
          <Line
            type="monotone"
            dataKey="ma"
            name={`${windowSize}-Day Avg`}
            stroke="#ef4444" // red-500
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
            animationDuration={1000}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
