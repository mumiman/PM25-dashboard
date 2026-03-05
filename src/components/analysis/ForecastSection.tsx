import { useState } from 'react';
import { ForecastResult, ModelInfo } from '../../pages/AnalysisPage';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Area, Line } from 'recharts';

interface ForecastSectionProps {
  data: ForecastResult[];
}

export function ForecastSection({ data }: ForecastSectionProps) {
  const [selectedTarget, setSelectedTarget] = useState(data[0]?.target || 'PM2.5');
  
  const currentForecast = data.find(f => f.target === selectedTarget);
  
  // Format model parameters for display
  const formatModelParams = (model: ModelInfo) => {
    if (model.name === 'SARIMA' && model.order && model.seasonal_order) {
      return `${model.name} ${model.order}${model.seasonal_order}`;
    } else if (model.name === 'Holt-Winters') {
      return `${model.name} (trend=${model.trend}, seasonal=${model.seasonal}, period=${model.seasonal_periods})`;
    }
    return model.name;
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Forecast (12 สัปดาห์)</h3>
            {currentForecast && (
              <p className="text-sm text-slate-500">
                ข้อมูลปัจจุบัน: Week {currentForecast.current_week}, {currentForecast.current_year}
                {currentForecast.target !== 'PM2.5' && ' (lag -1 สัปดาห์)'}
              </p>
            )}
          </div>
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="block w-40 pl-3 pr-8 py-1 text-sm border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm border"
          >
            {data.map(f => (
              <option key={f.target} value={f.target}>{f.target}</option>
            ))}
          </select>
        </div>
        
        {/* Model Info Box */}
        {currentForecast && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-slate-500">Model:</span>{' '}
                <span className="font-mono font-medium text-indigo-700">
                  {formatModelParams(currentForecast.model)}
                </span>
              </div>
              {currentForecast.model.aic && (
                <div>
                  <span className="text-slate-500">AIC:</span>{' '}
                  <span className="font-mono">{currentForecast.model.aic}</span>
                </div>
              )}
              {currentForecast.model.bic && (
                <div>
                  <span className="text-slate-500">BIC:</span>{' '}
                  <span className="font-mono">{currentForecast.model.bic}</span>
                </div>
              )}
              {currentForecast.model.smoothing_level !== undefined && (
                <div>
                  <span className="text-slate-500">α:</span>{' '}
                  <span className="font-mono">{currentForecast.model.smoothing_level}</span>
                </div>
              )}
              {currentForecast.model.smoothing_trend !== undefined && (
                <div>
                  <span className="text-slate-500">β:</span>{' '}
                  <span className="font-mono">{currentForecast.model.smoothing_trend}</span>
                </div>
              )}
              {currentForecast.model.smoothing_seasonal !== undefined && (
                <div>
                  <span className="text-slate-500">γ:</span>{' '}
                  <span className="font-mono">{currentForecast.model.smoothing_seasonal}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">{currentForecast.model.description}</p>
          </div>
        )}
        
        {currentForecast && (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={currentForecast.forecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="week" 
                tickFormatter={(week, index) => {
                  const point = currentForecast.forecast[index];
                  return point ? `W${week}/${point.year}` : `W${week}`;
                }}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  currentForecast.target === 'PM2.5' ? `${value} µg/m³` : `${value} cases`,
                  name
                ]}
                labelFormatter={(week, payload) => {
                  if (payload && payload[0]) {
                    const point = payload[0].payload;
                    return `Week ${point.week}, ${point.year}`;
                  }
                  return `Week ${week}`;
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="ci_upper"
                stackId="1"
                stroke="none"
                fill="#c7d2fe"
                name="Upper CI (95%)"
              />
              <Area
                type="monotone"
                dataKey="ci_lower"
                stackId="2"
                stroke="none"
                fill="#ffffff"
                name="Lower CI (95%)"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={true}
                name="Prediction"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
