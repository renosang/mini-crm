import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

// 1. Định nghĩa kiểu dữ liệu cho User
interface IUser {
  id: string;
  username: string;
  role: 'admin' | 'staff';
}

// 2. Định nghĩa kiểu dữ liệu cho Context
interface IAuthContext {
  user: IUser | null;
  setUser: React.Dispatch<React.SetStateAction<IUser | null>>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

// 3. Tạo Context với kiểu đã định nghĩa
const AuthContext = createContext<IAuthContext | null>(null);

// 4. Định nghĩa kiểu cho Props của Provider
interface AuthProviderProps {
  children: React.ReactNode;
}

// 5. Tạo Provider
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser) as IUser);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  // 6. Hàm Login (đã được type-safe)
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const { data } = await api.post('/auth/login', { username, password });
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setUser(data.user as IUser);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  // 7. Hàm Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // 8. Cung cấp giá trị
  const value: IAuthContext = {
    user,
    setUser,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 9. Tạo hook tùy chỉnh (useAuth)
export const useAuth = (): IAuthContext => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};