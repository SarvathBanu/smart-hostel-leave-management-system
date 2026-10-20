import React, { useState, useEffect } from 'react';
import { 
  Award, ShieldAlert, Users, Settings, FileText, Download, 
  Search, Eye, Activity, Database, AlertCircle, RefreshCcw, ShieldCheck
} from 'lucide-react';
import { apiService } from '../services/api';

export default function AdminDashboard({ currentTab = 'analytics', setCurrentTab }: { currentTab?: string; setCurrentTab?: (tab: string) => void }) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Settings values
  const [defaultLimit, setDefaultLimit] = useState(15);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  // Reset semester state
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  // Demo reset state
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [demoResetLoading, setDemoResetLoading] = useState(false);
  const [demoResetMessage, setDemoResetMessage] = useState('');
  const [demoResetMessageType, setDemoResetMessageType] = useState<'success' | 'error'>('success');

  // Search filter lists
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const analyticsData = await apiService.getAnalytics();
      setAnalytics(analyticsData);

      const usersData = await apiService.getUsers();
      setUsers(usersData);

      const logsData = await apiService.getAuditLogs();
      setLogs(logsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load system administration dossier.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMessage('');
    try {
      const res = await apiService.updateSettings(defaultLimit);
      setSettingsMessage(res.message);
      // Refresh list to update balances
      const usersData = await apiService.getUsers();
      setUsers(usersData);
    } catch (err: any) {
      setSettingsMessage(`Error: ${err.message}`);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleResetSemester = async () => {
    const confirmReset = window.confirm(
      "WARNING: Performing a Semester Reset will permanently DELETE all leave requests, active/historical gate passes, and reset all student attendance records to 100%.\n\nThis action cannot be undone. Do you wish to proceed?"
    );
    if (!confirmReset) return;

    setResetLoading(true);
    setResetMessage('');
    try {
      const res = await apiService.resetSemester();
      setResetMessage(res.message);
      await fetchAdminData();
    } catch (err: any) {
      setResetMessage(`Reset Error: ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setDemoResetMessage('Please select a student first.');
      setDemoResetMessageType('error');
      return;
    }
    setDemoResetLoading(true);
    setDemoResetMessage('');
    try {
      const res = await apiService.resetStudentDemoData(parseInt(selectedStudentId));
      setDemoResetMessage(res.message);
      setDemoResetMessageType('success');
      await fetchAdminData();
    } catch (err: any) {
      setDemoResetMessage(err.message || 'Error resetting student demo data.');
      setDemoResetMessageType('error');
    } finally {
      setDemoResetLoading(false);
    }
  };

  const handleResetAllDemo = async () => {
    const confirmReset = window.confirm(
      "Are you sure you want to RESET ALL DEMO DATA?\n\nThis will restore all sample student accounts, reset their leave logs, clear notifications, and reset attendance parameters back to original demo values."
    );
    if (!confirmReset) return;

    setDemoResetLoading(true);
    setDemoResetMessage('');
    try {
      const res = await apiService.resetAllDemoData();
      setDemoResetMessage(res.message);
      setDemoResetMessageType('success');
      await fetchAdminData();
    } catch (err: any) {
      setDemoResetMessage(err.message || 'Error resetting all demo data.');
      setDemoResetMessageType('error');
    } finally {
      setDemoResetLoading(false);
    }
  };

  // Helper to convert arrays to CSV format and download
  const handleExportCSV = (dataArray: any[], filename: string) => {
    if (!dataArray || dataArray.length === 0) return;
    
    // Extract headers
    const headers = Object.keys(dataArray[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...dataArray.map(row => 
        headers.map(fieldName => {
          let value = row[fieldName];
          if (value === null || value === undefined) value = '';
          // Escape quotes
          value = String(value).replace(/"/g, '""');
          return `"${value}"`;
        }).join(',')
      )
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">Loading admin console analytics...</p>
      </div>
    );
  }

  // Filter users
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.register_number && u.register_number.toLowerCase().includes(userSearch.toLowerCase()))
  );

  // Filter logs
  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
    (l.user_name && l.user_name.toLowerCase().includes(logSearch.toLowerCase())) ||
    (l.details && l.details.toLowerCase().includes(logSearch.toLowerCase()))
  );

  const summary = analytics?.summary || { total: 0, approved: 0, rejected: 0, pending: 0, lateReturns: 0 };
  const deptWise = analytics?.deptWise || [];
  const hostelWise = analytics?.hostelWise || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Control panel header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
        <div>
          <h2 className="text-lg font-bold text-slate-905 dark:text-white leading-tight">University ERP System Administration</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">Global settings override, security metrics compilation, and live server audits</p>
        </div>
        <button
          onClick={fetchAdminData}
          className="erp-btn-secondary py-2"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* KPI Cards Grid - Only show on Analytics tab */}
      {currentTab === 'analytics' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in duration-205">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm text-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Leaves</span>
            <p className="text-2xl font-extrabold text-slate-850 dark:text-white mt-2 leading-none">{summary.total}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm text-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Approvals Rate</span>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 leading-none">
              {summary.total > 0 ? Math.round((summary.approved / summary.total) * 100) : 0}%
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm text-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Rejections Rate</span>
            <p className="text-2xl font-extrabold text-rose-500 mt-2 leading-none">
              {summary.total > 0 ? Math.round((summary.rejected / summary.total) * 100) : 0}%
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm text-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Pending Queue</span>
            <p className="text-2xl font-extrabold text-indigo-505 mt-2 leading-none">{summary.pending}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm text-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Late Returns</span>
            <p className="text-2xl font-extrabold text-amber-500 mt-2 leading-none">{summary.lateReturns}</p>
          </div>
        </div>
      )}

      {/* Analytics Visual Graphics - Only show on Analytics tab */}
      {currentTab === 'analytics' && (
        <div className="grid md:grid-cols-2 gap-8 animate-in fade-in duration-205">
          {/* Dept Wise Leave Distribution */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department Distribution</h4>
            <div className="space-y-3.5">
              {deptWise.map((d: any) => {
                const maxCount = Math.max(...deptWise.map((x: any) => x.count), 1);
                const percentage = Math.round((d.count / maxCount) * 100);
                return (
                  <div key={d.department} className="space-y-1.5 text-xs font-semibold text-slate-500">
                    <div className="flex justify-between">
                      <span className="text-slate-700 dark:text-slate-350 truncate max-w-[250px]">{d.department}</span>
                      <span className="text-slate-850 dark:text-white font-bold">{d.count} requests</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-200/20 dark:border-slate-800">
                      <div 
                        className="bg-brand-600 h-full rounded-full transition-all duration-550" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {deptWise.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No data registered.</p>}
            </div>
          </div>

          {/* Hostel Wise Leave Distribution */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hostel Block Distribution</h4>
            <div className="space-y-3.5">
              {hostelWise.map((h: any) => {
                const maxCount = Math.max(...hostelWise.map((x: any) => x.count), 1);
                const percentage = Math.round((h.count / maxCount) * 100);
                return (
                  <div key={h.hostel} className="space-y-1.5 text-xs font-semibold text-slate-500">
                    <div className="flex justify-between">
                      <span className="text-slate-700 dark:text-slate-350">{h.hostel}</span>
                      <span className="text-slate-850 dark:text-white font-bold">{h.count} leaves</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-200/20 dark:border-slate-800">
                      <div 
                        className="bg-indigo-650 h-full rounded-full transition-all duration-550" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {hostelWise.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No data registered.</p>}
            </div>
          </div>
        </div>
      )}

      {/* User Directory Tab */}
      {currentTab === 'users' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in duration-205">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-slate-400" />
                <span>User Directory ({users.length})</span>
              </h4>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full sm:w-48 bg-slate-50 dark:bg-slate-905 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:border-brand-500 text-slate-805 dark:text-white"
                />
              </div>
              <button
                onClick={() => handleExportCSV(users, 'User_Directory')}
                className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-905 rounded-xl text-slate-600 dark:text-slate-400 cursor-pointer active:scale-95"
                title="Download CSV"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-405 font-extrabold uppercase tracking-wider text-[9px]">
                  <th className="py-2.5">Name</th>
                  <th>Role</th>
                  <th>Contact</th>
                  <th>Hostel Blocks / Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 font-semibold text-slate-500">
                    <td className="py-3 font-bold text-slate-900 dark:text-white">
                      {u.name}
                      {u.register_number && <span className="block text-[10px] text-slate-400 font-medium font-mono">{u.register_number}</span>}
                    </td>
                    <td>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-655 dark:bg-slate-700 dark:text-slate-350 border border-indigo-100 dark:border-slate-600 uppercase">
                        {u.role}
                      </span>
                    </td>
                    <td className="text-slate-450 font-normal">{u.email}</td>
                    <td className="font-bold text-slate-800 dark:text-slate-300">
                      {u.role === 'STUDENT' ? `${u.hostel_block} (Rm ${u.room_number})` : '-'}
                      {u.role === 'STUDENT' && <span className="block text-[10px] text-slate-405 font-medium">Leaves Bal: {u.leave_balance}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Audit Logs Tab */}
      {currentTab === 'audit' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in duration-205">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-105 dark:border-slate-800 pb-4">
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Database className="h-4.5 w-4.5 text-slate-400" />
                <span>Security Audit Logs</span>
              </h4>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Real-time database audit log records</p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search audit trail..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full sm:w-48 bg-slate-50 dark:bg-slate-905 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:border-brand-500 text-slate-805 dark:text-white"
                />
              </div>
              <button
                onClick={() => handleExportCSV(logs, 'Security_Audit_Logs')}
                className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-905 rounded-xl text-slate-600 dark:text-slate-400 cursor-pointer active:scale-95"
                title="Download CSV"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-805 text-slate-400 font-bold sticky top-0 bg-white dark:bg-slate-800 py-2">
                  <th className="py-2.5">Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>IP / Browser</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 font-medium text-slate-500">
                    <td className="py-3 text-slate-400 font-mono whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="font-bold text-slate-850 dark:text-slate-350">
                      {l.user_name || 'System'}
                      {l.user_email && <span className="block text-[10px] text-slate-455 font-medium">{l.user_email}</span>}
                    </td>
                    <td>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                        l.action.startsWith('LEAVE_REVIEW_APPROVE') ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-750' :
                        l.action.startsWith('LEAVE_REVIEW_REJECT') ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-slate-800 dark:text-rose-450 dark:border-slate-750' :
                        l.action.startsWith('LOGIN') ? 'bg-brand-50 text-brand-650 border-brand-100 dark:bg-slate-800 dark:text-brand-405 dark:border-slate-750' :
                        'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 border-slate-205 dark:border-slate-700'
                      }`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="text-slate-405 font-normal whitespace-nowrap">{l.ip_address} ({l.browser} on {l.device})</td>
                    <td className="text-slate-600 dark:text-slate-400 max-w-sm truncate font-normal" title={l.details}>
                      {l.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings & Demo Management Tab */}
      {currentTab === 'settings' && (
        <div className="grid lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-205">
          {/* Global & Semester settings: Left Panel */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Settings className="h-4.5 w-4.5 text-slate-400" />
                <span>Global Settings Override</span>
              </h4>
              <p className="text-[11px] text-slate-455 leading-relaxed font-semibold">
                Reset default leave balances for the entire student directory. Warning: this replaces all student records.
              </p>

              <form onSubmit={handleUpdateLimit} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Default Leaves Limit (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={defaultLimit}
                    onChange={(e) => setDefaultLimit(parseInt(e.target.value))}
                    className="erp-input font-bold"
                    required
                  />
                </div>
                {settingsMessage && (
                  <p className="text-[10px] font-extrabold text-brand-600 dark:text-brand-400">{settingsMessage}</p>
                )}
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="w-full py-2.5 bg-slate-850 hover:bg-slate-750 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  {settingsLoading ? 'Updating...' : 'Execute Override'}
                </button>
              </form>
            </div>

            {/* Semester Reset Section */}
            <div className="border-t border-slate-100 dark:border-slate-700/50 pt-5 space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <RefreshCcw className="h-4.5 w-4.5 text-slate-400" />
                <span>Semester Administration</span>
              </h4>
              <p className="text-[11px] text-slate-455 leading-relaxed font-semibold">
                Wipe out all current hostel leaves, QR passes, and reset student academic attendance percentages back to 100%.
              </p>
              {resetMessage && (
                <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">{resetMessage}</p>
              )}
              <button
                type="button"
                onClick={handleResetSemester}
                disabled={resetLoading}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                {resetLoading ? 'Resetting Semester...' : '⚠️ Reset Current Semester'}
              </button>
            </div>
          </div>

          {/* Demo Management Section: Right Panel */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Database className="h-4.5 w-4.5 text-slate-400" />
                <span>Demo Management</span>
              </h4>
              <p className="text-[11px] text-slate-455 leading-relaxed font-semibold">
                Reset student leave pipelines and restore original demo parameters to facilitate testing of the workflow.
              </p>

              {demoResetMessage && (
                <div className={`p-3.5 rounded-xl text-xs font-bold leading-normal border animate-in fade-in duration-200 ${
                  demoResetMessageType === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-455'
                }`}>
                  {demoResetMessage}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 pt-1">
                {/* Reset Individual Student Card */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4.5 rounded-2xl border border-slate-200/40 dark:border-slate-700/60 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-655 dark:bg-slate-700 dark:text-slate-350 border border-indigo-100 dark:border-slate-600 uppercase">
                      Option 1
                    </span>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-white">Reset Individual Student</h5>
                    <p className="text-[11px] text-slate-450 leading-relaxed font-semibold">
                      Clear the selected student's active logs and restore their demo attendance. Does not affect other student profiles.
                    </p>
                  </div>

                  <form onSubmit={handleResetStudent} className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Select Sample Student</label>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="erp-input py-1.5 text-xs font-bold"
                        required
                      >
                        <option value="">-- Choose student --</option>
                        {users.filter(u => u.role === 'STUDENT').map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.register_number})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={demoResetLoading}
                      className="w-full py-2 bg-slate-850 hover:bg-slate-755 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <RefreshCcw className={`h-3 w-3 ${demoResetLoading ? 'animate-spin' : ''}`} />
                      <span>Reset Student</span>
                    </button>
                  </form>
                </div>

                {/* Reset All Demo Data Card */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4.5 rounded-2xl border border-slate-200/40 dark:border-slate-700/60 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-655 dark:bg-slate-700 dark:text-slate-355 border border-indigo-100 dark:border-slate-600 uppercase">
                      Option 2
                    </span>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-white">Reset All Demo Data</h5>
                    <p className="text-[11px] text-slate-450 leading-relaxed font-semibold">
                      Restore every sample user profile to its original seeded state. Wipes leaves, passes, notifications, and logs.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleResetAllDemo}
                      disabled={demoResetLoading}
                      className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <RefreshCcw className={`h-3 w-3 ${demoResetLoading ? 'animate-spin' : ''}`} />
                      <span>Reset All Demo State</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
