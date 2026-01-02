
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CircleView from './pages/CircleView';
import Metaballs from './components/Metaballs';
import { authService } from './services/authService';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial auth check
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f2e8]">
        <div className="w-12 h-12 border-4 border-[#d4a373] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
     <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
    <Router>
      <div className="relative min-h-screen w-full overflow-hidden">
        {/* Background Animation */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Metaballs />
        </div>

        <div className="relative z-10 flex flex-col min-h-screen text-[#432818]">
          <Routes>
            <Route 
              path="/login" 
              element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} 
            />
            <Route 
              path="/" 
              element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/circle/:id" 
              element={user ? <CircleView user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
            />
          </Routes>
        </div>
      </div>
    </Router>
     </GoogleOAuthProvider>
  );
};

export default App;
