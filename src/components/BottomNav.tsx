import { Home, MapPin, BarChart3 } from 'lucide-react';

interface BottomNavProps {
  currentPage: 'region6' | 'analysis' | 'all';
  onPageChange: (page: 'region6' | 'analysis' | 'all') => void;
}

export function BottomNav({ currentPage, onPageChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => onPageChange('region6')}
            className={`flex flex-col items-center justify-center flex-1 py-2 px-4 transition-colors ${
              currentPage === 'region6'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MapPin size={24} className={currentPage === 'region6' ? 'text-indigo-600' : ''} />
            <span className="text-xs mt-1 font-medium">เขตสุขภาพที่ 6</span>
          </button>
          
          <button
            onClick={() => onPageChange('analysis')}
            className={`flex flex-col items-center justify-center flex-1 py-2 px-4 transition-colors ${
              currentPage === 'analysis'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 size={24} className={currentPage === 'analysis' ? 'text-indigo-600' : ''} />
            <span className="text-xs mt-1 font-medium">วิเคราะห์</span>
          </button>
          
          <button
            onClick={() => onPageChange('all')}
            className={`flex flex-col items-center justify-center flex-1 py-2 px-4 transition-colors ${
              currentPage === 'all'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Home size={24} className={currentPage === 'all' ? 'text-indigo-600' : ''} />
            <span className="text-xs mt-1 font-medium">ทั้งหมด</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

