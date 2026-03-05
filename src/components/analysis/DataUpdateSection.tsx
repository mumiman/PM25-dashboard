import React, { useState, useEffect } from 'react';
import { Upload, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

import { API_BASE_URL } from '@/lib/config';

interface RecentDataRow {
  date: string;
  [stationCode: string]: string | number;
}

interface RecentDataResponse {
  data: RecentDataRow[];
  stations: string[];
  station_metadata: Record<string, { province: string; district: string }>;
}

interface HDCDataResponse {
  year: number;
  province: string;
  weeks: number[];
  data: Record<string, number[]>;
}

export function DataUpdateSection() {
  const token = localStorage.getItem('sso_token');
  const [recentData, setRecentData] = useState<RecentDataResponse | null>(null);
  const [recentHDC, setRecentHDC] = useState<HDCDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [uploadingPM25, setUploadingPM25] = useState(false);
  const [uploadingHDC, setUploadingHDC] = useState(false);
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch PM2.5 Recent
      const resPM = await fetch(`${API_BASE_URL}/data/recent`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resPM.ok) {
        setRecentData(await resPM.json());
      }
      
      // Fetch HDC Recent
      const resHDC = await fetch(`${API_BASE_URL}/data/recent/hdc`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resHDC.ok) {
         setRecentHDC(await resHDC.json());
      }

    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pm25' | 'hdc') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'pm25') setUploadingPM25(true);
    else setUploadingHDC(true);
    
    setMessage(null);
    
    const formData = new FormData();
    formData.append('file', file);

    const endpoint = type === 'pm25' ? '/data/update' : '/data/update/hdc';

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      setMessage({ type: 'success', text: `${type === 'hdc' ? 'HDC' : 'PM2.5'} Data updated successfully!` });
      fetchData(); 
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      if (type === 'pm25') setUploadingPM25(false);
      else setUploadingHDC(false);
      e.target.value = '';
    }
  };

  const downloadTemplate = (type: 'pm25' | 'hdc') => {
      window.open(`${API_BASE_URL}/data/template/${type}`, '_blank');
  };

  // Helper to render PM2.5 Headers
  const renderPM25Headers = () => {
      if (!recentData) return null;
      
      const { stations, station_metadata } = recentData;
      
      // Group stations by Province -> District for header merging
      // Assuming stations are already sorted by backend
      
      // Calculate spans
      const provinceSpans: { name: string, colSpan: number }[] = [];
      const districtSpans: { name: string, colSpan: number }[] = [];
      
      let currentProv = "";
      let currentDist = "";
      let provCount = 0;
      let distCount = 0;
      
      stations.forEach((code, idx) => {
          const meta = station_metadata?.[code] || { province: '-', district: '-' };
          
          // Province
          if (meta.province !== currentProv) {
              if (currentProv) provinceSpans.push({ name: currentProv, colSpan: provCount });
              currentProv = meta.province;
              provCount = 1;
          } else {
              provCount++;
          }
           // Push last
          if (idx === stations.length - 1) provinceSpans.push({ name: currentProv, colSpan: provCount });

          // District
          if (meta.district !== currentDist) {
              if (currentDist) districtSpans.push({ name: currentDist, colSpan: distCount });
              currentDist = meta.district;
              distCount = 1;
          } else {
             // If province changed, district effectively changes even if name is same (unlikely but safe)
             const prevMeta = station_metadata?.[stations[idx-1]] || {};
             if (meta.province !== prevMeta.province) {
                  if (currentDist) districtSpans.push({ name: currentDist, colSpan: distCount });
                  currentDist = meta.district;
                  distCount = 1;
             } else {
                 distCount++;
             }
          }
          if (idx === stations.length - 1) districtSpans.push({ name: currentDist, colSpan: distCount });
      });

      return (
          <thead className="bg-slate-50">
             {/* Row 1: Province */}
             <tr>
                 <th rowSpan={3} className="px-4 py-3 text-left font-medium text-slate-500 sticky left-0 bg-slate-50 z-10 w-32 border-r">Date</th>
                 {provinceSpans.map((p, i) => (
                     <th key={i} colSpan={p.colSpan} className="px-4 py-2 text-center font-bold text-slate-700 border-b border-l">
                         {p.name}
                     </th>
                 ))}
             </tr>
             {/* Row 2: District */}
             <tr>
                 {districtSpans.map((d, i) => (
                     <th key={i} colSpan={d.colSpan} className="px-4 py-2 text-center font-medium text-slate-600 border-b border-l text-xs">
                         {d.name}
                     </th>
                 ))}
             </tr>
             {/* Row 3: Station Code */}
             <tr>
                 {stations.map(s => (
                     <th key={s} className="px-4 py-2 text-center font-normal text-slate-500 text-xs border-l min-w-[60px]">
                         {s}
                     </th>
                 ))}
             </tr>
          </thead>
      );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-indigo-600" />
          Update Data
        </h3>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-md flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Vertical Layout */}
      <div className="space-y-6">
        {/* Section 1: PM2.5 Data */}
        <div className="border rounded-lg p-5 bg-slate-50">
           <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-slate-700">1. PM2.5 Data</h4>
              <button onClick={() => downloadTemplate('pm25')} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                  Download Template
              </button>
           </div>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-100 transition-colors relative bg-white">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => handleFileUpload(e, 'pm25')} disabled={uploadingPM25}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
            <div className="flex flex-col items-center gap-2 pointer-events-none">
              {uploadingPM25 ? <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" /> : <Upload className="w-8 h-8 text-slate-400" />}
              <p className="text-slate-600 font-medium">{uploadingPM25 ? "Updating PM2.5..." : "Upload PM2.5 (CSV/Excel)"}</p>
            </div>
          </div>
        </div>

        {/* Section 2: HDC Data */}
        <div className="border rounded-lg p-5 bg-slate-50">
           <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-slate-700">2. HDC Disease Data</h4>
              <button onClick={() => downloadTemplate('hdc')} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                  Download Template
              </button>
           </div>
           <p className="text-lg font-bold text-red-600 mb-3">Format: Province_Year.csv (e.g., จันทบุรี_2567.csv)</p>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-100 transition-colors relative bg-white">
            <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'hdc')} disabled={uploadingHDC}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
            <div className="flex flex-col items-center gap-2 pointer-events-none">
               {uploadingHDC ? <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" /> : <Upload className="w-8 h-8 text-slate-400" />}
              <p className="text-slate-600 font-medium">{uploadingHDC ? "Updating HDC..." : "Upload HDC (CSV Only)"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent PM2.5 Table */}
      <div className="mt-8 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-slate-700">Recent PM2.5 Data (Last 10 Days)</h4>
          <button onClick={fetchData} disabled={loading} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            {renderPM25Headers()}
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading && !recentData ? (
                <tr><td colSpan={100} className="px-4 py-8 text-center text-slate-500">Loading data...</td></tr>
              ) : recentData?.data.length === 0 ? (
                <tr><td colSpan={100} className="px-4 py-8 text-center text-slate-500">No recent data found.</td></tr>
              ) : (
                recentData?.data.map((row) => (
                  <tr key={row.date} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">{row.date}</td>
                    {recentData.stations.map(station => (
                      <td key={station} className="px-4 py-2 text-center text-slate-600 border-l border-slate-50">
                        {row[station] !== undefined ? row[station] : '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Recent HDC Table */}
      <div className="mt-8 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-slate-700">
              Recent Patient HDC Data ({recentHDC ? `${recentHDC.province} ${recentHDC.year}` : 'Loading...'})
          </h4>
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
                <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 sticky left-0 bg-slate-50 z-10 w-32 border-r">Disease Group</th>
                    {recentHDC?.weeks.map(w => (
                        <th key={w} className="px-2 py-2 text-center font-medium text-slate-500 min-w-[50px] border-l text-xs">
                            W{w}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
               {!recentHDC ? (
                   <tr><td colSpan={54} className="px-4 py-8 text-center text-slate-500">No HDC data found.</td></tr>
               ) : (
                   Object.entries(recentHDC.data).map(([disease, cases]) => (
                       <tr key={disease} className="hover:bg-slate-50">
                           <td className="px-4 py-2 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">
                               {disease}
                           </td>
                           {cases.map((val, idx) => (
                               <td key={idx} className="px-2 py-2 text-center text-slate-600 border-l border-slate-50 text-xs">
                                   {val > 0 ? val.toLocaleString() : '-'}
                               </td>
                           ))}
                       </tr>
                   ))
               )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
