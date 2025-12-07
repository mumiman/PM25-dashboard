import { useState, useEffect } from 'react';
import { LayoutDashboard, Calendar, Activity, Info } from 'lucide-react';
import { TrendChart } from './components/TrendChart';
import { SeasonalChart } from './components/SeasonalChart';
import { HealthChart, HDCData } from './components/HealthChart'; // Import
import { Heatmap } from './components/Heatmap';
import { DailyHeatmap } from './components/DailyHeatmap';
import { StationSelector } from './components/StationSelector';

// Types matching our JSON structure
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

function App() {
  const [data, setData] = useState<PM25Data | null>(null);
  const [hdcData, setHdcData] = useState<HDCData | null>(null); // New State
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch PM2.5 Data
    fetch('/data/pm25_consolidated.json')
      .then(res => {
        if (!res.ok) throw new Error("Failed to load data");
        return res.json();
      })
      .then((jsonData: PM25Data) => {
        setData(jsonData);
        // Default to first station or a specific one if available
        if (jsonData.metadata.stations.length > 0) {
          setSelectedStation(jsonData.metadata.stations[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
      
    // Fetch HDC Data
    fetch('/data/hdc_consolidated.json')
      .then(res => res.json())
      .then((json: HDCData) => setHdcData(json))
      .catch(err => console.error("Failed to load HDC data", err));
  }, []);

  const stationData = data && selectedStation ? data.data[selectedStation] : [];
  const stationName = data?.metadata.stationNames?.[selectedStation] || selectedStation;
  const stationProvince = data?.metadata.stationProvinces?.[selectedStation] || 'Unknown';
  const stationRegion = data?.metadata.stationRegions?.[selectedStation] || 'Unknown';
  
  // 1. Get unique Regions (numeric sort)
  const regions = data?.metadata.stationRegions
    ? Array.from(new Set(Object.values(data.metadata.stationRegions))).sort((a,b) => {
        // Sort by region number "เขตสุขภาพที่ X"
        const numA = parseInt(a.replace(/\D/g, '')) || 999;
        const numB = parseInt(b.replace(/\D/g, '')) || 999;
        return numA - numB;
    })
    : [];
    
  // 2. Filter Provinces based on Selected Region
  const filteredProvinces = data?.metadata.stationProvinces 
    ? Array.from(new Set(
        Object.entries(data.metadata.stationProvinces)
          .filter(([station]) => {
            if (selectedRegion === 'All') return true;
            return data.metadata.stationRegions?.[station] === selectedRegion;
          })
          .map(([_, prov]) => prov)
      )).sort()
    : [];

  // 3. Filter Stations based on Selected Region AND Selected Province
  const filteredStations = data?.metadata.stations.filter(s => {
    let matchRegion = true;
    let matchProvince = true;

    if (selectedRegion !== 'All') {
      matchRegion = data.metadata.stationRegions?.[s] === selectedRegion;
    }
    
    if (selectedProvince !== 'All') {
      matchProvince = data.metadata.stationProvinces?.[s] === selectedProvince;
    }

    return matchRegion && matchProvince;
  }) || [];

  // Reset Province if Region changes and selected province is not in that region
  useEffect(() => {
    if (selectedRegion !== 'All' && selectedProvince !== 'All') {
        // Check if current province belongs to this region.
        // We can check if filteredProvinces contains the selectedProvince
        if (!filteredProvinces.includes(selectedProvince)) {
            setSelectedProvince('All');
        }
    }
  }, [selectedRegion, selectedProvince, filteredProvinces]);

  // Use Effect to reset station if filtered out
  useEffect(() => {
    if (filteredStations.length > 0 && !filteredStations.includes(selectedStation)) {
      setSelectedStation(filteredStations[0]);
    }
  }, [filteredStations, selectedStation]);

  // Calculate specific stats for the cards
  const currentLevel = stationData.length > 0 ? stationData[stationData.length - 1].value : 0;
  const avgLevel = stationData.length > 0 
    ? (stationData.reduce((acc, curr) => acc + curr.value, 0) / stationData.length).toFixed(1)
    : 0;

  // Available Data Years for Heatmap
  const availableYears = stationData.length > 0
    ? Array.from(new Set(stationData.map(d => new Date(d.date).getFullYear()))).sort((a, b) => b - a)
    : [2025];
    
  // Default to latest year if available, otherwise 2025
  const [heatmapYear, setHeatmapYear] = useState<number>(2025);
  
  // Update heatmap year when station changes if logic needed, but keeping user selection is usually fine.
  // Optionally reset to max year on station change:
  useEffect(() => {
     if (availableYears.length > 0 && !availableYears.includes(heatmapYear)) {
         setHeatmapYear(availableYears[0]);
     }
  }, [selectedStation, availableYears, heatmapYear]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-600">
      Error loading data: {error}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Activity size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">R6 - PM2.5 Analytics</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Office of Disease Prevention and Control Region 6 Chonburi</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-500 text-right hidden sm:block">
                <div>Data from Air4Thai กรมควบคุมมลพิษ</div>
                <div className="text-xs">Last Updated: {data?.metadata.maxDate}</div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                 {stationRegion}
               </span>
               <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                 {stationProvince}
               </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
               {selectedStation} - {stationName !== selectedStation ? stationName : 'Unknown Station'}
            </h2>
            <p className="text-slate-500 mt-1">Deep dive analysis of particulate matter trends and seasonality.</p>
          </div>
          
          <div className="flex items-end gap-2 flex-wrap">
            {/* Region Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Health Region</label>
              <select 
                className="block w-40 pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm border"
                value={selectedRegion}
                onChange={(e) => {
                    setSelectedRegion(e.target.value);
                    setSelectedProvince('All'); // Reset province on region change explicitly
                }}
              >
                <option value="All">All Regions</option>
                {regions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            
            {/* Province Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Province</label>
              <select 
                className="block w-36 pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm border"
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
              >
                <option value="All">All Provinces</option>
                {filteredProvinces.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {data && (
              <StationSelector 
                stations={filteredStations} 
                stationNames={data.metadata.stationNames}
                selectedStation={selectedStation} 
                onSelect={setSelectedStation} 
              />
            )}
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Latest Reading</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{currentLevel} <span className="text-sm font-normal text-slate-400">µg/m³</span></h3>
              <p className="text-xs text-slate-400 mt-1">Date: {stationData.length > 0 ? stationData[stationData.length - 1].date : '-'}</p>
            </div>
            <div className={`p-3 rounded-lg ${currentLevel > 50 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <Activity size={24} />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Historical Average</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{avgLevel} <span className="text-sm font-normal text-slate-400">µg/m³</span></h3>
              <p className="text-xs text-slate-400 mt-1">All-time average for this station</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <LayoutDashboard size={24} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Data Coverage</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{stationData.length} <span className="text-sm font-normal text-slate-400">days</span></h3>
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
            <TrendChart data={stationData} stationId={selectedStation} />
            <SeasonalChart data={stationData} stationId={selectedStation} />
          </div>

          {/* Health Correlation Chart */}
          <HealthChart 
             pm25Data={stationData} 
             province={data?.metadata.stationProvinces?.[selectedStation] || 'Unknown'} 
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
            <Heatmap data={stationData} title="" />
            
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
               <DailyHeatmap data={stationData} year={heatmapYear} />
            </div>
            <p className="text-xs text-slate-400 mt-2 italic text-center">
              * Darker red indicates higher PM2.5 concentration.
            </p>
          </div>
        </div>
        
        <footer className="mt-12 text-center text-slate-400 text-sm pb-8">
          &copy; 2025 R6 - PM2.5 Analytics • Made by Suppasit Srisaeng with Google Antigravity
        </footer>
      </main>
    </div>
  );
}

export default App;
