import React, { useState } from 'react';
import { Copy, Check, ExternalLink, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';
import { firebaseConfig } from '../../lib/firebase';

interface DomainAuthHelpProps {
  onQuickGuestSignIn?: () => void;
  guestLoading?: boolean;
}

export const DomainAuthHelp: React.FC<DomainAuthHelpProps> = ({
  onQuickGuestSignIn,
  guestLoading,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseProjectId = firebaseConfig.projectId || 'callcam-a7ea0';
  const consoleSettingsUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`;

  const handleCopyHostname = () => {
    if (!hostname) return;
    navigator.clipboard.writeText(hostname);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-xs text-amber-800 dark:text-amber-300">
            Google Sign-In: Domain Not Authorized Yet
          </p>
          <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5">
            Firebase blocks Google OAuth on new domains (like Netlify) until added to Authorized Domains.
          </p>
        </div>
      </div>

      {/* Instant Solutions */}
      <div className="mt-3 pt-2.5 border-t border-amber-500/20 space-y-2">
        {onQuickGuestSignIn && (
          <button
            type="button"
            onClick={onQuickGuestSignIn}
            disabled={guestLoading}
            className="w-full py-2 px-3 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            {guestLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Instant Solution: Join as Guest (1-Click)</span>
          </button>
        )}

        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-zinc-600 dark:text-zinc-400 font-medium">Or use Email & Password below!</span>
          <button
            type="button"
            onClick={() => setShowSteps(!showSteps)}
            className="text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <HelpCircle className="w-3 h-3" />
            <span>{showSteps ? 'Hide Setup Steps' : 'Authorize on Netlify (1 min)'}</span>
          </button>
        </div>

        {showSteps && (
          <div className="mt-2.5 p-3 rounded-xl bg-white/70 dark:bg-black/40 border border-amber-500/20 text-[11px] text-zinc-700 dark:text-zinc-300 space-y-2">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              How to enable Google Sign-In on this Netlify domain:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px]">
              <li>
                Copy your domain name:{' '}
                <button
                  type="button"
                  onClick={handleCopyHostname}
                  className="inline-flex items-center gap-1 font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded text-[10px] hover:bg-amber-500/30"
                >
                  {hostname}
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </li>
              <li>
                Open{' '}
                <a
                  href={consoleSettingsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 underline font-semibold"
                >
                  Firebase Console Settings <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </li>
              <li>Click on the <strong>Authorized domains</strong> tab</li>
              <li>Click <strong>Add domain</strong> and paste <code>{hostname}</code></li>
              <li>Click <strong>Save</strong> — Google Sign-in will work immediately!</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};
