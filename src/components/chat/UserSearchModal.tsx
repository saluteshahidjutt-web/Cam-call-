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
    startCall(target);
  };

  const handleSelect = (target: UserProfile) => {
    onSelectUser(target);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-base">New 1-to-1 Conversation</h3>
          </div>
          <button
            id="close-search-user-modal"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-950/40">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-username-input"
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, @username or email..."
              className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400 text-sm gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span>Finding contacts...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-sm">
              <p>No registered users found matching "{searchTerm}".</p>
              <p className="text-xs text-zinc-500 mt-1">
                Tip: Open another browser tab/incognito and register a 2nd user to test!
              </p>
            </div>
          ) : (
            filtered.map((u) => (
              <div
                key={u.uid}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/40 transition-all group"
              >
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  onClick={() => handleSelect(u)}
                >
                  <Avatar
                    name={u.displayName || u.username}
                    photoURL={u.photoURL}
                    size="md"
                    isOnline={u.isOnline}
                    showOnlineStatus
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-100 truncate">
                        {u.displayName || u.username}
                      </p>
                      {u.isOnline && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Online
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">@{u.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    id={`chat-with-${u.username}`}
                    onClick={() => handleSelect(u)}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white transition-colors"
                    title="Send message"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    id={`call-with-${u.username}`}
                    onClick={() => handleStartCall(u)}
                    className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition-colors"
                    title="Start 1-to-1 video call"
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
