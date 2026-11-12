import React from 'react';
import { DraftVariant, BaseVideoState, VariationDimension } from '../types';
import {
  Download,
  MessageSquare,
  Loader2,
  AlertCircle,
  ArrowRight,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface DraftGridProps {
  baseVideo?: BaseVideoState;
  variants: DraftVariant[];
  selectedVariantId: string | null;
  dimension?: VariationDimension;
  stage?: 'base_generating' | 'variations_generating' | 'completed' | 'error';
  onSelectVariant: (variantId: string) => void;
  onRefineVariant: (variant: DraftVariant) => void;
  onMasterVariant: (variant: DraftVariant) => void;
}

export const DraftGrid: React.FC<DraftGridProps> = ({
  variants,
  selectedVariantId,
  dimension,
  stage,
  onSelectVariant,
  onRefineVariant,
  onMasterVariant,
}) => {
  if (variants.length === 0) return null;

  const handleDownload = (e: React.MouseEvent, url: string, label: string, mimeType: string) => {
    e.stopPropagation();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    let ext = 'mp4';
    const mimeMatch = mimeType.match(/video\/(.+)/);
    if (mimeMatch && mimeMatch[1]) {
      ext = mimeMatch[1];
    }
    a.download = `draft-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center flex-shrink-0">
            <Layers size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                Draft Variations
              </h3>
              <span className="text-xs text-zinc-500 font-medium">
                ({variants.length} variations)
              </span>
              {stage === 'base_generating' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded">
                  <Loader2 size={11} className="animate-spin" />
                  Generating base shot...
                </span>
              )}
              {stage === 'variations_generating' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded">
                  <Loader2 size={11} className="animate-spin" />
                  {dimension === 'technique'
                    ? 'Generating parallel camera motion variations...'
                    : 'Rendering parallel variations...'}
                </span>
              )}
              {stage === 'completed' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded">
                  <CheckCircle2 size={11} />
                  Complete (360p Drafts Ready)
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select any variation below to review, refine conversationally, or commit to high-res master.
            </p>
          </div>
        </div>
      </div>

      {/* Variations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {variants.map((variant, index) => {
          const isSelected = selectedVariantId === variant.id;
          const letter = String.fromCharCode(65 + index);

          return (
            <div
              key={variant.id}
              onClick={() => onSelectVariant(variant.id)}
              className={`group flex flex-col rounded-xl border transition-all duration-150 overflow-hidden cursor-pointer bg-white ${
                isSelected
                  ? 'border-zinc-900 ring-2 ring-zinc-900/10 shadow-sm'
                  : 'border-zinc-200/90 hover:border-zinc-400 shadow-xs'
              }`}
            >
              {/* Card Header */}
              <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0">
                    {letter}
                  </span>
                  <span className="font-semibold text-xs text-zinc-900 truncate">
                    {variant.variationLabel}
                  </span>
                </div>
                <span className="text-[10px] font-medium bg-zinc-100 border border-zinc-200 text-zinc-700 px-2 py-0.5 rounded">
                  360p Draft
                </span>
              </div>

              {/* Video Player or Loading State */}
              <div className="relative aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden">
                {variant.status === 'idle' && (
                  <div className="flex flex-col items-center gap-2 p-6 text-center text-zinc-400">
                    <Loader2 size={20} className="animate-spin text-zinc-500" />
                    <span className="text-xs font-medium">Preparing shot...</span>
                  </div>
                )}

                {variant.status === 'generating' && (
                  <div className="flex flex-col items-center gap-2.5 p-6 text-center">
                    <Loader2 size={24} className="text-zinc-400 animate-spin" />
                    <span className="text-xs text-zinc-300 font-medium">
                      Generating Variation {letter}...
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {dimension === 'technique'
                        ? 'Directing camera motion & framing'
                        : 'Applying style and optics'}
                    </span>
                  </div>
                )}

                {variant.status === 'error' && (
                  <div className="flex flex-col items-center gap-2 p-6 text-center text-red-400">
                    <AlertCircle size={22} />
                    <span className="text-xs font-medium">Generation failed</span>
                    <span className="text-[11px] text-zinc-400 max-w-[200px] truncate">
                      {variant.error || 'Server error'}
                    </span>
                  </div>
                )}

                {variant.status === 'done' && variant.url && (
                  <video
                    src={variant.url}
                    className="w-full h-full object-cover"
                    controls
                    loop
                    playsInline
                  />
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 flex flex-col justify-between flex-1 gap-3 bg-white">
                <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed">
                  {variant.prompt}
                </p>

                {variant.status === 'done' && (
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRefineVariant(variant);
                        }}
                        className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 text-xs font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        <span>Refine</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMasterVariant(variant);
                        }}
                        className="flex-1 bg-zinc-900 hover:bg-black text-white text-xs font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      >
                        <span>Commit to Master</span>
                        <ArrowRight size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownload(e, variant.url, variant.variationLabel, variant.mimeType)}
                        title="Download 360p Draft"
                        className="p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-zinc-200 transition-colors cursor-pointer"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
