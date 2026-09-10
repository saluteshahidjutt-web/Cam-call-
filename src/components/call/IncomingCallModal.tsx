import React from 'react';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#111b21] text-white border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Ambient Ringing Glow */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#00a884]/20 rounded-full blur-2xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-[#00a884]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Pulse ring around avatar */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-[#00a884]/30 animate-ping" />
          <Avatar
            name={incomingCall.callerName || 'Caller'}
            photoURL={incomingCall.callerPhoto}
            size="2xl"
            className="relative ring-4 ring-[#00a884]/50 shadow-xl"
          />
        </div>

        <h3 className="text-xl font-bold mb-1 text-white">
          {incomingCall.callerName || 'Unknown Caller'}
        </h3>
        <p className="text-xs font-semibold text-[#25d366] flex items-center gap-1.5 mb-8">
          <Video className="w-4 h-4 animate-bounce" />
          <span>WhatsApp Video Call...</span>
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-8 w-full">
          {/* Reject */}
          <div className="flex flex-col items-center gap-2">
            <button
              id="reject-call-btn"
              type="button"
              onClick={rejectCall}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-950/40 hover:scale-105 active:scale-95 transition-all"
              title="Decline call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs text-zinc-400 font-medium">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              id="accept-call-btn"
              type="button"
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-[#00a884] hover:bg-[#008069] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all animate-bounce"
              title="Accept call"
            >
              <Phone className="w-7 h-7" />
            </button>
            <span className="text-xs text-[#25d366] font-medium">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
