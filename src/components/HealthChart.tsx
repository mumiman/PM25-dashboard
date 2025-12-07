import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getISOWeek, parseISO, getYear } from 'date-fns';

interface DataPoint {
  date: string;
  value: number;
}

interface HDCData {
    metadata: {
        description: string;
        source: string;
        groups: string[];
    };
    data: Record<string, Record<number, { // Province -> Year -> Data
        weeks: number[];
        diseases: Record<string, number[]>;
    }>>;
}

interface HealthChartProps {
  pm25Data: DataPoint[];
  province: string;
  hdcData: HDCData | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
          <p className="text-sm font-semibold text-slate-700 mb-2">Week {label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                    <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-medium text-slate-600">{entry.name}:</span>
                    <span className="font-bold text-slate-800">
                        {entry.name.includes("PM2.5") ? entry.value?.toFixed(1) : entry.value?.toLocaleString()} 
                        {entry.name.includes("PM2.5") ? " µg/m³" : " cases"}
                    </span>
                </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
};

export function HealthChart({ pm25Data, province, hdcData }: HealthChartProps) {
    const [selectedDisease, setSelectedDisease] = useState<string>('Total');
    const [selectedYear, setSelectedYear] = useState<number>(2025);

    const chartData = useMemo(() => {
        // Validate Data Availability
        if (!hdcData || !hdcData.data[province] || !hdcData.data[province][selectedYear] || !pm25Data || pm25Data.length === 0) return [];
        
        const yearHDC = hdcData.data[province][selectedYear];
        
        // Calculate Weekly PM2.5 for Selected Year
        const weeklyPM25: Record<number, number[]> = {};
        for (let i = 1; i <= 53; i++) weeklyPM25[i] = [];

        pm25Data.forEach(d => {
            const date = parseISO(d.date);
            const year = getYear(date);
            if (year === selectedYear) { 
                 const week = getISOWeek(date);
                 if (weeklyPM25[week]) {
                     weeklyPM25[week].push(d.value);
                 }
            }
        });

        const data = [];
        for (let i = 0; i < 53; i++) { // Weeks 1-53
             const weekNum = i + 1;
             const pm25Vals = weeklyPM25[weekNum];
             const avgPM25 = pm25Vals.length > 0 
                ? pm25Vals.reduce((a, b) => a + b, 0) / pm25Vals.length 
                : null;
             
             const diseaseCounts = yearHDC.diseases[selectedDisease];
             const caseCount = diseaseCounts ? diseaseCounts[i] : null;

             if (avgPM25 !== null || caseCount !== null) {
                 data.push({
                     week: weekNum,
                     pm25: avgPM25,
                     cases: caseCount
                 });
             }
        }
        return data;
    }, [pm25Data, province, hdcData, selectedDisease, selectedYear]);

    if (!hdcData) return null; 
    
    // Check if province data exists
    if (!hdcData.data[province]) {
         return (
            <div className="w-full h-[400px] bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
                 <p className="text-slate-400">Health comparison data not available for {province}.</p>
            </div>
         );
    }

    // Check if we have data for the *default* year, if not switch? 
    // Or just let user switch. But better to indicate available years.
    const availableYears = Object.keys(hdcData.data[province]).map(Number).sort((a,b) => b-a); // Descending

    return (
        <div className="w-full h-[400px] bg-white p-4 rounded-xl shadow-sm border border-slate-100">
             <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Health Impact Correlation</h3>
                    <p className="text-xs text-slate-500">Correlating Weekly PM2.5 vs Patient Diagnosis (HDC)</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <select 
                        className="block w-24 pl-3 pr-8 py-1 text-sm border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm border"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                        {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <select 
                        className="block w-40 pl-3 pr-8 py-1 text-sm border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm border"
                        value={selectedDisease}
                        onChange={(e) => setSelectedDisease(e.target.value)}
                    >
                        <option value="Total">Total Cases</option>
                        {hdcData.metadata.groups.map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
                    margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                >
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                        dataKey="week" 
                        label={{ value: 'Week No.', position: 'insideBottomRight', offset: -5, fontSize: 10 }}
                        tick={{ fill: '#64748b', fontSize: 12 }} 
                    />
                    
                    {/* Left Axis: PM2.5 */}
                    <YAxis 
                        yAxisId="left"
                        label={{ value: `PM2.5 (avg) ${selectedYear}`, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#ef4444', fontSize: 12 } }}
                        tick={{ fill: '#ef4444', fontSize: 12 }}
                    />
                    
                    {/* Right Axis: Cases */}
                    <YAxis 
                        yAxisId="right"
                        orientation="right"
                        label={{ value: 'Patients', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#3b82f6', fontSize: 12 } }}
                        tick={{ fill: '#3b82f6', fontSize: 12 }}
                    />

                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    {/* PM 2.5 Line (Red) */}
                    <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="pm25" 
                        name="PM2.5 Avg" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        dot={false}
                    />

                    {/* Patient Cases Bar (Blue) */}
                    <Bar 
                        yAxisId="right"
                        dataKey="cases" 
                        name={`${selectedDisease} Patients`} 
                        fill="#3b82f6" 
                        opacity={0.6}
                        barSize={12}
                        radius={[2, 2, 0, 0]}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

// Export the type so App.tsx can use it
export type { HDCData }; 
