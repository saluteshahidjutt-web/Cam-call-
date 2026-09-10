import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Video, Mail, Lock, Eye, EyeOff, AlertCircle, User, AtSign, Check, X, Sun, Moon } from 'lucide-react';

interface SignUpViewProps {
  onSwitchToLogin: () => void;
}

const AVATAR_SEEDS = ['Felix', 'Luna', 'Alex', 'Milo', 'Sam', 'Charlie', 'Riley', 'Jordan'];

export const SignUpView: React.FC<SignUpViewProps> = ({ onSwitchToLogin }) => {
  const { signup, loginWithGoogle, checkUsernameAvailable } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSeed, setSelectedSeed] = useState('Felix');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);

  const hasPendingCall = Boolean(
    window.location.hash.includes('#call=') ||
    window.location.search.includes('call=') ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pending_call_id'))
  );

  const handleUsernameChange = async (val: string) => {
    const clean = val.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(clean);
    if (!clean) {
      setUsernameStatus(null);
      return;
    }
    if (clean.length < 3) {
      setUsernameStatus('Too short (min 3 chars)');
      return;
    }
    try {
      const isFree = await checkUsernameAvailable(clean);
      setUsernameStatus(isFree ? 'Available' : 'Taken');
    } catch {
      setUsernameStatus('Available');
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const e = err as Error;
      let msg = 'Google Sign Up failed.';
      if (e.message?.includes('unauthorized-domain')) {
        msg = 'Google OAuth is not authorized on this domain. Please use the Email & Password form below to sign up directly!';
      } else if (e.message?.includes('popup-closed-by-user')) {
        msg = 'Google sign in popup was closed. Please try again.';
      } else if (e.message) {
        msg = e.message;
      }
      setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (username.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    if (usernameStatus === 'Taken') {
      setError('This username is already taken. Please pick another.');
      return;
    }

    setLoading(true);
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedSeed}`;

    try {
      await signup(email.trim(), password, displayName.trim(), username.trim(), avatarUrl);
    } catch (err: unknown) {
      const e = err as Error;
      let msg = e.message || 'Failed to create account.';
      if (e.message?.includes('unauthorized-domain')) {
        msg = 'Domain not authorized in Firebase. Please contact support or use email signup.';
      } else if (e.message?.includes('email-already-in-use')) {
        msg = 'This email is already registered. Try signing in instead.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f0f2f5] dark:bg-[#0c1317] text-[#111b21] dark:text-[#e9edef] relative transition-colors py-10">
      {/* Quick theme toggle floating top right */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-white dark:bg-[#1f2c34] border border-black/5 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm"
          title="Toggle Light / Dark mode"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-emerald-600" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00a884] text-white shadow-lg mb-3">
            <Video className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111b21] dark:text-white">
            Create Account
          </h1>
          <p className="text-xs text-zinc-500 dark:text-[#8696a0] mt-1">
            Join WhatsApp Messenger in seconds
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1f2c34] rounded-2xl p-6 sm:p-8 shadow-xl border border-black/5 dark:border-white/10">
          {hasPendingCall && (
            <div className="mb-4 p-3 rounded-xl bg-[#00a884]/15 border border-[#00a884]/30 text-[#00a884] dark:text-[#25d366] text-xs flex items-center gap-2.5 font-semibold">
              <Video className="w-4 h-4 shrink-0 animate-pulse" />
              <span>Video Call Invitation: Sign up to join room immediately</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign Up Button */}
          <button
            id="google-signup-button"
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading || googleLoading}
            className="w-full py-2.5 px-4 bg-white dark:bg-zinc-800/90 hover:bg-zinc-50 dark:hover:bg-zinc-750 border border-black/10 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 text-xs font-semibold rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                />
              </svg>
            )}
            <span>Sign up with Google</span>
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/10 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-white/80 dark:bg-zinc-900/90 px-2 text-zinc-400 font-medium">Or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar Picker */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 text-center">
                Select your avatar
              </label>
              <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                {AVATAR_SEEDS.map((seed) => {
                  const isSelected = selectedSeed === seed;
                  return (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => setSelectedSeed(seed)}
                      className={`w-9 h-9 rounded-full overflow-hidden transition-all ${
                        isSelected
                          ? 'ring-2 ring-emerald-500 scale-110 shadow-md'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`}
                        alt={seed}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full pl-9 pr-3 py-2.5 bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 rounded-2xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Username
                </label>
                {usernameStatus && (
                  <span
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      usernameStatus === 'Available'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500'
                    }`}
                  >
                    {usernameStatus === 'Available' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    {usernameStatus}
                  </span>
                )}
              </div>
              <div className="relative">
                <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  id="signup-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="alex99"
                  className="w-full pl-9 pr-3 py-2.5 bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 rounded-2xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all lowercase"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 rounded-2xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 rounded-2xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="signup-submit-button"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-semibold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Register Account</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Already have an account?{' '}
              <button
                id="switch-to-login"
                type="button"
                onClick={onSwitchToLogin}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
