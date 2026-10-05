import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ums_token');
    const savedUser = localStorage.getItem('ums_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token and get fresh data
      authAPI.getMe()
        .then(res => {
          setUser(res.data.user);
          setProfile(res.data.profile);
          localStorage.setItem('ums_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('ums_token');
          localStorage.removeItem('ums_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, user } = res.data;
    localStorage.setItem('ums_token', token);
    localStorage.setItem('ums_user', JSON.stringify(user));
    setUser(user);

    // Fetch profile
    const meRes = await authAPI.getMe();
    setProfile(meRes.data.profile);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('ums_token');
    localStorage.removeItem('ums_user');
    setUser(null);
    setProfile(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('ums_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, updateUser, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
