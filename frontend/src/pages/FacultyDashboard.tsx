import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, AlertCircle, Phone, MessageSquare, Mail, 
  ChevronRight, Calendar, User, BookOpen, AlertTriangle, ShieldCheck, 
  ExternalLink, CheckSquare, RefreshCcw, Info
} from 'lucide-react';
import { apiService } from '../services/api';

export default function FacultyDashboard() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [extensions, setExtensions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [selectedExtension, setSelectedExtension] = useState<any>(null);
  
  // Input actions
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [parentContacted, setParentContacted] = useState(false);

  // Parent Call Log Simulator State
  const [showCallModal, setShowCallModal] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [callLogSuccess, setCallLogSuccess] = useState(false);

  // Current logged in user context
  const currentUser = apiService.getCurrentUser() || {};
  const userRole = currentUser.role; // CC, HOD, DEAN

  useEffect(() => {
    fetchApprovals();
  }, []);

  useEffect(() => {
    const handleOpenLeave = (e: Event) => {
      const customEvent = e as CustomEvent;
      const leaveId = customEvent.detail.leaveId;
      if (leaveId) {
        fetchApprovals(leaveId);
      }
    };

    window.addEventListener('open-leave-request', handleOpenLeave);
    return () => window.removeEventListener('open-leave-request', handleOpenLeave);
  }, []);

  const fetchApprovals = async (selectId?: number, selectExtId?: number) => {
    try {
      setLoading(true);
      const data = await apiService.getFacultyLeaves();
      setLeaves(data);

      let extData: any[] = [];
      if (userRole === 'CC') {
        extData = await apiService.getPendingExtensions();
        setExtensions(extData);
      } else {
        setExtensions([]);
      }

      if (selectExtId) {
        const foundExt = extData.find((e: any) => e.id === selectExtId);
        if (foundExt) {
          setSelectedExtension(foundExt);
          setSelectedLeave(null);
          return data;
        }
      }

      if (selectId) {
        const found = data.find((l: any) => l.id === selectId);
        if (found) {
          setSelectedLeave(found);
          setSelectedExtension(null);
          return data;
        }
      }

      // Default fallback selections:
      if (selectedExtension) {
        const foundExt = extData.find((e: any) => e.id === selectedExtension.id);
        if (foundExt) {
          setSelectedExtension(foundExt);
          setSelectedLeave(null);
          return data;
        }
      }

      if (selectedLeave) {
        const found = data.find((l: any) => l.id === selectedLeave.id);
        if (found) {
          setSelectedLeave(found);
          setSelectedExtension(null);
          return data;
        }
      }

      // Initial defaults
      if (extData.length > 0) {
        setSelectedExtension(extData[0]);
        setSelectedLeave(null);
      } else if (data.length > 0) {
        setSelectedLeave(data[0]);
        setSelectedExtension(null);
      } else {
        setSelectedLeave(null);
        setSelectedExtension(null);
      }

      return data;
    } catch (err: any) {
      setError(err.message || 'Error retrieving approval queue.');
    } finally {
      setLoading(false);
    }
  };

  const handleActionSubmit = async (action: string) => {
    if (!selectedLeave) return;

    setActionLoading(true);
    setActionError('');
    setSuccessMessage('');

    try {
      await apiService.reviewLeave(selectedLeave.id, action, remarks);
      setRemarks('');
      setSuccessMessage(`Leave application successfully ${action.toLowerCase()}ed and forwarded.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      await fetchApprovals();
    } catch (err: any) {
      setActionError(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Simulate contact actions
  const handleParentCallSave = () => {
    if (!callNotes.trim()) return;
    setCallLogSuccess(true);
    setTimeout(() => {
      setShowCallModal(false);
      setCallLogSuccess(false);
      setRemarks(prev => (prev ? `${prev}\n` : '') + `[Call Log]: ${callNotes}`);
      setCallNotes('');
    }, 1200);
  };

  const openWhatsApp = () => {
    if (!selectedLeave) return;
    const text = encodeURIComponent(`Hello Mr/Mrs ${selectedLeave.parent_name}, this is ${currentUser.name} from College Administration. We are reviewing a leave application submitted by your child ${selectedLeave.student_name}.`);
    window.open(`https://wa.me/${selectedLeave.parent_phone.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  const openEmail = () => {
    if (!selectedLeave) return;
    const subject = encodeURIComponent(`Hostel Leave Application Verification - ${selectedLeave.student_name}`);
    const body = encodeURIComponent(`Respected Parent,\n\nThis is to notify you that ${selectedLeave.student_name} (${selectedLeave.register_number}) has applied for a ${selectedLeave.leave_type} leave from ${selectedLeave.start_date} to ${selectedLeave.end_date}.\nReason: ${selectedLeave.reason}\n\nPlease verify this application.\n\nWarm regards,\n${currentUser.name}\n${currentUser.role}, College Administration`);
    window.open(`mailto:${selectedLeave.student_email}?subject=${subject}&body=${body}`);
  };

  if (loading && leaves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">Loading leave queue dossier...</p>
      </div>
    );
  }

  // Filter leaves that require current user's approval
  const pendingQueue = leaves.filter(l => l.current_handler_role === userRole && l.status !== 'APPROVED' && l.status !== 'REJECTED');
  const pastApprovals = leaves.filter(l => l.current_handler_role !== userRole || l.status === 'APPROVED' || l.status === 'REJECTED');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
        <div>
          <h2 className="text-lg font-bold text-slate-905 dark:text-white leading-tight">Leave Approvals Control Panel</h2>
          <p className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase mt-1">Review student dossiers, verify parent permissions, and sign off passes</p>
        </div>
        <button
          onClick={() => fetchApprovals()}
          className="erp-btn-secondary py-2"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {leaves.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 p-16 text-center text-slate-455">
          <ShieldCheck className="h-12 w-12 text-slate-350 dark:text-slate-655 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider">Approval Queue Empty</h4>
          <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">No pending student applications require your review at this time.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Requests Queue List - Left Panel */}
          <div className="lg:col-span-5 space-y-6">
            {userRole === 'CC' && (
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Leave Extension Requests ({extensions.length})</h3>
                <div className="space-y-3 mb-6">
                  {extensions.map((ext) => (
                    <button
                      key={ext.id}
                      onClick={() => {
                        setSelectedExtension(ext);
                        setSelectedLeave(null);
                        setRemarks('');
                        setSuccessMessage('');
                      }}
                      className={`w-full p-4 rounded-2xl border text-left transition-all duration-150 relative active:scale-[0.98] ${
                        selectedExtension?.id === ext.id
                          ? 'border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/10'
                          : 'border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-slate-850 dark:text-white truncate max-w-[200px]">{ext.student_name}</h4>
                        <span className="text-[9px] text-slate-400 font-mono">Ext #{ext.id}</span>
                      </div>
                      <p className="text-[11px] text-indigo-650 dark:text-indigo-400 mt-1 font-bold">Extend to {ext.new_end_date} @ {ext.new_expected_return_time}</p>
                      <div className="flex items-center justify-between mt-3 text-[9px] text-slate-400 font-bold">
                        <span>Orig return: {ext.original_end_date}</span>
                        <span className={`px-2 py-0.5 rounded-full border ${
                          ext.attendance_percentage < 75.0 
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                            : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
                        }`}>
                          Attn: {ext.attendance_percentage}%
                        </span>
                      </div>
                    </button>
                  ))}
                  {extensions.length === 0 && (
                    <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-center text-xs text-slate-400">
                      No pending extension requests.
                    </div>
                  )}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Pending Action ({pendingQueue.length})</h3>
              <div className="space-y-3">
                {pendingQueue.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setSelectedLeave(l);
                      setRemarks('');
                      setSuccessMessage('');
                      setParentContacted(false);
                    }}
                    className={`w-full p-4 rounded-2xl border text-left transition-all duration-150 relative active:scale-[0.98] ${
                      selectedLeave?.id === l.id
                        ? 'border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/10'
                        : 'border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {/* Low Attendance Dot indicator */}
                    {l.attendance_percentage < 75.0 && (
                      <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-slate-850 dark:text-white truncate max-w-[200px]">{l.student_name}</h4>
                      <span className="text-[9px] text-slate-400 font-mono">#{l.id}</span>
                    </div>
                    <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-1">{l.leave_type} Leave • {l.department}</p>
                    <div className="flex items-center justify-between mt-3 text-[9px] text-slate-400 font-bold">
                      <span>{l.start_date} to {l.end_date}</span>
                      <span className={`px-2 py-0.5 rounded-full border ${
                        l.attendance_percentage < 75.0 
                          ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                          : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
                      }`}>
                        Attn: {l.attendance_percentage}%
                      </span>
                    </div>
                  </button>
                ))}
                {pendingQueue.length === 0 && (
                  <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-center text-xs text-slate-400">
                    No pending items in your queue.
                  </div>
                )}
              </div>
            </div>

            {pastApprovals.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Reviewed History ({pastApprovals.length})</h3>
                <div className="space-y-2">
                  {pastApprovals.slice(0, 5).map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        setSelectedLeave(l);
                        setRemarks('');
                        setSuccessMessage('');
                        setParentContacted(false);
                      }}
                      className={`w-full p-3.5 rounded-xl border text-left text-xs bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100/30 flex justify-between items-center transition-all ${
                        selectedLeave?.id === l.id ? 'ring-2 ring-brand-500/20 border-brand-500' : ''
                      }`}
                    >
                      <div className="overflow-hidden pr-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block truncate">{l.student_name}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">{l.leave_type} Leave • {l.status}</span>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        l.status === 'APPROVED' 
                          ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {l.status.replace('PENDING_', '')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7">
            {selectedExtension ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-md p-6 md:p-8 space-y-6 animate-in slide-in-from-right-4 duration-200">
                
                {/* Header Profile Section */}
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/80 pb-6">
                  <div className="flex gap-4">
                    <div className="h-11 w-11 rounded-xl bg-indigo-500/10 text-indigo-650 dark:text-indigo-405 flex items-center justify-center font-bold text-lg border border-indigo-500/15 shrink-0">
                      {selectedExtension.student_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-850 dark:text-white leading-tight">
                        {selectedExtension.student_name}
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/25 ml-2">Extension Request</span>
                      </h3>
                      <p className="text-[10px] text-slate-405 mt-1 font-mono">{selectedExtension.register_number} • Year {selectedExtension.year} • Sec {selectedExtension.section}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                    Pending CC Approval
                  </span>
                </div>

                {/* Success Message Banner */}
                {successMessage && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in-50">
                    <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-555" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid sm:grid-cols-2 gap-6 text-xs bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-700/40 rounded-2xl p-5">
                  <div className="space-y-3 font-semibold text-slate-550">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">ORIGINAL LEAVE DETAILS</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedExtension.leave_type} Leave (ID: #{selectedExtension.leave_request_id})</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">ORIGINAL RETURN DATE</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedExtension.original_end_date} @ {selectedExtension.original_return_time}</span>
                    </div>
                  </div>
                  <div className="space-y-3 font-semibold text-slate-550">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">PROPOSED EXTENSION RETURN</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{selectedExtension.new_end_date} @ {selectedExtension.new_expected_return_time}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">CURRENT ATTENDANCE</span>
                      <span className={`font-extrabold ${selectedExtension.attendance_percentage < 75.0 ? 'text-rose-500 animate-pulse' : 'text-indigo-650 dark:text-indigo-400'}`}>
                        {selectedExtension.attendance_percentage}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Extension Reason */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Reason for Extension</h4>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                    <p className="text-slate-755 dark:text-slate-350 text-xs italic leading-normal whitespace-pre-wrap font-medium">
                      "{selectedExtension.reason}"
                    </p>
                  </div>
                </div>

                {/* Review Form - Active Review Actions */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">CC Remarks (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Add review remarks for this extension..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:border-indigo-505 text-slate-800 dark:text-white font-medium"
                    />
                  </div>

                  {actionError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="h-4.5 w-4.5 text-rose-555" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={async () => {
                        setActionLoading(true);
                        setActionError('');
                        setSuccessMessage('');
                        try {
                          await apiService.reviewExtension(selectedExtension.id, 'APPROVE', remarks);
                          setRemarks('');
                          setSuccessMessage('Leave extension approved successfully.');
                          setSelectedExtension(null);
                          await fetchApprovals();
                        } catch (err: any) {
                          setActionError(err.message || 'Approval failed.');
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                      disabled={actionLoading}
                      className="flex-1 min-w-[120px] py-3 text-white rounded-xl text-xs font-bold transition-all active:scale-95 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/15 cursor-pointer"
                    >
                      {actionLoading ? 'Processing...' : 'Approve Extension'}
                    </button>

                    <button
                      onClick={async () => {
                        setActionLoading(true);
                        setActionError('');
                        setSuccessMessage('');
                        try {
                          await apiService.reviewExtension(selectedExtension.id, 'REJECT', remarks);
                          setRemarks('');
                          setSuccessMessage('Leave extension request rejected.');
                          setSelectedExtension(null);
                          await fetchApprovals();
                        } catch (err: any) {
                          setActionError(err.message || 'Rejection failed.');
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                      disabled={actionLoading}
                      className="flex-1 min-w-[120px] py-3 border border-rose-500 hover:bg-rose-500/5 text-rose-650 dark:text-rose-455 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      Reject Extension
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedLeave ? (() => {
              const isExtension = selectedLeave.reason?.includes('[EXTENSION_REQUEST:');
              let parsedExt: any = null;
              let displayReason = selectedLeave.reason;

              if (isExtension && selectedLeave.reason) {
                const match = selectedLeave.reason.match(/\[EXTENSION_REQUEST:([^|]+)\|([^\]]+)\]/);
                if (match) {
                  const tempReason = selectedLeave.reason.split('\n\nOriginal Reason: ')[0];
                  const extReason = tempReason.replace(/\[EXTENSION_REQUEST:[^\]]+\]\s*/, '');
                  const origReason = selectedLeave.reason.split('\n\nOriginal Reason: ').slice(1).join('\n\nOriginal Reason: ');
                  parsedExt = {
                    newEndDate: match[1],
                    originalEndDate: match[2],
                    extensionReason: extReason,
                    originalReason: origReason
                  };
                  displayReason = extReason;
                }
              }

              return (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-md p-6 md:p-8 space-y-6 animate-in slide-in-from-right-4 duration-200">
                  
                  {/* Header Profile Section */}
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/80 pb-6">
                    <div className="flex gap-4">
                      <div className="h-11 w-11 rounded-xl bg-brand-500/10 text-brand-655 dark:text-brand-405 flex items-center justify-center font-bold text-lg border border-brand-500/15 shrink-0">
                        {selectedLeave.student_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-850 dark:text-white leading-tight">
                          {selectedLeave.student_name}
                          {isExtension && <span className="text-xs font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/25 ml-2">Extension Review</span>}
                        </h3>
                        <p className="text-[10px] text-slate-405 mt-1 font-mono">{selectedLeave.register_number} • Year {selectedLeave.year} • Sec {selectedLeave.section}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border ${
                      selectedLeave.current_handler_role === userRole && selectedLeave.status !== 'APPROVED'
                        ? 'bg-amber-500/10 text-amber-550 border-amber-500/20 animate-pulse'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-450 border-slate-200 dark:border-slate-700'
                    }`}>
                      {selectedLeave.current_handler_role === userRole && selectedLeave.status !== 'APPROVED' 
                        ? 'Pending Review' 
                        : `${selectedLeave.status.replace('PENDING_', '')}`}
                    </span>
                  </div>

                  {/* Success Message Banner */}
                  {successMessage && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in-50">
                      <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-555" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {/* Warnings Banner if attendance is critical */}
                  {selectedLeave.attendance_percentage < 75.0 && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/25 text-rose-650 dark:text-rose-455 rounded-2xl text-xs flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-rose-600">CRITICAL ATTENDANCE ALERT</p>
                        <p className="mt-1 font-medium">Student's attendance is {selectedLeave.attendance_percentage}%. Confirm parent alignment before authorizing campus checkout.</p>
                      </div>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid sm:grid-cols-2 gap-6 text-xs bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-700/40 rounded-2xl p-5">
                    <div className="space-y-3 font-semibold text-slate-550">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">LEAVE TYPE & ID</span>
                        <span className="text-slate-808 dark:text-slate-200 font-bold">{selectedLeave.leave_type} Leave (ID: #{selectedLeave.id})</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">TRAVEL PERIOD</span>
                        <span className="text-slate-808 dark:text-slate-200 font-bold">
                          {selectedLeave.start_date} to {isExtension && parsedExt ? `${parsedExt.newEndDate} (Extension)` : selectedLeave.end_date}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">EXPECTED CAMPUS RETURN</span>
                        <span className="text-slate-808 dark:text-slate-200 font-bold">
                          {isExtension && parsedExt ? parsedExt.newEndDate : selectedLeave.end_date} at {selectedLeave.expected_return_time}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 font-semibold text-slate-550">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">HOSTEL BLOCK & ROOM</span>
                        <span className="text-slate-808 dark:text-slate-200 font-bold">{selectedLeave.hostel_block} • Room {selectedLeave.room_number}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">DESTINATION</span>
                        <span className="text-slate-808 dark:text-slate-200 font-bold truncate block max-w-xs">{selectedLeave.destination}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">PARENT PHONE</span>
                        <span className="text-slate-808 dark:text-slate-200 font-bold">{selectedLeave.parent_phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Leave Purpose Reason</h4>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                      {isExtension && parsedExt ? (
                        <div className="text-xs font-semibold text-slate-550 space-y-2">
                          <p className="text-slate-700 dark:text-slate-350 italic">Extension Reason: <span className="font-bold font-sans">"{parsedExt.extensionReason}"</span></p>
                          <p className="border-t border-slate-200/40 dark:border-slate-800 pt-2 text-[11px] text-slate-400 italic">Original Reason: "{parsedExt.originalReason}"</p>
                        </div>
                      ) : (
                        <p className="text-slate-755 dark:text-slate-300 text-xs italic leading-normal whitespace-pre-wrap font-medium">
                          "{displayReason}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Supporting Documents if available */}
                  {selectedLeave.documents && selectedLeave.documents.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Attached Documents ({selectedLeave.documents.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedLeave.documents.map((doc: string) => (
                          <div key={doc} className="flex items-center gap-2 py-2 px-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs">
                            <BookOpen className="h-4 w-4 text-indigo-500" />
                            <span className="text-slate-605 dark:text-slate-300 font-bold truncate max-w-[150px]">{doc.split('_')[1]}</span>
                            <button className="text-indigo-650 hover:text-indigo-700 cursor-pointer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Simulated Notification Dispatch Status (For CC and HOD) */}
                  {selectedLeave.status !== 'APPROVED' && selectedLeave.status !== 'REJECTED' && (
                    <div className="p-4 border border-indigo-200 dark:border-indigo-850 rounded-2xl bg-indigo-500/5 text-xs space-y-2 animate-in fade-in-50">
                      <div className="flex justify-between items-center pb-2 border-b border-indigo-100 dark:border-indigo-900">
                        <span className="font-extrabold text-indigo-700 dark:text-indigo-400 block uppercase tracking-wider text-[9px]">🤖 PROTOTYPE NOTIFICATION SIMULATOR</span>
                        <span className="text-[8px] bg-indigo-550/20 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.5 rounded-md uppercase">ACTIVE</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] font-semibold text-slate-500">
                        <div className="flex justify-between items-center bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400">CC WhatsApp Alert:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">DELIVERED</span>
                        </div>
                        <div className="flex justify-between items-center bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400">CC SMS Alert:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">DISPATCHED</span>
                        </div>
                        <div className="flex justify-between items-center bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 col-span-2">
                          <span className="text-slate-400">Parent Link Status:</span>
                          <span className="text-indigo-650 dark:text-indigo-400 font-bold">SENT (WAITING VERIFICATION)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chain Remarks if this is HOD / Dean review */}
                  {(selectedLeave.cc_remarks || selectedLeave.hod_remarks) && (
                    <div className="p-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl text-xs space-y-1.5">
                      <span className="font-extrabold text-brand-600 dark:text-brand-400 block uppercase tracking-wider text-[9px]">Approver Chain Remarks Log</span>
                      {selectedLeave.cc_remarks && (
                        <p className="text-slate-600 dark:text-slate-450 leading-relaxed font-semibold">
                          <span className="font-bold text-slate-800 dark:text-slate-200">Coordinator Remarks:</span> "{selectedLeave.cc_remarks}"
                        </p>
                      )}
                      {selectedLeave.hod_remarks && (
                        <p className="text-slate-600 dark:text-slate-450 leading-relaxed font-semibold">
                          <span className="font-bold text-slate-800 dark:text-slate-200">HOD Remarks:</span> "{selectedLeave.hod_remarks}"
                        </p>
                      )}
                    </div>
                  )}

                  {selectedLeave.current_handler_role === userRole && selectedLeave.status !== 'APPROVED' && (
                    userRole === 'CC' ? (
                      <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50/20 dark:bg-slate-900/10 space-y-4">
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Parent Authorization Verification</h4>
                          <p className="text-xs text-slate-405 mt-1 font-semibold">Parent: <span className="font-extrabold text-slate-850 dark:text-white">{selectedLeave.parent_name} ({selectedLeave.parent_phone})</span></p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              window.open(`tel:${selectedLeave.parent_phone}`);
                              setParentContacted(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-brand-500/15 cursor-pointer active:scale-95 hover:shadow-md"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            📞 Call Parent
                          </button>
                          <button
                            onClick={() => {
                              openWhatsApp();
                              setParentContacted(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-555" />
                            💬 WhatsApp
                          </button>
                        </div>

                        <label className="flex items-center gap-2.5 mt-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={parentContacted}
                            onChange={(e) => setParentContacted(e.target.checked)}
                            className="h-4.5 w-4.5 text-indigo-655 bg-slate-900 border-slate-300 dark:border-slate-750 focus:ring-0 rounded cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                            I verify that I have spoken with the student's parent/guardian before approval
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="p-5 border border-slate-200/60 dark:border-slate-700 rounded-3xl bg-slate-50/20 dark:bg-slate-900/10 space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Parent Contact Log</h4>
                            <p className="text-[10px] text-slate-400 mt-1">Parent: <span className="font-bold text-slate-850 dark:text-slate-200">{selectedLeave.parent_name} ({selectedLeave.parent_phone})</span></p>
                          </div>
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] bg-slate-105 dark:bg-slate-800 text-slate-450 border border-slate-200/50 dark:border-slate-700 font-bold">Optional</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setShowCallModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-brand-500/15 cursor-pointer active:scale-95"
                          >
                            <Phone className="h-4 w-4" />
                            Log Parent Call
                          </button>
                          <button
                            onClick={openWhatsApp}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 transition-all cursor-pointer active:scale-95"
                          >
                            <MessageSquare className="h-4 w-4 text-emerald-555" />
                            WhatsApp
                          </button>
                          <button
                            onClick={openEmail}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 transition-all cursor-pointer active:scale-95"
                          >
                            <Mail className="h-4 w-4 text-brand-555" />
                            Mail Parent
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  {/* Review Form - Active Review Actions */}
                  {selectedLeave.current_handler_role === userRole && selectedLeave.status !== 'APPROVED' ? (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Review Remarks / Remarks</label>
                        <textarea
                          rows={2}
                          placeholder="Add verification comments or review notes..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:border-brand-500 text-slate-800 dark:text-white"
                        />
                      </div>

                      {actionError && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-rose-505" />
                          <span>{actionError}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleActionSubmit('APPROVE')}
                          disabled={actionLoading || (userRole === 'CC' && !parentContacted)}
                          className={`flex-1 min-w-[120px] py-3 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                            (userRole === 'CC' && !parentContacted)
                              ? 'bg-slate-200 dark:bg-slate-750 text-slate-400 cursor-not-allowed opacity-50 shadow-none'
                              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/15'
                          }`}
                        >
                          {actionLoading ? 'Processing...' : 'Approve & Forward'}
                        </button>

                        {userRole === 'CC' && (
                          <button
                            onClick={() => handleActionSubmit('CLARIFICATION')}
                            disabled={actionLoading}
                            className="flex-1 min-w-[120px] py-3 border border-orange-500 hover:bg-orange-500/5 text-orange-600 dark:text-orange-400 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
                          >
                            Clarification Needed
                          </button>
                        )}

                        {userRole === 'HOD' && (
                          <button
                            onClick={() => handleActionSubmit('RETURN_TO_CC')}
                            disabled={actionLoading}
                            className="flex-1 min-w-[120px] py-3 border border-amber-500 hover:bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
                          >
                            Return to CC
                          </button>
                        )}

                        <button
                          onClick={() => handleActionSubmit('REJECT')}
                          disabled={actionLoading}
                          className="flex-1 min-w-[120px] py-3 border border-rose-500 hover:bg-rose-500/5 text-rose-650 dark:text-rose-400 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
                        >
                          Reject Application
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-700/80 flex items-center gap-2 text-xs font-bold text-slate-400">
                      <CheckSquare className="h-5 w-5 text-slate-305 shrink-0" />
                      <span>Review completed for this request dossier.</span>
                    </div>
                  )}
                </div>
              );
            })()
        : (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[400px]">
                <User className="h-12 w-12 text-slate-350 dark:text-slate-655 mb-3" />
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200">No Student Selected</h4>
                <p className="text-xs text-slate-400 mt-1.5 max-w-[250px] leading-relaxed">Choose a pending student application from the queue lists to execute the review actions.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Call Log Simulator Modal */}
      {showCallModal && selectedLeave && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Call Log Simulator</h3>
              <button onClick={() => setShowCallModal(false)} className="text-slate-405 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            
            <div className="bg-indigo-50/50 dark:bg-slate-900 p-4 border border-indigo-500/10 rounded-2xl text-xs space-y-2.5">
              <p className="text-slate-400">Calling Parent: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLeave.parent_name}</span></p>
              <p className="text-slate-400">Phone Number: <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{selectedLeave.parent_phone}</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Call Outcome Remarks</label>
              <textarea
                rows={3}
                placeholder="Describe conversation details (e.g. Spoke with mother. Approved. Confirm travel details)..."
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:border-brand-500 text-slate-800 dark:text-white font-medium"
                required
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700/80 pt-4">
              <button
                onClick={() => setShowCallModal(false)}
                className="erp-btn-secondary py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleParentCallSave}
                disabled={callLogSuccess}
                className="erp-btn-primary py-2"
              >
                {callLogSuccess ? 'Saving log...' : 'Save Call Log'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
