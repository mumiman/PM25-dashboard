import React, { useState, useEffect } from 'react';
import { Upload, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3009';

interface RecentDataRow {
  date: string;
  [stationCode: string]: string | number;
}

interface RecentDataResponse {
  data: RecentDataRow[];
  stations: string[];
}

export function DataUpdateSection() {
  const token = localStorage.getItem('sso_token');
  const [recentData, setRecentData] = useState<RecentDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const fetchRecentData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/data/recent`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRecentData(data);
      }
    } catch (err) {
      console.error("Failed to fetch recent data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/data/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      setMessage({ type: 'success', text: 'Data updated successfully!' });
      fetchRecentData(); // Refresh table
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-indigo-600" />
          Update Data
        </h3>
        <div className="text-sm text-slate-500">
          Supported: CSV, Excel (Format: Province/District/Station/Date/Values)
        </div>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors relative">
        <input 
          type="file" 
          accept=".csv,.xlsx,.xls" 
          onChange={handleFileUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          {uploading ? (
            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          ) : (
            <Upload className="w-10 h-10 text-slate-400" />
          )}
          <p className="text-slate-600 font-medium">
            {uploading ? "Updating database..." : "Click or Drag to Upload CSV/Excel"}
          </p>
          <p className="text-xs text-slate-400">
            Ensure the file follows the standard format with 3 header rows.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Recent Data Table */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-slate-700">Recent Data (Last 10 Days)</h4>
          <button 
            onClick={fetchRecentData}
            disabled={loading}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500 sticky left-0 bg-slate-50 z-10 w-32">Date</th>
                {recentData?.stations.map(s => (
                  <th key={s} className="px-4 py-3 text-center font-medium text-slate-500 min-w-[80px]">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading && !recentData ? (
                <tr>
                  <td colSpan={100} className="px-4 py-8 text-center text-slate-500">Loading data...</td>
                </tr>
              ) : recentData?.data.length === 0 ? (
                <tr>
                  <td colSpan={100} className="px-4 py-8 text-center text-slate-500">No recent data found.</td>
                </tr>
              ) : (
                recentData?.data.map((row) => (
                  <tr key={row.date} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">
                      {row.date}
                    </td>
                    {recentData.stations.map(station => (
                      <td key={station} className="px-4 py-2 text-center text-slate-600">
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
    </div>
  );
}
