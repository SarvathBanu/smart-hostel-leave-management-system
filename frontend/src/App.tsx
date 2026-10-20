import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import WardenDashboard from './pages/WardenDashboard';
import SecurityDashboard from './pages/SecurityDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DigitalAttendance from './pages/DigitalAttendance';
import { apiService } from './services/api';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate JWT session on startup
    const checkSession = async () => {
      const savedUser = apiService.getCurrentUser();
      if (savedUser) {
        try {
          const profile = await apiService.getProfile();
          setUser(profile);
          setDefaultTab(profile.role);
        } catch (e) {
          apiService.logout();
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  // Update theme class on HTML documentElement
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const setDefaultTab = (role: string) => {
    switch (role) {
      case 'STUDENT':
        setCurrentTab('dashboard');
        break;
      case 'CC':
      case 'HOD':
      case 'DEAN':
        setCurrentTab('approvals');
        break;
      case 'WARDEN':
        setCurrentTab('warden-approvals');
        break;
      case 'GUARD':
        setCurrentTab('scanner');
        break;
      case 'ADMIN':
        setCurrentTab('analytics');
        break;
      default:
        setCurrentTab('dashboard');
    }
  };

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setDefaultTab(userData.role);
  };

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    setCurrentTab('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Verifying secure SSO connection...</p>
      </div>
    );
  }

  // Render view depending on user role and active tab
  const renderMainContent = () => {
    if (!user) return null;

    switch (user.role) {
      case 'STUDENT':
        return (
          <StudentDashboard
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            user={user}
            onUserUpdate={setUser}
          />
        );
      case 'CC':
        if (currentTab === 'attendance') {
          return <DigitalAttendance />;
        }
        return <FacultyDashboard />;
      case 'HOD':
      case 'DEAN':
        return <FacultyDashboard />;
      case 'WARDEN':
        return <WardenDashboard />;
      case 'GUARD':
        return <SecurityDashboard />;
      case 'ADMIN':
        return <AdminDashboard currentTab={currentTab} setCurrentTab={setCurrentTab} />;
      default:
        return (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <h3 className="font-bold text-red-500">System Role Error</h3>
            <p className="text-xs text-slate-500 mt-2">Your role configuration is invalid or missing in the DB profile.</p>
          </div>
        );
    }
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Navbar
      user={user}
      onLogout={handleLogout}
      onUserUpdate={setUser}
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
    >
      {renderMainContent()}
    </Navbar>
  );
}
