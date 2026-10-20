import React, { useState } from 'react';
import { 
  Shield, Mail, Lock, ChevronRight, UserCheck, KeyRound, 
  AlertTriangle, Fingerprint, GraduationCap, ClipboardList, 
  Building2, Award, Home, ArrowLeft 
} from 'lucide-react';
import { apiService } from '../services/api';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

interface RoleOption {
  id: string;
  label: string;
  role: string;
  email: string;
  pass: string;
  description: string;
  icon: React.ComponentType<any>;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Verification demo trigger
  const [useOtp, setUseOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpStep, setOtpStep] = useState(false);

  const roleOptions: RoleOption[] = [
    {
      id: 'STUDENT',
      label: 'Student Login',
      role: 'STUDENT',
      email: 'student.demo@college.edu',
      pass: 'StudentPassword123',
      description: 'Apply for leaves, view gate passes, and track attendance',
      icon: GraduationCap
    },
    {
      id: 'CC',
      label: 'CC Login',
      role: 'CC',
      email: 'cc.demo@college.edu',
      pass: 'StaffPassword123',
      description: 'Review and approve class leave requests',
      icon: ClipboardList
    },
    {
      id: 'HOD',
      label: 'HOD Login',
      role: 'HOD',
      email: 'hod.demo@college.edu',
      pass: 'StaffPassword123',
      description: 'Department-level leave approvals & gate pass controls',
      icon: Building2
    },
    {
      id: 'DEAN',
      label: 'Dean Login',
      role: 'DEAN',
      email: 'dean.demo@college.edu',
      pass: 'StaffPassword123',
      description: 'Academic oversight & special leave clearances',
      icon: Award
    },
    {
      id: 'WARDEN',
      label: 'Warden Login',
      role: 'WARDEN',
      email: 'warden.demo@college.edu',
      pass: 'StaffPassword123',
      description: 'Hostel outpass approvals & generate secure QR codes',
      icon: Home
    },
    {
      id: 'GUARD',
      label: 'Guard Login',
      role: 'GUARD',
      email: 'guard.demo@college.edu',
      pass: 'StaffPassword123',
      description: 'Scan & verify secure student QR gate passes',
      icon: Shield
    }
  ];

  const handleRoleSelect = (roleOpt: RoleOption) => {
    setSelectedRole(roleOpt.role);
    setIdentifier(roleOpt.email);
    setPassword(roleOpt.pass);
    setError('');
    setOtpStep(false);
    setUseOtp(false);
  };

  const handleAdminSelect = () => {
    setSelectedRole('ADMIN');
    setIdentifier('admin.demo@college.edu');
    setPassword('AdminPassword123');
    setError('');
    setOtpStep(false);
    setUseOtp(false);
  };

