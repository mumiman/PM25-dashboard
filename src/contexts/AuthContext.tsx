import React, { createContext, useContext, useState, useEffect } from 'react';

// User type definition based on R6World SSO
interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  organizationName?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean; // True if admin role OR specific email
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('sso_token');
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Verify token with SSO backend
      // In dev: /api/auth/verify -> localhost:3006
      // In prod: /api/auth/verify -> r6world.ddc.moph.go.th/api/auth/verify
      const res = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Invalid token
        localStorage.removeItem('sso_token');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      // Don't remove token on network error, just fail quietly
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    // Redirect to Portal Login
    window.location.href = '/portal/login?redirect=' + encodeURIComponent(window.location.href);
  };

  const logout = () => {
    localStorage.removeItem('sso_token');
    setUser(null);
    window.location.href = '/portal/login';
  };

  // Admin logic: Role is 'admin' OR email is the specific one
  const isAdmin = !!user && (
    user.role === 'admin' || 
    user.email === 'monchayawarasit@gmail.com' ||
    user.username === 'monchaya' // Fallback if username is used
  );

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
