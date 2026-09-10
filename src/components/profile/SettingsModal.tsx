import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
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
  CheckCircle,
  Mic,
  Sun,
  Moon,
  Laptop,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { profile, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 transition-colors animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#1f2c34] rounded-2xl p-6 shadow-2xl text-[#111b21] dark:text-[#e9edef] border border-black/5 dark:border-white/10 relative max-h-[90vh] overflow-y-auto">
        <button
          id="close-settings-modal"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-xl font-bold tracking-tight">Settings</h3>
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#00a884]/15 text-[#00a884] border border-[#00a884]/20">
            Call CAM
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-[#8696a0] mb-6">
          Theme preferences, audio alerts, and device settings
        </p>

        <div className="space-y-4">
          {/* WhatsApp Appearance / Theme Selector */}
          <div className="p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00a884]" />
                <span className="text-sm font-semibold">Appearance & Theme</span>
              </div>
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 capitalize">
                {theme} ({resolvedTheme})
              </span>
            </div>

            {/* Segmented Control */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/5">
              <button
                type="button"
                id="theme-btn-light"
                onClick={() => setTheme('light')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  theme === 'light'
                    ? 'bg-white text-zinc-900 shadow-sm shadow-black/10 dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </button>

              <button
                type="button"
                id="theme-btn-dark"
                onClick={() => setTheme('dark')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  theme === 'dark'
                    ? 'bg-white text-zinc-900 shadow-sm shadow-black/10 dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                id="theme-btn-system"
                onClick={() => setTheme('system')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  theme === 'system'
                    ? 'bg-white text-zinc-900 shadow-sm shadow-black/10 dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-emerald-500" />
                <span>Auto</span>
              </button>
            </div>
          </div>

          {/* Hardware Camera & Mic Test */}
          <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span className="text-sm font-semibold">Camera & Microphone</span>
              </div>
              <button
                id="toggle-media-test-btn"
                onClick={handleToggleMediaTest}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  isTestingMedia
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                }`}
              >
                {isTestingMedia ? 'Stop Test' : 'Test Devices'}
              </button>
            </div>

            {isTestingMedia && (
              <div className="mt-3 space-y-2">
                <div className="w-full aspect-video rounded-xl bg-black/80 overflow-hidden border border-black/10 dark:border-white/10 relative">
                  <video
                    ref={videoTestRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/70 text-white text-[10px] backdrop-blur-xs">
                    <Mic className="w-3 h-3 text-emerald-400" />
                    <span>Live hardware test</span>
                  </div>
                </div>
                {mediaError && <p className="text-xs text-amber-500">{mediaError}</p>}
              </div>
            )}
          </div>

          {/* Sound Notification */}
          <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {soundMuted ? (
                <VolumeX className="w-4 h-4 text-zinc-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              )}
              <div>
                <p className="text-sm font-semibold">Audio Ringtones & Chimes</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Play tone on incoming calls and messages</p>
              </div>
            </div>
            <button
              id="toggle-sound-btn"
              onClick={handleToggleSound}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                soundMuted
                  ? 'bg-black/5 dark:bg-zinc-800 text-zinc-500 border-black/10 dark:border-zinc-700'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              }`}
            >
              {soundMuted ? 'Muted' : 'Enabled'}
            </button>
          </div>

          {/* Desktop Push Notification */}
          <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold">Browser Notifications</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Show incoming alert when tab is hidden</p>
              </div>
            </div>
            {notificationPermission === 'granted' ? (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Allowed
              </span>
            ) : (
              <button
                id="request-push-btn"
                onClick={handleRequestNotifications}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/5 dark:bg-zinc-800 hover:bg-black/10 dark:hover:bg-zinc-700 border border-black/10 dark:border-zinc-700"
              >
                Enable
              </button>
            )}
          </div>

          {/* Calling Guide */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 mb-2 text-zinc-800 dark:text-zinc-200">
              <HelpCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span className="text-xs font-semibold">Instant Call CAM Calling Flow:</span>
            </div>
            <ol className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1.5 list-decimal pl-4 leading-relaxed">
              <li>Tap <strong>Instant Call Link</strong> to create a private room URL.</li>
              <li>Tap <strong>Share Link</strong> or copy link to invite any friend.</li>
              <li>When the other person opens the link, peer-to-peer WebRTC video connects in real time.</li>
            </ol>
          </div>

          {/* Sign Out */}
          <div className="pt-2">
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 border border-rose-500/30 dark:border-rose-800/50 text-rose-600 dark:text-rose-300 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
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
