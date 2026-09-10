import React, { useState, useEffect } from 'react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { Search, X, MessageSquare, Video, Loader2, Users } from 'lucide-react';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: UserProfile) => void;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
}) => {
  const { user: currentUser } = useAuth();
  const { startCall } = useCall();

  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(30));
        const snap = await getDocs(q);
        const usersList: UserProfile[] = [];

        snap.forEach((doc) => {
          if (doc.id !== currentUser?.uid) {
            usersList.push({ ...doc.data(), uid: doc.id } as UserProfile);
          }
        });
        setResults(usersList);
      } catch {
        // search error
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const filtered = results.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      u.username?.toLowerCase().includes(term) ||
      u.displayName?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  });

  const handleStartCall = (target: UserProfile) => {
    onClose();
    startCall(target.uid, target.displayName || target.username, target.photoURL);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 transition-colors animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#1f2c34] rounded-2xl p-6 shadow-2xl text-[#111b21] dark:text-[#e9edef] border border-black/5 dark:border-white/10 relative flex flex-col max-h-[85vh]">
        <button
          id="close-search-modal"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-[#00a884]" />
          <h3 className="text-xl font-bold tracking-tight">New Contact & Chat</h3>
        </div>
        <p className="text-xs text-zinc-500 dark:text-[#8696a0] mb-4">
          Find registered users by name, @username, or email
        </p>

        {/* Search input */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            id="search-users-input"
            type="text"
            placeholder="Search by username or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-xs focus:ring-2 focus:ring-emerald-500/40 focus:outline-none transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto space-y-1 divide-y divide-black/[0.03] dark:divide-white/[0.04] scrollbar-thin pr-1">
          {loading ? (
            <div className="py-12 text-center text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
              <p className="text-xs">Finding contacts...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 dark:text-zinc-500">
              <p className="text-xs">No users found matching "{searchTerm}"</p>
            </div>
          ) : (
            filtered.map((target) => (
              <div
                key={target.uid}
                className="pt-2 pb-2 px-2 rounded-xl flex items-center justify-between hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
              >
                <div
                  className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 mr-2"
                  onClick={() => onSelectUser(target)}
                >
                  <Avatar
                    name={target.displayName || target.username}
                    photoURL={target.photoURL}
                    size="md"
                    isOnline={target.isOnline}
                    showOnlineStatus
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate text-zinc-900 dark:text-zinc-100">
                      {target.displayName || target.username}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      @{target.username}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onSelectUser(target)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title="Chat"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleStartCall(target)}
                    className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/30 transition-colors"
                    title="Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
