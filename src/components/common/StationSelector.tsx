import { Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface StationSelectorProps {
  stations: string[];
  stationNames?: Record<string, string>;
  selectedStation: string;
  onSelect: (station: string) => void;
}

export function StationSelector({ stations, stationNames = {}, selectedStation, onSelect }: StationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = stations.filter(s => {
    const name = stationNames[s] || '';
    const term = search.toLowerCase();
    return s.toLowerCase().includes(term) || name.toLowerCase().includes(term);
  });

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const selectedName = stationNames[selectedStation];

  return (
    <div className="relative w-80" ref={wrapperRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">Select Station</label>
      <div 
        className="w-full bg-white border border-slate-300 rounded-lg shadow-sm px-3 py-2 text-left cursor-pointer flex items-center justify-between hover:border-indigo-400 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-col overflow-hidden">
          <span className="text-slate-900 block truncate font-medium">
             {selectedStation} {selectedName ? `- ${selectedName}` : ''}
          </span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 flex-shrink-0 ml-2"><path d="m6 9 6 6 6-6"/></svg>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-xl rounded-lg border border-slate-200 max-h-80 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Search code or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filtered.map(station => {
              const name = stationNames[station];
              return (
                <button
                  key={station}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex flex-col ${
                    station === selectedStation 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    onSelect(station);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <span className="font-semibold">{station}</span>
                  {name && <span className="text-xs opacity-75 truncate">{name}</span>}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-400">No stations found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
