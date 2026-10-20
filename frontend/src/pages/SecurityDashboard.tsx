import React, { useState, useEffect } from 'react';
import { 
  Shield, CheckCircle2, XCircle, Clock, 
  MapPin, User, LogOut, LogIn, RefreshCw, 
  MessageSquare, AlertTriangle, Search, Camera, ScanLine, ShieldCheck
} from 'lucide-react';
import { apiService } from '../services/api';

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState<'scan' | 'checked-out' | 'history'>('scan');
  const [loading, setLoading] = useState(false);
  const [pendingPasses, setPendingPasses] = useState<any[]>([]);
  const [selectedPass, setSelectedPass] = useState<any>(null);
  const [simulationId, setSimulationId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lateReason, setLateReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Gate scanning history
  const [gateHistory, setGateHistory] = useState<any[]>([
    { name: 'Rahul Kumar', regNum: '22CSE101', action: 'EXIT', time: '14:22', status: 'SUCCESS' }
  ]);

  const fetchPendingPasses = async () => {
    try {
      const data = await apiService.getPendingPasses();
      setPendingPasses(data);
    } catch (err: any) {
      console.error('Error fetching pending passes:', err);
    }
  };

  useEffect(() => {
    fetchPendingPasses();
    const interval = setInterval(fetchPendingPasses, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleProcessPass = async (pass: any, action: 'EXIT' | 'ENTRY' | 'REJECT') => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiService.processPass(pass.pass_id, action, lateReason);
      
      const newLog = {
        name: pass.student_name,
        regNum: pass.register_number,
        action: action,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: action === 'REJECT' ? 'FAIL' : 'SUCCESS'
      };
      setGateHistory(prev => [newLog, ...prev]);

      if (action === 'EXIT') {
        setSuccess(`Exit approved successfully for ${pass.student_name}. [PROTOTYPE SIMULATOR] Simulated WhatsApp & SMS checkout alerts dispatched to parent Mr/Mrs ${pass.parent_name || 'Guardian'} (${pass.parent_phone}).`);
      } else if (action === 'ENTRY') {
        setSuccess(`Entry/Return recorded successfully for ${pass.student_name}. [PROTOTYPE SIMULATOR] Simulated WhatsApp & SMS campus-return alerts dispatched to parent Mr/Mrs ${pass.parent_name || 'Guardian'} (${pass.parent_phone}).`);
      } else {
        setSuccess(`Pass rejected successfully for ${pass.student_name}.`);
      }

      setSelectedPass(null);
      setLateReason('');
      await fetchPendingPasses();
    } catch (err: any) {
      setError(err.message || 'Failed to process pass.');
    } finally {
      setLoading(false);
    }
  };

  // Filter queues
  const exitQueue = pendingPasses.filter(p => p.status === 'ACTIVE' && p.sent_to_guard === 1);
  const checkedOutList = pendingPasses.filter(p => p.status === 'OUT_OF_CAMPUS');

  // Filter checked out list by search query
  const filteredCheckedOut = checkedOutList.filter(p => 
    p.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.register_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.room_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Brand Header / Title */}
      <div className="bg-slate-900 border border-slate-805 text-slate-100 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Security Guard Verification Console</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">Smart Hostel Leave Management System</p>
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase">GATE PASS VERIFICATION PORTAL</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => { setActiveTab('scan'); setError(''); setSuccess(''); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer ${
            activeTab === 'scan' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 hover:text-slate-655'
          }`}
        >
          📷 Scan Gate Pass
          {activeTab === 'scan' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-600 dark:bg-brand-400" />
          )}
        </button>
        <button
          onClick={() => { setActiveTab('checked-out'); setError(''); setSuccess(''); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer ${
            activeTab === 'checked-out' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 hover:text-slate-655'
          }`}
        >
          📋 Checked-Out Students ({checkedOutList.length})
          {activeTab === 'checked-out' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-600 dark:bg-brand-400" />
          )}
        </button>
        <button
          onClick={() => { setActiveTab('history'); setError(''); setSuccess(''); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer ${
            activeTab === 'history' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 hover:text-slate-655'
          }`}
        >
          🕒 Gate Activity Log
          {activeTab === 'history' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-600 dark:bg-brand-400" />
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-450 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Content depending on selected tab */}
      {activeTab === 'scan' && (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Scan Section (Left) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-sm space-y-5">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gate Scanner Verification Portal</h4>
              </div>

              <div className="p-5 bg-brand-500/5 border border-brand-500/10 rounded-2xl flex items-start gap-3 text-xs text-brand-600 dark:text-brand-400 font-semibold leading-relaxed">
                <ScanLine className="h-5 w-5 text-brand-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-extrabold uppercase text-[10px] tracking-wide text-brand-700 dark:text-brand-300">Verification Desk</p>
                  <p className="mt-1">Select a student from the active queue below and click the verification scan button.</p>
                </div>
              </div>

              {/* Simulation Dropdown & Scan Button */}
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Select Student from Active Queue</label>
                  <div className="flex gap-2">
                    <select
                      className="erp-input flex-1 font-bold text-xs"
                      onChange={(e) => setSimulationId(e.target.value)}
                      value={simulationId}
                    >
                      <option value="">Choose a student...</option>
                      {exitQueue.map((p) => (
                        <option key={p.pass_id} value={p.pass_id}>
                          {p.student_name} ({p.register_number})
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={fetchPendingPasses}
                      type="button"
                      className="erp-btn-secondary py-3 px-3"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (simulationId) {
                      const pass = exitQueue.find(p => p.pass_id === simulationId);
                      setSelectedPass(pass || null);
                      setError('');
                      setSuccess('');
                    } else {
                      setError('Please select a student first.');
                    }
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-650 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-brand-500/10"
                >
                  <ScanLine className="h-4 w-4 animate-pulse" />
                  <span>Scan Pass & Verify</span>
                </button>
              </div>
            </div>
          </div>

          {/* Verification Details Card (Right) */}
          <div className="lg:col-span-6">
            {selectedPass ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 p-6 md:p-8 space-y-6 shadow-md animate-in slide-in-from-right-4 duration-200">
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/80 pb-5">
                  <div className="flex gap-4">
                    <div className="h-11 w-11 rounded-xl bg-brand-500/10 text-brand-650 dark:text-brand-450 flex items-center justify-center font-extrabold text-lg border border-brand-500/15 shrink-0">
                      {selectedPass.student_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">{selectedPass.student_name}</h3>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">{selectedPass.register_number} • Room {selectedPass.room_number}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-605 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wide border">
                    Approved
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-700/40 rounded-2xl p-5 font-semibold text-slate-500">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block mb-1">DEPARTMENT</span>
                    <span className="text-slate-800 dark:text-white font-bold">{selectedPass.department}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block mb-1">HOSTEL ROOM</span>
                    <span className="text-slate-800 dark:text-white font-bold">{selectedPass.hostel_block} • Room {selectedPass.room_number}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] text-slate-400 font-bold block mb-1">LEAVE REASON</span>
                    <span className="text-slate-850 dark:text-white font-bold block">"{selectedPass.reason}"</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block mb-1">DESTINATION</span>
                    <span className="text-slate-800 dark:text-white font-bold">{selectedPass.destination}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block mb-1">LEAVE TIMINGS</span>
                    <span className="text-slate-805 dark:text-white font-bold block">{selectedPass.start_date} to {selectedPass.end_date}</span>
                  </div>
                </div>

                <div className="flex gap-4 border-t border-slate-100 dark:border-slate-750 pt-5">
                  <button
                    onClick={() => handleProcessPass(selectedPass, 'EXIT')}
                    disabled={loading}
                    className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-550 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer shadow-md shadow-emerald-500/10"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    <span>Allow Exit</span>
                  </button>
                  <button
                    onClick={() => handleProcessPass(selectedPass, 'REJECT')}
                    disabled={loading}
                    className="px-6 py-3.5 border border-rose-500 hover:bg-rose-500/5 text-rose-600 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Reject Exit
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[350px]">
                <ScanLine className="h-12 w-12 text-slate-350 dark:text-slate-655 mb-3" />
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200">Waiting for QR Scan</h4>
                <p className="text-xs text-slate-400 mt-1.5 max-w-[280px] leading-relaxed">Scan a student's QR gate pass or choose a student in the simulation selector to verify details.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'checked-out' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checked-Out Students Queue</h4>
              <p className="text-xs text-slate-400 mt-0.5">Students who are currently outside campus. Record returns here.</p>
            </div>
            
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, register no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-brand-500 text-slate-800 dark:text-white font-semibold"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            {filteredCheckedOut.map((p) => (
              <div key={p.pass_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors text-xs">
                <div className="flex gap-4">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/15 flex items-center justify-center shrink-0 font-bold">
                    {p.student_name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">{p.student_name}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{p.register_number} • Room {p.room_number} • {p.hostel_block}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end text-slate-400">
                  <span className="text-[10px] font-bold text-slate-450 dark:text-slate-350">Exit time: {new Date(p.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(p.exit_time).toLocaleDateString()})</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Expected Return: {p.end_date} @ {p.expected_return_time}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Late Reason Input if returning late */}
                  <input
                    type="text"
                    placeholder="Late reason (optional)..."
                    onChange={(e) => setLateReason(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-[11px] w-40 outline-none focus:border-brand-500 text-slate-800 dark:text-white"
                  />
                  <button
                    onClick={() => handleProcessPass(p, 'ENTRY')}
                    disabled={loading}
                    className="py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer shadow-sm shadow-brand-500/10"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Verify Return</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredCheckedOut.length === 0 && (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[250px]">
                <ShieldCheck className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-300">No checked-out students found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[260px]">Students verified for exit by security will appear here. Record their return once they check back in.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gate Activity History Log</h4>
            <p className="text-xs text-slate-405 mt-0.5">Live log of security scan events for campus release audits.</p>
          </div>

          <div className="divide-y divide-slate-105 dark:divide-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            {gateHistory.map((log, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                <div className="flex gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    log.action === 'EXIT' 
                      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' 
                      : log.action === 'ENTRY' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  }`}>
                    {log.action === 'EXIT' ? <LogOut className="h-4 w-4" /> : log.action === 'ENTRY' ? <LogIn className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </div>
                  <div>
                    <span className="font-bold text-slate-805 dark:text-slate-200 block">{log.name}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{log.regNum} • Action: {log.action}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 font-mono font-bold block">{log.time}</span>
                  <span className={`inline-block text-[9px] font-bold uppercase mt-1 tracking-wider ${
                    log.status === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
