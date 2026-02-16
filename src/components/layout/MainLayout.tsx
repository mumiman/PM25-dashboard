
import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { Activity } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: any) => void;
  title: string;
  subtitle: string;
  icon?: React.ElementType; // Optional icon override
  iconColorClass?: string;
  showBackButton?: boolean;
  rightContent?: ReactNode; // For "Last Updated" or other header content
}

export function MainLayout({ 
    children, 
    currentPage, 
    onPageChange, 
    title, 
    subtitle, 
    icon: Icon = Activity, 
    iconColorClass = "bg-indigo-600", 
    showBackButton = false,
    rightContent
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16">
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-2">
                <div className={`${iconColorClass} p-2 rounded-lg text-white`}>
                   <Icon size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{subtitle}</p>
                </div>
              </div>
               {showBackButton && (
                    <button 
                       onClick={() => onPageChange('region6')}
                       className="text-sm text-slate-500 hover:text-slate-800"
                    >
                       Back to Dashboard
                    </button>
               )}
               {rightContent && (
                   <div className="flex items-center gap-4">
                       {rightContent}
                   </div>
               )}
            </div>
          </div>
        </nav>

        {children}

        <footer className="text-center text-slate-400 text-sm pb-20">
          &copy; 2025 R6 - PM2.5 Analytics • Made by Suppasit Srisaeng with Google Antigravity
        </footer>
        
        <BottomNav currentPage={currentPage} onPageChange={onPageChange} />
    </div>
  );
}
