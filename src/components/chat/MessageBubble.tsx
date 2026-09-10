import React, { useState } from 'react';
import { Message } from '../../types';
import { Check, CheckCheck, Video, Phone, X, Download } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe }) => {
  const [showFullImage, setShowFullImage] = useState(false);

  // Call log notification
  if (message.type === 'call_log') {
    return (
      <div className="flex w-full justify-center my-2">
        <div className="px-3.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[11.5px] text-zinc-600 dark:text-zinc-300 flex items-center gap-2 shadow-xs">
          <Video className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{message.text}</span>
          <span className="text-[10px] text-zinc-400">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-1.5 px-2`}>
        <div
          className={`relative max-w-[85%] sm:max-w-[70%] shadow-xs transition-all ${
            isMe
              ? 'bg-[#e7ffdb] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-lg rounded-tr-none shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]'
              : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-lg rounded-tl-none shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]'
          }`}
        >
          {/* If Message contains an image */}
          {message.imageUrl && (
            <div className="p-1 pb-0">
              <div
                onClick={() => setShowFullImage(true)}
                className="relative rounded-md overflow-hidden cursor-pointer group bg-black/5 dark:bg-black/20"
              >
                <img
                  src={message.imageUrl}
                  alt={message.caption || 'Shared photo'}
                  className="w-full max-h-80 object-cover rounded-md group-hover:opacity-95 transition-opacity"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Text content or caption */}
          {(message.text || message.caption) && (
            <div className="px-3 py-1.5 pt-2">
              <p className="whitespace-pre-wrap break-words leading-relaxed text-[13.5px] font-normal">
                {message.text || message.caption}
              </p>
            </div>
          )}

          {/* Timestamp and Delivery Checkmark */}
          <div
            className={`flex items-center justify-end gap-1 px-2.5 pb-1 -mt-1 text-[10.5px] select-none ${
              isMe
                ? 'text-zinc-500 dark:text-[#8696a0]'
                : 'text-zinc-500 dark:text-[#8696a0]'
            }`}
          >
            <span>{formatTime(message.timestamp)}</span>
            {isMe && (
              <span title={message.seen ? 'Seen' : 'Delivered'}>
                {message.seen ? (
                  <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                ) : (
                  <Check className="w-3.5 h-3.5 opacity-70" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Image Modal Preview */}
      {showFullImage && message.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
            <a
              href={message.imageUrl}
              download="whatsapp-image.jpg"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              title="Download image"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={() => setShowFullImage(false)}
              className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={message.imageUrl}
              alt={message.caption || 'Full view'}
              className="max-h-[75vh] w-auto object-contain rounded-lg shadow-2xl"
            />
            {(message.text || message.caption) && (
              <p className="mt-3 text-white text-sm text-center px-4 max-w-xl">
                {message.text || message.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

