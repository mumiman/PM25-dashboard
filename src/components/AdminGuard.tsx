import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="bg-red-100 p-4 rounded-full text-red-600 mb-4">
          <ShieldAlert size={48} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500 mb-6">
          คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะผู้ดูแลระบบเท่านั้น
        </p>
        <button 
          onClick={() => window.location.href = '/portal/login'}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          เข้าสู่ระบบด้วย SSO
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
