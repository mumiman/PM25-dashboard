import { useMemo } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DataPoint {
  date: string;
  value: number;
}

interface HeatmapProps {
  data: DataPoint[];
  title?: string;
}

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// Color scale function
const getColor = (value: number) => {
  if (value < 12) return 'bg-emerald-100 text-emerald-900'; // Good
  if (value < 35.4) return 'bg-yellow-100 text-yellow-900'; // Moderate
  if (value < 55.4) return 'bg-orange-100 text-orange-900'; // Unhealthy for sensitive
  if (value < 150.4) return 'bg-red-200 text-red-900'; // Unhealthy
  if (value < 250.4) return 'bg-purple-200 text-purple-900'; // Very Unhealthy
  return 'bg-rose-900 text-rose-100'; // Hazardous
};

export function Heatmap({ data, title = "Seasonality Heatmap" }: HeatmapProps) {
  // Aggregate data by Year-Month
  const matrix = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    
    data.forEach(d => {
      const date = new Date(d.date);
      if (isNaN(date.getTime())) return;
      
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      const key = `${year}-${month}`;
      
      const entry = map.get(key) || { sum: 0, count: 0 };
      entry.sum += d.value;
      entry.count += 1;
      map.set(key, entry);
    });
    
    // Find min/max years
    const years = Array.from(new Set(data.map(d => new Date(d.date).getFullYear()).filter(y => !isNaN(y)))).sort();
    
    return { map, years };
  }, [data]);
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  if (!data || data.length === 0) return <div className="p-4 text-slate-400">No data available for heatmap</div>;

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{title} (Monthly Average)</h3>
      
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header Row */}
          <div className="grid grid-cols-[80px_repeat(12,1fr)] gap-1 mb-1">
            <div className="text-xs font-medium text-slate-400 text-right pr-2">Year</div>
            {months.map(m => (
              <div key={m} className="text-xs font-medium text-slate-500 text-center">{m}</div>
            ))}
          </div>
          
          {/* Rows */}
          {matrix.years.map(year => (
            <div key={year} className="grid grid-cols-[80px_repeat(12,1fr)] gap-1 mb-1">
              <div className="text-xs font-medium text-slate-600 text-right pr-2 flex items-center justify-end">
                {year}
              </div>
              {months.map((_, monthIdx) => {
                const key = `${year}-${monthIdx}`;
                const entry = matrix.map.get(key);
                const avg = entry ? entry.sum / entry.count : null;
                
                return (
                  <div 
                    key={key}
                    className={cn(
                      "h-8 rounded flex items-center justify-center text-[10px] font-medium transition-colors",
                      avg !== null ? getColor(avg) : "bg-slate-50"
                    )}
                    title={avg ? `${months[monthIdx]} ${year}: ${avg.toFixed(1)}` : 'No Data'}
                  >
                    {avg ? avg.toFixed(0) : '-'}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
          
      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 items-center justify-center text-xs text-slate-600">
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200"></span> Good (&lt;12)</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200"></span> Moderate (12-35)</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></span> High (35-55)</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 border border-red-300"></span> Unhealthy (&gt;55)</div>
      </div>
    </div>
  );
}
