import { useState, useEffect } from 'react';
import { LayoutDashboard, Calendar, Activity, Info } from 'lucide-react';
import { TrendChart } from './components/TrendChart';
import { Heatmap } from './components/Heatmap';
import { StationSelector } from './components/StationSelector';

// Types matching our JSON structure
interface PM25Data {
  metadata: {
    minDate: string;
    maxDate: string;
    stations: string[];
  };
  data: Record<string, { date: string; value: number }[]>;
}

function App() {
  const [data, setData] = useState<PM25Data | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  const stationData = data && selectedStation ? data.data[selectedStation] : [];
  
  // Calculate specific stats for the cards
  const currentLevel = stationData.length > 0 ? stationData[stationData.length - 1].value : 0;
  const avgLevel = stationData.length > 0 
    ? (stationData.reduce((acc, curr) => acc + curr.value, 0) / stationData.length).toFixed(1)
    : 0;

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
                <h1 className="text-xl font-bold tracking-tight text-slate-900">AirGuard Analytics</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">PM 2.5 Executive Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-500 text-right hidden sm:block">
                <div>Data Source: PM2.5 Monitoring Network</div>
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
            <h2 className="text-2xl font-bold text-slate-800">Station Overview</h2>
            <p className="text-slate-500 mt-1">Deep dive analysis of particulate matter trends and seasonality.</p>
          </div>
          <div className="flex items-end gap-2">
            {data && (
              <StationSelector 
                stations={data.metadata.stations} 
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
          <section>
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <Activity className="text-indigo-500" size={20} />
                 Trend Analysis
               </h3>
            </div>
            <TrendChart data={stationData} stationId={selectedStation} />
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <Calendar className="text-indigo-500" size={20} />
                 Seasonality Matrix
               </h3>
               <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                 <Info size={14} /> Guide
               </button>
            </div>
            <Heatmap data={stationData} title="Monthly Concentration Heatmap" />
            <p className="text-xs text-slate-500 mt-2 italic text-center">
              * Values represent monthly averages. Darker red indicates higher PM2.5 concentration.
            </p>
          </section>
        </div>
        
        <footer className="mt-12 text-center text-slate-400 text-sm pb-8">
          &copy; 2025 AirGuard Analytics • Environmental Epidemiology Unit
        </footer>
      </main>
    </div>
  );
}

export default App;
