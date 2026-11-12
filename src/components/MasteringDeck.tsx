import React, { useState } from 'react';
import { DraftVariant, getClientId } from '../types';
import {
  ArrowLeft,
  Download,
  Loader2,
  Film,
  ArrowRight,
} from 'lucide-react';

interface MasteringDeckProps {
  draft: DraftVariant;
  onBackToEditing: () => void;
  onMasterComplete: (masteredDraft: DraftVariant) => void;
}

export const MasteringDeck: React.FC<MasteringDeckProps> = ({
  draft,
  onBackToEditing,
  onMasterComplete,
}) => {
  const resolution = '1080p';
  const [isMastering, setIsMastering] = useState(false);
  const [masteringLabel, setMasteringLabel] = useState('Initiating Master...');
  const [masteredResult, setMasteredResult] = useState<DraftVariant | null>(
    draft.quality === '1080p' ? draft : null
  );
  const [error, setError] = useState<string | null>(null);

  const pollJob = async (jobId: string): Promise<{ url: string; data: string; mimeType: string }> => {
    const started = Date.now();
    while (true) {
      await new Promise((r) => setTimeout(r, 4000));
      const elapsed = Math.round((Date.now() - started) / 1000);
      setMasteringLabel(`Mastering in 1080p (${elapsed}s)...`);
      const statusRes = await fetch(`/api/job/${jobId}`, {
        headers: { 'x-client-id': getClientId() },
      });
      if (!statusRes.ok) throw new Error('Lost connection to mastering render job.');
      const status = await statusRes.json();
      if (status.status === 'error') throw new Error(status.error || 'Mastering failed.');
      if (status.status === 'done') {
        const resultRes = await fetch(`/api/job/${jobId}/result`, {
          headers: { 'x-client-id': getClientId() },
        });
        if (!resultRes.ok) throw new Error('Failed to fetch mastered video.');
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

  const handleStartMastering = async () => {
    if (isMastering || !draft.data) return;
    setError(null);
    setIsMastering(true);
    setMasteringLabel('Mastering in 1080p...');

    try {
      const res = await fetch('/api/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': getClientId() },
        body: JSON.stringify({
          video: draft.data,
          mimeType: draft.mimeType,
          target: '1080p',
        }),
      });

      const { jobId, error: jobError } = await res.json();
      if (jobError || !jobId) throw new Error(jobError || 'Failed to start mastering render.');

      const result = await pollJob(jobId);

      const mastered: DraftVariant = {
        ...draft,
        url: result.url,
        data: result.data,
        mimeType: result.mimeType,
        quality: '1080p',
        timestamp: Date.now(),
      };

      setMasteredResult(mastered);
      onMasterComplete(mastered);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Mastering failed.');
    } finally {
      setIsMastering(false);
    }
  };

  const handleDownloadMaster = () => {
    const target = masteredResult || draft;
    if (!target.url) return;
    const a = document.createElement('a');
    a.href = target.url;
    let ext = 'mp4';
    const mimeMatch = target.mimeType.match(/video\/(.+)/);
    if (mimeMatch && mimeMatch[1]) {
      ext = mimeMatch[1];
    }
    a.download = `master-1080p-${target.variationLabel.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${ext}`;
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
            onClick={onBackToEditing}
            className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 transition-colors border border-zinc-200"
            title="Back to refining"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
                Commit Once: Master Lab
              </h2>
              <span className="text-[11px] font-medium bg-zinc-100 border border-zinc-200 text-zinc-800 px-2 py-0.5 rounded">
                Production Master
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Selected variation: <span className="text-zinc-900 font-medium">{draft.variationLabel}</span>
            </p>
          </div>
        </div>

        {masteredResult && (
          <button
            type="button"
            onClick={handleDownloadMaster}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all self-end sm:self-auto"
          >
            <Download size={14} />
            <span>Download Master ({resolution.toUpperCase()})</span>
          </button>
        )}
      </div>

      {/* Main Mastering Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Video Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative aspect-video bg-zinc-950 rounded-xl border border-zinc-200 overflow-hidden shadow-sm flex items-center justify-center">
            {masteredResult ? (
              <video
                key={masteredResult.url}
                src={masteredResult.url}
                className="w-full h-full object-cover"
                controls
                autoPlay
                loop
                playsInline
              />
            ) : draft.url ? (
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
              <div className="text-zinc-400 text-xs">No video data</div>
            )}

            {/* Resolution Tag */}
            <div className="absolute top-3 left-3 bg-zinc-900/90 text-white px-2.5 py-1 rounded text-[11px] font-bold border border-zinc-700 flex items-center gap-1.5">
              <Film size={12} className="text-zinc-300" />
              <span>
                {masteredResult
                  ? `${resolution.toUpperCase()} Master`
                  : '360p Draft Take'}
              </span>
            </div>

            {isMastering && (
              <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5 z-20">
                <Loader2 size={32} className="text-zinc-200 animate-spin" />
                <span className="text-sm font-semibold text-zinc-100">{masteringLabel}</span>
                <span className="text-xs text-zinc-400">
                  Executing high-fidelity upscaling and spatial reconstruction...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Master Controls & Parameters (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-zinc-200/90 rounded-xl p-5 sm:p-6 flex flex-col justify-between space-y-6 shadow-xs">
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">Mastering Settings</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Commit to high-fidelity output.
              </p>
            </div>

            {/* Target Resolution */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-800">
                Target Resolution
              </label>
              <div className="p-3.5 rounded-lg border border-zinc-900 bg-zinc-900 text-white shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs">1080p Full HD</div>
                  <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">1920×1080</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Standard High-Definition Production Master
                </div>
              </div>
            </div>

            {/* Approved Prompt */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                Approved Directive
              </span>
              <p className="text-xs text-zinc-700 line-clamp-3 leading-relaxed">
                {draft.prompt}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-xs font-medium">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleStartMastering}
              disabled={isMastering}
              className="w-full bg-zinc-900 hover:bg-black disabled:opacity-40 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer"
            >
              <span>
                {masteredResult
                  ? `Re-Master in ${resolution.toUpperCase()}`
                  : `Master in ${resolution.toUpperCase()}`}
              </span>
              <ArrowRight size={14} />
            </button>

            <button
              type="button"
              onClick={onBackToEditing}
              className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 py-2.5 px-4 rounded-lg text-xs font-medium border border-zinc-200 transition-colors text-center"
            >
              Back to Conversational Refinement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
