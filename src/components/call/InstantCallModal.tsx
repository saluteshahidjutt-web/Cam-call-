import React, { useState, useEffect } from 'react';
import { useCall } from '../../context/CallContext';
import {
  Video,
  Copy,
  Check,
  Share2,
  PhoneCall,
  X,
  Link as LinkIcon,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Hash,
  Info,
  ClipboardPaste,
} from 'lucide-react';

interface InstantCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCallId?: string;
}

export const getPublicAppBaseUrl = (): string => {
  let origin = window.location.origin;
  // If running inside Google AI Studio container (ais-dev-*), convert to the public shared URL (ais-pre-*)
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  } else if (origin.includes('aistudio.google.com')) {
    origin = 'https://ais-pre-mbgspic7h6o6pjqx5hklrq-604133282907.asia-southeast1.run.app';
  }
  return origin;
};

export const InstantCallModal: React.FC<InstantCallModalProps> = ({
  isOpen,
  onClose,
  initialCallId,
}) => {
  const { createCallLink, joinCallWithLink } = useCall();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>(
    initialCallId ? 'join' : 'create'
  );
  const [createdLink, setCreatedLink] = useState<string>('');
  const [createdRoomCode, setCreatedRoomCode] = useState<string>('');
  const [createdCallId, setCreatedCallId] = useState<string>('');
  const [joinInput, setJoinInput] = useState<string>(initialCallId || '');
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCallId) {
      setActiveTab('join');
      setJoinInput(initialCallId);
    }
  }, [initialCallId]);

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setError(null);
    setLoading(true);
    try {
      const { callId, roomCode } = await createCallLink();
      const publicBase = getPublicAppBaseUrl();
      const link = `${publicBase}/#call=${callId}`;
      setCreatedCallId(callId);
      setCreatedRoomCode(roomCode);
      setCreatedLink(link);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to generate call link. Check camera and mic permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdLink) return;
    navigator.clipboard.writeText(createdLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    if (!createdRoomCode) return;
    navigator.clipboard.writeText(createdRoomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handlePasteJoinInput = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setJoinInput(text.trim());
    } catch {}
  };

  const handleShareWhatsApp = () => {
    if (!createdLink) return;
    const text = encodeURIComponent(
      `📞 Join my WhatsApp Video Call!\n\nDirect Link: ${createdLink}\nRoom Code: ${createdRoomCode}\n\n(Tap the link on your phone to join instantly!)`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleJoinCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = joinInput.trim();
    if (!trimmed) {
      setError('Please enter a valid call link or 6-character room code.');
      return;
    }

    setLoading(true);
    try {
      await joinCallWithLink(trimmed);
      try {
        sessionStorage.removeItem('pending_call_id');
      } catch {}
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to join video room. Room may be closed or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 transition-colors animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#1f2c34] rounded-2xl p-6 shadow-2xl text-[#111b21] dark:text-[#e9edef] border border-black/5 dark:border-white/10 relative">
        <button
          id="close-instant-call-modal"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#00a884] text-white flex items-center justify-center shadow-sm">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">WhatsApp Call Link</h3>
          </div>
        </div>
        <p className="text-xs text-zinc-500 dark:text-[#8696a0] mb-4">
          Create a private call room or join using a shared link / room code
        </p>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/5 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00a884]" />
            <span>Create Call Link</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'join'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-sky-500" />
            <span>Join Room</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'create' ? (
          <div className="space-y-4">
            {!createdLink ? (
              <div className="text-center py-6 px-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/10">
                <div className="w-12 h-12 rounded-full bg-[#00a884]/15 text-[#00a884] dark:text-[#25d366] flex items-center justify-center mx-auto mb-3">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold mb-1">Create Private Video Room</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 max-w-xs mx-auto">
                  Anyone with this link or 6-digit room code can join your call directly from their phone or computer.
                </p>
                <button
                  id="generate-call-link-btn"
                  type="button"
                  onClick={handleGenerateLink}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#00a884] hover:bg-[#008f6f] active:scale-95 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Call Link & Start Room</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* 6-Digit Room Code Display */}
                {createdRoomCode && (
                  <div className="p-3.5 rounded-xl bg-[#00a884]/10 border border-[#00a884]/25 text-center">
                    <p className="text-[11px] font-semibold text-[#00a884] dark:text-[#25d366] mb-1">
                      6-DIGIT ROOM CODE (Quick Join on 2nd Phone)
                    </p>
                    <div className="flex items-center justify-center gap-2 my-1.5">
                      <span className="text-2xl font-mono font-bold tracking-widest text-[#111b21] dark:text-white bg-white/80 dark:bg-black/40 px-3 py-1 rounded-lg border border-black/5 dark:border-white/10">
                        {createdRoomCode}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="py-1.5 px-2.5 rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-[#8696a0]">
                      Second phone can open app & enter this code in "Join Room"
                    </p>
                  </div>
                )}

                {/* Direct Link */}
                <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10">
                  <p className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    Public Shareable Link
                  </p>
                  <p className="text-[11px] font-mono break-all text-zinc-700 dark:text-zinc-300 bg-white/80 dark:bg-black/40 p-2 rounded-lg border border-black/5 dark:border-white/5">
                    {createdLink}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="copy-call-link-btn"
                    type="button"
                    onClick={handleCopyLink}
                    className="py-2.5 px-3 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 border border-black/10 dark:border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-[#00a884]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <button
                    id="share-whatsapp-btn"
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                </div>

                {/* Notice regarding 403 error */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Note for Second Phone / Friends:</span>
                    Do not copy the URL from the browser's top address bar (<code className="font-mono text-[10px]">aistudio.google.com</code> gives a 403 error to other accounts). Always use the <strong>Copy Link</strong> button above or share the <strong>6-digit Room Code</strong>!
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleJoinCall} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Enter 6-Digit Code or Call Link:
                </label>
                <button
                  type="button"
                  onClick={handlePasteJoinInput}
                  className="text-[11px] text-[#00a884] dark:text-[#25d366] hover:underline flex items-center gap-1 font-medium"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  <span>Paste</span>
                </button>
              </div>
              <input
                id="join-call-input"
                type="text"
                placeholder="e.g. ABC123 or paste full link"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-xs focus:ring-2 focus:ring-[#00a884]/40 focus:outline-none transition-all text-zinc-900 dark:text-white font-mono"
              />
              <p className="text-[10px] text-zinc-500 dark:text-[#8696a0] mt-1.5">
                You can paste the entire link or just type the 6-character room code.
              </p>
            </div>

            <button
              id="submit-join-call-btn"
              type="submit"
              disabled={loading || !joinInput.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-[#00a884] hover:bg-[#008f6f] active:scale-95 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Join Call Now</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

