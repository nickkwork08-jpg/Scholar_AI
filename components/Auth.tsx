
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, GraduationCap, ShieldCheck, Key, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

type AuthMode = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'OTP_VERIFY' | 'RESET_PASSWORD';

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: ['', '', '', '', '', '']
  });

  // Focus the first OTP input on verify mode
  useEffect(() => {
    if (mode === 'OTP_VERIFY') {
      const firstInput = document.getElementById('otp-0');
      firstInput?.focus();
    }
  }, [mode]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...formData.otp];
    newOtp[index] = value.slice(-1);
    setFormData({ ...formData, otp: newOtp });

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const startResendCooldown = (seconds: number) => {
    setResendCooldown(seconds);
    const iv = setInterval(() => {
      setResendCooldown(s => {
        if (s <= 1) { clearInterval(iv); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setResendLoading(true);
    try {
      const res = await fetch('/api/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });

      const text = await res.text();
      let json = {} as any;
      try { json = text ? JSON.parse(text) : {}; } catch (e) { json = {}; }

      if (!res.ok) throw new Error(json?.message || text || 'Resend failed');

      setSuccess('OTP resent to your email');
      startResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Resend failed');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      switch (mode) {
        case 'LOGIN': {
          const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email, password: formData.password })
          });

          const text = await res.text();
          let json = {} as any;
          try { json = text ? JSON.parse(text) : {}; } catch (e) { json = {}; }

          if (!res.ok) throw new Error(json?.message || text || 'Login failed');

          // Expect { user: { name, email } }
          onLogin(json.user || { name: formData.email, email: formData.email });
          break;
        }

        case 'SIGNUP': {
          if (!formData.name || !formData.email || !formData.password) {
            throw new Error('All fields are required');
          }

          const res = await fetch('/api/signup',  {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password })
          });

          const text = await res.text();
          let json = {} as any;
          try { json = text ? JSON.parse(text) : {}; } catch (e) { json = {}; }

          if (!res.ok) throw new Error(json?.message || text || 'Signup failed');
          // When backend returns message indicating failure to send OTP, show an error and allow user to resend
          const msg = json?.message || text || '';
          if (msg.toLowerCase().includes('failed to send otp')) {
            // Allow user to proceed to OTP verify even if email delivery failed so they can request resend
            setMode('OTP_VERIFY');
            setFormData(prev => ({ ...prev, otp: ['', '', '', '', '', ''] }));
            setSuccess(json?.message || 'Signup succeeded but failed to send OTP email. Please resend the code or try again later.');
            setLoading(false);
            break;
          }

          // If account already exists but not verified, backend resends OTP — proceed to verify
          setMode('OTP_VERIFY');
          setFormData(prev => ({ ...prev, otp: ['', '', '', '', '', ''] }));
          setSuccess(json?.message || 'OTP sent to your email');
          setLoading(false);
          break;
        }

        case 'OTP_VERIFY': {
          const enteredOtp = formData.otp.join('');
          if (enteredOtp.length !== 6) throw new Error('Please enter a 6-digit code');

          // Use atomic endpoint to verify OTP and login in one request to avoid races
          const res = await fetch('/api/verify-and-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email, otp: enteredOtp, password: formData.password })
          });

          const text = await res.text();
          let json = {} as any;
          try { json = text ? JSON.parse(text) : {}; } catch (e) { json = {}; }

          if (!res.ok) throw new Error(json?.message || text || 'Verification/login failed');

          onLogin(json.user || { name: formData.name, email: formData.email });
          break;
        }

        case 'FORGOT_PASSWORD': {
          if (!formData.email) throw new Error('Please enter your email');
          const res = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email })
          });

          const text = await res.text();
          let json = {} as any;
          try { json = text ? JSON.parse(text) : {}; } catch (e) { json = {}; }

          if (!res.ok) throw new Error(json?.message || text || 'Request failed');
          setSuccess('Reset instructions sent to your email!');
          setTimeout(() => setMode('RESET_PASSWORD'), 2000);
          setLoading(false);
          break;
        }

        case 'RESET_PASSWORD': {
          if (formData.password !== formData.confirmPassword) throw new Error('Passwords do not match');
          if (formData.password.length < 6) throw new Error('Password must be at least 6 characters');

          // For reset we expect the flow to have included an otp verification step in real app
          const res = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email, otp: formData.otp.join(''), newPassword: formData.password })
          });

          const text = await res.text();
          let json = {} as any;
          try { json = text ? JSON.parse(text) : {}; } catch (e) { json = {}; }

          if (!res.ok) throw new Error(json?.message || text || 'Reset failed');

          setSuccess('Password updated successfully!');
          setTimeout(() => setMode('LOGIN'), 1500);
          break;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      if (mode !== 'SIGNUP' && mode !== 'FORGOT_PASSWORD') {
        setLoading(false);
      }
    }
  };

  const renderHeader = (title: string, subtitle: string) => (
    <div className="mb-8 text-center animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">{title}</h2>
      <p className="text-slate-500 text-sm px-4">{subtitle}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden relative border border-slate-100">
        
        <div className="w-full p-8 md:p-10">
          <div className="flex items-center gap-3 mb-10 justify-center">
            <div className="bg-primary-600 p-2.5 rounded-2xl text-white shadow-lg shadow-primary-200 transform -rotate-3 transition-transform hover:rotate-0">
                <GraduationCap size={32} />
            </div>
            <h1 className="font-black text-2xl text-slate-800 tracking-tighter uppercase italic">Scholar    AI</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'LOGIN' && (
              <>
                {renderHeader('Welcome Back!', 'Log in to continue your learning journey.')}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                      <input 
                        type="email" 
                        required 
                        placeholder="you@example.com"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-sm font-medium text-slate-800"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                      <button type="button" onClick={() => setMode('FORGOT_PASSWORD')} className="text-xs font-bold text-primary-600 hover:text-primary-700">Forgot?</button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                      <input 
                        type="password" 
                        required 
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-sm font-medium text-slate-800"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {mode === 'SIGNUP' && (
              <>
                {renderHeader('Create Account', 'Sign up to transform your study materials.')}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Full Name</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                      <input 
                        type="text" 
                        required 
                        placeholder="John Doe"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-sm font-medium text-slate-800"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                      <input 
                        type="email" 
                        required 
                        placeholder="you@example.com"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-sm font-medium text-slate-800"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                      <input 
                        type="password" 
                        required 
                        placeholder="Min. 6 characters"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-sm font-medium text-slate-800"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {mode === 'OTP_VERIFY' && (
              <>
                <div className="flex flex-col items-center mb-6">
                  <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-4 ring-8 ring-primary-50/50">
                    <ShieldCheck size={32} />
                  </div>
                  {renderHeader('Verify Email', `We've sent a 6-digit code to ${formData.email}`)}
                </div>
                <div className="flex justify-between gap-2 px-1">
                  {formData.otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      className="w-12 h-14 text-center text-xl font-bold border border-slate-200 bg-slate-50 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:bg-white focus:outline-none transition-all"
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                    />
                  ))}
                </div>
                <div className="text-center mt-4">
                   <button type="button" onClick={handleResend} disabled={resendLoading || resendCooldown > 0} className="text-xs font-bold text-slate-400 hover:text-primary-600 flex items-center gap-2 mx-auto transition-colors disabled:opacity-60">
                      {resendLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={12} />}
                      {resendCooldown > 0 ? ` Resend in ${resendCooldown}s` : ' Resend code'}
                   </button>
                </div>
              </>
            )}

            {mode === 'FORGOT_PASSWORD' && (
              <>
                <div className="flex flex-col items-center mb-6">
                  <div className="w-16 h-16 bg-slate-50 text-slate-600 rounded-full flex items-center justify-center mb-4">
                    <Key size={32} />
                  </div>
                  {renderHeader('Recover Password', 'Enter your email address to receive a reset link.')}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                    <input 
                      type="email" 
                      required 
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-sm font-medium text-slate-800"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
              </>
            )}

            {mode === 'RESET_PASSWORD' && (
              <>
                {renderHeader('Set New Password', 'Choose a strong password for your account.')}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">New Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                      <input 
                        type="password" 
                        required 
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-sm font-medium text-slate-800"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Confirm Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                      <input 
                        type="password" 
                        required 
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-sm font-medium text-slate-800"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl text-center border border-red-100 animate-shake">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 text-xs font-bold p-4 rounded-2xl text-center border border-green-100 flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                {success}
              </div>
            )}

            <button 
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4.5 rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-2 mt-4 hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0 h-14"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                        {mode === 'LOGIN' && 'Sign In'}
                        {mode === 'SIGNUP' && 'Create Account'}
                        {mode === 'OTP_VERIFY' && 'Verify & Continue'}
                        {mode === 'FORGOT_PASSWORD' && 'Send Reset Link'}
                        {mode === 'RESET_PASSWORD' && 'Update Password'}
                        {mode !== 'OTP_VERIFY' && <ArrowRight size={20} className="ml-1" />}
                    </>
                )}
            </button>
          </form>

          <div className="mt-10 text-center">
            {mode === 'LOGIN' ? (
              <p className="text-slate-500 text-sm font-medium">
                New to ScholarAI?
                <button onClick={() => setMode('SIGNUP')} className="text-primary-600 font-bold ml-1.5 hover:underline">Create Account</button>
              </p>
            ) : mode === 'SIGNUP' ? (
              <p className="text-slate-500 text-sm font-medium">
                Already have an account?
                <button onClick={() => setMode('LOGIN')} className="text-primary-600 font-bold ml-1.5 hover:underline">Log In</button>
              </p>
            ) : (
              <button 
                onClick={() => setMode('LOGIN')} 
                className="text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center gap-2 mx-auto transition-colors"
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
