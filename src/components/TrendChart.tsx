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

interface DataPoint {
  date: string;
  value: number;
}

interface TrendChartProps {
  data: DataPoint[];
  stationId: string;
  color?: string;
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
        <p className="text-sm font-semibold text-slate-700">{format(new Date(label), 'MMM dd, yyyy')}</p>
        <p className="text-sm text-indigo-600 font-medium">
          PM 2.5: {payload[0].value} µg/m³
        </p>
      </div>
    );
  }
  return null;
};

export function TrendChart({ data, stationId, color = "#4f46e5" }: TrendChartProps) {
  // Parsing dates for XAxis typically handled by recharts if numbers or strings, 
  // but better to pass timestamps or ISO strings and format tick.
  
  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-xl shadow-sm border border-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Long-term Trend: {stationId}</h3>
        <div className="flex gap-2 text-xs text-slate-500">
           {/* Controls could go here */}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
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
          <Line
            type="monotone"
            dataKey="value"
            name={`Station ${stationId}`}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
