
import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { User, Settings, LayoutGrid } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
    showBackButton = false,
    rightContent
}: MainLayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16">
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg">
                   <img src="/pm/logo_pm.png" alt="PM2.5 Logo" className="w-10 h-10 object-contain" />
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
            {/* Right Side Content */}
            <div className="flex items-center gap-4">
               {rightContent && (
                   <div className="hidden md:block">
                       {rightContent}
                   </div>
               )}
               
               {/* User Profile Section */}
               {user ? (
                 <div className="flex items-center gap-3 pl-4 border-l border-slate-200 ml-2">
                    <div className="flex items-center gap-2 text-slate-700">
                        <span className="text-sm font-medium">{user.username || 'User'}</span>
                        <User size={16} className="text-slate-400" />
                    </div>
                    
                    <button 
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                      onClick={() => window.location.href = '/portal/profile'} 
                    >
                      <Settings size={14} />
                      ตั้งค่า Profile
                    </button>
                    
                    <button 
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                      onClick={() => window.location.href = '/portal'}
                    >
                      <LayoutGrid size={14} />
                      กลับหน้า Portal
                    </button>

                    <button 
                      onClick={logout}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 transition-colors"
                      title="Sign Out"
                    >
                      <span className="sr-only">Sign Out</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                    </button>
                 </div>
               ) : (
                  <div className="flex items-center gap-3 pl-4 border-l border-slate-200 ml-2">
                      <button 
                        onClick={() => window.location.href = '/portal/login'}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                      >
                        เข้าสู่ระบบ
                      </button>
                  </div>
               )}
            </div>
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
