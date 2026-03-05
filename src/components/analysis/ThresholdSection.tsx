import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

interface ThresholdSectionProps {
  data: {
    thresholds: string[];
    avg_cases: Record<string, number[]>;
  };
}

export function ThresholdSection({ data }: ThresholdSectionProps) {
  const chartData = data.thresholds.map((threshold, i) => ({
    threshold,
    Total: data.avg_cases.Total?.[i] || 0,
    Respiratory: data.avg_cases.Respiratory?.[i] || 0,
    Cardiovascular: data.avg_cases.Cardiovascular?.[i] || 0,
    Skin: data.avg_cases.Skin?.[i] || 0,
    Eye: data.avg_cases.Eye?.[i] || 0,
  }));

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Average Cases by PM2.5 Threshold</h3>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="threshold" angle={-15} textAnchor="end" height={80} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Respiratory" stackId="a" fill="#3b82f6" />
          <Bar dataKey="Cardiovascular" stackId="a" fill="#a855f7" />
          <Bar dataKey="Skin" stackId="a" fill="#f97316" />
          <Bar dataKey="Eye" stackId="a" fill="#06b6d4" />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-3">
        แสดงจำนวนผู้ป่วยเฉลี่ยต่อสัปดาห์ในแต่ละช่วงระดับ PM2.5 (Thai AQI Standard)
      </p>
    </div>
  );
}