  const handleBackToRoles = () => {
    setSelectedRole(null);
    setIdentifier('');
    setPassword('');
    setError('');
    setOtpStep(false);
    setUseOtp(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (useOtp && !otpStep) {
        // Mock sending OTP
        setOtpStep(true);
        setLoading(false);
        return;
      }

      if (useOtp && otpStep) {
        if (otpCode !== '123456') {
          setError('Invalid OTP code. Use 123456 for demo purposes.');
          setLoading(false);
          return;
        }
      }

      const user = await apiService.login(identifier, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-slate-950 text-slate-100 font-sans selection:bg-brand-500 selection:text-white">
      {/* Left Column: Visual Side Panel with Premium Branding */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-12 bg-gradient-to-br from-brand-950 via-slate-950 to-slate-900 border-r border-slate-800/80 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.12),transparent_55%)] pointer-events-none" />
        <div className="absolute top-1/4 -right-1/4 h-96 w-96 rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-72 w-72 rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/35 border border-brand-400/25">
            <Shield className="h-5.5 w-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-xs font-extrabold text-white tracking-wide leading-tight uppercase">Smart Hostel Leave</h1>
            <p className="text-[9px] text-brand-400 font-extrabold uppercase tracking-wider">Management System</p>
          </div>
        </div>

        {/* Center Info Text */}
        <div className="space-y-5 relative z-10 my-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-brand-500/10 border border-brand-500/35 text-brand-300">
            <Fingerprint className="w-3.5 h-3.5" />
            Security Shield Active
          </span>
          <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
            Digitalizing <br />
            Campus Gate Passes
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Fast, secure, paperless approval workflow connecting Students, Faculty, Wardens, and Security Guards.
          </p>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium relative z-10">
          <span>© 2026 Smart Hostel Leave Management System</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            SHA-256 Encrypted
          </span>
        </div>
      </div>

      {/* Right Column: Content Panel */}
      <div className="lg:col-span-7 flex flex-col justify-center px-6 py-12 md:p-16 xl:p-24 bg-slate-950 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.06),transparent_45%)] pointer-events-none" />
        
        <div className="max-w-xl w-full mx-auto space-y-8 relative z-10">
          
          {selectedRole === null ? (
            /* Role Selection Screen */
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-3xl font-extrabold text-white tracking-tight">Sign In to SHLMS</h2>
                <p className="text-slate-400 text-sm mt-2">Select your role below to access the Hostel Leave Management System.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roleOptions.map((roleOpt) => {
                  const Icon = roleOpt.icon;
                  return (
                    <button
                      key={roleOpt.id}
                      onClick={() => handleRoleSelect(roleOpt)}
                      className="flex items-start gap-4 p-5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-brand-500/80 rounded-2xl text-left transition-all duration-200 group cursor-pointer hover:shadow-lg hover:shadow-brand-500/5 active:scale-[0.99]"
                    >
                      <div className="p-3 rounded-xl bg-slate-800 group-hover:bg-brand-500/10 group-hover:text-brand-400 border border-slate-700/60 group-hover:border-brand-500/30 text-slate-400 transition-colors">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-white group-hover:text-brand-400 transition-colors">{roleOpt.label}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{roleOpt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-900 flex justify-between items-center text-xs">
                <span className="text-slate-500">Need help accessing the system? Contact support.</span>
                <button
                  onClick={handleAdminSelect}
                  className="font-bold text-brand-400 hover:text-brand-350 transition-colors cursor-pointer"
                >
                  System Admin Login
                </button>
              </div>
            </div>
          ) : (
            /* Sign In Credentials Form Screen */
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToRoles}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  title="Back to Role Selection"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">
                    {roleOptions.find(r => r.role === selectedRole)?.label || (selectedRole === 'ADMIN' ? 'Admin Login' : 'Login')}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Verify details below to access your dashboard.</p>
                </div>
              </div>

              {selectedRole === 'STUDENT' && (
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-400 uppercase tracking-wider">
                    <UserCheck className="h-4 w-4 text-brand-400" />
                    <span>Select Student Test Account</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Student A', email: 'student.demo@college.edu' },
                      { label: 'Shahana', email: 'student1.demo@college.edu' },
                      { label: 'Saran', email: 'student2.demo@college.edu' },
                      { label: 'Arjun Kumar', email: 'student3.demo@college.edu' },
                      { label: 'Sneha Patel', email: 'student4.demo@college.edu' },
                      { label: 'mohammed Ayaz', email: 'student5.demo@college.edu' }
                    ].map((std) => {
                      const isSelected = identifier === std.email;
                      return (
                        <button
                          key={std.email}
                          onClick={() => {
                            setIdentifier(std.email);
                            setPassword('StudentPassword123');
                            setError('');
                          }}
                          type="button"
                          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-150 active:scale-[0.96] cursor-pointer ${
                            isSelected
                              ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-600/20'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {std.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/35 rounded-2xl text-rose-300 text-sm animate-in fade-in-50">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                {!otpStep ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">College Email or Reg. No.</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="e.g. user.demo@college.edu"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800/80 focus:border-brand-500 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-brand-500/10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Password</label>
                        <button type="button" className="text-xs font-semibold text-brand-400 hover:text-brand-350 transition-colors">
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                        <input
                          type="password"
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800/80 focus:border-brand-500 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-brand-500/10"
                          required
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-2xl text-brand-300 text-xs leading-relaxed">
                      <p className="font-bold">2-Factor Authentication Required</p>
                      <p className="mt-1">We have simulated sending a secure passcode to your mobile phone. Please input the passcode below.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Passcode (Use "123456")</label>
                      <div className="relative">
                        <KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit OTP code"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800/80 focus:border-brand-500 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm font-bold tracking-widest text-center outline-none transition-all duration-150 focus:ring-2 focus:ring-brand-500/10"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 text-xs font-medium text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-900 text-brand-600 focus:ring-0 focus:ring-offset-0 accent-brand-500"
                    />
                    Remember my session
                  </label>

                  {!otpStep && (
                    <button
                      type="button"
                      onClick={() => setUseOtp(!useOtp)}
                      className={`text-xs font-bold py-1 px-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                        useOtp 
                          ? 'bg-brand-500/10 border-brand-500/40 text-brand-400' 
                          : 'border-slate-800 text-slate-400 hover:bg-slate-900/60 hover:text-slate-300'
                      }`}
                    >
                      {useOtp ? '✓ OTP Enabled' : 'Enable 2FA (OTP)'}
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-500/15 hover:shadow-brand-500/25 active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{otpStep ? 'Verify & Continue' : 'Sign In To Account'}</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {otpStep && (
                  <button
                    type="button"
                    onClick={() => setOtpStep(false)}
                    className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-400 transition-colors"
                  >
                    Go back to login credentials
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
