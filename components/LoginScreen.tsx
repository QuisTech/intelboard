import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Fingerprint, Scan, AlertTriangle, ChevronRight, Loader2, Globe2, UserPlus, ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [id, setId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [confirmCode, setConfirmCode] = useState(''); // For registration
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [scanStep, setScanStep] = useState(0); // 0: Idle, 1: Scanning, 2: Success

  // Initialize DB on mount
  useEffect(() => {
    authService.init();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    setScanStep(1);

    // Simulate Network/Processing Delay
    setTimeout(() => {
      if (isRegistering) {
        // --- REGISTRATION LOGIC ---
        if (accessCode !== confirmCode) {
           setIsLoading(false);
           setScanStep(0);
           setError('Security Keys do not match.');
           return;
        }

        const result = authService.register(id, accessCode);
        
        if (result.success) {
          setIsLoading(false);
          setScanStep(0);
          setSuccessMsg('Agent Registered. Please authenticate.');
          setIsRegistering(false); // Switch back to login
          setAccessCode('');
          setConfirmCode('');
        } else {
          setIsLoading(false);
          setScanStep(0);
          setError(result.message || 'Registration Failed');
        }

      } else {
        // --- LOGIN LOGIC ---
        const result = authService.login(id, accessCode);

        if (result.success) {
          setScanStep(2);
          setTimeout(() => {
            onLogin();
          }, 800);
        } else {
          setIsLoading(false);
          setScanStep(0);
          setError(`ACCESS DENIED: ${result.message}`);
        }
      }
    }, 1500);
  };

  const toggleMode = () => {
    setError('');
    setSuccessMsg('');
    setIsRegistering(!isRegistering);
    setId('');
    setAccessCode('');
    setConfirmCode('');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-mono">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-slate-950" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-blue-500/10 rounded-full animate-[spin_60s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-dashed border-blue-500/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
        <div className="absolute grid grid-cols-12 gap-4 w-full h-full opacity-10">
           {Array.from({ length: 48 }).map((_, i) => (
             <div key={i} className="border-r border-slate-800 h-full" />
           ))}
        </div>
      </div>

      {/* Main Card */}
      <div className="z-10 w-full max-w-md p-8 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl relative overflow-hidden group transition-all duration-500">
        
        {/* Top Scanner Line */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent transition-all duration-1000 ${isLoading ? 'animate-[shimmer_2s_infinite]' : 'opacity-30'}`} />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 border border-slate-600 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.2)] relative">
            {isLoading ? (
               <Scan className="w-8 h-8 text-blue-400 animate-pulse" />
            ) : isRegistering ? (
               <UserPlus className="w-8 h-8 text-slate-200" />
            ) : (
               <ShieldCheck className="w-8 h-8 text-slate-200" />
            )}
            
            {/* Spinning ring for loading */}
            {isLoading && (
              <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent animate-spin" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex justify-center items-center gap-2">
            <span className="text-amber-500">INTEL</span>BOARD
          </h1>
          <p className="text-xs text-slate-500 tracking-[0.2em] uppercase mt-2">
            {isRegistering ? 'New Agent Registration' : 'Restricted Access Terminal'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-4">
            <div className="group/input">
              <label className="block text-[10px] uppercase text-slate-500 mb-1 tracking-wider">
                {isRegistering ? 'Choose Agent ID' : 'Agent ID'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Fingerprint className="h-4 w-4 text-slate-500 group-focus-within/input:text-blue-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm font-medium tracking-wide uppercase"
                  placeholder={isRegistering ? "CREATE ID" : "ENTER ID"}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="group/input">
              <label className="block text-[10px] uppercase text-slate-500 mb-1 tracking-wider">
                {isRegistering ? 'Create Security Key' : 'Security Key'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500 group-focus-within/input:text-blue-400 transition-colors" />
                </div>
                <input
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm font-medium tracking-wide"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Confirm Password Field for Registration */}
            {isRegistering && (
              <div className="group/input animate-in slide-in-from-top-4 fade-in duration-300">
                <label className="block text-[10px] uppercase text-slate-500 mb-1 tracking-wider">Confirm Key</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500 group-focus-within/input:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="password"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-950/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm font-medium tracking-wide"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/50 rounded flex items-center gap-2 text-xs text-red-300 animate-in slide-in-from-top-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          
          {successMsg && (
            <div className="p-3 bg-emerald-900/20 border border-emerald-500/50 rounded flex items-center gap-2 text-xs text-emerald-300 animate-in slide-in-from-top-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !id || !accessCode}
            className={`
              w-full py-3 px-4 rounded-lg font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300
              ${isLoading 
                ? 'bg-blue-600/20 text-blue-300 cursor-wait border border-blue-500/30' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]'}
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {scanStep === 1 ? 'Processing...' : 'Success'}
              </>
            ) : isRegistering ? (
              <>
                Initialize Agent
                <UserPlus className="w-4 h-4" />
              </>
            ) : (
              <>
                Authenticate
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode Link */}
        <div className="mt-6 text-center">
           <button 
             onClick={toggleMode}
             disabled={isLoading}
             className="text-xs text-slate-500 hover:text-blue-400 underline underline-offset-4 transition-colors disabled:opacity-50"
           >
             {isRegistering ? (
               <span className="flex items-center justify-center gap-1"><ArrowLeft className="w-3 h-3" /> Return to Login</span>
             ) : (
               "Request New Agent Clearance (Sign Up)"
             )}
           </button>
        </div>

        {/* Decoration Grid */}
        <div className="absolute bottom-4 right-4 flex gap-1 opacity-20">
           <div className="w-1 h-1 bg-blue-500 rounded-full" />
           <div className="w-1 h-1 bg-blue-500 rounded-full" />
           <div className="w-1 h-1 bg-blue-500 rounded-full" />
        </div>
      </div>

      {/* Footer / Hint */}
      <div className="mt-8 text-center space-y-2 z-10">
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 uppercase tracking-widest">
          <Globe2 className="w-3 h-3" /> Local JSON DB Active • AES-256
        </div>
        {!isRegistering && (
          <div className="text-[10px] text-slate-700 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800 animate-in fade-in zoom-in duration-500 delay-500">
            <span className="font-bold text-slate-500">DEFAULT USER:</span> ID: <span className="text-slate-300">admin</span> / KEY: <span className="text-slate-300">password</span>
          </div>
        )}
      </div>
    </div>
  );
};
