import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, AtSign, Eye, EyeOff, Video, ArrowRight, AlertCircle } from 'lucide-react';
import { Avatar } from '../common/Avatar';

interface SignUpViewProps {
  onSwitchToLogin: () => void;
}

const AVATAR_SEEDS = ['Felix', 'Luna', 'Alex', 'Milo', 'Sam', 'Charlie', 'Riley', 'Jordan'];

export const SignUpView: React.FC<SignUpViewProps> = ({ onSwitchToLogin }) => {
  const { signup, checkUsernameAvailable } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSeed, setSelectedSeed] = useState('Felix');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);

  const handleUsernameChange = async (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
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
      // ignore check error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (usernameStatus === 'Taken') {
      setError('This username is already taken.');
      return;
    }

    setLoading(true);
    const photoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedSeed}`;

    try {
      await signup(email.trim(), password, displayName, username, photoURL);
    } catch (err: unknown) {
      const e = err as Error;
      let msg = e.message || 'Failed to create account.';
      if (e.message.includes('unauthorized-domain')) {
        msg = 'Domain not authorized: Please add this Netlify domain to Firebase Console > Authentication > Settings > Authorized Domains.';
      } else if (e.message.includes('email-already-in-use')) {
        msg = 'This email is already registered. Try signing in instead.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (name: string, uname: string, mail: string) => {
    setDisplayName(name);
    setUsername(uname);
    setEmail(mail);
    setPassword('Test123456!');
    setSelectedSeed(uname);
    setUsernameStatus('Available');
    setError(null);
  };

  const currentAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedSeed}`;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-950 text-zinc-100 py-10">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/30 mb-3 shadow-lg shadow-emerald-950/50">
            <Video className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create your account</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Sign up to chat and video call with friends
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar Picker */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-2">Choose Avatar</label>
              <div className="flex items-center gap-3">
                <Avatar name={displayName || 'User'} photoURL={currentAvatarUrl} size="lg" />
                <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {AVATAR_SEEDS.map((seed) => {
                    const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
                    const isSelected = selectedSeed === seed;
                    return (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => setSelectedSeed(seed)}
                        className={`w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 transition-all ${
                          isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={seed} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-name-input"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alice Smith"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-300">Username (Unique identifier)</label>
                {usernameStatus && (
                  <span
                    className={`text-[11px] font-medium ${
                      usernameStatus === 'Available' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {usernameStatus}
                  </span>
                )}
              </div>
              <div className="relative">
                <AtSign className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-username-input"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="alice_dev"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Other users will search for you with this @username.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="signup-submit-button"
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick presets */}
          <div className="mt-5 pt-4 border-t border-zinc-800/80">
            <p className="text-xs text-zinc-400 mb-2 font-medium">Quick prefill demo accounts:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleFillDemo('Alice Johnson', 'alice', 'alice@test.com')}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/50 transition-colors text-left truncate"
              >
                + Fill Alice (@alice)
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('Bob Martinez', 'bob', 'bob@test.com')}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/50 transition-colors text-left truncate"
              >
                + Fill Bob (@bob)
              </button>
            </div>
          </div>
        </div>

        {/* Footer switch to Login */}
        <p className="text-center text-sm text-zinc-400 mt-6">
          Already have an account?{' '}
          <button
            id="go-to-login-btn"
            onClick={onSwitchToLogin}
            className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};
