import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CallProvider, useCall } from './context/CallContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LoginView } from './components/auth/LoginView';
import { SignUpView } from './components/auth/SignUpView';
import { ConversationList } from './components/chat/ConversationList';
import { ChatScreen } from './components/chat/ChatScreen';
import { UserSearchModal } from './components/chat/UserSearchModal';
import { IncomingCallModal } from './components/call/IncomingCallModal';
import { VideoCallScreen } from './components/call/VideoCallScreen';
import { InstantCallModal } from './components/call/InstantCallModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { SettingsModal } from './components/profile/SettingsModal';
import { IosChatBackground } from './components/common/IosChatBackground';
import { Conversation, UserProfile } from './types';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { MessageSquare, Video, ShieldCheck, Zap, Sparkles } from 'lucide-react';

function MainApp() {
  const { user, profile, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(null);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isInstantCallModalOpen, setIsInstantCallModalOpen] = useState(false);
  const [initialCallIdFromUrl, setInitialCallIdFromUrl] = useState<string | undefined>(undefined);

  // Check URL for direct #call=ID or ?call=ID to join
  React.useEffect(() => {
    const handleCheckUrlForCall = () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      let callId = params.get('call');
      if (!callId && hash.includes('#call=')) {
        callId = hash.split('#call=')[1].split('&')[0];
      }
      if (callId) {
        setInitialCallIdFromUrl(callId);
        try {
          sessionStorage.setItem('pending_call_id', callId);
        } catch {}
        setIsInstantCallModalOpen(true);
      } else {
        try {
          const saved = sessionStorage.getItem('pending_call_id');
          if (saved) {
            setInitialCallIdFromUrl(saved);
            setIsInstantCallModalOpen(true);
          }
        } catch {}
      }
    };

    handleCheckUrlForCall();
    window.addEventListener('hashchange', handleCheckUrlForCall);
    return () => window.removeEventListener('hashchange', handleCheckUrlForCall);
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#f0f2f5] dark:bg-[#0c1317] flex flex-col items-center justify-center text-[#111b21] dark:text-[#e9edef] transition-colors">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[#00a884] text-white flex items-center justify-center shadow-lg">
            <Video className="w-8 h-8 animate-pulse" />
          </div>
          <div className="w-6 h-6 border-2 border-[#00a884]/30 border-t-[#00a884] rounded-full animate-spin absolute -bottom-2 -right-2 bg-white dark:bg-zinc-900 shadow-sm" />
        </div>
        <p className="text-sm font-semibold tracking-wide">Call CAM</p>
        <p className="text-xs text-zinc-400 mt-1">Connecting...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return authView === 'login' ? (
      <LoginView onSwitchToSignUp={() => setAuthView('signup')} />
    ) : (
      <SignUpView onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  const handleStartChatWithUser = async (targetUser: UserProfile) => {
    setIsSearchModalOpen(false);
    if (!user || !profile) return;

    try {
      const convsRef = collection(db, 'conversations');
      const q = query(convsRef, where('participants', 'array-contains', user.uid));
      const snap = await getDocs(q);

      let foundConv: Conversation | null = null;
      snap.forEach((d) => {
        const c = { id: d.id, ...d.data() } as Conversation;
        if (c.participants.includes(targetUser.uid)) {
          foundConv = c;
        }
      });

      if (foundConv) {
        setSelectedConversation(foundConv);
        setSelectedRecipient(targetUser);
      } else {
        const convId = [user.uid, targetUser.uid].sort().join('_');
        const newConv: Conversation = {
          id: convId,
          participants: [user.uid, targetUser.uid],
          participantData: {
            [user.uid]: {
              displayName: profile.displayName || profile.username,
              username: profile.username,
              photoURL: profile.photoURL,
              email: profile.email,
            },
            [targetUser.uid]: {
              displayName: targetUser.displayName || targetUser.username,
              username: targetUser.username,
              photoURL: targetUser.photoURL,
              email: targetUser.email,
            },
          },
          updatedAt: Date.now(),
          unreadCount: {
            [user.uid]: 0,
            [targetUser.uid]: 0,
          },
        };

        await setDoc(doc(db, 'conversations', convId), newConv);
        setSelectedConversation(newConv);
        setSelectedRecipient(targetUser);
      }
    } catch {
      // Error creating conversation
    }
  };

  return (
    <div className="h-screen w-screen bg-[#f0f2f5] dark:bg-[#0c1317] text-[#111b21] dark:text-[#e9edef] flex overflow-hidden select-none transition-colors">
      {/* Sidebar: Conversation List */}
      <div
        className={`h-full w-full md:w-80 lg:w-96 shrink-0 transition-all border-r border-[#e9edef] dark:border-[#222e35] ${
          selectedConversation ? 'hidden md:flex flex-col' : 'flex flex-col'
        }`}
      >
        <ConversationList
          selectedConversationId={selectedConversation?.id || null}
          onSelectConversation={(conv, recipient) => {
            setSelectedConversation(conv);
            setSelectedRecipient(recipient);
          }}
          onOpenNewChatModal={() => setIsSearchModalOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenInstantCall={() => setIsInstantCallModalOpen(true)}
        />
      </div>

      {/* Main Panel: Active Chat or Empty State */}
      <div
        className={`h-full flex-1 flex flex-col min-w-0 transition-all ${
          selectedConversation ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedConversation && selectedRecipient ? (
          <ChatScreen
            conversation={selectedConversation}
            recipient={selectedRecipient}
            onBack={() => {
              setSelectedConversation(null);
              setSelectedRecipient(null);
            }}
          />
        ) : (
          /* WhatsApp Desktop Empty State Screen */
          <div className="h-full flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden bg-[#f0f2f5] dark:bg-[#111b21]">
            <IosChatBackground />

            <div className="max-w-md w-full relative z-10 bg-white dark:bg-[#1f2c34] rounded-2xl p-8 sm:p-10 shadow-lg border border-black/5 dark:border-white/10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-[#00a884] text-white flex items-center justify-center mb-5 shadow-lg shadow-emerald-900/10">
                <Video className="w-10 h-10" />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-[#111b21] dark:text-white mb-2">
                Call CAM
              </h2>
              <p className="text-xs text-zinc-500 dark:text-[#8696a0] leading-relaxed mb-6">
                Send and receive real-time messages, share photos, and make peer-to-peer video calls securely.
              </p>

              <div className="grid grid-cols-2 gap-3 w-full mb-6">
                <button
                  id="empty-state-new-call"
                  type="button"
                  onClick={() => setIsInstantCallModalOpen(true)}
                  className="py-2.5 px-4 rounded-full bg-[#00a884] hover:bg-[#008069] active:scale-95 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  <span>Call Link</span>
                </button>
                <button
                  id="empty-state-new-chat"
                  type="button"
                  onClick={() => setIsSearchModalOpen(true)}
                  className="py-2.5 px-4 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 text-zinc-800 dark:text-white font-semibold text-xs border border-black/10 dark:border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>New Chat</span>
                </button>
              </div>

              {/* End to end encryption pill */}
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-[#8696a0]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00a884]" />
                <span>End-to-end encrypted</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <UserSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectUser={handleStartChatWithUser}
      />

      <InstantCallModal
        isOpen={isInstantCallModalOpen}
        onClose={() => {
          setIsInstantCallModalOpen(false);
          setInitialCallIdFromUrl(undefined);
        }}
        initialCallId={initialCallIdFromUrl}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Global Incoming Call Banner & Fullscreen Video Screen */}
      <IncomingCallModal />
      <VideoCallScreen />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CallProvider>
          <MainApp />
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
