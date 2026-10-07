import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, fullName: string, role?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 4000);

    const fetchUser = async () => {
      if (!token) {
        if (isMounted) setLoading(false);
        clearTimeout(timer);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (isMounted) setUser(res.data);
      } catch (err) {
        localStorage.removeItem('auth_token');
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
        clearTimeout(timer);
      }
    };
    fetchUser();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('auth_token', access_token);
    setToken(access_token);
    setUser(userData);
  };

  const register = async (email: string, password: string, full_name: string, role: string = 'ADMIN') => {
    await api.post('/auth/register', { email, password, full_name, role });
    // Auto login after registration
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
