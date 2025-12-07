import { Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface StationSelectorProps {
  stations: string[];
  selectedStation: string;
  onSelect: (station: string) => void;
}

export function StationSelector({ stations, selectedStation, onSelect }: StationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = stations.filter(s => s.toLowerCase().includes(search.toLowerCase()));

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

  return (
    <div className="relative w-64" ref={wrapperRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">Select Station</label>
      <div 
        className="w-full bg-white border border-slate-300 rounded-lg shadow-sm px-3 py-2 text-left cursor-pointer flex items-center justify-between hover:border-indigo-400 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-slate-900 block truncate">{selectedStation || "Select..."}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-xl rounded-lg border border-slate-200 max-h-80 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filtered.map(station => (
              <button
                key={station}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  station === selectedStation 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => {
                  onSelect(station);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                {station}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-400">No stations found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
