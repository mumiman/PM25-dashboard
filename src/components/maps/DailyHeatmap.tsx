import { useMemo } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, getDay, eachDayOfInterval, startOfYear, endOfYear } from 'date-fns';

interface DataPoint {
  date: string;
  value: number;
}

interface DailyHeatmapProps {
  data: DataPoint[];
  year?: number;
}

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// Color scale function (Matching Heatmap.tsx)
const getColor = (value: number) => {
  if (value <= 15) return 'bg-blue-100 text-blue-900'; // Very Good (0-15)
  if (value <= 25) return 'bg-emerald-100 text-emerald-900'; // Good (15.1-25)
  if (value <= 37.5) return 'bg-yellow-100 text-yellow-900'; // Moderate (25.1-37.5)
  if (value <= 75) return 'bg-orange-100 text-orange-900'; // Unhealthy for sensitive (37.6-75)
  return 'bg-red-200 text-red-900'; // Unhealthy (>75)
};

export function DailyHeatmap({ data, year = 2025 }: DailyHeatmapProps) {
  
  const calendarData = useMemo(() => {
    const startDate = startOfYear(new Date(year, 0, 1));
    const endDate = endOfYear(new Date(year, 0, 1));
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    const dataMap = new Map<string, number>();
    data.forEach(d => {
        dataMap.set(d.date, d.value);
    });

    const days = allDays.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return {
            date: date,
            dateStr: dateStr,
            value: dataMap.get(dateStr) || null,
        };
    });

    // Add padding for the start of the year
    // getDay returns 0 for Sunday, 1 for Monday...
    // If Jan 1 is Wednesday (3), we need 3 empty slots (0, 1, 2)
    const startDay = getDay(startDate); 
    const padding = Array(startDay).fill(null);
    
    return [...padding, ...days];
  }, [data, year]);

  if (!data || data.length === 0) return null;

  // Group by weeks for rendering columns
  // We need to handle the grid carefully. 
  // Standard GitHub graph: Columns = Weeks, Rows = Days (Sun-Sat or Mon-Sun).
  // Let's go with rows = Sun(0) to Sat(6).
  
  // Calculate offset for the first week to align days correctly
  // But a simpler way for CSS Grid is to just render a grid with 53 cols and 7 rows.
  // Actually, flex-col of weeks is easier implementation for responsive SVGs/Divs.
  // Let's use a CSS Grid approach: grid-rows-7 grid-flow-col
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Daily Intensity ({year})</h3>
      
      <div className="overflow-x-auto pb-2">
         <div className="min-w-[800px]">
             {/* Month Labels - Simplified approximation for grid alignment */}
             {/* Ideally we calculate position based on week index, but for now simple list is ok or just legend */}
             
             <div className="flex text-xs text-slate-400 mb-2 gap-10 pl-8">
                 {months.map(m => <span key={m}>{m}</span>)}
             </div>

             <div className="flex gap-2">
                 {/* Day Labels */}
                 <div className="flex flex-col gap-1 text-[10px] text-slate-400 h-[112px] justify-between pt-1">
                     <span>Mon</span>
                     <span>Wed</span>
                     <span>Fri</span>
                 </div>

                 {/* The Grid: 53 Columns x 7 Rows */}
                 <div className="grid grid-rows-7 grid-flow-col gap-1">
                     {calendarData.map((day, idx) => {
                         if (!day) {
                             return <div key={`pad-${idx}`} className="w-3 h-3" />; // Invisible placeholder
                         }
                         return (
                             <div 
                                key={day.dateStr}
                                className={cn(
                                    "w-3 h-3 rounded-sm cursor-help transition-colors",
                                    day.value !== null ? getColor(day.value) : "bg-slate-50 border border-slate-100"
                                )}
                                title={`${format(day.date, 'MMM d, yyyy')}: ${day.value ? day.value.toFixed(1) + ' µg/m³' : 'No Data'}`}
                             />
                         );
                     })}
                 </div>
             </div>
         </div>
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-2 items-start justify-center text-xs text-slate-600">
        <div className="flex flex-col items-center gap-1 w-24 text-center">
            <span className="w-full h-3 rounded bg-blue-100 border border-blue-200"></span> 
            <span className="font-semibold text-blue-800">ดีมาก</span>
            <span className="text-[10px] text-slate-400">0-15</span>
        </div>
        <div className="flex flex-col items-center gap-1 w-24 text-center">
            <span className="w-full h-3 rounded bg-emerald-100 border border-emerald-200"></span> 
            <span className="font-semibold text-emerald-800">ดี</span>
            <span className="text-[10px] text-slate-400">15.1-25.0</span>
        </div>
        <div className="flex flex-col items-center gap-1 w-24 text-center">
            <span className="w-full h-3 rounded bg-yellow-100 border border-yellow-200"></span> 
            <span className="font-semibold text-yellow-800">ปานกลาง</span>
            <span className="text-[10px] text-slate-400">25.1-37.5</span>
        </div>
        <div className="flex flex-col items-center gap-1 w-28 text-center">
            <span className="w-full h-3 rounded bg-orange-100 border border-orange-200"></span> 
            <span className="font-semibold text-orange-800 leading-tight">เริ่มมีผลกระทบ<br/>ต่อสุขภาพ</span>
            <span className="text-[10px] text-slate-400">37.6-75.0</span>
        </div>
        <div className="flex flex-col items-center gap-1 w-24 text-center">
            <span className="w-full h-3 rounded bg-red-200 border border-red-300"></span> 
            <span className="font-semibold text-red-900 leading-tight">มีผลกระทบ<br/>ต่อสุขภาพ</span>
            <span className="text-[10px] text-slate-400">&gt; 75.1</span>
        </div>
      </div>
    </div>
  );
}
