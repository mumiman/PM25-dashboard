import { LagResult } from '../../pages/AnalysisPage';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';

interface LagAnalysisSectionProps {
  data: LagResult[];
}

export function LagAnalysisSection({ data }: LagAnalysisSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Summary Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Optimal Lag Summary</h3>
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Disease</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Optimal Lag</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">r at Optimal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr key={row.disease}>
                <td className="px-3 py-2 text-sm text-slate-800">{row.disease}</td>
                <td className="px-3 py-2 text-sm text-center font-medium text-indigo-600">
                  {row.optimal_lag} weeks
                </td>
                <td className="px-3 py-2 text-sm text-center">
                  {row.optimal_r.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-400 mt-3">
          Optimal lag = จำนวนสัปดาห์หลังจากสัมผัส PM2.5 ที่สังเกตพบผลกระทบสูงสุด
        </p>
      </div>

      {/* Lag Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Cross-Correlation by Lag</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="lag" type="number" domain={[0, 4]} label={{ value: 'Lag (weeks)', position: 'bottom' }} />
            <YAxis domain={[-1, 1]} />
            <Tooltip />
            <Legend />
            {data.slice(0, 3).map((disease, i) => (
              <Line
                key={disease.disease}
                data={disease.correlations}
                type="monotone"
                dataKey="r"
                name={disease.disease}
                stroke={['#4f46e5', '#10b981', '#f59e0b'][i]}
                strokeWidth={2}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
