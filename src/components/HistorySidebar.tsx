import React from 'react';
import { DraftBatch, DraftVariant } from '../types';
import { History, X } from 'lucide-react';

interface HistorySidebarProps {
  batches: DraftBatch[];
  activeBatchId: string | null;
  onSelectBatch: (batch: DraftBatch) => void;
  onSelectVariant: (variant: DraftVariant) => void;
  onClose?: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  batches,
  activeBatchId,
  onSelectBatch,
  onSelectVariant,
  onClose,
}) => {
  return (
    <div className="w-80 bg-white border-l border-zinc-200 flex flex-col h-full shadow-lg z-30">
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
        <div className="flex items-center gap-2">
          <History size={15} className="text-zinc-700" />
          <span className="text-xs font-semibold text-zinc-900">Exploration History</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 font-medium">{batches.length} runs</span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Batches List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-hide bg-zinc-50/40">
        {batches.length === 0 ? (
          <div className="text-center text-zinc-400 text-xs py-12 px-4 leading-relaxed font-normal">
            Generated draft runs and mastered takes will appear here.
          </div>
        ) : (
          batches.map((batch) => {
            const isActive = activeBatchId === batch.id;

            return (
              <div
                key={batch.id}
                onClick={() => onSelectBatch(batch)}
                className={`p-3 rounded-lg border transition-all cursor-pointer bg-white ${
                  isActive
                    ? 'border-zinc-900 ring-1 ring-zinc-900/10 shadow-xs'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-900 truncate max-w-[160px]">
                    {batch.title}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {new Date(batch.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Thumbnails grid */}
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {batch.variants.map((v, i) => (
                    <div
                      key={v.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectVariant(v);
                      }}
                      className="relative aspect-video bg-zinc-950 rounded overflow-hidden border border-zinc-200 group"
                    >
                      {v.url ? (
                        <video
                          src={v.url}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-mono">
                          {String.fromCharCode(65 + i)}
                        </div>
                      )}
                      <div className="absolute top-1 left-1 bg-zinc-900/80 text-white px-1 py-0.2 rounded text-[8px] font-bold font-mono">
                        {String.fromCharCode(65 + i)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="capitalize font-medium">{batch.dimension} Matrix</span>
                  <span className="bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded border border-zinc-200 font-medium">
                    360p Draft
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
