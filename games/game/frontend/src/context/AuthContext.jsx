import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

const API_BASE = 'http://localhost:5000/api';

export function AuthProvider({ children, setView }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      loadMe();
    } else {
      setLoading(false);
    }
  }, [token]);

  async function loadMe() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.ok) {
        setUser(data);
      } else {
        // Token expired or invalid
        logout();
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setView('dashboard');
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function register(username, email, password, confirmPassword) {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, confirmPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setView('dashboard');
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setView('home');
  }

  async function claimDaily() {
    try {
      const res = await fetch(`${API_BASE}/user/claim-daily`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim bonus');
      }

      // Update local coins state
      setUser(prev => ({
        ...prev,
        coins: data.newCoinsBalance
      }));

      return data;
    } catch (err) {
      throw err;
    }
  }

  async function equipAvatar(avatarId) {
    try {
      const res = await fetch(`${API_BASE}/user/avatar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatarUrl: avatarId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update avatar');
      }

      setUser(prev => ({
        ...prev,
        avatarUrl: data.avatarUrl
      }));

      return data;
    } catch (err) {
      throw err;
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      login,
      register,
      logout,
      claimDaily,
      equipAvatar,
      setUser,
      loadMe
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
