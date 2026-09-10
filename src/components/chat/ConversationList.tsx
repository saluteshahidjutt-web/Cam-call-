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
import { Conversation, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { MessageSquarePlus, Search, Settings, User as UserIcon, Video, AlertCircle } from 'lucide-react';

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (conv: Conversation, recipient: UserProfile) => void;
  onOpenNewChatModal: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

function formatLastMessageTime(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();

  // If today: 2:45 PM
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // If yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  // Older: e.g. Sep 8
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const ConversationList: React.FC<ConversationListProps> = ({
  selectedConversationId,
  onSelectConversation,
  onOpenNewChatModal,
  onOpenProfile,
  onOpenSettings,
}) => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [recipientProfiles, setRecipientProfiles] = useState<Record<string, UserProfile>>({});
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(true);

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

  // Also listen in realtime to the profiles of the other participants (to update online status in real-time)
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

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-r border-zinc-800 text-zinc-100 select-none">
      {/* Top Header */}
      <div className="p-3.5 border-b border-zinc-800/90 flex items-center justify-between bg-zinc-900/95 sticky top-0 z-10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onOpenProfile}>
          <Avatar
            name={profile?.displayName || profile?.username || 'User'}
            photoURL={profile?.photoURL}
            size="md"
            isOnline={profile?.isOnline}
            showOnlineStatus
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate text-white leading-tight">
              {profile?.displayName || 'My Account'}
            </h2>
            <p className="text-xs text-zinc-400 truncate">@{profile?.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="new-chat-button"
            onClick={onOpenNewChatModal}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Start new conversation"
          >
            <MessageSquarePlus className="w-5 h-5 text-emerald-400" />
          </button>
          <button
            id="profile-button"
            onClick={onOpenProfile}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Edit Profile"
          >
            <UserIcon className="w-5 h-5" />
          </button>
          <button
            id="settings-button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Settings & Audio/Video Test"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Conversations */}
      <div className="p-3 border-b border-zinc-800/60 bg-zinc-950/30">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="filter-chats-input"
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Conversations List View */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500 text-xs">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-zinc-400 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 flex items-center justify-center mx-auto mb-3 text-zinc-400">
              <Video className="w-6 h-6" />
            </div>
            <p className="font-medium text-zinc-300">No active conversations</p>
            <p className="text-zinc-500 mt-1">Find another user by @username to chat or video call.</p>
            <button
              id="empty-start-chat-btn"
              onClick={onOpenNewChatModal}
              className="mt-4 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              Start a Conversation
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const otherUid = conv.participants.find((p) => p !== user?.uid) || '';
            const recipient = recipientProfiles[otherUid] || {
              uid: otherUid,
              displayName: conv.participantData?.[otherUid]?.displayName || 'User',
              username: conv.participantData?.[otherUid]?.username || 'user',
              photoURL: conv.participantData?.[otherUid]?.photoURL,
              isOnline: false,
            };

            const isSelected = selectedConversationId === conv.id;
            const unread = user && conv.unreadCount?.[user.uid] ? conv.unreadCount[user.uid] : 0;

            return (
              <div
                key={conv.id}
                id={`conversation-item-${conv.id}`}
                onClick={() => onSelectConversation(conv, recipient as UserProfile)}
                className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-zinc-800/90 border-l-4 border-l-emerald-500'
                    : 'hover:bg-zinc-800/40'
                }`}
              >
                <Avatar
                  name={recipient.displayName || recipient.username}
                  photoURL={recipient.photoURL}
                  size="md"
                  isOnline={recipient.isOnline}
                  showOnlineStatus
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h3 className="text-sm font-semibold text-zinc-100 truncate">
                      {recipient.displayName || recipient.username}
                    </h3>
                    <span className="text-[11px] text-zinc-500 shrink-0">
                      {formatLastMessageTime(conv.updatedAt || conv.lastMessage?.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-zinc-400 truncate">
                      {conv.lastMessage ? (
                        <span>
                          {conv.lastMessage.senderId === user?.uid ? 'You: ' : ''}
                          {conv.lastMessage.text}
                        </span>
                      ) : (
                        <span className="italic text-zinc-500">Conversation started</span>
                      )}
                    </p>

                    {unread > 0 && (
                      <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-zinc-950 font-bold text-[10px]">
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
    </div>
  );
};
