import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { X, Save, CheckCircle2, Sparkles, User, FileText } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_SEEDS = ['Felix', 'Luna', 'Alex', 'Milo', 'Sam', 'Charlie', 'Riley', 'Jordan', 'Shadow', 'Oliver'];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateUserProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !profile) return null;

  const handleSelectSeed = (seed: string) => {
    const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
    setPhotoURL(url);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoURL: photoURL.trim(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 transition-colors animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#1f2c34] rounded-2xl p-6 shadow-2xl text-[#111b21] dark:text-[#e9edef] border border-black/5 dark:border-white/10 relative">
        <button
          id="close-profile-modal"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold tracking-tight mb-1">Profile</h3>
        <p className="text-xs text-zinc-500 dark:text-[#8696a0] mb-6">
          Customize your display name, bio, and avatar
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile successfully updated!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Current Avatar & Seed selection */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <Avatar
                name={displayName || profile.username}
                photoURL={photoURL}
                size="xl"
                className="ring-4 ring-emerald-500/30 shadow-md"
              />
              <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 text-white shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
            </div>

            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-2">
              Choose Avatar Style:
            </p>

            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 px-1 scrollbar-none">
              {AVATAR_SEEDS.map((seed) => {
                const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
                const isSelected = photoURL === url;
                return (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => handleSelectSeed(seed)}
                    className={`w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 transition-transform ${
                      isSelected
                        ? 'border-emerald-500 scale-110 shadow-md'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={seed} className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Username (Read Only) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Username (Immutable)
            </label>
            <input
              type="text"
              disabled
              value={`@${profile.username}`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-zinc-500 dark:text-zinc-400 font-mono cursor-not-allowed"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Display Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                id="edit-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={40}
                placeholder="e.g. Sarah Jenkins"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-xs focus:ring-2 focus:ring-emerald-500/40 focus:outline-none transition-all text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              About / Bio
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
              <textarea
                id="edit-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={140}
                rows={2}
                placeholder="Hey there! I am using 1-to-1 Video & Chat."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-xs focus:ring-2 focus:ring-emerald-500/40 focus:outline-none transition-all resize-none text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="save-profile-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
