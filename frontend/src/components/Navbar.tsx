import React, { useState, useEffect } from 'react';
import { 
  LogOut, Bell, Sun, Moon, Shield, Award, User, Clock, 
  CheckCircle, FileText, Settings, ShieldAlert, BookOpen, 
  MapPin, Menu, X, Info, ClipboardList
} from 'lucide-react';
import { apiService } from '../services/api';

interface NavbarProps {
  user: any;
  onLogout: () => void;
  onUserUpdate?: (user: any) => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  children?: React.ReactNode;
}

export default function Navbar({ 
  user, 
  onLogout, 
  onUserUpdate,
  currentTab, 
  setCurrentTab, 
  darkMode, 
  setDarkMode,
  children
}: NavbarProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll notifications every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await apiService.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => n.read === 0).length);
    } catch (err) {
      console.error('Failed to load notifications');
    }
  };

  const handleMarkAsRead = async () => {
    try {
      await apiService.markNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      handleMarkAsRead();
    }
  };

  const handleNotificationClick = (n: any) => {
    if (n.leave_request_id) {
      // Switch tab based on role
      if (user.role === 'STUDENT') {
        setCurrentTab('history');
      } else if (['CC', 'HOD', 'DEAN'].includes(user.role)) {
        setCurrentTab('approvals');
      } else if (user.role === 'WARDEN') {
        setCurrentTab('warden-approvals');
      }

      // Dispatch custom event to select/open the request
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-leave-request', {
          detail: { leaveId: n.leave_request_id }
        }));
      }, 50);

      setShowNotifications(false);
    }
  };

  // Define sidebar menu options based on User Role
  const getMenuOptions = () => {
    switch (user.role) {
      case 'STUDENT':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: User },
          { id: 'apply', label: 'Apply Leave', icon: FileText },
          { id: 'history', label: 'Leave History', icon: Clock },
          { id: 'settings', label: 'Account Settings', icon: Settings },
        ];
      case 'CC':
        return [
          { id: 'approvals', label: 'Leave Approvals', icon: CheckCircle },
          { id: 'history', label: 'Academic History', icon: BookOpen },
          { id: 'attendance', label: 'Digital Attendance', icon: ClipboardList }
        ];
      case 'HOD':
      case 'DEAN':
        return [
          { id: 'approvals', label: 'Leave Approvals', icon: CheckCircle },
          { id: 'history', label: 'Academic History', icon: BookOpen },
        ];
      case 'WARDEN':
        return [
          { id: 'warden-approvals', label: 'Warden Queue', icon: Shield },
          { id: 'rooms', label: 'Room Allotment', icon: MapPin },
        ];
      case 'GUARD':
        return [
          { id: 'scanner', label: 'QR Scanner', icon: ShieldAlert },
          { id: 'scan-history', label: 'Gate Logs', icon: Clock },
        ];
      case 'ADMIN':
        return [
          { id: 'analytics', label: 'Analytics Panel', icon: Award },
          { id: 'users', label: 'User Directory', icon: User },
          { id: 'audit', label: 'Security Audit Logs', icon: Shield },
          { id: 'settings', label: 'Settings', icon: Settings },
        ];
      default:
        return [];
    }
  };

  const menuOptions = getMenuOptions();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 text-slate-300 border-r border-slate-900/60 shrink-0">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-900/40 bg-slate-950">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/25 border border-brand-400/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xs font-extrabold text-white tracking-wide leading-tight uppercase">Smart Hostel</h1>
            <p className="text-[8px] text-brand-400 font-extrabold tracking-wider uppercase">Leave System</p>
          </div>
        </div>

        {/* User Card */}
        <div 
          onClick={() => setShowProfileModal(true)}
          className="p-3 mx-4 my-5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800/60 rounded-2xl flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="h-9 w-9 rounded-xl bg-brand-500/10 flex items-center justify-center font-bold text-brand-450 border border-brand-500/20 shrink-0">
            {user.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-white truncate leading-normal">{user.name}</h4>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.role} Account</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 space-y-1">
          {menuOptions.map((opt) => {
            const Icon = opt.icon;
            const active = currentTab === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setCurrentTab(opt.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                  active 
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-600/15' 
                    : 'hover:bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-900 space-y-1.5">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold rounded-xl hover:bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-3">
              {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5" />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl text-rose-450 hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-slate-950 text-white border-b border-slate-900 z-50 shrink-0">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5.5 w-5.5 text-brand-400" />
          <span className="font-extrabold text-xs tracking-wide uppercase">Smart Hostel Leave System</span>
        </div>
        <div className="flex items-center gap-3.5">
          <button onClick={() => setDarkMode(!darkMode)} className="p-1 cursor-pointer">
            {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-400" />}
          </button>
          <button 
            onClick={toggleNotifications} 
            className="relative p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Bell className="h-5.5 w-5.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1 cursor-pointer">
            {mobileMenuOpen ? <X className="h-5.5 w-5.5" /> : <Menu className="h-5.5 w-5.5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <nav className="md:hidden fixed inset-x-0 top-[57px] bg-slate-950 text-slate-300 border-b border-slate-900 py-3.5 px-5 z-40 space-y-1.5 animate-in slide-in-from-top duration-150">
          {menuOptions.map((opt) => {
            const Icon = opt.icon;
            const active = currentTab === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setCurrentTab(opt.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl cursor-pointer ${
                  active ? 'bg-brand-600 text-white' : 'hover:bg-slate-900 text-slate-450 hover:text-white'
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{opt.label}</span>
              </button>
            );
          })}
          <hr className="border-slate-900 my-3" />
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl text-rose-455 hover:bg-rose-500/10 cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign Out
          </button>
        </nav>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4.5 border-b border-slate-200/50 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-35">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize tracking-tight leading-tight">
              {currentTab.replace('-', ' ')}
            </h2>
            <p className="text-[9px] text-slate-405 font-bold tracking-wide uppercase mt-0.5">Digital Hostel Leave Approval & QR Verification Portal</p>
          </div>

          <div className="flex items-center gap-5">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={toggleNotifications}
                className="p-2 text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-150 relative cursor-pointer active:scale-95"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900" />
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden z-50 animate-in fade-in-50 slide-in-from-top-1">
                  <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <span className="font-extrabold text-xs text-slate-850 dark:text-white uppercase tracking-wider">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[9px] bg-brand-600 text-white font-extrabold px-2.5 py-0.5 rounded-full">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">No notifications available</div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => handleNotificationClick(n)}
                          className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${!n.read ? 'bg-brand-50/20 dark:bg-brand-500/5' : ''}`}
                        >
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-normal">{n.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-450 mt-1 leading-snug">{n.message}</p>
                          <span className="text-[9px] text-slate-400 dark:text-slate-550 block mt-2">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar summary */}
            <div 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-850 cursor-pointer hover:opacity-85 active:scale-95 transition-all"
            >
              <div className="h-8.5 w-8.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold shrink-0 border border-brand-500/15">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{user.name}</p>
                <p className="text-[9px] text-slate-450 dark:text-slate-400 font-extrabold tracking-wider uppercase mt-0.5">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Router Render Panel */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onUserUpdate={onUserUpdate}
        />
      )}
    </div>
  );
}

interface ProfileModalProps {
  user: any;
  onClose: () => void;
  onUserUpdate?: (user: any) => void;
}

function ProfileModal({ user, onClose, onUserUpdate }: ProfileModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'password'>('profile');
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMsg({ type: 'error', text: 'Name is required' });
      return;
    }
    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const updated = await apiService.updateProfile(name, phone);
      if (onUserUpdate) onUserUpdate(updated);
      localStorage.setItem('hlms_user', JSON.stringify(updated));
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error updating profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      await apiService.changePassword(currentPassword, newPassword);
      setMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error updating password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Profile Settings</h3>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-0.5">{user.role} ID: #{user.id}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-all cursor-pointer active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-700/80 px-6 py-2 bg-slate-50/20 dark:bg-slate-800/20">
          <button
            onClick={() => { setActiveSubTab('profile'); setMsg({ type: '', text: '' }); }}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'profile'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
          >
            Identity Profile
          </button>
          <button
            onClick={() => { setActiveSubTab('password'); setMsg({ type: '', text: '' }); }}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'password'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
          >
            Security & Password
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {msg.text && (
            <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              msg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}>
              <Info className="h-4 w-4 shrink-0" />
              <span>{msg.text}</span>
            </div>
          )}

          {activeSubTab === 'profile' ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email (Read-only)</label>
                <input
                  type="text"
                  value={user.email}
                  disabled
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-xl py-2.5 px-4 text-xs text-slate-400 cursor-not-allowed font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Display Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-xs outline-none focus:border-brand-500 text-slate-800 dark:text-white font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-xs outline-none focus:border-brand-500 text-slate-850 dark:text-white font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5.5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-brand-600/10 transition-all cursor-pointer active:scale-95 hover:shadow-lg"
                >
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-xs outline-none focus:border-brand-500 text-slate-850 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-xs outline-none focus:border-brand-500 text-slate-850 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-xs outline-none focus:border-brand-500 text-slate-850 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5.5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-brand-600/10 transition-all cursor-pointer active:scale-95 hover:shadow-lg"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
