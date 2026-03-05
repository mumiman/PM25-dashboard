import { CorrelationResult } from '../../pages/AnalysisPage';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, Bar } from 'recharts';

interface CorrelationSectionProps {
  data: CorrelationResult[];
}

export function CorrelationSection({ data }: CorrelationSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Correlation Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Correlation Results</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Disease</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">r</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">95% CI</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">P-value</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">R²</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row) => (
                <tr key={row.disease} className={row.disease === 'Total' ? 'bg-slate-50 font-medium' : ''}>
                  <td className="px-3 py-2 text-sm text-slate-800">{row.disease}</td>
                  <td className="px-3 py-2 text-sm text-center">
                    <span className={row.r > 0 ? 'text-red-600' : 'text-blue-600'}>
                      {row.r.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-slate-600">
                    [{row.ci_lower.toFixed(3)}, {row.ci_upper.toFixed(3)}]
                  </td>
                  <td className="px-3 py-2 text-sm text-center">
                    <span className={row.p_value < 0.05 ? 'text-green-600 font-medium' : 'text-slate-500'}>
                      {row.p_value < 0.001 ? '<0.001' : row.p_value.toFixed(4)}
                      {row.p_value < 0.05 && ' *'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-slate-600">
                    {(row.r_squared * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-3">* p {'<'} 0.05 (statistically significant)</p>
      </div>

      {/* Correlation Bar Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Correlation Coefficients</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[-1, 1]} />
            <YAxis dataKey="disease" type="category" width={100} />
            <Tooltip />
            <ReferenceLine x={0} stroke="#94a3b8" />
            <Bar dataKey="r" fill="#6366f1" name="Correlation (r)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
