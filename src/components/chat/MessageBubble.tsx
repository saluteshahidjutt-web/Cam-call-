import React from 'react';
import { Message } from '../../types';
import { Check, CheckCheck } from 'lucide-react';

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
  return (
    <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] px-3.5 py-2 rounded-2xl text-sm shadow-xs ${
          isMe
            ? 'bg-emerald-600 text-white rounded-tr-xs'
            : 'bg-zinc-800 text-zinc-100 border border-zinc-700/40 rounded-tl-xs'
        }`}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
        <div
          className={`flex items-center justify-end gap-1 mt-1 text-[11px] ${
            isMe ? 'text-emerald-200' : 'text-zinc-400'
          }`}
        >
          <span>{formatTime(message.timestamp)}</span>
          {isMe && (
            <span title={message.seen ? 'Seen' : 'Delivered'}>
              {message.seen ? (
                <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
              ) : (
                <Check className="w-3.5 h-3.5 opacity-80" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
