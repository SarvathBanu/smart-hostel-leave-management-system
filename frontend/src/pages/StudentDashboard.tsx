import React, { useState, useEffect } from 'react';
import { 
  User, BookOpen, MapPin, Calendar, Clock, Phone, AlertTriangle, 
  FileText, ShieldCheck, Download, Trash, CheckCircle2, ArrowRight, 
  ChevronRight, Upload, Info, MessageSquare, AlertCircle, Settings, KeyRound, Shield
} from 'lucide-react';
import { apiService } from '../services/api';

interface StudentDashboardProps {
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  user?: any;
  onUserUpdate?: (user: any) => void;
}

export default function StudentDashboard({
  currentTab = 'dashboard',
  setCurrentTab,
  user,
  onUserUpdate
}: StudentDashboardProps) {
  const [profile, setProfile] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [activePass, setActivePass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingPass, setSendingPass] = useState(false);

  const handleSendPassToGuard = async () => {
    if (!activePass) return;
    setSendingPass(true);
    try {
      await apiService.sendPassToGuard(activePass.pass_id);
      await fetchStudentData();
    } catch (err: any) {
      alert(err.message || 'Failed to send gate pass to guard.');
    } finally {
      setSendingPass(false);
    }
  };
  
  // Tabs & Forms state
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [formError, setFormError] = useState('');
  const [formWarnings, setFormWarnings] = useState<string[]>([]);

  // Extension states
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extensionData, setExtensionData] = useState({
    newEndDate: '',
    newExpectedReturnTime: '',
    extensionReason: ''
  });
  const [extensionError, setExtensionError] = useState('');
  const [extensionPredicting, setExtensionPredicting] = useState(false);
  const [extensionPrediction, setExtensionPrediction] = useState<any>(null);

  // Attendance Validation States
  const [prediction, setPrediction] = useState<any>(null);
  const [predicting, setPredicting] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationDialogData, setValidationDialogData] = useState<any>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogData, setSuccessDialogData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    leaveType: '',
    reason: '',
    destination: '',
    address: '',
    emergencyContact: '',
    travelMode: 'Bus',
    startDate: '',
    goingTime: '',
    endDate: '',
    expectedReturnTime: '',
    documents: [] as string[]
  });

  // Simulated uploader
  const [uploadingFile, setUploadingFile] = useState(false);

  // Live prediction effect for extension
  useEffect(() => {
    const fetchExtensionPrediction = async () => {
      if (!showExtensionForm || !extensionData.newEndDate || !extensionData.newExpectedReturnTime || !activePass) {
        setExtensionPrediction(null);
        return;
      }
      const currentExpectedStr = `${activePass.end_date}T${activePass.expected_return_time}:00`;
      const newExpectedStr = `${extensionData.newEndDate}T${extensionData.newExpectedReturnTime}:00`;
      if (new Date(newExpectedStr) <= new Date(currentExpectedStr)) {
        setExtensionPrediction(null);
        return;
      }
      setExtensionPredicting(true);
      try {
        const pred = await apiService.predictAttendance(
          activePass.start_date, 
          activePass.going_time || '09:00',
          extensionData.newEndDate, 
          extensionData.newExpectedReturnTime
        );
        setExtensionPrediction(pred);
        setExtensionError('');
      } catch (err: any) {
        console.error('Error fetching extension attendance prediction:', err);
      } finally {
        setExtensionPredicting(false);
      }
    };

    fetchExtensionPrediction();
  }, [extensionData.newEndDate, extensionData.newExpectedReturnTime, showExtensionForm, activePass]);

  const handleExtensionSubmit = async () => {
    setExtensionError('');
    if (!extensionData.newEndDate) {
      setExtensionError('Please select a new expected return date.');
      return;
    }
    if (!extensionData.newExpectedReturnTime) {
      setExtensionError('Please select a new expected return time.');
      return;
    }
    if (!extensionData.extensionReason.trim()) {
      setExtensionError('Please enter a reason for extension.');
      return;
    }
    const currentExpectedStr = `${activePass.end_date}T${activePass.expected_return_time}:00`;
    const newExpectedStr = `${extensionData.newEndDate}T${extensionData.newExpectedReturnTime}:00`;
    if (new Date(newExpectedStr) <= new Date(currentExpectedStr)) {
      setExtensionError('New return date and time must be after your current return date and time.');
      return;
    }

    setLoading(true);
    try {
      await apiService.applyExtension(extensionData.newEndDate, extensionData.newExpectedReturnTime, extensionData.extensionReason);
      setShowExtensionForm(false);
      setExtensionData({ newEndDate: '', newExpectedReturnTime: '', extensionReason: '' });
      setExtensionPrediction(null);
      
      // Refresh student data
      await fetchStudentData();
      
      alert('Extension request submitted successfully and sent for approval.');
    } catch (err: any) {
      setExtensionError(err.message || 'Failed to submit extension request.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const profileData = await apiService.getProfile();
      setProfile(profileData);
      
      const leavesData = await apiService.getStudentLeaves();
      setLeaves(leavesData);

      try {
        const passData = await apiService.getActivePass();
        setActivePass(passData);
      } catch (e) {
        setActivePass(null); // No active pass is a normal case
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load student dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Simulated drag-and-drop document uploader
  const handleUploadSimulate = () => {
    setUploadingFile(true);
    setTimeout(() => {
      const mockFiles = ['medical_certificate_v2.pdf', 'wedding_invitation_scan.jpg', 'permission_letter.pdf'];
      const randomFile = mockFiles[Math.floor(Math.random() * mockFiles.length)];
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, `${Date.now()}_${randomFile}`]
      }));
      setUploadingFile(false);
    }, 1200);
  };

  const handleRemoveDoc = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  // Prefill parent contact number when profile is loaded
  useEffect(() => {
    const parentPhone = profile?.studentDetails?.parent_phone;
    if (parentPhone && !formData.emergencyContact) {
      setFormData(prev => ({
        ...prev,
        emergencyContact: parentPhone
      }));
    }
  }, [profile?.studentDetails?.parent_phone]);

  // Live prediction effect
  useEffect(() => {
    const fetchPrediction = async () => {
      if (!formData.startDate || !formData.goingTime || !formData.endDate || !formData.expectedReturnTime) {
        setPrediction(null);
        return;
      }
      if (formData.endDate < formData.startDate) {
        setPrediction(null);
        return;
      }
      setPredicting(true);
      try {
        const pred = await apiService.predictAttendance(
          formData.startDate,
          formData.goingTime,
          formData.endDate,
          formData.expectedReturnTime
        );
        setPrediction(pred);
        setFormError('');
      } catch (err: any) {
        console.error('Error fetching attendance prediction:', err);
      } finally {
        setPredicting(false);
      }
    };

    fetchPrediction();
  }, [formData.startDate, formData.goingTime, formData.endDate, formData.expectedReturnTime]);

  const calculatedDays = (formData.startDate && formData.goingTime && formData.endDate && formData.expectedReturnTime)
    ? getDaysCount(formData.startDate, formData.endDate, formData.goingTime, formData.expectedReturnTime)
    : 0;

  // Submit leave form
  const handleFormSubmitSimplified = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.startDate) {
      setFormError('Please select a Going Date.');
      return;
    }
    if (!formData.goingTime) {
      setFormError('Please select a Going Time.');
      return;
    }
    if (!formData.endDate) {
      setFormError('Please select a Return Date.');
      return;
    }
    if (!formData.expectedReturnTime) {
      setFormError('Please select an Expected Return Time.');
      return;
    }
    if (!formData.emergencyContact.trim()) {
      setFormError('Please enter Parent/Guardian contact number.');
      return;
    }
    if (!formData.reason.trim()) {
      setFormError('Please enter a Reason for Leave.');
      return;
    }

    // Date validations
    const today = new Date().toISOString().split('T')[0];
    if (formData.startDate < today) {
      setFormError('Going date cannot be in the past.');
      return;
    }
    if (formData.endDate < formData.startDate) {
      setFormError('Return date cannot be before Going date.');
      return;
    }

    // Semester limit validation (15 days max)
    const leavesUsed = profile?.studentDetails?.leaves_used ?? 0;
    if (leavesUsed + calculatedDays > 15) {
      setFormError('You have exceeded the maximum leave limit of 15 days for this semester.');
      return;
    }

    setLoading(true);

    try {
      const fullSubmitData = {
        leaveType: formData.leaveType || 'Personal',
        reason: formData.reason,
        destination: formData.destination || 'Home',
        address: formData.address || 'Parent Address',
        emergencyContact: formData.emergencyContact,
        travelMode: formData.travelMode || 'Bus',
        startDate: formData.startDate,
        goingTime: formData.goingTime,
        endDate: formData.endDate,
        expectedReturnTime: formData.expectedReturnTime,
        documents: formData.documents || []
      };

      const res = await apiService.applyLeave(fullSubmitData);
      
      // Reset form
      setFormData({
        leaveType: '',
        reason: '',
        destination: '',
        address: '',
        emergencyContact: profile?.studentDetails?.parent_phone || '',
        travelMode: 'Bus',
        startDate: '',
        goingTime: '',
        endDate: '',
        expectedReturnTime: '',
        documents: []
      });
      setShowApplyForm(false);
      if (setCurrentTab) setCurrentTab('dashboard');
      
      // Show success modal
      setSuccessDialogData({
        predictedAttendance: res.predictedAttendance ?? 100.0,
        remainingSafeLeaveDays: res.remainingSafeLeaveDays ?? 11
      });
      setShowSuccessDialog(true);

      // Refresh list
      await fetchStudentData();
    } catch (err: any) {
      if (err.message === 'Attendance Requirement Not Met' || err.predictedAttendance !== undefined) {
        // Validation failure
        setValidationDialogData({
          predictedAttendance: err.predictedAttendance ?? 72.45,
          minRequired: err.minRequired ?? 75.0
        });
        setShowValidationDialog(true);
      } else {
        setFormError(err.message || 'Error submitting leave application.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Dynamic status timelines
  const getTimelineSteps = (status: string, handler: string) => {
    const steps = [
      { label: 'Applied', completed: true, active: false, desc: 'Student submitted request' },
      { label: 'CC Review', completed: ['PENDING_HOD', 'PENDING_DEAN', 'PENDING_WARDEN', 'APPROVED', 'CHECKED_OUT', 'COMPLETED'].includes(status), active: status === 'PENDING_CC', desc: 'Coordinator verification' },
      { label: 'HOD Sign', completed: ['PENDING_DEAN', 'PENDING_WARDEN', 'APPROVED', 'CHECKED_OUT', 'COMPLETED'].includes(status), active: status === 'PENDING_HOD', desc: 'Department check' },
      { label: 'Dean Sign', completed: ['PENDING_WARDEN', 'APPROVED', 'CHECKED_OUT', 'COMPLETED'].includes(status), active: status === 'PENDING_DEAN', desc: 'Principal signoff' },
      { label: 'Warden Log', completed: ['APPROVED', 'CHECKED_OUT', 'COMPLETED'].includes(status), active: status === 'PENDING_WARDEN', desc: 'Hostel gate release' }
    ];

    if (status === 'REJECTED') {
      return [
        { label: 'Applied', completed: true, active: false, desc: 'Student submitted request' },
        { label: 'Rejected', completed: false, active: true, desc: `Declined during review` }
      ];
    }

    if (status === 'CLARIFICATION') {
      return [
        { label: 'Applied', completed: true, active: false, desc: 'Student submitted request' },
        { label: 'Clarification', completed: false, active: true, desc: 'Student response needed' }
      ];
    }

    return steps;
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">Loading student profile...</p>
      </div>
    );
  }

  const studentAttr = profile?.studentDetails || {};

  if (currentTab === 'settings') {
    return (
      <SettingsView
        profile={profile}
        onUserUpdate={onUserUpdate}
        fetchStudentData={fetchStudentData}
      />
    );
  }

  const leavesListJSX = leaves.length === 0 ? (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 p-12 text-center text-slate-400">
      <FileText className="h-10 w-10 text-slate-350 dark:text-slate-650 mx-auto mb-2" />
      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No leave history records</p>
      <p className="text-xs mt-1 text-slate-400">Apply for a leave by tapping the welcome banner button.</p>
    </div>
  ) : (
    <div className="space-y-4">
      {leaves.map((leave) => {
        const isExtension = leave.reason?.includes('[EXTENSION_REQUEST:');
        let parsedExt: any = null;
        let displayReason = leave.reason;

        if (isExtension && leave.reason) {
          const match = leave.reason.match(/\[EXTENSION_REQUEST:([^|]+)\|([^\]]+)\]/);
          if (match) {
            const tempReason = leave.reason.split('\n\nOriginal Reason: ')[0];
            const extReason = tempReason.replace(/\[EXTENSION_REQUEST:[^\]]+\]\s*/, '');
            const origReason = leave.reason.split('\n\nOriginal Reason: ').slice(1).join('\n\nOriginal Reason: ');
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
          <div key={leave.id} className="erp-card p-5 space-y-5">
            {/* Header */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm text-slate-850 dark:text-white">
                    {leave.leave_type} Leave {isExtension && <span className="text-xs font-bold text-indigo-600 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/25 ml-1">Extension Request</span>}
                  </span>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                    leave.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-405 border-emerald-500/20' :
                    leave.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/20' :
                    leave.status === 'CLARIFICATION' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-405 border-amber-500/20' :
                    'bg-brand-500/10 text-brand-600 dark:text-brand-405 border-brand-500/20'
                  }`}>
                    {leave.status.replace('PENDING_', '').replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  {leave.start_date} to {isExtension && parsedExt ? `${parsedExt.newEndDate} (Proposed Extension, originally ${parsedExt.originalEndDate})` : leave.end_date} ({getDaysCount(leave.start_date, isExtension && parsedExt ? parsedExt.newEndDate : leave.end_date)} days)
                </p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">ID: #{leave.id}</span>
            </div>

            {/* Destination & Reason */}
            <div className="text-xs space-y-1.5 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-150/40 dark:border-slate-800/40 font-semibold text-slate-550">
              <p className="text-slate-400 font-medium">Destination: <span className="text-slate-800 dark:text-slate-350 font-bold">{leave.destination}</span></p>
              {isExtension && parsedExt ? (
                <>
                  <p className="text-slate-400 font-medium">Extension Reason: <span className="text-slate-800 dark:text-slate-350 font-bold">"{parsedExt.extensionReason}"</span></p>
                  <p className="text-slate-455 border-t border-slate-200/45 dark:border-slate-800 pt-1.5 mt-1.5 font-medium">Original Reason: <span className="italic">"{parsedExt.originalReason}"</span></p>
                </>
              ) : (
                <p className="text-slate-400 font-medium">Remarks / Reason: <span className="text-slate-800 dark:text-slate-350 font-bold leading-relaxed">"{displayReason}"</span></p>
              )}
            </div>

            {/* Timeline Tracker */}
            <div className="pt-2">
              <div className="flex items-center justify-between gap-1">
                {getTimelineSteps(leave.status, leave.current_handler_role).map((s, idx, arr) => (
                  <React.Fragment key={s.label}>
                    <div className="flex flex-col items-center flex-1 text-center relative">
                      <div className={`h-6.5 w-6.5 rounded-full flex items-center justify-center border font-bold text-[9px] transition-all duration-300 ${
                        s.completed 
                          ? 'bg-emerald-550 text-white border-emerald-550 shadow-sm shadow-emerald-500/10' 
                          : s.active 
                          ? 'bg-brand-600 text-white border-brand-600 animate-pulse'
                          : 'bg-slate-50 text-slate-300 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600'
                      }`}>
                        {s.completed ? '✓' : idx + 1}
                      </div>
                      <span className="text-[9px] font-extrabold text-slate-700 dark:text-slate-350 mt-1.5 truncate w-full max-w-[70px]">{s.label}</span>
                      <span className="text-[8px] text-slate-400 hidden sm:block truncate w-full max-w-[75px] mt-0.5">{s.desc}</span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={`h-0.5 flex-1 -mt-6 transition-all duration-300 ${
                        s.completed 
                          ? 'bg-emerald-555' 
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Clarification Box if pending */}
            {leave.status === 'CLARIFICATION' && (
              <ClarificationBox leaveId={leave.id} onSubmitting={fetchStudentData} />
            )}

            {/* Approver Remarks History if exist */}
            {(leave.cc_remarks || leave.hod_remarks || leave.dean_remarks || leave.warden_remarks) && (
              <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-700/40 rounded-2xl p-3.5 space-y-1.5 text-[11px]">
                <span className="font-extrabold text-slate-400 block uppercase tracking-wider text-[9px]">Review Comments</span>
                {leave.cc_remarks && <p className="text-slate-600 dark:text-slate-450"><span className="font-bold text-slate-800 dark:text-slate-300">Coordinator:</span> {leave.cc_remarks}</p>}
                {leave.hod_remarks && <p className="text-slate-600 dark:text-slate-450"><span className="font-bold text-slate-800 dark:text-slate-300">HOD:</span> {leave.hod_remarks}</p>}
                {leave.dean_remarks && <p className="text-slate-600 dark:text-slate-450"><span className="font-bold text-slate-800 dark:text-slate-300">Dean / Principal:</span> {leave.dean_remarks}</p>}
                {leave.warden_remarks && <p className="text-slate-600 dark:text-slate-450"><span className="font-bold text-slate-800 dark:text-slate-300">Warden:</span> {leave.warden_remarks}</p>}
              </div>
            )}

            {/* Extension Requests Log */}
            {leave.extensions && leave.extensions.length > 0 && (
              <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-700/40 rounded-2xl p-3.5 space-y-2.5 text-[11px] mt-2">
                <span className="font-extrabold text-slate-400 block uppercase tracking-wider text-[9px]">Extension Requests Log</span>
                {leave.extensions.map((ext: any, extIdx: number) => (
                  <div key={ext.id} className={`pb-2.5 ${extIdx < leave.extensions.length - 1 ? 'border-b border-slate-250 dark:border-slate-750/50 mb-2' : ''}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-800 dark:text-slate-250">
                        Extension to {ext.new_end_date} @ {ext.new_expected_return_time}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wide ${
                        ext.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-405 border-emerald-500/20' :
                        ext.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/20' :
                        'bg-amber-500/10 text-amber-600 dark:text-amber-405 border-amber-500/20 animate-pulse'
                      }`}>
                        {ext.status}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-405 leading-normal"><span className="font-semibold text-slate-400">Extension Reason:</span> "{ext.reason}"</p>
                    {ext.cc_remarks && (
                      <p className="text-slate-700 dark:text-slate-350 mt-1 pl-2 border-l-2 border-brand-500/40">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">CC Remarks:</span> "{ext.cc_remarks}"
                      </p>
                    )}
                    <span className="text-[9px] text-slate-400 block mt-1.5 font-mono">Requested: {new Date(ext.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const leavesUsed = profile?.studentDetails?.leaves_used ?? 0;
  const workingDays = profile?.attendanceSummary?.working_days_conducted ?? 45;
  const initialAttendance = profile?.studentDetails?.initial_attendance_percentage ?? 85.0;
  const currentRequestDays = calculatedDays;
  const currentDaysAttended = (initialAttendance / 100) * workingDays - leavesUsed;
  const currentAttendanceCalculated = workingDays > 0 ? parseFloat(((currentDaysAttended / workingDays) * 100).toFixed(2)) : 100.00;
  const daysAttendedAfterLeave = Math.max(0, currentDaysAttended - currentRequestDays);
  const attendanceAfterApproval = parseFloat(((daysAttendedAfterLeave / workingDays) * 100).toFixed(2));
  const remainingSemesterLeave = 15 - leavesUsed - currentRequestDays;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-indigo-650 to-indigo-600 p-8 shadow-md border border-brand-500/10 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_55%)]" />
        <div className="absolute top-1/2 -right-1/4 h-64 w-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4.5">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-extrabold text-2xl border border-white/20">
              {profile?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Welcome back, {profile?.name}!</h2>
              <p className="text-brand-100 text-xs mt-1.5 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-200" />
                Hostel: {studentAttr.hostel_block || 'Unassigned'} • Room {studentAttr.room_number || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            {activePass && activePass.status === 'OUT_OF_CAMPUS' ? (
              <button
                onClick={() => {
                  setShowExtensionForm(true);
                  setExtensionData({
                    newEndDate: '',
                    newExpectedReturnTime: '',
                    extensionReason: ''
                  });
                }}
                className="px-5 py-3 rounded-xl bg-white text-indigo-600 font-bold hover:bg-slate-100 transition-all duration-150 shadow-md shadow-black/10 active:scale-[0.97] cursor-pointer text-xs uppercase tracking-wider"
              >
                Request Extension
              </button>
            ) : !activePass ? (
              <button
                onClick={() => {
                  if (setCurrentTab) {
                    setCurrentTab('apply');
                  } else {
                    setShowApplyForm(true);
                  }
                  setFormStep(1);
                }}
                className="px-5 py-3 rounded-xl bg-white text-brand-655 font-bold hover:bg-slate-100 transition-all duration-150 shadow-md shadow-black/10 active:scale-[0.97] cursor-pointer text-xs uppercase tracking-wider"
              >
                Apply New Leave
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leave Balance</span>
          <div className="flex items-baseline gap-1.5 mt-4">
            <span className="text-3xl font-extrabold text-slate-850 dark:text-white">{studentAttr.leave_balance ?? 15}</span>
            <span className="text-xs font-semibold text-slate-400">days left</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leaves Approved</span>
          <div className="flex items-baseline gap-1.5 mt-4">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-450">{studentAttr.leaves_used ?? 0}</span>
            <span className="text-xs font-semibold text-slate-400">used</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Attendance</span>
          <div className="flex items-baseline gap-1 mt-4">
            <span className={`text-3xl font-extrabold ${studentAttr.attendance_percentage < 75.0 ? 'text-rose-500 animate-pulse' : 'text-indigo-600 dark:text-indigo-400'}`}>
              {studentAttr.attendance_percentage ?? 85.0}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Location</span>
          <div className="flex items-baseline mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-605 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Inside Campus
            </span>
          </div>
        </div>
      </div>

      {/* Main Student Section: Apply Form vs Details Grid */}
      {(currentTab === 'apply' || showApplyForm) ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-md p-6 md:p-8 animate-in zoom-in-95 duration-150 max-w-xl mx-auto">
          <div className="flex justify-between items-center pb-5 border-b border-slate-100 dark:border-slate-700/80 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Apply for Leave</h3>
              <p className="text-xs text-slate-400 mt-1">Please provide travel details and parent's contact number.</p>
            </div>
            <button 
              onClick={() => {
                setShowApplyForm(false);
                if (setCurrentTab) setCurrentTab('dashboard');
              }}
              className="text-xs font-bold text-slate-450 hover:text-slate-650 dark:hover:text-slate-250 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-600 dark:text-rose-400 text-sm flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Going Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="erp-input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Going Time</label>
                <input
                  type="time"
                  name="goingTime"
                  value={formData.goingTime}
                  onChange={handleInputChange}
                  className="erp-input font-semibold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Expected Return Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="erp-input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Expected Return Time</label>
                <input
                  type="time"
                  name="expectedReturnTime"
                  value={formData.expectedReturnTime}
                  onChange={handleInputChange}
                  className="erp-input font-semibold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Parent/Guardian Contact Number</label>
              <input
                type="text"
                name="emergencyContact"
                placeholder="Parent's mobile number"
                value={formData.emergencyContact}
                onChange={handleInputChange}
                className="erp-input font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Reason for Leave</label>
              <textarea
                name="reason"
                rows={3}
                placeholder="Explain the reason for your leave..."
                value={formData.reason}
                onChange={handleInputChange}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:border-brand-500 text-slate-800 dark:text-white font-medium"
              />
            </div>

            {/* Live Preview / Calculations Panel */}
            {formData.startDate && formData.goingTime && formData.endDate && formData.expectedReturnTime ? (
              <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200/40 dark:border-slate-700/50 text-xs font-semibold text-slate-550 animate-in fade-in duration-200">
                
                {/* Semester Leave Summary Section */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Semester Leave Summary</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block">Total Allowed</span>
                      <span className="text-slate-800 dark:text-slate-300 font-bold text-xs mt-0.5 block">15 Days</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block">Already Used</span>
                      <span className="text-slate-800 dark:text-slate-300 font-bold text-xs mt-0.5 block">{leavesUsed} {leavesUsed === 1 ? 'Day' : 'Days'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block">Current Request</span>
                      <span className="text-brand-600 dark:text-brand-400 font-extrabold text-xs mt-0.5 block">{currentRequestDays} {currentRequestDays === 1 ? 'Day' : 'Days'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block">Remaining Leave</span>
                      <span className={`font-extrabold text-xs mt-0.5 block ${remainingSemesterLeave < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {remainingSemesterLeave} {remainingSemesterLeave === 1 ? 'Day' : 'Days'}
                      </span>
                    </div>
                  </div>
                  {remainingSemesterLeave < 0 && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 rounded-xl leading-relaxed text-[10px] flex gap-2">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 text-current mt-0.5" />
                      <span>You have exceeded the maximum leave limit of 15 days for this semester.</span>
                    </div>
                  )}
                </div>

                {/* Attendance Calculation Section */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Attendance Impact</h4>
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block">Current Attendance</span>
                      <span className="text-slate-800 dark:text-slate-300 font-bold text-xs mt-0.5 block">{currentAttendanceCalculated.toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block">Leave Requested</span>
                      <span className="text-slate-800 dark:text-slate-300 font-bold text-xs mt-0.5 block">{currentRequestDays} {currentRequestDays === 1 ? 'Day' : 'Days'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block">After Approval</span>
                      <span className={`font-extrabold text-xs mt-0.5 block ${
                        attendanceAfterApproval < 75.0 ? 'text-rose-500 animate-pulse' :
                        attendanceAfterApproval < 80.0 ? 'text-amber-500' :
                        'text-emerald-500'
                      }`}>
                        {attendanceAfterApproval.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  {attendanceAfterApproval < 75.0 && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-450 rounded-xl leading-relaxed text-[10px] flex gap-2">
                      <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-current mt-0.5 animate-bounce" />
                      <span>⚠ Warning: Approving this leave will reduce your attendance below the required 75%.</span>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center py-2 italic">
                Please specify Going/Return Dates and Times to view dynamic live preview.
              </p>
            )}

            {/* Declaration */}
            <label className="flex items-start gap-3 p-4 bg-brand-50/20 dark:bg-brand-500/5 rounded-2xl border border-brand-500/10 cursor-pointer">
              <input type="checkbox" className="mt-0.5 h-4.5 w-4.5 rounded text-brand-600 bg-slate-900 accent-brand-500" required />
              <span className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                I hereby declare that the details provided in this leave request are correct. I will return to the college campus on or before the declared expected return date and time, and adhere to all college and hostel conduct rules.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700/80 mt-8">
            <button
              onClick={() => {
                setShowApplyForm(false);
                if (setCurrentTab) setCurrentTab('dashboard');
              }}
              className="erp-btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleFormSubmitSimplified}
              className="erp-btn-primary"
            >
              Submit Application
            </button>
          </div>
        </div>
      ) : currentTab === 'history' ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 p-6 md:p-8 space-y-6 max-w-4xl mx-auto shadow-sm">
          <h3 className="text-xs font-bold text-slate-405 dark:text-slate-350 uppercase tracking-wider">Leave Applications Log</h3>
          {leavesListJSX}
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Active QR Wallet - Left Panel */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Attendance Summary Card */}
            {(() => {
              const attSummary = profile?.attendanceSummary || {
                current_attendance: profile?.studentDetails?.attendance_percentage ?? 100.0,
                approved_leave_days: profile?.studentDetails?.leaves_used ?? 0,
                remaining_safe_leave_days: 11,
                working_days_conducted: 45,
                conducted_periods: 405,
                attendance_status: 'Safe'
              };

              const radius = 32;
              const strokeWidth = 6;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (attSummary.current_attendance / 100) * circumference;
              
              const isSafe = attSummary.current_attendance >= 80.0;
              const isWarning = attSummary.current_attendance >= 75.0 && attSummary.current_attendance < 80.0;
              const isCritical = attSummary.current_attendance < 75.0;

              let strokeColor = 'text-emerald-500';
              let bgColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
              let statusText = 'Safe';
              let statusMsg = '';

              if (isWarning) {
                strokeColor = 'text-amber-500';
                bgColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
                statusText = 'Warning';
                statusMsg = 'Your attendance is close to the minimum requirement. Applying more leave may reduce your attendance below 75%.';
              } else if (isCritical) {
                strokeColor = 'text-rose-500';
                bgColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/20';
                statusText = 'Critical';
                statusMsg = 'You are below the minimum attendance requirement. Additional leave cannot be applied.';
              }

              return (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-5 space-y-4 relative overflow-hidden">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Summary</h4>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-2 border ${bgColor}`}>
                        <span className={`h-1 w-1 rounded-full ${isSafe ? 'bg-emerald-500' : isWarning ? 'bg-amber-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
                        {statusText}
                      </span>
                    </div>
                    
                    {/* Circular indicator */}
                    <div className="relative h-16 w-16 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r={radius}
                          className="text-slate-100 dark:text-slate-700"
                          strokeWidth={strokeWidth}
                          stroke="currentColor"
                          fill="transparent"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r={radius}
                          className={`transition-all duration-500 ${strokeColor}`}
                          strokeWidth={strokeWidth}
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                        />
                      </svg>
                      <span className="absolute font-mono text-[10px] font-extrabold text-slate-850 dark:text-white">
                        {attSummary.current_attendance.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1 text-xs font-semibold text-slate-500">
                    <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-200/20 dark:border-slate-850">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isSafe ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-rose-500'}`} 
                        style={{ width: `${attSummary.current_attendance}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                      <span>0%</span>
                      <span>Min: 75%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {statusMsg && (
                    <div className={`p-3 rounded-2xl border text-[10px] font-semibold leading-relaxed flex items-start gap-2 ${
                      isWarning ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-455'
                    }`}>
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 text-current mt-0.5" />
                      <span>{statusMsg}</span>
                    </div>
                  )}

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-semibold text-slate-500">
                    <div className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-150/40 dark:border-slate-800/40">
                      <span className="text-[9px] text-slate-455 font-bold block uppercase tracking-wider">Leave Balance</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                        {profile?.studentDetails?.leave_balance ?? 15} Days
                      </span>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-150/40 dark:border-slate-800/40">
                      <span className="text-[9px] text-slate-455 font-bold block uppercase tracking-wider">Leaves Approved</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                        {attSummary.approved_leave_days} Days
                      </span>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-150/40 dark:border-slate-800/40">
                      <span className="text-[9px] text-slate-455 font-bold block uppercase tracking-wider">Conducted Days</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                        {attSummary.working_days_conducted} Days
                      </span>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-150/40 dark:border-slate-800/40">
                      <span className="text-[9px] text-slate-455 font-bold block uppercase tracking-wider">Conducted Periods</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                        {attSummary.conducted_periods} Periods
                      </span>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-150/40 dark:border-slate-800/40 col-span-2">
                      <span className="text-[9px] text-slate-455 font-bold block uppercase tracking-wider">Remaining Safe Leaves</span>
                      <span className="text-xs font-extrabold text-indigo-650 dark:text-indigo-400 mt-0.5 block">
                        {attSummary.remaining_safe_leave_days} Days
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <h3 className="text-xs font-bold text-slate-405 dark:text-slate-350 uppercase tracking-wider">Active QR Gate Pass</h3>
            {activePass ? (
              activePass.status === 'OUT_OF_CAMPUS' ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-md p-6 flex flex-col items-center relative overflow-hidden text-center">
                  {/* Visual Accent */}
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-500" />
                  
                  <div className="my-6 flex flex-col items-center">
                    <div className="h-16 w-16 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="h-8 w-8 animate-bounce" />
                    </div>
                    <h4 className="font-extrabold text-slate-850 dark:text-white text-base">✅ Successfully Checked Out</h4>
                    
                    <div className="w-full bg-slate-50/50 dark:bg-slate-900/60 border border-slate-200/35 dark:border-slate-700/35 rounded-2xl p-4 text-xs space-y-2.5 mt-4 text-left font-semibold text-slate-500">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Status:</span>
                        <span className="text-emerald-605 dark:text-emerald-400 font-bold uppercase tracking-wider">Checked Out</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Exit Time:</span>
                        <span className="text-slate-800 dark:text-slate-300 font-bold">{new Date(activePass.exit_time).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Expected Return:</span>
                        <span className="text-slate-800 dark:text-slate-300 font-bold">{activePass.end_date} @ {activePass.expected_return_time}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowExtensionForm(true);
                        setExtensionData({
                          newEndDate: '',
                          newExpectedReturnTime: '',
                          extensionReason: ''
                        });
                      }}
                      className="w-full mt-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] cursor-pointer"
                    >
                      ➕ Request Leave Extension
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-md p-6 flex flex-col items-center relative overflow-hidden">
                  {/* Visual Accent */}
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-600 to-indigo-600" />
                  
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-2.5">SECURE DIGITAL GATE PASS</span>
                  
                  {/* QR Code Container */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/40 rounded-2xl my-6 flex items-center justify-center relative group">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(activePass.encrypted_token)}`}
                      alt="Secure QR Gate Pass"
                      className="h-44 w-44 object-contain transition-all duration-200 group-hover:scale-[1.02]"
                    />
                  </div>

                  <div className="w-full text-center space-y-1 mb-4">
                    <h4 className="font-extrabold text-slate-850 dark:text-white text-base">{activePass.student_name}</h4>
                    <p className="text-[10px] text-slate-405 font-bold uppercase tracking-wider">{activePass.register_number} • Room {activePass.room_number}</p>
                  </div>

                  <div className="w-full bg-slate-50/50 dark:bg-slate-900/60 border border-slate-200/35 dark:border-slate-700/35 rounded-2xl p-4 text-xs space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Destination:</span>
                      <span className="text-slate-800 dark:text-slate-300 font-bold truncate max-w-xs">{activePass.destination}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Leave Dates:</span>
                      <span className="text-slate-800 dark:text-slate-300 font-bold">{activePass.start_date} to {activePass.end_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Expected In:</span>
                      <span className="text-slate-800 dark:text-slate-300 font-bold">{activePass.expected_return_time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Pass Status:</span>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        ACTIVE (IN CAMPUS)
                      </span>
                    </div>
                  </div>

                  {activePass.sent_to_guard === 1 ? (
                    <div className="w-full mt-4 space-y-1">
                      <button
                        onClick={handleSendPassToGuard}
                        disabled={sendingPass}
                        className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      >
                        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        {sendingPass ? 'Sending...' : 'Resend Gate Pass to Guard'}
                      </button>
                      <p className="text-[10px] text-amber-500 text-center font-bold mt-1">
                        Forwarded to guard at {new Date(activePass.sent_to_guard_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleSendPassToGuard}
                      disabled={sendingPass}
                      className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50 shadow-md shadow-brand-500/10"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {sendingPass ? 'Sending...' : 'Send Gate Pass to Guard'}
                    </button>
                  )}



                  <div className="w-full mt-4 flex items-center justify-between text-[10px] text-slate-400 px-1 border-t border-slate-100 dark:border-slate-700/80 pt-4">
                    <span className="font-mono text-[9px]">UUID: {activePass.pass_id.slice(0, 18)}...</span>
                    <a 
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(activePass.encrypted_token)}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-1 text-indigo-500 font-bold hover:underline cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </div>
                </div>
              )
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[350px]">
                <ShieldCheck className="h-12 w-12 text-slate-350 dark:text-slate-655 mb-3" />
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200">No active gate pass</h4>
                <p className="text-xs text-slate-400 mt-1.5 max-w-[250px] leading-relaxed">Once your Warden reviews and signs your leave request, a secure digital QR code pass will appear here.</p>
              </div>
            )}
          </div>

          {/* Leave History List - Right Panel */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-xs font-bold text-slate-450 dark:text-slate-350 uppercase tracking-wider">Recent Leaves Log</h3>
            {leavesListJSX}
          </div>
        </div>
      )}
      {/* Validation Failure Dialog Overlay */}
      {showValidationDialog && validationDialogData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-205">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-150">
            <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-md font-bold text-rose-600 dark:text-rose-455">Attendance Requirement Not Met</h3>
              
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4.5 rounded-2xl border border-slate-200/40 dark:border-slate-700/60 text-xs space-y-3 font-semibold text-slate-650 dark:text-slate-350 text-left leading-relaxed">
                <p>Your predicted attendance after applying this leave will become <span className="font-extrabold text-rose-500">{validationDialogData.predictedAttendance.toFixed(2)}%</span>.</p>
                <p>The minimum attendance required is {validationDialogData.minRequired}%.</p>
                <p>You have reached the maximum safe leave limit based on your attendance.</p>
                <p>This leave request cannot be submitted.</p>
                <p className="pt-2 text-center text-slate-500 dark:text-slate-400 font-medium">Please contact your Class Coordinator if this leave is unavoidable.</p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowValidationDialog(false);
                setValidationDialogData(null);
              }}
              className="w-full py-3 bg-slate-850 hover:bg-slate-750 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Success Dialog Overlay */}
      {showSuccessDialog && successDialogData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-205">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-150">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-md font-bold text-emerald-600 dark:text-emerald-450">Leave Request Submitted Successfully</h3>
              <p className="text-xs text-slate-400">Your leave application has entered the review pipeline.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-4.5 rounded-2xl border border-slate-200/40 dark:border-slate-700/60 text-xs space-y-3 font-semibold text-slate-500 text-left">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-750">
                <span className="text-slate-400 font-medium">Predicted Attendance:</span>
                <span className="text-indigo-650 dark:text-indigo-400 font-extrabold text-sm">
                  {successDialogData.predictedAttendance.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5">
                <span className="text-slate-400 font-medium">Remaining Safe Leave Days:</span>
                <span className="text-emerald-605 dark:text-emerald-400 font-extrabold text-sm">
                  {successDialogData.remainingSafeLeaveDays}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowSuccessDialog(false);
                setSuccessDialogData(null);
              }}
              className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Leave Extension Form Modal */}
      {showExtensionForm && activePass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-8 max-w-md w-full mx-4 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Request Leave Extension</h3>
                <p className="text-[10px] text-slate-400 mt-1">Current Return: {activePass.end_date} @ {activePass.expected_return_time}</p>
              </div>
              <button 
                onClick={() => {
                  setShowExtensionForm(false);
                  setExtensionPrediction(null);
                }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {extensionError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 rounded-xl text-xs font-semibold flex gap-2">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{extensionError}</span>
              </div>
            )}

             <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">New Expected Return Date</label>
                <input
                  type="date"
                  value={extensionData.newEndDate}
                  onChange={(e) => setExtensionData(prev => ({ ...prev, newEndDate: e.target.value }))}
                  className="erp-input font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">New Expected Return Time</label>
                <input
                  type="time"
                  value={extensionData.newExpectedReturnTime}
                  onChange={(e) => setExtensionData(prev => ({ ...prev, newExpectedReturnTime: e.target.value }))}
                  className="erp-input font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Reason for Extension</label>
                <textarea
                  rows={3}
                  placeholder="Explain why you need to extend your leave..."
                  value={extensionData.extensionReason}
                  onChange={(e) => setExtensionData(prev => ({ ...prev, extensionReason: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:border-brand-500 text-slate-800 dark:text-white font-medium"
                />
              </div>

              {extensionPredicting && (
                <div className="text-[11px] font-semibold text-slate-400 animate-pulse text-center py-2">
                  Calculating attendance extension impact...
                </div>
              )}

              {!extensionPredicting && extensionPrediction && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/40 dark:border-slate-700/50 text-xs font-semibold text-slate-550 animate-in fade-in duration-200">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Impact Prediction</span>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block">Total Leave Days</span>
                      <span className="text-slate-800 dark:text-slate-300 font-extrabold text-xs block">
                        {extensionPrediction.requestedLeaveDays} Days
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block">Predicted Attendance</span>
                      <span className={`font-extrabold text-xs block ${
                        extensionPrediction.predictedAttendance < 75.0 ? 'text-rose-500' :
                        extensionPrediction.predictedAttendance < 80.0 ? 'text-amber-500' :
                        'text-emerald-500'
                      }`}>
                        {extensionPrediction.predictedAttendance.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  {extensionPrediction.predictedAttendance < 75.0 && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 rounded-xl text-[10px] leading-relaxed flex gap-2">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                      <span>This extension drops your attendance below 75%. Request will be blocked.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700 pt-4">
              <button
                onClick={() => {
                  setShowExtensionForm(false);
                  setExtensionPrediction(null);
                }}
                className="erp-btn-secondary py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={handleExtensionSubmit}
                disabled={loading || extensionPredicting || (extensionPrediction && extensionPrediction.predictedAttendance < 75.0)}
                className="erp-btn-primary py-2.5"
              >
                {loading ? 'Submitting...' : 'Submit Extension Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline component to answer clarification
function ClarificationBox({ leaveId, onSubmitting }: { leaveId: number, onSubmitting: () => void }) {
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;

    setLoading(true);
    setError('');

    try {
      await apiService.respondToClarification(leaveId, msg);
      setMsg('');
      onSubmitting();
    } catch (err: any) {
      setError(err.message || 'Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-orange-550/5 border border-orange-500/20 rounded-2xl space-y-3">
      <div className="flex items-start gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
        <MessageSquare className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
        <span>Class Coordinator requested clarification. Please enter details below:</span>
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
      <textarea
        rows={2}
        placeholder="Provide additional details or explain the urgency..."
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:border-orange-500 text-slate-800 dark:text-white"
        required
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-4.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-655 text-white font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          {loading ? 'Submitting...' : 'Send Clarification'}
        </button>
      </div>
    </form>
  );
}

// Helper to count days using college rules
function getDaysCount(startDateStr, endDateStr, goingTimeStr = '09:00', expectedReturnTimeStr = '18:00') {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const totalDays = Math.round((endUtc - startUtc) / millisecondsPerDay) + 1;

  let count = 0;
  for (let i = 0; i < totalDays; i++) {
    const isStart = i === 0;
    const isEnd = i === totalDays - 1;

    let keep = true;
    if (isStart) {
      const timeStr = goingTimeStr || '09:00';
      const [h, m] = timeStr.split(':').map(Number);
      if (h > 15 || (h === 15 && m > 0)) {
        keep = false;
      }
    }
    if (isEnd) {
      const timeStr = expectedReturnTimeStr || '18:00';
      const [h, m] = timeStr.split(':').map(Number);
      if (h < 8 || (h === 8 && m <= 30)) {
        keep = false;
      }
    }

    if (keep) {
      count++;
    }
  }
  return count;
}

// Account Settings Component for editing display name and changing password
function SettingsView({ profile, onUserUpdate, fetchStudentData }) {
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Sync state if profile loads asynchronously after mount
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileMsg({ type: 'error', text: 'Name cannot be empty.' });
      return;
    }
    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const updated = await apiService.updateProfile(name, phone);
      if (onUserUpdate) onUserUpdate(updated);
      localStorage.setItem('hlms_user', JSON.stringify(updated));
      await fetchStudentData();
      setProfileMsg({ type: 'success', text: 'Display profile and contact phone number updated successfully!' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg({ type: '', text: '' });
    try {
      await apiService.changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const studentAttr = profile?.studentDetails || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Account Settings</h2>
        <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">Configure your profile identity and login security</p>
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Forms */}
        <div className="md:col-span-7 space-y-6">
          {/* Profile Details Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Profile Information</h3>
              <p className="text-xs text-slate-405 mt-1">Edit display details and phone credentials.</p>
            </div>
            
            {profileMsg.text && (
              <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
                profileMsg.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}>
                <Info className="h-4.5 w-4.5 shrink-0" />
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="erp-input font-bold"
                  placeholder="Your Full Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Contact Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="erp-input font-bold"
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className="erp-btn-primary"
              >
                {profileLoading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Security Access</h3>
              <p className="text-xs text-slate-405 mt-1">Change current log-in passkey configuration.</p>
            </div>

            {passwordMsg.text && (
              <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
                passwordMsg.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}>
                <Info className="h-4.5 w-4.5 shrink-0" />
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="erp-input"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="erp-input"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="erp-input"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="erp-btn-primary"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Read-only academic dossier */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-6 md:p-8 space-y-6">
            <h3 className="text-xs font-bold text-slate-805 dark:text-white uppercase tracking-wider">Academic Record</h3>
            
            <div className="flex flex-col items-center py-4 border-b border-slate-100 dark:border-slate-850">
              <div className="h-16 w-16 bg-gradient-to-tr from-brand-600 to-indigo-650 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl mb-3 shadow-md shadow-brand-500/10 border border-brand-500/15">
                {name.charAt(0)}
              </div>
              <h4 className="font-extrabold text-slate-850 dark:text-white text-base">{name}</h4>
              <p className="text-xs text-slate-400 mt-1 font-mono">{profile?.register_number || 'N/A'}</p>
            </div>

            <div className="space-y-4.5 text-xs font-semibold text-slate-500">
              <div className="flex justify-between">
                <span className="text-slate-400">Email Address</span>
                <span className="text-slate-800 dark:text-slate-300 font-bold">{profile?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Department</span>
                <span className="text-slate-800 dark:text-slate-300 font-bold">{studentAttr.department || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Year & Section</span>
                <span className="text-slate-800 dark:text-slate-300 font-bold">Year {studentAttr.year || 3} • Sec {studentAttr.section || 'A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Semester</span>
                <span className="text-slate-800 dark:text-slate-300 font-bold">Sem {studentAttr.semester || 6}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hostel Block</span>
                <span className="text-slate-800 dark:text-slate-300 font-bold">{studentAttr.hostel_block || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Room Number</span>
                <span className="text-slate-800 dark:text-slate-300 font-bold">{studentAttr.room_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Faculty Advisor</span>
                <span className="text-slate-800 dark:text-slate-300 font-bold">{studentAttr.faculty_advisor || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
