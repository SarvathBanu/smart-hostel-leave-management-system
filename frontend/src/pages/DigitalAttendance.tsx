import React, { useState, useEffect } from 'react';
import { RefreshCcw, Info, Search, ClipboardList, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';

export default function DigitalAttendance() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchAttendance = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      const data = await apiService.getAttendance();
      setRecords(data);
      setLastRefreshed(new Date());
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch ERP attendance records.');
    } finally {
      setLoading(false);
    }
  };

  // Setup live reload polling every 5 seconds
  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(() => {
      fetchAttendance(false); // poll silently without full loading spinner
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Present':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-450 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            🟢 Present
          </span>
        );
      case 'On Approved Leave':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            🔵 On Approved Leave
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-205">
            {status}
          </span>
        );
    }
  };

  const getRiskBadge = (percentage: number) => {
    if (percentage >= 80.0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-500/20">
          🟢 Safe
        </span>
      );
    } else if (percentage >= 75.0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-605 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20">
          🟡 Warning
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-450 border border-rose-500/20">
          🔴 Critical
        </span>
      );
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      r.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.register_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ERP Notice Banner */}
      <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-750 dark:text-indigo-300 rounded-2xl text-xs flex items-start gap-3.5 shadow-sm">
        <Info className="h-5 w-5 shrink-0 text-indigo-500 mt-0.5" />
        <div>
          <p className="font-extrabold uppercase tracking-wide text-[10px] text-indigo-600 dark:text-indigo-400">ERP Sync Mode (Simulated)</p>
          <p className="mt-0.5 leading-relaxed font-semibold">
            This is a simulated ERP attendance module demonstrating how attendance can be automatically updated through hostel leave management.
          </p>
        </div>
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <ClipboardList className="h-4 w-4" />
            </div>
            <h2 className="text-md font-bold text-slate-850 dark:text-white leading-tight">Digital Attendance Register</h2>
          </div>
          <p className="text-[10px] text-slate-400 font-bold tracking-wide uppercase mt-1">
            Simulated ERP Synchronizer • Auto-refreshing every 5s • Last Sync: {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>

        <button
          onClick={() => fetchAttendance(true)}
          disabled={loading}
          className="erp-btn-secondary py-2 flex items-center gap-2 text-xs font-bold cursor-pointer active:scale-95"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Force Sync</span>
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, roll number, or branch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:border-brand-500 text-slate-800 dark:text-white"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
          {['ALL', 'Present', 'On Approved Leave'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                statusFilter === status
                  ? 'bg-indigo-650 text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-105 dark:hover:bg-slate-800'
              }`}
            >
              {status === 'ALL' ? 'All Status' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Table */}
      {error ? (
        <div className="p-8 text-center bg-rose-500/5 border border-rose-500/20 rounded-2xl">
          <AlertCircle className="h-10 w-10 text-rose-555 mx-auto mb-2" />
          <h4 className="font-bold text-rose-600 text-sm">Attendance Sync Error</h4>
          <p className="text-xs text-rose-500/80 mt-1">{error}</p>
        </div>
      ) : loading && records.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl">
          <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-455">Acquiring ERP secure link...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl">
          <ClipboardList className="h-12 w-12 text-slate-300 dark:text-slate-655 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">No Records Found</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">No students match your current search queries or filter selections.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-750 bg-slate-50/75 dark:bg-slate-900/50 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="py-4.5 px-6">Student Dossier</th>
                  <th className="py-4.5 px-6">Register Number</th>
                  <th className="py-4.5 px-6">Department</th>
                  <th className="py-4.5 px-6">Attendance %</th>
                  <th className="py-4.5 px-6">Approved Leave</th>
                  <th className="py-4.5 px-6">Remaining Safe Days</th>
                  <th className="py-4.5 px-6">Attendance Status</th>
                  <th className="py-4.5 px-6 text-right">Attendance Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-750/70 text-xs">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8.5 w-8.5 rounded-lg bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 flex items-center justify-center font-bold">
                          {record.student_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-850 dark:text-white leading-normal">{record.student_name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">B.E. Student</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4.5 px-6 font-mono text-slate-500 dark:text-slate-400">
                      {record.register_number}
                    </td>
                    <td className="py-4.5 px-6 text-slate-655 dark:text-slate-350">
                      {record.department}
                    </td>
                    <td className="py-4.5 px-6 font-bold text-slate-800 dark:text-white">
                      {record.current_attendance !== null && record.current_attendance !== undefined ? `${record.current_attendance.toFixed(2)}%` : '100.00%'}
                    </td>
                    <td className="py-4.5 px-6 font-medium text-slate-600 dark:text-slate-300">
                      {record.approved_leave_days !== null && record.approved_leave_days !== undefined ? `${record.approved_leave_days} Days` : '0 Days'}
                    </td>
                    <td className="py-4.5 px-6 font-bold text-indigo-650 dark:text-indigo-400">
                      {record.remaining_safe_leave_days !== null && record.remaining_safe_leave_days !== undefined ? `${record.remaining_safe_leave_days} Days` : '11 Days'}
                    </td>
                    <td className="py-4.5 px-6">
                      {getStatusBadge(record.status ?? 'Present')}
                    </td>
                    <td className="py-4.5 px-6 text-right">
                      {getRiskBadge(record.current_attendance ?? 100.0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
