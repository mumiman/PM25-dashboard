import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { getMonth, getYear, parseISO } from 'date-fns';

interface DataPoint {
  date: string;
  value: number;
}

interface SeasonalChartProps {
  data: DataPoint[];
  stationId: string;
}

// Helper to calculate median
const calculateMedian = (values: number[]) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
          <p className="text-sm font-semibold text-slate-700 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                    <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-medium text-slate-600">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{entry.value?.toFixed(1)}</span>
                </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
};

export function SeasonalChart({ data, stationId }: SeasonalChartProps) {
    const processedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const currentYear = 2025;
        const prevYear = 2024;
        const medianStartYear = 2020;
        const medianEndYear = 2024;

        // Buckets for aggregation
        const monthlyData2025: Record<number, number[]> = {};
        const monthlyData2024: Record<number, number[]> = {};
        const monthlyDataMedian: Record<number, number[]> = {};

        // Initialize buckets
        for (let i = 0; i < 12; i++) {
            monthlyData2025[i] = [];
            monthlyData2024[i] = [];
            monthlyDataMedian[i] = [];
        }

        data.forEach(d => {
            const date = parseISO(d.date);
            const year = getYear(date);
            const month = getMonth(date); // 0-11
            const val = d.value;

            if (year === currentYear) {
                monthlyData2025[month].push(val);
            }
            if (year === prevYear) {
                monthlyData2024[month].push(val);
            }
            if (year >= medianStartYear && year <= medianEndYear) {
                monthlyDataMedian[month].push(val);
            }
        });

        // Compute stats for each month
        const chartData = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let i = 0; i < 12; i++) {
            const vals2025 = monthlyData2025[i];
            const vals2024 = monthlyData2024[i];
            const valsMedian = monthlyDataMedian[i];

            chartData.push({
                month: monthNames[i],
                current: vals2025.length > 0 ? vals2025.reduce((a, b) => a + b, 0) / vals2025.length : null,
                prev: vals2024.length > 0 ? vals2024.reduce((a, b) => a + b, 0) / vals2024.length : null,
                median: valsMedian.length > 0 ? calculateMedian(valsMedian) : null,
            });
        }
        return chartData;

    }, [data]);

    return (
        <div className="w-full h-[400px] bg-white p-4 rounded-xl shadow-sm border border-slate-100">
             <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Seasonal Comparison: {stationId}</h3>
                <p className="text-xs text-slate-500">Comparing 2025 (Bar) vs 2024 (Line) vs 5-Year Median</p>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={processedData}
                    margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                >
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }} 
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        label={{ value: 'PM2.5 (µg/m³)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: 12 } }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Legend iconType="circle" />
                    
                    {/* 2025 Bar */}
                    <Bar 
                        dataKey="current" 
                        name="2025 Average" 
                        barSize={20} 
                        radius={[4, 4, 0, 0]}
                        fill="#3b82f6" // Blue-500
                    >
                        {
                            processedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.current && entry.current > 50 ? '#ef4444' : '#3b82f6'} />
                            ))
                        }
                    </Bar>

                    {/* 2024 Line */}
                    <Line 
                        type="monotone" 
                        dataKey="prev" 
                        name="2024 Average" 
                        stroke="#94a3b8" // Slate-400 (Gray)
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#94a3b8' }}
                    />

                    {/* 5-Year Median Line */}
                    <Line 
                         type="monotone" 
                         dataKey="median" 
                         name="5-Year Median" 
                         stroke="#10b981" // Emerald-500 (Green)
                         strokeWidth={2}
                         strokeDasharray="5 5"
                         dot={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
