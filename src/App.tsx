import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CallProvider, useCall } from './context/CallContext';
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
import { Conversation, UserProfile } from './types';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { MessageSquare, Video, ShieldCheck, Zap, PhoneCall } from 'lucide-react';

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
        setIsInstantCallModalOpen(true);
      }
    };

    handleCheckUrlForCall();
    window.addEventListener('hashchange', handleCheckUrlForCall);
    return () => window.removeEventListener('hashchange', handleCheckUrlForCall);
  }, []);

  // Loading indicator for auth check
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-zinc-100">
        <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-zinc-400 font-medium tracking-wide">Starting 1-to-1 Chat & Video...</p>
      </div>
    );
  }

  // Not logged in: Show Login / Sign Up
  if (!user || !profile) {
    if (authView === 'signup') {
      return <SignUpView onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginView onSwitchToSignUp={() => setAuthView('signup')} />;
  }

  // Handle selecting or creating a conversation with target user
  const handleSelectUserToChat = async (targetUser: UserProfile) => {
    if (!user || !profile) return;

    try {
      // Find existing 1-to-1 conversation
      const convQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid)
      );
      const snap = await getDocs(convQuery);

      let foundConv: Conversation | null = null;
      snap.forEach((d) => {
        const data = { id: d.id, ...d.data() } as Conversation;
        if (data.participants.includes(targetUser.uid) && data.participants.length === 2) {
          foundConv = data;
        }
      });

      if (foundConv) {
        setSelectedConversation(foundConv);
        setSelectedRecipient(targetUser);
      } else {
        // Create new conversation
        // Deterministic conversation ID for 1-to-1: sorted uids
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
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex overflow-hidden select-none">
      {/* Sidebar: Conversation List */}
      <div
        className={`h-full w-full md:w-80 lg:w-96 shrink-0 transition-all ${
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

      {/* Main Area: Active Chat or Welcome Placeholder */}
      <div
        className={`h-full flex-1 flex-col transition-all ${
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
          <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-zinc-950">
            <div className="w-16 h-16 rounded-3xl bg-emerald-600/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5 shadow-xl shadow-emerald-950/40">
              <Video className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Direct 1-to-1 Video Calling & Chat</h2>
            <p className="text-sm text-zinc-400 max-w-md leading-relaxed mb-6">
              Call any friend instantly via a shareable video link or search for users by their @username for private encrypted messaging and video calls.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                id="instant-call-welcome-btn"
                onClick={() => setIsInstantCallModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/50 flex items-center gap-2 transition-all"
              >
                <Video className="w-4 h-4" />
                <span>Instant Call Link</span>
              </button>

              <button
                id="start-chat-welcome-btn"
                onClick={() => setIsSearchModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold border border-zinc-700/60 shadow-sm flex items-center gap-2 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Search Contacts / New Chat</span>
              </button>
            </div>

            <div className="flex items-center gap-6 mt-12 text-zinc-400 text-xs">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Private 1-to-1</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>WebRTC Direct Audio & Video</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Global Overlays */}
      <UserSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectUser={handleSelectUserToChat}
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
    <AuthProvider>
      <CallProvider>
        <MainApp />
      </CallProvider>
    </AuthProvider>
  );
}
