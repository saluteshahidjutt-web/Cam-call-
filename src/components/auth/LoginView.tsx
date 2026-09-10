import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { Video, Mail, Lock, Eye, EyeOff, AlertCircle, Sun, Moon, Sparkles } from 'lucide-react';

interface LoginViewProps {
  onSwitchToSignUp: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSwitchToSignUp }) => {
  const { login, loginWithGoogle, loginAsGuest } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const hasPendingCall = Boolean(
    window.location.hash.includes('#call=') ||
    window.location.search.includes('call=') ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pending_call_id'))
  );

  const handleGuestSignIn = async () => {
    setError(null);
    setGuestLoading(true);
    try {
      await loginAsGuest();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to sign in as guest.');
    } finally {
      setGuestLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const e = err as Error;
      let msg = 'Google sign in failed.';
      if (e.message?.includes('unauthorized-domain')) {
        msg = 'Domain not authorized yet in Firebase Console > Authentication > Settings.';
      } else if (e.message?.includes('operation-not-allowed')) {
        msg = 'Google Sign-in is not enabled in Firebase Console.';
      } else if (e.message?.includes('popup-closed-by-user')) {
        msg = 'Sign in popup was closed. Please try again.';
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
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const e = err as Error;
      let msg = 'Failed to sign in. Please check your credentials.';
      if (e.message?.includes('user-not-found') || e.message?.includes('wrong-password') || e.message?.includes('invalid-credential')) {
        msg = 'Invalid email or password.';
      } else if (e.message?.includes('operation-not-allowed')) {
        msg = 'Email/Password sign in is disabled in Firebase Console.';
      } else if (e.message?.includes('too-many-requests')) {
        msg = 'Too many attempts. Please try again in a few minutes.';
      } else if (e.message) {
        msg = e.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f0f2f5] dark:bg-[#0c1317] text-[#111b21] dark:text-[#e9edef] relative transition-colors">
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
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00a884] text-white shadow-lg mb-3">
            <Video className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111b21] dark:text-white">
            Call CAM
          </h1>
          <p className="text-xs text-zinc-500 dark:text-[#8696a0] mt-1">
            Real-time messaging, photos & peer-to-peer video calls
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1f2c34] rounded-2xl p-6 sm:p-8 shadow-xl border border-black/5 dark:border-white/10">
          {hasPendingCall && (
            <div className="mb-4 p-3 rounded-xl bg-[#00a884]/15 border border-[#00a884]/30 text-[#00a884] dark:text-[#25d366] text-xs flex items-center gap-2.5 font-semibold">
              <Video className="w-4 h-4 shrink-0 animate-pulse" />
              <span>Video Call Invitation: Sign in to join room immediately</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            id="google-login-button"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading || guestLoading}
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
            <span>Sign in with Google</span>
          </button>

          {/* 1-Click Guest Sign In Option */}
          <button
            id="guest-login-button"
            type="button"
            onClick={handleGuestSignIn}
            disabled={loading || googleLoading || guestLoading}
            className="mt-2.5 w-full py-2.5 px-4 bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            {guestLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>⚡ Join as Guest (1-Click Instant Access)</span>
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/10 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-white/80 dark:bg-zinc-900/90 px-2 text-zinc-400 font-medium">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 rounded-2xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              id="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-semibold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Don't have an account?{' '}
              <button
                id="switch-to-signup"
                type="button"
                onClick={onSwitchToSignUp}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                Create Account
              </button>
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5">
            <PWAInstallButton variant="banner" />
          </div>
        </div>
      </div>
    </div>
  );
};
