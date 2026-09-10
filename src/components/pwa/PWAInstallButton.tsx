import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'button' | 'banner' | 'compact' | 'menu-item';
  className?: string;
  onInstalled?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  className = '',
  onInstalled,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If already installed or running as standalone, don't show
  if (isInstalled || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success && onInstalled) {
        onInstalled();
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Browser fallback guide modal
      setShowIOSGuide(true);
    }
  };

  // Menu item style (e.g. inside settings or dropdown menu)
  if (variant === 'menu-item') {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-left transition-colors ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00a884] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                Install Call CAM App
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-[#8696a0]">
                {isIOS ? 'Add to iOS Home Screen' : 'Install native WebApp experience'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#00a884] bg-white dark:bg-[#111b21] px-2.5 py-1 rounded-full border border-emerald-500/30">
            Install
          </span>
        </button>

        {showIOSGuide && (
          <InstallGuideModal isIOS={isIOS} onClose={() => setShowIOSGuide(false)} />
        )}
      </>
    );
  }

  // Banner variant (top or bottom banner)
  if (variant === 'banner') {
    return (
      <>
        <div className={`p-3 rounded-2xl bg-gradient-to-r from-[#00a884]/20 via-[#25d366]/15 to-emerald-500/20 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-sm ${className}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#00a884] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                Install Call CAM
              </p>
              <p className="text-[11px] text-zinc-600 dark:text-[#8696a0] truncate">
                Fast 1-click video calls & notifications on your home screen
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-[#00a884] hover:bg-[#008f6b] active:scale-95 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showIOSGuide && (
          <InstallGuideModal isIOS={isIOS} onClose={() => setShowIOSGuide(false)} />
        )}
      </>
    );
  }

  // Compact icon button
  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`p-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00a884] border border-emerald-500/20 transition-all active:scale-95 ${className}`}
          title="Install Call CAM WebApp"
        >
          <Download className="w-4 h-4" />
        </button>

        {showIOSGuide && (
          <InstallGuideModal isIOS={isIOS} onClose={() => setShowIOSGuide(false)} />
        )}
      </>
    );
  }

  // Standard Button
  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-2 rounded-xl bg-[#00a884] hover:bg-[#008f6b] active:scale-95 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>

      {showIOSGuide && (
        <InstallGuideModal isIOS={isIOS} onClose={() => setShowIOSGuide(false)} />
      )}
    </>
  );
};

interface InstallGuideModalProps {
  isIOS: boolean;
  onClose: () => void;
}

const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isIOS, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#111b21] p-6 shadow-2xl border border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#00a884] text-white flex items-center justify-center shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Install Call CAM WebApp
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-[#8696a0]">
                Add to your home screen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-3.5 my-4">
            <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/10 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Tap the <strong className="text-zinc-900 dark:text-white inline-flex items-center gap-1 mx-0.5"><Share className="w-3.5 h-3.5 inline text-blue-500" /> Share</strong> button in your Safari bottom bar.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Scroll down and tap <strong className="text-zinc-900 dark:text-white inline-flex items-center gap-1 mx-0.5"><PlusSquare className="w-3.5 h-3.5 inline text-emerald-500" /> Add to Home Screen</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Tap <strong className="text-zinc-900 dark:text-white">Add</strong> at the top right to launch Call CAM like a native app.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 my-4">
            <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/10 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Tap your browser menu <strong className="text-zinc-900 dark:text-white">(⋮ or ⋯)</strong> in Chrome, Edge, or Firefox.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Select <strong className="text-zinc-900 dark:text-white">Install app</strong> or <strong className="text-zinc-900 dark:text-white">Add to Home screen</strong>.
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#00a884] text-white text-xs font-semibold hover:bg-[#008f6b] active:scale-98 transition-all"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
