import { useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
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
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';

// Types for analysis results
interface CorrelationResult {
  disease: string;
  r: number;
  ci_lower: number;
  ci_upper: number;
  p_value: number;
  r_squared: number;
  n: number;
}

interface ForecastPoint {
  week: number;
  year: number;
  value: number;
  ci_lower: number;
  ci_upper: number;
}

interface ModelInfo {
  name: string;
  order?: string;
  seasonal_order?: string;
  trend?: string;
  seasonal?: string;
  seasonal_periods?: number;
  description: string;
  aic?: number;
  bic?: number;
  smoothing_level?: number;
  smoothing_trend?: number;
  smoothing_seasonal?: number;
}

interface ForecastResult {
  target: string;
  forecast: ForecastPoint[];
  model: ModelInfo;
  current_week: number;
  current_year: number;
}

interface LagCorrelation {
  lag: number;
  r: number;
  p_value: number;
}

interface LagResult {
  disease: string;
  correlations: LagCorrelation[];
  optimal_lag: number;
  optimal_r: number;
}

interface AnalysisData {
  correlations: CorrelationResult[];
  forecasts: ForecastResult[];
  lag_analysis: LagResult[];
  threshold_analysis: {
    thresholds: string[];
    avg_cases: Record<string, number[]>;
  };
  computed_at: string;
  cached: boolean;
}

export function AnalysisPage() {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedTab, setSelectedTab] = useState<'correlation' | 'forecast' | 'lag' | 'threshold'>('correlation');

  const handleCompute = async (force: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear, force_recompute: force })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      setAnalysisData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute analysis');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'correlation', label: 'Correlation', icon: BarChart3 },
    { id: 'forecast', label: 'Forecast', icon: TrendingUp },
    { id: 'lag', label: 'Lag Analysis', icon: Clock },
    { id: 'threshold', label: 'Threshold', icon: AlertTriangle },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
              <BarChart3 size={12} className="inline mr-1" />
              การวิเคราะห์ทางสถิติ
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            วิเคราะห์ เขตสุขภาพที่ 6
          </h2>
          <p className="text-slate-500 mt-1">Correlation, Forecasting และ Statistical Analysis</p>
        </div>
        
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ปี</label>
            <select 
              className="block w-24 pl-3 pr-8 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm border"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[2026, 2025, 2024, 2023, 2022].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => handleCompute(false)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            {loading ? 'กำลังคำนวณ...' : 'โหลดข้อมูล'}
          </button>
          
          <button
            onClick={() => handleCompute(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            คำนวณใหม่
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <strong>Error:</strong> {error}
          <p className="text-sm mt-1">ตรวจสอบว่า Backend กำลังทำงาน: <code>cd backend && uvicorn main:app --reload</code></p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              selectedTab === tab.id
                ? 'text-indigo-600 border-indigo-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {!analysisData ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-100 text-center">
          <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">ยังไม่มีข้อมูลการวิเคราะห์</h3>
          <p className="text-slate-500 mb-4">กดปุ่ม "โหลดข้อมูล" เพื่อเริ่มการวิเคราะห์ทางสถิติ</p>
          <button
            onClick={() => handleCompute(false)}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            เริ่มการวิเคราะห์
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Last computed time and cache status */}
          <div className="flex justify-between items-center text-sm">
            <span className={analysisData.cached ? 'text-amber-600' : 'text-green-600'}>
              {analysisData.cached ? '📁 ใช้ข้อมูลจาก Cache' : '✓ คำนวณใหม่'}
            </span>
            <span className="text-slate-500">
              คำนวณล่าสุด: {new Date(analysisData.computed_at).toLocaleString('th-TH')}
            </span>
          </div>

          {/* Correlation Tab */}
          {selectedTab === 'correlation' && (
            <CorrelationSection data={analysisData.correlations} />
          )}

          {/* Forecast Tab */}
          {selectedTab === 'forecast' && (
            <ForecastSection data={analysisData.forecasts} />
          )}

          {/* Lag Analysis Tab */}
          {selectedTab === 'lag' && (
            <LagAnalysisSection data={analysisData.lag_analysis} />
          )}

          {/* Threshold Tab */}
          {selectedTab === 'threshold' && (
            <ThresholdSection data={analysisData.threshold_analysis} />
          )}
        </div>
      )}
    </main>
  );
}

// Correlation Section Component
function CorrelationSection({ data }: { data: CorrelationResult[] }) {
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

// Forecast Section Component
function ForecastSection({ data }: { data: ForecastResult[] }) {
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

// Lag Analysis Section Component
function LagAnalysisSection({ data }: { data: LagResult[] }) {
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

// Threshold Section Component  
function ThresholdSection({ data }: { data: { thresholds: string[]; avg_cases: Record<string, number[]> } }) {
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
