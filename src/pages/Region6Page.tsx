import { useState, useEffect, useMemo } from 'react';
import { Calendar, Activity, LayoutDashboard, Info, MapPin, BarChart3 } from 'lucide-react';
import { TrendChart } from '../components/TrendChart';
import { SeasonalChart } from '../components/SeasonalChart';
import { HealthChart, HDCData } from '../components/HealthChart';
import { Heatmap } from '../components/Heatmap';
import { DailyHeatmap } from '../components/DailyHeatmap';

// Region 6 Provinces (Thai names matching the data)
const REGION6_PROVINCES = [
  'จันทบุรี',
  'ฉะเชิงเทรา',
  'ชลบุรี',
  'ตราด',
  'ปราจีนบุรี',
  'ระยอง',
  'สมุทรปราการ',
  'สระแก้ว'
];

interface PM25Data {
  metadata: {
    minDate: string;
    maxDate: string;
    stations: string[];
    stationNames?: Record<string, string>;
    stationProvinces?: Record<string, string>;
    stationRegions?: Record<string, string>;
  };
  data: Record<string, { date: string; value: number }[]>;
}

interface Region6PageProps {
  hdcData: HDCData | null;
}

type ViewMode = 'station' | 'province_avg' | 'region_avg';

export function Region6Page({ hdcData }: Region6PageProps) {
  const [data, setData] = useState<PM25Data | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('Chon Buri');
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('station');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatmapYear, setHeatmapYear] = useState<number>(2025);

  // Load data from pm25_consolidated.json
  useEffect(() => {
    fetch('/data/pm25_consolidated.json')
      .then(res => {
        if (!res.ok) throw new Error("Failed to load PM2.5 data");
        return res.json();
      })
      .then((jsonData: PM25Data) => {
        setData(jsonData);
        
        // Find first station in Region 6 and selected province
        const firstStation = jsonData.metadata.stations.find(
          s => jsonData.metadata.stationRegions?.[s] === 'เขตสุขภาพที่ 6' &&
               jsonData.metadata.stationProvinces?.[s] === selectedProvince
        );
        if (firstStation) {
          setSelectedStation(firstStation);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Filter stations by Region 6 and selected province
  const region6Stations = useMemo(() => {
    if (!data) return [];
    return data.metadata.stations.filter(
      s => data.metadata.stationRegions?.[s] === 'เขตสุขภาพที่ 6'
    );
  }, [data]);

  const filteredStations = useMemo(() => {
    if (!data) return [];
    return region6Stations.filter(
      s => data.metadata.stationProvinces?.[s] === selectedProvince
    );
  }, [data, region6Stations, selectedProvince]);

  // Update station when province changes
  useEffect(() => {
    if (filteredStations.length > 0 && !filteredStations.includes(selectedStation)) {
      setSelectedStation(filteredStations[0]);
    }
  }, [selectedProvince, filteredStations, selectedStation]);

  // Calculate province average data
  const provinceAverageData = useMemo(() => {
    if (!data || filteredStations.length === 0) return [];
    
    const dateMap = new Map<string, number[]>();
    filteredStations.forEach(station => {
      const stationData = data.data[station] || [];
      stationData.forEach(d => {
        if (!dateMap.has(d.date)) {
          dateMap.set(d.date, []);
        }
        dateMap.get(d.date)!.push(d.value);
      });
    });
    
    return Array.from(dateMap.entries())
      .map(([date, values]) => ({
        date,
        value: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data, filteredStations]);

  // Calculate region-wide average data
  const regionAverageData = useMemo(() => {
    if (!data || region6Stations.length === 0) return [];
    
    const dateMap = new Map<string, number[]>();
    region6Stations.forEach(station => {
      const stationData = data.data[station] || [];
      stationData.forEach(d => {
        if (!dateMap.has(d.date)) {
          dateMap.set(d.date, []);
        }
        dateMap.get(d.date)!.push(d.value);
      });
    });
    
    return Array.from(dateMap.entries())
      .map(([date, values]) => ({
        date,
        value: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data, region6Stations]);

  // Get display data based on view mode
  const displayData = useMemo(() => {
    switch (viewMode) {
      case 'province_avg':
        return provinceAverageData;
      case 'region_avg':
        return regionAverageData;
      default:
        return data && selectedStation ? data.data[selectedStation] : [];
    }
  }, [viewMode, provinceAverageData, regionAverageData, data, selectedStation]);

  // Display title based on view mode
  const displayTitle = useMemo(() => {
    switch (viewMode) {
      case 'province_avg':
        return `ค่าเฉลี่ย ${selectedProvince}`;
      case 'region_avg':
        return 'ค่าเฉลี่ย เขตสุขภาพที่ 6';
      default:
        return data?.metadata.stationNames?.[selectedStation] || selectedStation;
    }
  }, [viewMode, selectedProvince, selectedStation, data]);

  // Calculate stats
  const currentLevel = displayData.length > 0 ? displayData[displayData.length - 1].value : 0;
  const avgLevel = displayData.length > 0 
    ? (displayData.reduce((acc, curr) => acc + curr.value, 0) / displayData.length).toFixed(1)
    : 0;

  // Available Years
  const availableYears = displayData.length > 0
    ? Array.from(new Set(displayData.map(d => new Date(d.date).getFullYear()))).sort((a, b) => b - a)
    : [2025];

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(heatmapYear)) {
      setHeatmapYear(availableYears[0]);
    }
  }, [selectedStation, viewMode, availableYears, heatmapYear]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 pb-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-600 pb-20">
      Error loading data: {error}
    </div>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
              <MapPin size={12} className="inline mr-1" />
              เขตสุขภาพที่ 6
            </span>
            {viewMode !== 'station' && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                <BarChart3 size={12} className="inline mr-1" />
                ค่าเฉลี่ย
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            {displayTitle}
          </h2>
          <p className="text-slate-500 mt-1">ข้อมูลคุณภาพอากาศ PM2.5 รายจังหวัด</p>
        </div>
        
        <div className="flex items-end gap-2 flex-wrap">
          {/* View Mode Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">มุมมอง</label>
            <select 
              className="block w-48 pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm border"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
            >
              <option value="station">รายสถานี</option>
              <option value="province_avg">ค่าเฉลี่ย รายจังหวัด</option>
              <option value="region_avg">ค่าเฉลี่ย ทั้งเขต 6</option>
            </select>
          </div>

          {/* Province Selector (hide for region average) */}
          {viewMode !== 'region_avg' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">จังหวัด</label>
              <select 
                className="block w-40 pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm border"
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
              >
                {REGION6_PROVINCES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Station Selector (only for station mode) */}
          {viewMode === 'station' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">สถานี</label>
              <select 
                className="block w-48 pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm border"
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
              >
                {filteredStations.map(s => (
                  <option key={s} value={s}>
                    {data?.metadata.stationNames?.[s] || s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">ค่าล่าสุด</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{currentLevel} <span className="text-sm font-normal text-slate-400">µg/m³</span></h3>
            <p className="text-xs text-slate-400 mt-1">Date: {displayData.length > 0 ? displayData[displayData.length - 1].date : '-'}</p>
          </div>
          <div className={`p-3 rounded-lg ${currentLevel > 50 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <Activity size={24} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">ค่าเฉลี่ยตลอดช่วง</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{avgLevel} <span className="text-sm font-normal text-slate-400">µg/m³</span></h3>
            <p className="text-xs text-slate-400 mt-1">
              {viewMode === 'region_avg' ? `จาก ${region6Stations.length} สถานี` : 
               viewMode === 'province_avg' ? `จาก ${filteredStations.length} สถานี` : 
               'ค่าเฉลี่ยทั้งหมด'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
            <LayoutDashboard size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">จำนวนข้อมูล</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{displayData.length} <span className="text-sm font-normal text-slate-400">วัน</span></h3>
            <p className="text-xs text-slate-400 mt-1">Total valid records</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
            <Calendar size={24} />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendChart data={displayData} stationId={viewMode === 'station' ? selectedStation : displayTitle} />
          <SeasonalChart data={displayData} stationId={viewMode === 'station' ? selectedStation : displayTitle} />
        </div>

        {/* Health Correlation Chart */}
        <HealthChart 
          pm25Data={displayData} 
          province={viewMode === 'region_avg' ? 'เขตสุขภาพที่ 6' : selectedProvince} 
          hdcData={hdcData}
        />

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="text-indigo-500" size={20} />
              Seasonality Matrix
            </h3>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Info size={14} />
              <span>Monthly Average Concentration</span>
            </div>
          </div>
          <Heatmap data={displayData} title="" />
          
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-slate-700">Daily Intensity</h4>
              <select
                className="block w-24 pl-3 pr-8 py-1 text-sm border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm border"
                value={heatmapYear}
                onChange={(e) => setHeatmapYear(Number(e.target.value))}
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <DailyHeatmap data={displayData} year={heatmapYear} />
          </div>
          <p className="text-xs text-slate-400 mt-2 italic text-center">
            * Darker red indicates higher PM2.5 concentration.
          </p>
        </div>
      </div>
    </main>
  );
}
