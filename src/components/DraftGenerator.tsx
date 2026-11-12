import React, { useState } from 'react';
import {
  SlidersHorizontal,
  ArrowRight,
  X,
} from 'lucide-react';
import { VariationDimension, VariationOption } from '../types';
import { VARIATION_DIMENSIONS, VARIATION_PRESETS } from '../data/variations';

interface DraftGeneratorProps {
  onGenerateDrafts: (params: {
    basePrompt: string;
    dimension: VariationDimension;
    variants: VariationOption[];
  }) => void;
  isGenerating: boolean;
}

export const DraftGenerator: React.FC<DraftGeneratorProps> = ({
  onGenerateDrafts,
  isGenerating,
}) => {
  const [basePrompt, setBasePrompt] = useState('');
  const [dimension, setDimension] = useState<VariationDimension>('style');
  const [activeVariants, setActiveVariants] = useState<Record<VariationDimension, VariationOption[]>>({
    style: [...VARIATION_PRESETS.style],
    technique: [...VARIATION_PRESETS.technique],
  });
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedVariants, setShowAdvancedVariants] = useState(false);

  const currentPresets = activeVariants[dimension] || VARIATION_PRESETS[dimension];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!basePrompt.trim()) {
      setError('Please enter a prompt to generate the video.');
      return;
    }
    setError(null);

    onGenerateDrafts({
      basePrompt: basePrompt.trim(),
      dimension,
      variants: currentPresets,
    });
  };

  return (
    <div className="w-full bg-white border border-zinc-200/90 rounded-xl p-5 sm:p-7 md:p-8 lg:p-9 shadow-sm transition-all">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900 tracking-tight">
                Prompt Video Generation & Variations
              </h2>
              <span className="bg-zinc-100 border border-zinc-200 text-zinc-800 text-[11px] font-medium px-2 py-0.5 rounded">
                360p Draft Mode
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Enter your video prompt below. The system renders 4 parallel visual variations in 360p draft mode.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start">
            <span className="bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold px-2.5 py-1 rounded-md">
              4 Variations
            </span>
          </div>
        </div>

        {/* Video Prompt Text Box (Prominent) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label htmlFor="video-prompt-input" className="text-xs sm:text-sm font-semibold text-zinc-900">
              Video Scene Prompt
            </label>
            {basePrompt && (
              <button
                type="button"
                onClick={() => setBasePrompt('')}
                disabled={isGenerating}
                className="text-[11px] sm:text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 font-medium cursor-pointer"
              >
                <X size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="relative">
            <textarea
              id="video-prompt-input"
              rows={4}
              value={basePrompt}
              onChange={(e) => {
                setBasePrompt(e.target.value);
                if (error) setError(null);
              }}
              disabled={isGenerating}
              placeholder="Describe the scene, subject, movement, atmosphere, and mood to generate...&#10;"
              className="w-full bg-zinc-50/50 hover:bg-zinc-50/80 focus:bg-white border border-zinc-300 focus:border-zinc-900 rounded-lg p-3.5 sm:p-4 text-sm sm:text-base text-zinc-900 placeholder-zinc-400 outline-none transition-all leading-relaxed resize-y min-h-[120px]"
            />
          </div>
        </div>

        {/* Variable Isolation Dimension Picker */}
        <div className="space-y-2.5 pt-2 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-zinc-900">
              Select Variation Dimension:
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VARIATION_DIMENSIONS.map((dim) => (
              <button
                key={dim.id}
                type="button"
                onClick={() => setDimension(dim.id)}
                disabled={isGenerating}
                className={`px-4 py-3 rounded-lg text-left border transition-all cursor-pointer ${
                  dimension === dim.id
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                <div className="text-sm sm:text-base font-semibold">{dim.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Variation Branches Preview */}
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-zinc-600 uppercase tracking-wider">
              4 Variation Branches Scheduled
            </span>
            <button
              type="button"
              onClick={() => setShowAdvancedVariants(!showAdvancedVariants)}
              className="text-[11px] sm:text-xs text-zinc-600 hover:text-zinc-900 flex items-center gap-1 font-medium cursor-pointer"
            >
              <SlidersHorizontal size={12} />
              {showAdvancedVariants ? 'Collapse prompts' : 'Customize variation directives'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {currentPresets.map((opt, i) => (
              <div
                key={opt.id}
                className="bg-white border border-zinc-200 rounded-lg p-3 sm:p-3.5 text-xs flex flex-col justify-between shadow-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-zinc-100 border border-zinc-200 text-zinc-900 font-mono text-[10px] flex items-center justify-center font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="font-semibold text-zinc-900 text-xs sm:text-sm">{opt.label}</span>
                  </div>
                  {opt.badge && (
                    <span className="text-[10px] text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                      {opt.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-500 line-clamp-2 leading-relaxed">{opt.description}</p>
                {showAdvancedVariants && (
                  <textarea
                    rows={2}
                    value={opt.promptModifier}
                    onChange={(e) => {
                      const updatedDimensionPresets = [...activeVariants[dimension]];
                      const targetIdx = updatedDimensionPresets.findIndex((u) => u.id === opt.id);
                      if (targetIdx !== -1) {
                        updatedDimensionPresets[targetIdx] = {
                          ...updatedDimensionPresets[targetIdx],
                          promptModifier: e.target.value,
                        };
                        setActiveVariants((prev) => ({
                          ...prev,
                          [dimension]: updatedDimensionPresets,
                        }));
                      }
                    }}
                    placeholder="Custom directive for this branch..."
                    className="mt-2 w-full text-[11px] bg-zinc-50 border border-zinc-300 rounded p-2 text-zinc-800 outline-none focus:border-zinc-500 focus:bg-white"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        {/* Generate CTA Button */}
        <button
          type="submit"
          disabled={isGenerating || !basePrompt.trim()}
          className="w-full bg-zinc-900 hover:bg-black disabled:opacity-40 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-medium py-3.5 sm:py-4 px-6 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base shadow-xs transition-all cursor-pointer"
        >
          <span>Generate 360p Draft</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
};

