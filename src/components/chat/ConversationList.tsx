import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Conversation, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  MessageSquare,
  Search,
  Settings,
  User as UserIcon,
  Video,
  Phone,
  PhoneCall,
  Sun,
  Moon,
  MoreVertical,
  Camera,
  CheckCheck,
  Check,
  Plus,
  Link2,
  ArrowDownLeft,
  ArrowUpRight,
  PhoneMissed,
  Image as ImageIcon,
} from 'lucide-react';

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (conv: Conversation, recipient: UserProfile) => void;
  onOpenNewChatModal: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenInstantCall: () => void;
}

type TabType = 'chats' | 'status' | 'calls';

function formatLastMessageTime(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: '2-digit' });
}

export const ConversationList: React.FC<ConversationListProps> = ({
  selectedConversationId,
  onSelectConversation,
  onOpenNewChatModal,
  onOpenProfile,
  onOpenSettings,
  onOpenInstantCall,
}) => {
  const { user, profile } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [recipientProfiles, setRecipientProfiles] = useState<Record<string, UserProfile>>({});
  const [searchFilter, setSearchFilter] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  // Status updates state
  const [myStatus, setMyStatus] = useState<string>('Available');
  const [showStatusInput, setShowStatusInput] = useState(false);
  const [newStatusText, setNewStatusText] = useState('');

  // Listen to user conversations
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const convs: Conversation[] = [];
        const neededUserIds = new Set<string>();

        snapshot.forEach((docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() } as Conversation;
          convs.push(data);

          const otherUid = data.participants.find((p) => p !== user.uid);
          if (otherUid && !recipientProfiles[otherUid]) {
            neededUserIds.add(otherUid);
          }
        });

        setConversations(convs);
        setLoading(false);

        // Fetch any missing user profiles
        if (neededUserIds.size > 0) {
          const newProfiles = { ...recipientProfiles };
          for (const uid of neededUserIds) {
            try {
              const uSnap = await getDoc(doc(db, 'users', uid));
              if (uSnap.exists()) {
                newProfiles[uid] = { ...uSnap.data(), uid: uSnap.id } as UserProfile;
              }
            } catch {}
          }
          setRecipientProfiles(newProfiles);
        }
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Realtime updates for recipients
  useEffect(() => {
    if (!user || conversations.length === 0) return;

    const otherUids = Array.from(
      new Set(
        conversations
          .map((c) => c.participants.find((p) => p !== user.uid))
          .filter(Boolean) as string[]
      )
    );

    const unsubs = otherUids.map((uid) => {
      return onSnapshot(doc(db, 'users', uid), (snap) => {
        if (snap.exists()) {
          setRecipientProfiles((prev) => ({
            ...prev,
            [uid]: { ...snap.data(), uid: snap.id } as UserProfile,
          }));
        }
      });
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [conversations, user]);

  const filteredConversations = conversations.filter((c) => {
    if (!user) return false;
    const otherUid = c.participants.find((p) => p !== user.uid) || '';
    const otherProfile = recipientProfiles[otherUid];
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    const name = otherProfile?.displayName || otherProfile?.username || '';
    const lastMsg = c.lastMessage?.text || '';
    return name.toLowerCase().includes(term) || lastMsg.toLowerCase().includes(term);
  });

  const totalUnreadCount = conversations.reduce((acc, conv) => {
    if (user && conv.unreadCount?.[user.uid]) {
      return acc + conv.unreadCount[user.uid];
    }
    return acc;
  }, 0);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#121b22] text-[#111b21] dark:text-[#e9edef] select-none relative">
      {/* WhatsApp Signature Top Bar (Matches Screenshot) */}
      <div className="bg-[#075e54] dark:bg-[#1f2c34] text-white px-4 pt-3 pb-1 shadow-md z-20">
        {isSearching ? (
          <div className="flex items-center gap-2 py-1">
            <Search className="w-5 h-5 text-white/70 shrink-0" />
            <input
              id="search-chats-input"
              type="text"
              autoFocus
              placeholder="Search..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
            />
            <button
              onClick={() => {
                setIsSearching(false);
                setSearchFilter('');
              }}
              className="text-xs text-white/80 hover:text-white px-2 py-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between py-1">
            <h1 className="text-xl font-bold tracking-normal text-white">
              Call CAM
            </h1>

            <div className="flex items-center gap-2 text-white/90">
              <button
                id="search-toggle-btn"
                type="button"
                onClick={() => setIsSearching(true)}
                className="p-2 rounded-full hover:bg-black/15 transition-colors"
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              <button
                id="quick-theme-toggle"
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-black/15 transition-colors"
                title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-300" />
                ) : (
                  <Moon className="w-5 h-5 text-white" />
                )}
              </button>

              <div className="relative">
                <button
                  id="whatsapp-menu-button"
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-full hover:bg-black/15 transition-colors"
                  title="Menu"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showMenu && (
                  <div
                    className="absolute right-0 top-11 w-52 bg-white dark:bg-[#233138] text-zinc-800 dark:text-zinc-100 rounded-md shadow-2xl py-2 z-50 border border-black/5 dark:border-white/5 text-sm"
                    onClick={() => setShowMenu(false)}
                  >
                    <button
                      onClick={onOpenNewChatModal}
                      className="w-full text-left px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <span>New chat</span>
                    </button>
                    <button
                      onClick={onOpenInstantCall}
                      className="w-full text-left px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3"
                    >
                      <Video className="w-4 h-4 text-emerald-600" />
                      <span>Create call link</span>
                    </button>
                    <button
                      onClick={onOpenProfile}
                      className="w-full text-left px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3"
                    >
                      <UserIcon className="w-4 h-4 text-emerald-600" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={onOpenSettings}
                      className="w-full text-left px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3"
                    >
                      <Settings className="w-4 h-4 text-emerald-600" />
                      <span>Settings</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Navigation Tabs (Exactly as in Screenshot) */}
        <div className="flex items-center mt-2 border-b border-white/10 text-xs font-semibold tracking-wider">
          {/* Camera tab */}
          <button
            onClick={onOpenNewChatModal}
            className="py-2.5 px-2 text-white/70 hover:text-white transition-colors"
            title="Camera / Photo"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* CHATS Tab */}
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 text-center py-2.5 flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'chats'
                ? 'text-white border-b-4 border-white font-bold'
                : 'text-white/75 hover:text-white border-b-4 border-transparent'
            }`}
          >
            <span>CHATS</span>
            {totalUnreadCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#25d366] text-[#075e54] dark:text-[#111b21] text-[10.5px] font-extrabold flex items-center justify-center shadow-xs">
                {totalUnreadCount}
              </span>
            )}
          </button>

          {/* STATUS Tab */}
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 text-center py-2.5 transition-all ${
              activeTab === 'status'
                ? 'text-white border-b-4 border-white font-bold'
                : 'text-white/75 hover:text-white border-b-4 border-transparent'
            }`}
          >
            <span>STATUS</span>
          </button>

          {/* CALLS Tab */}
          <button
            onClick={() => setActiveTab('calls')}
            className={`flex-1 text-center py-2.5 transition-all ${
              activeTab === 'calls'
                ? 'text-white border-b-4 border-white font-bold'
                : 'text-white/75 hover:text-white border-b-4 border-transparent'
            }`}
          >
            <span>CALLS</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ===================== TAB 1: CHATS ===================== */}
        {activeTab === 'chats' && (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {loading ? (
              <div className="p-12 text-center text-zinc-400 text-xs">
                <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading Call CAM chats...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <div className="w-14 h-14 rounded-full bg-[#00a884]/15 text-[#00a884] flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                  No conversations yet
                </h3>
                <p className="text-xs text-zinc-400 mb-4 max-w-xs mx-auto">
                  Tap the green chat button below to start messaging or video calling your friends.
                </p>
                <button
                  onClick={onOpenNewChatModal}
                  className="px-4 py-2 rounded-full bg-[#00a884] hover:bg-[#008069] text-white text-xs font-semibold shadow-md transition-all"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const otherUid = conv.participants.find((p) => p !== user?.uid) || '';
                const otherProfile = recipientProfiles[otherUid] || (conv.participantData?.[otherUid] as UserProfile);
                const isSelected = selectedConversationId === conv.id;
                const unread = (user && conv.unreadCount?.[user.uid]) || 0;
                const isLastMsgMe = user && conv.lastMessage?.senderId === user.uid;

                return (
                  <div
                    key={conv.id}
                    id={`conversation-item-${conv.id}`}
                    onClick={() => {
                      if (otherProfile) {
                        onSelectConversation(conv, otherProfile);
                      }
                    }}
                    className={`px-4 py-3 flex items-center gap-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#f0f2f5] dark:bg-[#202c33]'
                        : 'hover:bg-[#f5f6f6] dark:hover:bg-[#182229]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        name={otherProfile?.displayName || otherProfile?.username || 'User'}
                        photoURL={otherProfile?.photoURL}
                        size="md"
                        isOnline={otherProfile?.isOnline}
                        showOnlineStatus
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h2 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                          {otherProfile?.displayName || otherProfile?.username || 'WhatsApp Contact'}
                        </h2>
                        <span
                          className={`text-[11px] shrink-0 ml-2 ${
                            unread > 0
                              ? 'text-[#25d366] font-semibold'
                              : 'text-zinc-500 dark:text-[#8696a0]'
                          }`}
                        >
                          {formatLastMessageTime(conv.updatedAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0 text-zinc-500 dark:text-[#8696a0] text-xs">
                          {isLastMsgMe && (
                            <span className="shrink-0">
                              {conv.lastMessage?.seen ? (
                                <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                              ) : (
                                <Check className="w-4 h-4 text-zinc-400" />
                              )}
                            </span>
                          )}

                          {conv.lastMessage?.imageUrl ? (
                            <span className="flex items-center gap-1 text-xs truncate">
                              <ImageIcon className="w-3.5 h-3.5 text-zinc-500" />
                              <span>Photo</span>
                            </span>
                          ) : (
                            <p className="truncate text-xs leading-tight">
                              {conv.lastMessage?.text || 'Tap to chat'}
                            </p>
                          )}
                        </div>

                        {unread > 0 && (
                          <span className="shrink-0 min-w-[20px] h-[20px] px-1.5 bg-[#25d366] text-white font-bold rounded-full text-[10.5px] flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ===================== TAB 2: STATUS ===================== */}
        {activeTab === 'status' && (
          <div className="p-4 space-y-4">
            {/* My Status */}
            <div className="flex items-center gap-3.5 cursor-pointer group pb-3 border-b border-black/5 dark:border-white/5">
              <div className="relative">
                <Avatar
                  name={profile?.displayName || 'My Profile'}
                  photoURL={profile?.photoURL}
                  size="md"
                />
                <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#00a884] text-white flex items-center justify-center text-xs ring-2 ring-white dark:ring-[#121b22]">
                  <Plus className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
                  My status
                </h3>
                <p className="text-xs text-zinc-500 dark:text-[#8696a0] truncate">
                  {myStatus}
                </p>
              </div>
              <button
                onClick={() => setShowStatusInput(!showStatusInput)}
                className="text-xs text-[#00a884] font-semibold hover:underline"
              >
                Update
              </button>
            </div>

            {/* Quick status edit box */}
            {showStatusInput && (
              <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl space-y-2">
                <input
                  type="text"
                  placeholder="Set your Call CAM status..."
                  value={newStatusText}
                  onChange={(e) => setNewStatusText(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-[#202c33] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowStatusInput(false)}
                    className="text-xs px-3 py-1 text-zinc-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newStatusText.trim()) {
                        setMyStatus(newStatusText.trim());
                        setNewStatusText('');
                        setShowStatusInput(false);
                      }
                    }}
                    className="text-xs px-3 py-1 bg-[#00a884] text-white rounded-md font-semibold"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Recent status updates from contacts */}
            <div>
              <p className="text-xs font-bold text-zinc-500 dark:text-[#8696a0] uppercase tracking-wider mb-2">
                Recent updates
              </p>
              <div className="space-y-3">
                {(Object.values(recipientProfiles) as UserProfile[]).slice(0, 5).map((p) => (
                  <div key={p.uid} className="flex items-center gap-3.5">
                    <div className="ring-2 ring-[#00a884] p-0.5 rounded-full">
                      <Avatar name={p.displayName || p.username} photoURL={p.photoURL} size="md" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                        {p.displayName || p.username}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-[#8696a0]">
                        {p.isOnline ? 'Online now' : 'Today, 10:24 AM'}
                      </p>
                    </div>
                  </div>
                ))}
                {Object.values(recipientProfiles).length === 0 && (
                  <p className="text-xs text-zinc-400 py-4 text-center">
                    No recent updates from your contacts
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: CALLS ===================== */}
        {activeTab === 'calls' && (
          <div className="p-4 space-y-4">
            {/* Create Call Link Banner */}
            <div
              onClick={onOpenInstantCall}
              className="flex items-center gap-3.5 cursor-pointer group pb-3 border-b border-black/5 dark:border-white/5"
            >
              <div className="w-11 h-11 rounded-full bg-[#00a884] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Link2 className="w-5 h-5 rotate-45" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
                  Create call link
                </h3>
                <p className="text-xs text-zinc-500 dark:text-[#8696a0] truncate">
                  Share a link for your Call CAM video or voice call
                </p>
              </div>
            </div>

            {/* Recent Calls */}
            <div>
              <p className="text-xs font-bold text-zinc-500 dark:text-[#8696a0] uppercase tracking-wider mb-2">
                Recent
              </p>
              <div className="space-y-3">
                {(Object.values(recipientProfiles) as UserProfile[]).map((p, idx) => (
                  <div key={p.uid} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={p.displayName || p.username} photoURL={p.photoURL} size="md" />
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                          {p.displayName || p.username}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-[#8696a0]">
                          {idx % 2 === 0 ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-[#00a884]" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
                          )}
                          <span>{idx === 0 ? 'Yesterday, 8:15 PM' : '26 March, 11:35 AM'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={onOpenInstantCall}
                      className="p-2.5 text-[#00a884] hover:bg-[#00a884]/10 rounded-full transition-colors"
                      title="Start Call"
                    >
                      <Video className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {Object.values(recipientProfiles).length === 0 && (
                  <p className="text-xs text-zinc-400 py-6 text-center">
                    To start a call with someone, tap the video or call button.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) - WhatsApp Signature */}
      <div className="absolute right-5 bottom-5 z-30">
        {activeTab === 'chats' && (
          <button
            id="fab-new-chat-button"
            type="button"
            onClick={onOpenNewChatModal}
            className="w-14 h-14 rounded-full bg-[#00a884] hover:bg-[#008069] text-white shadow-xl flex items-center justify-center transition-transform active:scale-95"
            title="New Chat"
          >
            <MessageSquare className="w-6 h-6 fill-current" />
          </button>
        )}
        {activeTab === 'status' && (
          <button
            onClick={() => setShowStatusInput(true)}
            className="w-14 h-14 rounded-full bg-[#00a884] hover:bg-[#008069] text-white shadow-xl flex items-center justify-center transition-transform active:scale-95"
            title="Edit Status"
          >
            <Camera className="w-6 h-6" />
          </button>
        )}
        {activeTab === 'calls' && (
          <button
            onClick={onOpenInstantCall}
            className="w-14 h-14 rounded-full bg-[#00a884] hover:bg-[#008069] text-white shadow-xl flex items-center justify-center transition-transform active:scale-95"
            title="Start Call"
          >
            <PhoneCall className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};
