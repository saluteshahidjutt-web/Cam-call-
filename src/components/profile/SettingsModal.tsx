import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { soundManager } from '../../lib/sound';
import { getLocalMediaStream, stopMediaStream } from '../../lib/webrtc';
import {
  X,
  Volume2,
  VolumeX,
  Camera,
  Bell,
  LogOut,
  HelpCircle,
  Video,
  CheckCircle,
  Mic,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, logout } = useAuth();

  const [soundMuted, setSoundMuted] = useState(soundManager.getMuted());
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isTestingMedia, setIsTestingMedia] = useState(false);
  const [testStream, setTestStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const videoTestRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoTestRef.current && testStream) {
      videoTestRef.current.srcObject = testStream;
    }
  }, [testStream]);

  // Clean test stream when modal closes
  const stopTest = () => {
    if (testStream) {
      stopMediaStream(testStream);
      setTestStream(null);
    }
    setIsTestingMedia(false);
    setMediaError(null);
  };

  const handleClose = () => {
    stopTest();
    onClose();
  };

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const next = !soundMuted;
    soundManager.setMuted(next);
    setSoundMuted(next);
  };

  const handleRequestNotifications = async () => {
    if ('Notification' in window) {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
    }
  };

  const handleToggleMediaTest = async () => {
    if (isTestingMedia) {
      stopTest();
    } else {
      setIsTestingMedia(true);
      setMediaError(null);
      const { stream, error } = await getLocalMediaStream({ video: true, audio: true });
      if (error) setMediaError(error);
      if (stream) {
        setTestStream(stream);
      } else {
        setIsTestingMedia(false);
      }
    }
  };

  const handleLogout = async () => {
    stopTest();
    onClose();
    await logout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-zinc-100 relative max-h-[90vh] overflow-y-auto scrollbar-thin">
        <button
          id="close-settings-modal"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold mb-1">App Settings</h3>
        <p className="text-xs text-zinc-400 mb-5">Configure device permissions and notifications</p>

        <div className="space-y-4">
          {/* Hardware Camera & Mic Test */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold">Camera & Microphone Test</span>
              </div>
              <button
                id="toggle-media-test-btn"
                onClick={handleToggleMediaTest}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  isTestingMedia
                    ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30'
                    : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30'
                }`}
              >
                {isTestingMedia ? 'Stop Test' : 'Test Devices'}
              </button>
            </div>

            {isTestingMedia && (
              <div className="mt-3 space-y-2">
                <div className="w-full aspect-video rounded-xl bg-zinc-900 overflow-hidden border border-zinc-700/60 relative">
                  <video
                    ref={videoTestRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 text-white text-[10px]">
                    <Mic className="w-3 h-3 text-emerald-400" />
                    <span>Microphone & camera live</span>
                  </div>
                </div>
                {mediaError && <p className="text-xs text-amber-400">{mediaError}</p>}
              </div>
            )}
          </div>

          {/* Sound Notification */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {soundMuted ? (
                <VolumeX className="w-4 h-4 text-zinc-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
              <div>
                <p className="text-sm font-semibold">Audio Ringtones & Chimes</p>
                <p className="text-xs text-zinc-400">Play ringing sound on calls and message pops</p>
              </div>
            </div>
            <button
              id="toggle-sound-btn"
              onClick={handleToggleSound}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                soundMuted
                  ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {soundMuted ? 'Muted' : 'Enabled'}
            </button>
          </div>

          {/* Desktop Push Notification */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold">Browser Notifications</p>
                <p className="text-xs text-zinc-400">Show incoming call popups when tab is in background</p>
              </div>
            </div>
            {notificationPermission === 'granted' ? (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Allowed
              </span>
            ) : (
              <button
                id="request-push-btn"
                onClick={handleRequestNotifications}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
              >
                Enable
              </button>
            )}
          </div>

          {/* Calling Guide */}
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="flex items-center gap-2 mb-2 text-zinc-300">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold">How to start a video call:</span>
            </div>
            <ol className="text-[11px] text-zinc-400 space-y-1.5 list-decimal pl-4 leading-relaxed">
              <li>Tap <strong>Instant Call Link</strong> to create a shareable video link (send directly to WhatsApp).</li>
              <li>Or tap <strong>New Chat / Search</strong>, enter any user's name or @username, and tap the <strong>Video</strong> icon.</li>
              <li>When the other person accepts or opens the link, high-definition video connects peer-to-peer.</li>
            </ol>
          </div>

          {/* Sign Out */}
          <div className="pt-2">
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/50 text-rose-300 hover:text-rose-200 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out (@{profile?.username})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
