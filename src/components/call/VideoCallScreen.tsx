import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { getPublicCallLink, getWhatsAppShareUrl } from '../../lib/callLink';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  SwitchCamera,
  AlertTriangle,
  X,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Share2,
  Info,
} from 'lucide-react';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const VideoCallScreen: React.FC = () => {
  const { user } = useAuth();
  const {
    activeCall,
    callStatus,
    localStream,
    remoteStream,
    isMicMuted,
    isVideoMuted,
    callDuration,
    error,
    endCall,
    toggleMicrophone,
    toggleCamera,
    switchCamera,
    clearError,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPipSwapped, setIsPipSwapped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyLink = () => {
    if (!activeCall) return;
    const link = getPublicCallLink(activeCall.id);
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyCode = () => {
    if (!activeCall?.roomCode) return;
    navigator.clipboard.writeText(activeCall.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!activeCall) return;
    const shareUrl = getWhatsAppShareUrl(activeCall.id, activeCall.roomCode);
    window.open(shareUrl, '_blank');
  };

  // Bind streams to video tags
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!activeCall || callStatus === 'ended') return null;

  const isCaller = user?.uid === activeCall.callerId;
  const partnerName = isCaller ? activeCall.calleeName : activeCall.callerName;
  const partnerPhoto = isCaller ? activeCall.calleePhoto : activeCall.callerPhoto;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-300">
      {/* Remote Video Stream (Full Canvas) */}
      <div className="absolute inset-0 w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden">
        {callStatus === 'connected' && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          /* Waiting / Connecting State */
          <div className="flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full border-2 border-emerald-500/40 animate-ping absolute inset-0" />
              <Avatar
                name={partnerName || 'Participant'}
                photoURL={partnerPhoto}
                size="2xl"
                className="relative ring-4 ring-emerald-500/40 shadow-2xl"
              />
            </div>

            <h2 className="text-2xl font-bold mb-2">{partnerName || 'Waiting for peer...'}</h2>
            <p className="text-sm font-medium text-emerald-400 animate-pulse mb-6">
              {callStatus === 'waiting'
                ? 'Waiting for participant to join link...'
                : callStatus === 'ringing'
                ? 'Ringing...'
                : 'Establishing secure WebRTC peer connection...'}
            </p>

            {/* Quick Share Link Pill while waiting */}
            {activeCall.isLinkCall && (
              <div className="max-w-sm w-full p-4 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col gap-3">
                {activeCall.roomCode && (
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center">
                    <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                      6-Digit Room Code (Fast Join)
                    </p>
                    <div className="flex items-center justify-center gap-2 my-1">
                      <span className="text-2xl font-mono font-bold tracking-widest text-white bg-white/10 px-3 py-1 rounded-xl border border-white/10">
                        {activeCall.roomCode}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="py-1.5 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-zinc-300">
                  Invite your contact using public link or WhatsApp:
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied Link' : 'Copy Public Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="py-2 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                </div>

                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-zinc-300 flex items-start gap-1.5 text-left">
                  <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Second phone can open the link in any mobile browser or enter the 6-digit code in <strong>Join Room</strong>.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Local Video (iOS Picture-in-Picture) */}
      <div
        onClick={() => setIsPipSwapped(!isPipSwapped)}
        className="absolute top-16 right-4 sm:right-6 w-28 sm:w-36 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl z-30 cursor-pointer bg-zinc-900 group hover:scale-105 transition-all backdrop-blur-md"
        title="Tap to swap preview"
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isVideoMuted ? 'hidden' : ''} scale-x-[-1]`}
        />
        {isVideoMuted && (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-2 bg-zinc-900">
            <VideoOff className="w-6 h-6 mb-1 text-rose-400" />
            <span className="text-[10px] font-semibold">Camera Off</span>
          </div>
        )}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-medium backdrop-blur-xs">
          You
        </div>
      </div>

      {/* WhatsApp Call Top Bar */}
      <div className="relative z-20 p-4 sm:px-6 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-base font-bold text-white drop-shadow-md leading-tight">
              {partnerName}
            </span>
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{callStatus === 'connected' ? formatDuration(callDuration) : 'Connecting...'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-white backdrop-blur-md transition-all active:scale-95"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Dynamic Error Notification */}
      {error && (
        <div className="relative z-30 mx-4 self-center p-3 rounded-2xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 backdrop-blur-lg shadow-xl animate-in slide-in-from-top duration-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={clearError} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WhatsApp Call Bottom Control Island */}
      <div className="relative z-20 pb-8 pt-4 px-4 flex justify-center bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <div className="flex items-center gap-4 sm:gap-6 px-6 py-3.5 rounded-full bg-[#1f2c34]/90 border border-white/15 shadow-2xl">
          {/* Mute Mic */}
          <button
            id="toggle-mic-btn"
            type="button"
            onClick={toggleMicrophone}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90 ${
              isMicMuted
                ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-400/40'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Video */}
          <button
            id="toggle-cam-btn"
            type="button"
            onClick={toggleCamera}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90 ${
              isVideoMuted
                ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-400/40'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title={isVideoMuted ? 'Turn video on' : 'Turn video off'}
          >
            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </button>

          {/* Switch Camera (Front/Back) */}
          <button
            id="switch-cam-btn"
            type="button"
            onClick={switchCamera}
            className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all shadow-lg active:scale-90"
            title="Switch camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>

          {/* Hang Up (Red Call Button) */}
          <button
            id="hangup-call-btn"
            type="button"
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all shadow-xl shadow-rose-950/60 active:scale-95 ring-4 ring-rose-500/20"
            title="End Video Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
