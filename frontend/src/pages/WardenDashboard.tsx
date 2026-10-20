import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, CheckCircle, XCircle, Home, MapPin, 
  User, RefreshCcw, Trash2, Calendar, FileText, CheckSquare
} from 'lucide-react';
import { apiService } from '../services/api';

export default function WardenDashboard() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  
  // Decision states
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Selected hostel block filter
  const [hostelFilter, setHostelFilter] = useState('Emerald Block-A');

  useEffect(() => {
    fetchWardenQueue();
  }, []);

  const fetchWardenQueue = async () => {
    try {
      setLoading(true);
      const data = await apiService.getFacultyLeaves();
      setLeaves(data);
      
      // Auto select the first request pending warden review
      const wardenPending = data.filter(l => l.current_handler_role === 'WARDEN' && l.status !== 'APPROVED');
      if (wardenPending.length > 0) {
        setSelectedLeave(wardenPending[0]);
      } else if (data.length > 0) {
        setSelectedLeave(data[0]);
      } else {
        setSelectedLeave(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading warden data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!selectedLeave) return;
    setActionLoading(true);
    setActionError('');

    try {
      await apiService.reviewLeave(selectedLeave.id, action, remarks);
      setRemarks('');
      await fetchWardenQueue();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit warden action.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && leaves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">Loading warden queue console...</p>
      </div>
    );
  }

  // Filter queues
  const pendingQueue = leaves.filter(l => l.current_handler_role === 'WARDEN' && l.status === 'PENDING_WARDEN');
  const checkedOutQueue = leaves.filter(l => l.qr_status === 'OUT_OF_CAMPUS');
  const pastQueue = leaves.filter(l => l.status === 'APPROVED' || l.status === 'REJECTED');



  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Overview stats header */}
      <div className="grid sm:grid-cols-3 gap-6 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Sign-offs</span>
          <p className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none mt-1">{pendingQueue.length} Students</p>
        </div>
        <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-750/80 pt-4 sm:pt-0 sm:pl-6">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students Checked Out</span>
          <p className="text-2xl font-extrabold text-amber-500 leading-none mt-1">{checkedOutQueue.length} Active</p>
        </div>
        <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-750/80 pt-4 sm:pt-0 sm:pl-6 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Checked In</span>
            <p className="text-2xl font-extrabold text-indigo-500 leading-none mt-1">{leaves.filter(l => l.qr_status === 'USED').length} Logged</p>
          </div>
          <button 
            onClick={fetchWardenQueue}
            className="erp-btn-secondary p-2.5"
          >
            <RefreshCcw className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Warden Queues list - Left Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Warden Release Queue ({pendingQueue.length})</h3>
            <div className="space-y-3">
              {pendingQueue.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLeave(l)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] ${
                    selectedLeave?.id === l.id
                      ? 'border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/10'
                      : 'border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-xs text-slate-850 dark:text-white truncate max-w-[200px]">{l.student_name}</span>
                    <span className="text-[9px] text-slate-400 font-mono">#{l.id}</span>
                  </div>
                  <p className="text-[11px] text-slate-450 dark:text-slate-450 mt-1">Room {l.room_number} • {l.hostel_block}</p>
                  <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold mt-3">
                    <span>Out: {l.start_date}</span>
                    <span>Duration: {Math.ceil((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} Days</span>
                  </div>
                </button>
              ))}
              {pendingQueue.length === 0 && (
                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-700/40 rounded-2xl text-center text-xs text-slate-400">
                  No leaves awaiting Warden approval.
                </div>
              )}
            </div>
          </div>

          {/* Active Checkout list */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Currently Checked Out ({checkedOutQueue.length})</h3>
            <div className="space-y-2.5">
              {checkedOutQueue.map((l) => (
                <div key={l.id} className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white block">{l.student_name}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Room {l.room_number} • Expected Return: {l.end_date}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                    Checked Out
                  </span>
                </div>
              ))}
              {checkedOutQueue.length === 0 && (
                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-700/40 rounded-2xl text-center text-xs text-slate-400">
                  No students currently off-campus.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Application Review - Right Panel */}
        <div className="lg:col-span-7 space-y-6">
          {selectedLeave ? (() => {
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
                  
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700 pb-5">
                    <div className="flex gap-4">
                      <div className="h-11 w-11 bg-brand-500/10 text-brand-650 dark:text-brand-405 rounded-xl font-bold flex items-center justify-center border border-brand-500/15 shrink-0">
                        {selectedLeave.student_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                          {selectedLeave.student_name}
                          {isExtension && <span className="text-xs font-bold text-indigo-600 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/25 ml-2">Extension Review</span>}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">{selectedLeave.register_number} • {selectedLeave.hostel_block} • Room {selectedLeave.room_number}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[9px] font-extrabold rounded-full bg-slate-100 text-slate-655 dark:bg-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 uppercase tracking-wide">
                      Warden Stage
                    </span>
                  </div>

                  {/* Travel & Destination Details */}
                  <div className="grid sm:grid-cols-2 gap-4.5 text-xs bg-slate-50 dark:bg-slate-900/40 p-4.5 rounded-2xl border border-slate-200/40 dark:border-slate-700/40 font-semibold text-slate-550">
                    <div>
                      <span className="text-[9px] text-slate-400 block mb-1">TRAVEL PERIOD</span>
                      <span className="text-slate-800 dark:text-white font-bold">
                        {selectedLeave.start_date} to {isExtension && parsedExt ? `${parsedExt.newEndDate} (Extension)` : selectedLeave.end_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block mb-1">DESTINATION</span>
                      <span className="text-slate-800 dark:text-white font-bold">{selectedLeave.destination}</span>
                    </div>
                  </div>

                  {/* Reason / Purpose */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/40 dark:border-slate-700/40 text-xs font-semibold text-slate-550">
                    <span className="text-[9px] text-slate-400 block mb-1">LEAVE PURPOSE</span>
                    {isExtension && parsedExt ? (
                      <div className="space-y-1.5 mt-1.5">
                        <p className="text-slate-755 dark:text-slate-205 italic">Extension Reason: "{parsedExt.extensionReason}"</p>
                        <p className="border-t border-slate-200/35 dark:border-slate-800 pt-1.5 mt-1.5 text-[10px] text-slate-400 font-medium italic">Original Reason: "{parsedExt.originalReason}"</p>
                      </div>
                    ) : (
                      <p className="text-slate-755 dark:text-slate-200 italic mt-1 leading-normal">"{displayReason}"</p>
                    )}
                  </div>

                  {/* Remarks History */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 space-y-2 text-xs font-semibold text-slate-550">
                    <span className="font-extrabold text-slate-400 block uppercase tracking-wider text-[9px]">Academic & Coordinator Signatures</span>
                    <p className="text-slate-600 dark:text-slate-450 leading-relaxed"><span className="font-bold text-slate-800 dark:text-slate-200">Coordinator remarks:</span> "{selectedLeave.cc_remarks || 'Approved without comments'}"</p>
                    <p className="text-slate-600 dark:text-slate-450 leading-relaxed"><span className="font-bold text-slate-800 dark:text-slate-200">HOD remarks:</span> "{selectedLeave.hod_remarks || 'Approved'}"</p>
                    {selectedLeave.dean_remarks && <p className="text-slate-600 dark:text-slate-450 leading-relaxed"><span className="font-bold text-slate-800 dark:text-slate-200">Dean remarks:</span> "{selectedLeave.dean_remarks}"</p>}
                  </div>



              {/* Review inputs */}
              {selectedLeave.current_handler_role === 'WARDEN' && selectedLeave.status === 'PENDING_WARDEN' ? (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Warden Gate Release Remarks</label>
                    <input
                      type="text"
                      placeholder="Add checkout remarks (e.g. Exit approved. Call verified)..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="erp-input"
                    />
                  </div>

                  {actionError && (
                    <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-bold">
                      {actionError}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={() => handleAction('APPROVE')}
                      disabled={actionLoading}
                      className="flex-1 py-3.5 bg-gradient-to-r from-brand-600 to-indigo-650 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/15 active:scale-95 transition-all duration-150 cursor-pointer"
                    >
                      {actionLoading ? 'Activating Pass...' : 'Approve & Release QR Pass'}
                    </button>
                    <button
                      onClick={() => handleAction('REJECT')}
                      disabled={actionLoading}
                      className="px-6 py-3.5 border border-rose-550 hover:bg-rose-500/5 text-rose-600 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/80 flex items-center gap-2 text-xs font-bold text-slate-450">
                  <CheckSquare className="h-5 w-5 text-slate-350 shrink-0" />
                  <span>Dossier signed off by warden. QR Pass generation triggered.</span>
                </div>
              )}
            </div>
          );
        })()
      : (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[400px]">
              <Home className="h-12 w-12 text-slate-350 dark:text-slate-655 mb-3" />
              <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200">No Student Selected</h4>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">Choose a hostel release check-out application from the sidebar queue list to review.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
