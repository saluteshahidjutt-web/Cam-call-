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
import { IosChatBackground } from '../common/IosChatBackground';
import { soundManager } from '../../lib/sound';
import {
  ArrowLeft,
  Video,
  Send,
  Smile,
  Phone,
  Paperclip,
  Camera,
  Mic,
  MoreVertical,
  FileText,
  Image as GalleryIcon,
  Headphones,
  MapPin,
  User as ContactIcon,
  X,
  Check,
} from 'lucide-react';

interface ChatScreenProps {
  conversation: Conversation;
  recipient: UserProfile;
  onBack: () => void;
}

function formatLastSeen(lastSeen?: number, isOnline?: boolean): string {
  if (isOnline) return 'online';
  if (!lastSeen) return 'offline';
  const diff = Date.now() - lastSeen;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'last seen just now';
  if (minutes < 60) return `last seen today at ${new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return `last seen ${new Date(lastSeen).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

// Helper to compress image client-side to lightweight JPEG base64
async function compressImage(file: File, maxDimension = 1080, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context failed'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  conversation,
  recipient,
  onBack,
}) => {
  const { user } = useAuth();
  const { startCall } = useCall();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);

  // Selected image preview modal state
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        if (!msg.seen && msg.senderId !== user.uid) {
          unreadBatch.update(doc(db, 'conversations', conversation.id, 'messages', msg.id), {
            seen: true,
            seenAt: Date.now(),
          });
          hasUnread = true;
        }
      });

      setMessages(msgs);
      scrollToBottom();

      // Clear unread count for current user
      if (hasUnread) {
        unreadBatch.commit().catch(() => {});
        updateDoc(doc(db, 'conversations', conversation.id), {
          [`unreadCount.${user.uid}`]: 0,
        }).catch(() => {});
      }
    });

    return () => unsubscribe();
  }, [conversation.id, user]);

  const handleStartCall = () => {
    if (!recipient) return;
    startCall(
      recipient.uid,
      recipient.displayName || recipient.username,
      recipient.photoURL
    );
  };

  const handleSendMessage = async (customText?: string, imageUrl?: string) => {
    const text = (customText !== undefined ? customText : inputText).trim();
    if ((!text && !imageUrl) || !user || sending) return;

    setSending(true);
    setInputText('');
    setSelectedImagePreview(null);
    setImageCaption('');
    setShowAttachmentMenu(false);
    soundManager.playMessageTone();

    try {
      const now = Date.now();
      const messagesCol = collection(db, 'conversations', conversation.id, 'messages');

      const messagePayload: Partial<Message> = {
        conversationId: conversation.id,
        senderId: user.uid,
        timestamp: now,
        seen: false,
      };

      if (imageUrl) {
        messagePayload.imageUrl = imageUrl;
        messagePayload.type = 'image';
        if (text) {
          messagePayload.text = text;
          messagePayload.caption = text;
        }
      } else {
        messagePayload.text = text;
        messagePayload.type = 'text';
      }

      await addDoc(messagesCol, messagePayload);

      const otherUid = recipient.uid;
      const currentUnread = conversation.unreadCount?.[otherUid] || 0;

      const lastMessageSnippet = imageUrl
        ? (text ? `📷 ${text}` : '📷 Photo')
        : text;

      // Update conversation metadata
      await updateDoc(doc(db, 'conversations', conversation.id), {
        lastMessage: {
          text: lastMessageSnippet,
          senderId: user.uid,
          timestamp: now,
          seen: false,
          type: imageUrl ? 'image' : 'text',
        },
        updatedAt: now,
        [`unreadCount.${otherUid}`]: currentUnread + 1,
      });
    } catch {
      // Catch errors
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImage(file);
      setSelectedImagePreview(compressedDataUrl);
      setShowAttachmentMenu(false);
    } catch (err) {
      console.error('Error compressing image:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleSendLocation = () => {
    setShowAttachmentMenu(false);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locText = `📍 My Location: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
          handleSendMessage(locText);
        },
        () => {
          handleSendMessage('📍 Location: Shared from WhatsApp Web');
        }
      );
    } else {
      handleSendMessage('📍 Location: Shared from WhatsApp Web');
    }
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#efeae2] dark:bg-[#0b141a] text-[#111b21] dark:text-[#e9edef] select-none">
      {/* WhatsApp Wallpaper Pattern */}
      <IosChatBackground />

      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Header - WhatsApp Signature Dark Green Header */}
      <div className="bg-[#075e54] dark:bg-[#1f2c34] text-white px-3 py-2.5 flex items-center justify-between z-20 shrink-0 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <button
            id="chat-back-button"
            onClick={onBack}
            className="p-1 -ml-1 text-white/90 hover:text-white rounded-full hover:bg-black/10 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative shrink-0">
            <Avatar
              name={recipient.displayName || recipient.username}
              photoURL={recipient.photoURL}
              size="md"
              isOnline={recipient.isOnline}
              showOnlineStatus
            />
          </div>

          <div className="min-w-0 ml-1">
            <h2 className="text-sm font-semibold truncate leading-tight text-white">
              {recipient.displayName || recipient.username}
            </h2>
            <p className="text-[11px] truncate text-white/80">
              {formatLastSeen(recipient.lastSeen, recipient.isOnline)}
            </p>
          </div>
        </div>

        {/* Right Action Icons: Video, Call, More */}
        <div className="flex items-center gap-1 sm:gap-2 text-white/90">
          <button
            id="start-video-call-btn"
            type="button"
            onClick={handleStartCall}
            className="p-2 rounded-full hover:bg-black/15 transition-colors"
            title="Video Call"
          >
            <Video className="w-5 h-5" />
          </button>

          <button
            id="start-audio-call-btn"
            type="button"
            onClick={handleStartCall}
            className="p-2 rounded-full hover:bg-black/15 transition-colors"
            title="Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="p-2 rounded-full hover:bg-black/15 transition-colors"
              title="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showChatMenu && (
              <div
                className="absolute right-0 top-10 w-44 bg-white dark:bg-[#233138] text-zinc-800 dark:text-zinc-100 rounded-md shadow-2xl py-1.5 z-50 border border-black/5 dark:border-white/5 text-sm"
                onClick={() => setShowChatMenu(false)}
              >
                <button
                  onClick={handleStartCall}
                  className="w-full text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Video call
                </button>
                <button
                  onClick={handleStartCall}
                  className="w-full text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Voice call
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Send photo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 space-y-1 relative z-10 scrollbar-thin">
        {/* Encryption notice banner */}
        <div className="flex justify-center my-1.5">
          <div className="px-3 py-1 rounded-lg bg-[#ffeecd] dark:bg-[#182229] border border-amber-500/20 text-[#54656f] dark:text-[#8696a0] text-[11px] max-w-sm text-center shadow-2xs">
            🔒 Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them.
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-70">
            <div className="w-14 h-14 rounded-full bg-[#00a884]/15 text-[#00a884] flex items-center justify-center mb-3">
              <Smile className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] mb-1">
              Say hello to {recipient.displayName || recipient.username}!
            </p>
            <p className="text-xs text-zinc-500 dark:text-[#8696a0]">
              Send a message, share photos, or tap the video camera to call.
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

      {/* Attachment Menu Popup (Exactly matching the right screen in screenshot) */}
      {showAttachmentMenu && (
        <div className="absolute bottom-16 left-4 right-4 sm:left-auto sm:right-auto sm:w-80 sm:left-12 z-40 bg-white dark:bg-[#202c33] rounded-2xl shadow-2xl p-4 border border-black/5 dark:border-white/10 animate-in fade-in zoom-in-95 duration-150">
          <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-center text-xs text-zinc-700 dark:text-zinc-200">
            {/* 1. Document */}
            <div
              className="flex flex-col items-center gap-1 cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-full bg-[#7f66ff] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-medium">Document</span>
            </div>

            {/* 2. Camera */}
            <div
              className="flex flex-col items-center gap-1 cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-full bg-[#d3396d] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-medium">Camera</span>
            </div>

            {/* 3. Gallery */}
            <div
              className="flex flex-col items-center gap-1 cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-full bg-[#ac44cf] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <GalleryIcon className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-medium">Gallery</span>
            </div>

            {/* 4. Audio */}
            <div
              className="flex flex-col items-center gap-1 cursor-pointer group"
              onClick={() => {
                setShowAttachmentMenu(false);
                handleSendMessage('🎵 Audio message');
              }}
            >
              <div className="w-12 h-12 rounded-full bg-[#e6683c] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Headphones className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-medium">Audio</span>
            </div>

            {/* 5. Location */}
            <div
              className="flex flex-col items-center gap-1 cursor-pointer group"
              onClick={handleSendLocation}
            >
              <div className="w-12 h-12 rounded-full bg-[#1ea362] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-medium">Location</span>
            </div>

            {/* 6. Contact */}
            <div
              className="flex flex-col items-center gap-1 cursor-pointer group"
              onClick={() => {
                setShowAttachmentMenu(false);
                handleSendMessage(`👤 Contact: ${recipient.displayName || recipient.username}`);
              }}
            >
              <div className="w-12 h-12 rounded-full bg-[#009de2] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <ContactIcon className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-medium">Contact</span>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal before sending */}
      {selectedImagePreview && (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-between p-4">
          <div className="w-full flex justify-between items-center text-white px-2">
            <button
              onClick={() => setSelectedImagePreview(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="text-sm font-semibold">Send Photo</span>
            <div className="w-8" />
          </div>

          <div className="max-h-[60vh] max-w-lg my-auto overflow-hidden rounded-xl">
            <img
              src={selectedImagePreview}
              alt="Preview"
              className="max-h-[55vh] w-auto object-contain rounded-xl shadow-2xl"
            />
          </div>

          <div className="w-full max-w-xl flex items-center gap-2 pb-2">
            <div className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 flex items-center text-white">
              <input
                type="text"
                placeholder="Add a caption..."
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage(imageCaption, selectedImagePreview);
                  }
                }}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
              />
            </div>
            <button
              onClick={() => handleSendMessage(imageCaption, selectedImagePreview)}
              disabled={sending}
              className="w-12 h-12 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-lg hover:bg-[#008069] active:scale-95 transition-all"
              title="Send Photo"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Message Input Bar - WhatsApp Signature Style (Pill + Detached Button) */}
      <div className="p-2 sm:p-2.5 z-20 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 max-w-5xl mx-auto">
          {/* WhatsApp Pill Input Container */}
          <div className="flex-1 flex items-center bg-white dark:bg-[#1f2c34] rounded-full px-3 py-1.5 shadow-sm border border-black/5 dark:border-white/5">
            {/* Emoji Smile */}
            <button
              type="button"
              onClick={() => setInputText((prev) => prev + ' 😊')}
              className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              title="Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Input field */}
            <input
              id="message-input-field"
              type="text"
              placeholder="Type a message"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent px-2 text-sm text-[#111b21] dark:text-[#e9edef] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
            />

            {/* Paperclip Attachment Menu Toggle */}
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              title="Attach document or photo"
            >
              <Paperclip className="w-5 h-5 -rotate-45" />
            </button>

            {/* Direct Camera Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              title="Camera"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          {/* Detached Circular Action Button: Send Arrow if text, else Microphone */}
          {inputText.trim() ? (
            <button
              id="send-message-button"
              type="button"
              onClick={() => handleSendMessage()}
              disabled={sending}
              className="w-11 h-11 rounded-full bg-[#00a884] hover:bg-[#008069] text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0"
              title="Send message"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSendMessage('🎤 Voice Note')}
              className="w-11 h-11 rounded-full bg-[#00a884] hover:bg-[#008069] text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0"
              title="Voice note"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
