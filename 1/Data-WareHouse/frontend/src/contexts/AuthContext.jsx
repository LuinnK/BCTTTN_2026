import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('wh_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('wh_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((tokenVal, userData) => {
    localStorage.setItem('wh_token', tokenVal);
    localStorage.setItem('wh_user', JSON.stringify(userData));
    setToken(tokenVal);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wh_token');
    localStorage.removeItem('wh_user');
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles) => user && roles.includes(user.role),
    [user]
  );

  return (
    <AuthContext.Provider value={{ token, user, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
