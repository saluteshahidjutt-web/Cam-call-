import React, { useState } from 'react';
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
} from 'lucide-react';

interface InstantCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCallId?: string;
}

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
  const [createdCallId, setCreatedCallId] = useState<string>('');
  const [joinInput, setJoinInput] = useState<string>(initialCallId || '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setError(null);
    setLoading(true);
    try {
      const callId = await createCallLink();
      const link = `${window.location.origin}${window.location.pathname}#call=${callId}`;
      setCreatedCallId(callId);
      setCreatedLink(link);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to generate call link. Check camera and mic permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdLink) return;
    navigator.clipboard.writeText(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!createdLink) return;
    const text = encodeURIComponent(
      `Join my private 1-to-1 video call now: ${createdLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleJoinCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let code = joinInput.trim();
    if (!code) {
      setError('Please enter a call code or link.');
      return;
    }

    // Extract callId if user pasted a full URL
    if (code.includes('#call=')) {
      code = code.split('#call=')[1].split('&')[0];
    } else if (code.includes('?call=')) {
      code = code.split('?call=')[1].split('&')[0];
    }

    setLoading(true);
    try {
      await joinCallWithLink(code);
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Unable to join call. The call may have ended or the code is invalid.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterCreatedRoom = () => {
    // Caller is already in 'waiting' status from createCallLink
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/30">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Instant Video Calling</h2>
              <p className="text-xs text-zinc-400">Call anyone via a direct shareable link</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex p-2 gap-2 bg-zinc-950/60 border-b border-zinc-800/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Call Link</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('join');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'join'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Join with Code</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'create' ? (
            <div className="space-y-4">
              {!createdLink ? (
                <div className="text-center py-4">
                  <p className="text-sm text-zinc-300 mb-2">
                    Start a 1-to-1 video call and share the link on WhatsApp or by message.
                  </p>
                  <p className="text-xs text-zinc-500 mb-6">
                    The other person taps the link on their mobile or PC to connect face-to-face instantly.
                  </p>

                  <button
                    onClick={handleGenerateLink}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-2xl transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Video className="w-4 h-4" />
                        <span>Create Instant Call Link</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30">
                    <p className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Call Link Ready!</span>
                    </p>
                    <p className="text-xs text-zinc-400 mb-3">
                      Share this link with your friend:
                    </p>

                    <div className="flex items-center gap-2 mb-3">
                      <input
                        readOnly
                        value={createdLink}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono select-all focus:outline-none"
                      />
                      <button
                        onClick={handleCopy}
                        className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>

                    <button
                      onClick={handleShareWhatsApp}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-950/40"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share on WhatsApp</span>
                    </button>
                  </div>

                  <button
                    onClick={handleEnterCreatedRoom}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-2xl transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
                  >
                    <span>Enter Call Screen Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleJoinCall} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Call Code or Link
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    placeholder="Paste call link or room code"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-2xl transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4" />
                    <span>Join Video Call Now</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
