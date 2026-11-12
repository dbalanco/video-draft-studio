import React, { useState } from 'react';
import { DraftVariant, RefinementMessage, MediaState, getClientId } from '../types';
import {
  ArrowLeft,
  Send,
  Loader2,
  Download,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

interface ConversationalEditorProps {
  draft: DraftVariant;
  sourceMedia: MediaState[];
  onBackToGrid: () => void;
  onMasterDraft: (draft: DraftVariant) => void;
  onUpdateDraftVideo: (updatedDraft: DraftVariant) => void;
}

export const ConversationalEditor: React.FC<ConversationalEditorProps> = ({
  draft,
  sourceMedia,
  onBackToGrid,
  onMasterDraft,
  onUpdateDraftVideo,
}) => {
  const [inputText, setInputText] = useState('');
  const [isIterating, setIsIterating] = useState(false);
  const [iteratingStatus, setIteratingStatus] = useState('Applying refinement...');
  const [messages, setMessages] = useState<RefinementMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      text: `Draft variation "${draft.variationLabel}" loaded in 360p Draft Mode. Direct modifications in the prompt bar below to iterate quickly before committing to final 1080p master.`,
      timestamp: new Date(draft.timestamp),
      videoUrl: draft.url,
    },
  ]);
  const [qualityMode] = useState<'draft' | 'final'>('draft');

  const pollJob = async (jobId: string): Promise<{ url: string; data: string; mimeType: string }> => {
    const started = Date.now();
    while (true) {
      await new Promise((r) => setTimeout(r, 3500));
      const elapsed = Math.round((Date.now() - started) / 1000);
      setIteratingStatus(`Refining draft (${elapsed}s)...`);
      const statusRes = await fetch(`/api/job/${jobId}`, {
        headers: { 'x-client-id': getClientId() },
      });
      if (!statusRes.ok) throw new Error('Lost connection to refinement render job.');
      const status = await statusRes.json();
      if (status.status === 'error') throw new Error(status.error || 'Refinement failed.');
      if (status.status === 'done') {
        const resultRes = await fetch(`/api/job/${jobId}/result`, {
          headers: { 'x-client-id': getClientId() },
        });
        if (!resultRes.ok) throw new Error('Failed to retrieve refined video.');
        const blob = await resultRes.blob();
        const safeMime = /^video\/(mp4|webm)$/i.test(blob.type) ? blob.type : 'video/mp4';
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              url: URL.createObjectURL(blob),
              data: (reader.result as string).split(',')[1],
              mimeType: safeMime,
            });
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    }
  };

  const handleSendPrompt = async (promptToSend: string) => {
    if (!promptToSend.trim() || isIterating) return;

    const userMessage: RefinementMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: promptToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsIterating(true);
    setIteratingStatus('Submitting directing instruction...');

    try {
      const isExtend = promptToSend.toLowerCase().includes('extend');
      const payload: any = {
        mode: isExtend ? 'extend' : 'refine',
        video: draft.data,
        mimeType: draft.mimeType,
        sourceMedia: sourceMedia.map((m) => ({ data: m.data, mimeType: m.mimeType })),
        prompt: promptToSend,
        quality: qualityMode,
      };

      const res = await fetch('/api/omni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': getClientId() },
        body: JSON.stringify(payload),
      });

      const { jobId, error: jobError } = await res.json();
      if (jobError || !jobId) throw new Error(jobError || 'Failed to start refinement job.');

      const result = await pollJob(jobId);

      const updatedDraft: DraftVariant = {
        ...draft,
        url: result.url,
        data: result.data,
        mimeType: result.mimeType,
        prompt: `${draft.prompt} | Iteration: ${promptToSend}`,
        timestamp: Date.now(),
      };

      onUpdateDraftVideo(updatedDraft);

      const assistantMessage: RefinementMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Refinement rendered: "${promptToSend}". You can continue directing or commit once to 1080p master.`,
        timestamp: new Date(),
        videoUrl: result.url,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      const errorMessage: RefinementMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Refinement error: ${err.message || 'Could not process update.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsIterating(false);
    }
  };

  const handleDownloadCurrent = () => {
    if (!draft.url) return;
    const a = document.createElement('a');
    a.href = draft.url;
    let ext = 'mp4';
    const mimeMatch = draft.mimeType.match(/video\/(.+)/);
    if (mimeMatch && mimeMatch[1]) {
      ext = mimeMatch[1];
    }
    a.download = `refined-draft-${draft.variationLabel.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-zinc-200/90 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToGrid}
            className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 transition-colors border border-zinc-200"
            title="Back to all variations"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-sm text-zinc-900 tracking-tight">
                Refining: {draft.variationLabel}
              </span>
              <span className="text-[11px] font-medium bg-zinc-100 border border-zinc-200 text-zinc-700 px-2 py-0.5 rounded">
                360p Draft Mode
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Direct changes with conversational prompts while maintaining low-cost 360p draft speed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleDownloadCurrent}
            className="px-3 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium border border-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <Download size={14} />
            <span>Download Draft</span>
          </button>

          <button
            type="button"
            onClick={() => onMasterDraft(draft)}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all"
          >
            <span>Commit Once (1080p Master)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Video Player (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="relative aspect-video bg-zinc-950 rounded-xl border border-zinc-200 overflow-hidden shadow-sm flex items-center justify-center">
            {draft.url ? (
              <video
                key={draft.url}
                src={draft.url}
                className="w-full h-full object-cover"
                controls
                autoPlay
                loop
                playsInline
              />
            ) : (
              <div className="text-zinc-400 text-xs">No video data available</div>
            )}

            {isIterating && (
              <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5 z-20">
                <Loader2 size={28} className="text-zinc-200 animate-spin" />
                <span className="text-xs font-semibold text-zinc-100">{iteratingStatus}</span>
                <span className="text-[11px] text-zinc-400">
                  Processing update in 360p draft mode...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Conversational Directing Stream (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-zinc-200/90 rounded-xl flex flex-col h-[520px] shadow-xs overflow-hidden">
          
          {/* Header */}
          <div className="p-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-zinc-800" />
              <span className="text-xs font-semibold text-zinc-900">
                Conversational Directing
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">360p Draft Speed</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide bg-zinc-50/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] p-3 rounded-lg text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-zinc-900 text-white rounded-br-none'
                      : 'bg-white text-zinc-800 border border-zinc-200 rounded-bl-none shadow-xs'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-zinc-400 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt(inputText);
            }}
            className="p-3 border-t border-zinc-200 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isIterating}
              placeholder="e.g. Add subtle lens flare during the portal exit..."
              className="flex-1 bg-zinc-50 border border-zinc-300 rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isIterating || !inputText.trim()}
              className="bg-zinc-900 hover:bg-black disabled:opacity-30 text-white p-2.5 rounded-lg transition-colors flex-shrink-0"
              title="Send refinement command"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
