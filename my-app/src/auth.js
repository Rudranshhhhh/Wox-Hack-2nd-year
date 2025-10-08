import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }){
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('authToken');
    if (saved) setAuthToken(saved);
  }, []);

  const login = useCallback((token) => {
    setAuthToken(token);
    localStorage.setItem('authToken', token);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem('authToken');
  }, []);

  const value = useMemo(() => ({
    isAuthenticated: Boolean(authToken),
    authToken,
    login,
    logout,
  }), [authToken, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(){
  return useContext(AuthContext);
}


