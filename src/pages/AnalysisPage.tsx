import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, RefreshCw, Clock, Lock } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

import { useAuth } from '../contexts/AuthContext';
import { DataUpdateSection } from '../components/analysis/DataUpdateSection';
import { CorrelationSection } from '../components/analysis/CorrelationSection';
import { ForecastSection } from '../components/analysis/ForecastSection';
import { LagAnalysisSection } from '../components/analysis/LagAnalysisSection';
import { ThresholdSection } from '../components/analysis/ThresholdSection';

// Types for analysis results - Keep these here or move to a separate types file
// For now keeping them exported so components can import them if needed, 
// though ideally components should define their own props interface or import from a types file.
export interface CorrelationResult {
  disease: string;
  r: number;
  ci_lower: number;
  ci_upper: number;
  p_value: number;
  r_squared: number;
  n: number;
}

export interface ForecastPoint {
  week: number;
  year: number;
  value: number;
  ci_lower: number;
  ci_upper: number;
}

export interface ModelInfo {
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

export interface ForecastResult {
  target: string;
  forecast: ForecastPoint[];
  model: ModelInfo;
  current_week: number;
  current_year: number;
}

export interface LagCorrelation {
  lag: number;
  r: number;
  p_value: number;
  r_squared?: number;
}

export interface LagResult {
  disease: string;
  correlations: LagCorrelation[];
  optimal_lag: number;
  optimal_r: number;
}

export interface AnalysisData {
  correlations: CorrelationResult[];
  forecasts: ForecastResult[];
  lag_analysis: LagResult[];
  threshold_analysis: {
    thresholds: string[];
    avg_cases: Record<string, number[]>;
  };
  computed_at: string;
  cached: boolean;
  available_years?: number[];
}

export function AnalysisPage() {
  const { isAdmin } = useAuth();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(0);
  const [availableYears, setAvailableYears] = useState<number[]>([2026, 2025, 2024]);
  const [selectedTab, setSelectedTab] = useState<'correlation' | 'forecast' | 'lag' | 'threshold'>('correlation');

  useEffect(() => {
    fetchLatestAnalysis();
  }, [selectedYear]);

  const fetchLatestAnalysis = async () => {
    setLoading(true);
    try {
      // Use the new endpoint structure if backend updated, or keep old if compatible
      // Refactoring plan said endpoints remain same, but we added /analysis prefix possibility.
      // Let's try /analysis/latest first, fallback to /analysis?
      // Actually main.py has: app.include_router(analysis.router, prefix="/analysis", ...)
      // So it is /analysis/latest
      const response = await fetch(`${API_BASE_URL}/analysis/latest?year=${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          setAnalysisData(data);
          if (data.available_years && data.available_years.length > 0) {
             setAvailableYears(data.available_years);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch analysis", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompute = async (force: boolean = false) => {
    if (!isAdmin) {
      setError("เฉพาะ Admin หรือคุณ Monchaya เท่านั้นที่สามารถเริ่มการวิเคราะห์ได้");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // We mapped /compute to analysis router in main.py
      const response = await fetch(`${API_BASE_URL}/compute`, {
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
              className="block w-32 pl-3 pr-8 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm border"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              <option value={0}>All Years</option>
              {availableYears.map(y => (
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
          
          {isAdmin ? (
            <button
              onClick={() => handleCompute(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Analysis...
                </>
              ) : (
                'คำนวณใหม่'
              )}
            </button>
          ) : (
             <button
              onClick={() => setError("เฉพาะ Admin หรือคุณ Monchaya เท่านั้นที่สามารถเริ่มการวิเคราะห์ได้")}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed text-sm"
              title="เฉพาะ Admin เท่านั้น"
            >
              <Lock size={14} />
              คำนวณใหม่
            </button>
          )}
        </div>

      </div>

      {isAdmin && (
        <div className="mb-8">
          <DataUpdateSection />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertTriangle className="shrink-0" size={20} />
            <div>
              <strong>คำเตือน:</strong> {error}
              {!isAdmin && error.includes('Admin') && (
                  <p className="text-sm mt-1">กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบเพื่อใช้งานฟังก์ชันนี้</p>
              )}
            </div>
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
          
          {isAdmin ? (
            <button
               onClick={() => handleCompute(false)}
               disabled={loading}
               className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
               เริ่มการวิเคราะห์
            </button>
          ) : (
             <div className="flex flex-col items-center gap-2">
                <button
                   onClick={() => setError("เฉพาะ Admin หรือคุณ Monchaya เท่านั้นที่สามารถเริ่มการวิเคราะห์ได้")}
                   className="px-6 py-2 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2"
                >
                   <Lock size={16} />
                   เริ่มการวิเคราะห์
                </button>
                <p className="text-xs text-red-500 mt-1">* เฉพาะ Admin เท่านั้น</p>
             </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Last computed time and cache status */}
          <div className="flex justify-between items-center text-sm">
            <span className={analysisData.cached ? 'text-amber-600' : 'text-green-600'}>
              {analysisData.cached ? '📁 ใช้ข้อมูลจาก Cache' : '✓ คำนวณใหม่'}
            </span>
            <span className="text-slate-500">
              คำนวณล่าสุด: {analysisData.computed_at ? new Date(analysisData.computed_at).toLocaleString('th-TH') : '-'}
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
