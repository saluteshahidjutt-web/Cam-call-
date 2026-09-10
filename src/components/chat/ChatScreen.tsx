import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { Conversation, Message, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { MessageBubble } from './MessageBubble';
import { soundManager } from '../../lib/sound';
import { ArrowLeft, Video, Send, Smile } from 'lucide-react';

interface ChatScreenProps {
  conversation: Conversation;
  recipient: UserProfile;
  onBack: () => void;
}

function formatLastSeen(lastSeen?: number, isOnline?: boolean): string {
  if (isOnline) return 'Online';
  if (!lastSeen) return 'Offline';
  const diff = Date.now() - lastSeen;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${new Date(lastSeen).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  conversation,
  recipient,
  onBack,
}) => {
  const { user, profile } = useAuth();
  const { startCall } = useCall();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Listen to messages in real-time
  useEffect(() => {
    if (!conversation.id || !user) return;

    const messagesCol = collection(db, 'conversations', conversation.id, 'messages');
    const q = query(messagesCol, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      const unreadBatch = writeBatch(db);
      let hasUnread = false;

      snapshot.forEach((d) => {
        const msg = { id: d.id, ...d.data() } as Message;
        msgs.push(msg);

        // Mark incoming messages as seen
        if (msg.senderId !== user.uid && !msg.seen) {
          unreadBatch.update(d.ref, { seen: true, seenAt: Date.now() });
          hasUnread = true;
        }
      });

      setMessages(msgs);

      if (hasUnread) {
        unreadBatch.commit().catch(() => {});
        // Reset unread count for current user
        updateDoc(doc(db, 'conversations', conversation.id), {
          [`unreadCount.${user.uid}`]: 0,
        }).catch(() => {});
      }
    });

    return () => unsubscribe();
  }, [conversation.id, user]);

  // Scroll on messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !user || sending) return;

    setSending(true);
    setInputText('');
    soundManager.playMessageTone();

    try {
      const now = Date.now();
      const messagesCol = collection(db, 'conversations', conversation.id, 'messages');

      await addDoc(messagesCol, {
        conversationId: conversation.id,
        senderId: user.uid,
        text,
        timestamp: now,
        seen: false,
      });

      const otherUid = recipient.uid;
      const currentUnread = conversation.unreadCount?.[otherUid] || 0;

      // Update conversation metadata
      await updateDoc(doc(db, 'conversations', conversation.id), {
        lastMessage: {
          text,
          senderId: user.uid,
          timestamp: now,
          seen: false,
        },
        updatedAt: now,
        [`unreadCount.${otherUid}`]: currentUnread + 1,
      });
    } catch {
      // Message sending error
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:px-4 border-b border-zinc-800 bg-zinc-900/95 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            id="chat-back-button"
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <Avatar
            name={recipient.displayName || recipient.username}
            photoURL={recipient.photoURL}
            size="md"
            isOnline={recipient.isOnline}
            showOnlineStatus
          />

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">
              {recipient.displayName || recipient.username}
            </h2>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 truncate">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  recipient.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                }`}
              />
              <span>{formatLastSeen(recipient.lastSeen, recipient.isOnline)}</span>
            </p>
          </div>
        </div>

        {/* Action button: 1-to-1 Video Call */}
        <div className="flex items-center gap-2">
          <button
            id="start-video-call-btn"
            onClick={() => startCall(recipient)}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-emerald-950/40"
            title={`Start video call with ${recipient.displayName || recipient.username}`}
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Video Call</span>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 text-xs">
            <Avatar
              name={recipient.displayName || recipient.username}
              photoURL={recipient.photoURL}
              size="xl"
              isOnline={recipient.isOnline}
              showOnlineStatus
              className="mb-3"
            />
            <p className="font-semibold text-sm text-zinc-300">
              {recipient.displayName || recipient.username}
            </p>
            <p className="text-zinc-500 mt-0.5">@{recipient.username}</p>
            <p className="mt-3 text-xs text-zinc-400 max-w-xs">
              This is the beginning of your private 1-to-1 conversation. Messages and calls are directly connected.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMe={msg.senderId === user?.uid}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-900/90 shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            id="chat-message-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message @${recipient.username}...`}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />

          <button
            id="send-message-btn"
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl transition-all shadow-xs shrink-0 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
