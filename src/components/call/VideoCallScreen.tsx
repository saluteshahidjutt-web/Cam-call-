import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
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

  const handleCopyLink = () => {
    if (!activeCall) return;
    const link = `${window.location.origin}${window.location.pathname}#call=${activeCall.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!activeCall) return;
    const link = `${window.location.origin}${window.location.pathname}#call=${activeCall.id}`;
    const text = encodeURIComponent(`Join my private 1-to-1 video call now: ${link}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Bind local stream to video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isPipSwapped]);

  // Bind remote stream to video
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isPipSwapped]);

  if (!activeCall) return null;

  const isCaller = activeCall.callerId === user?.uid;
  const peerName = isCaller ? activeCall.calleeName : activeCall.callerName;
  const peerPhoto = isCaller ? activeCall.calleePhoto : activeCall.callerPhoto;

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
    <div className="fixed inset-0 z-40 bg-zinc-950 flex flex-col justify-between overflow-hidden select-none">
      {/* Remote Video (Main Viewport) */}
      <div className="relative w-full h-full flex items-center justify-center bg-zinc-900 overflow-hidden">
        {callStatus === 'connected' && remoteStream ? (
          <video
            ref={isPipSwapped ? localVideoRef : remoteVideoRef}
            autoPlay
            playsInline
            muted={isPipSwapped}
            className={`w-full h-full object-cover ${isPipSwapped ? 'scale-x-[-1]' : ''}`}
          />
        ) : callStatus === 'waiting' ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md animate-in fade-in duration-300 z-10">
            <div className="w-16 h-16 rounded-3xl bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/30 flex items-center justify-center mb-4 shadow-xl shadow-emerald-950/50 animate-pulse">
              <VideoIcon className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1.5">Waiting for your friend to join...</h2>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              Your camera & microphone are live. Share this invite link with the person you want to call:
            </p>

            {/* Share Card */}
            <div className="w-full bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}${window.location.pathname}#call=${activeCall.id}`}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono select-all focus:outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-950/50"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Link on WhatsApp</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="relative mb-6">
              {callStatus === 'ringing' && (
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              )}
              <Avatar
                name={peerName || 'Contact'}
                photoURL={peerPhoto}
                size="2xl"
                className="relative ring-4 ring-zinc-800 shadow-2xl"
              />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{peerName}</h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-xs font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {callStatus === 'ringing'
                  ? 'Ringing...'
                  : callStatus === 'connected'
                  ? 'Connecting video stream...'
                  : 'Call session active'}
              </span>
            </div>
          </div>
        )}

        {/* Local Video Picture-in-Picture (PiP) */}
        <div
          onClick={() => setIsPipSwapped(!isPipSwapped)}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-28 sm:w-44 aspect-video rounded-2xl overflow-hidden bg-zinc-800 border-2 border-zinc-700/80 shadow-2xl cursor-pointer transition-transform hover:scale-105 group"
          title="Click to swap video view"
        >
          {isVideoMuted ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400 text-xs">
              <VideoOff className="w-5 h-5 mb-1 text-zinc-500" />
              <span className="text-[10px]">Camera off</span>
            </div>
          ) : (
            <video
              ref={isPipSwapped ? remoteVideoRef : localVideoRef}
              autoPlay
              playsInline
              muted={!isPipSwapped}
              className={`w-full h-full object-cover ${!isPipSwapped ? 'scale-x-[-1]' : ''}`}
            />
          )}
          <span className="absolute bottom-1 left-2 text-[9px] px-1 py-0.5 rounded-sm bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
            {isPipSwapped ? peerName : 'You'}
          </span>
        </div>

        {/* Top Info Bar Overlay */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-3 z-20">
          <div className="px-3.5 py-1.5 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-xs flex items-center gap-2.5 shadow-lg">
            <span className="font-semibold text-white">{peerName}</span>
            <span className="text-zinc-500">•</span>
            <span className="text-emerald-400 font-mono">
              {callStatus === 'connected' ? formatDuration(callDuration) : 'Calling...'}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Network or Permission Error Banner */}
        {error && (
          <div className="absolute top-20 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto max-w-md z-30 p-3 rounded-xl bg-rose-950/90 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={clearError}
              className="p-1 text-rose-300 hover:text-white rounded-lg hover:bg-rose-900/50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Bottom Floating Control Dock */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 sm:gap-4 px-5 py-3 rounded-3xl bg-zinc-900/90 border border-zinc-800/90 backdrop-blur-md shadow-2xl">
          {/* Mute Microphone */}
          <button
            id="toggle-mic-btn"
            onClick={toggleMicrophone}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMicMuted
                ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white'
            }`}
            title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera On / Off */}
          <button
            id="toggle-camera-btn"
            onClick={toggleCamera}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isVideoMuted
                ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white'
            }`}
            title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </button>

          {/* Switch Camera (Mobile) */}
          <button
            id="switch-camera-btn"
            onClick={switchCamera}
            className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center transition-all"
            title="Switch Camera (Front / Back)"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>

          {/* End Call */}
          <button
            id="end-call-btn"
            onClick={endCall}
            className="w-13 h-13 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-950/60 hover:scale-105 active:scale-95 transition-all ml-2"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
