import React, { useState } from 'react';
import { DraftGenerator } from './components/DraftGenerator';
import { DraftGrid } from './components/DraftGrid';
import { ConversationalEditor } from './components/ConversationalEditor';
import { MasteringDeck } from './components/MasteringDeck';
import { HistorySidebar } from './components/HistorySidebar';
import {
  DraftBatch,
  DraftVariant,
  BaseVideoState,
  MediaState,
  VariationDimension,
  VariationOption,
  getClientId,
} from './types';
import {
  Layers,
  MessageSquare,
  History,
  ArrowRight,
} from 'lucide-react';

export function App() {
  const [batches, setBatches] = useState<DraftBatch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'matrix' | 'refine' | 'master'>('matrix');
  const [currentSourceMedia, setCurrentSourceMedia] = useState<MediaState[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || null;
  const selectedVariant =
    activeBatch?.variants.find((v) => v.id === selectedVariantId) ||
    activeBatch?.variants[0] ||
    null;

  const pollJob = async (
    jobId: string,
    onProgress?: (elapsed: number) => void
  ): Promise<{ url: string; data: string; mimeType: string }> => {
    const started = Date.now();
    while (true) {
      await new Promise((r) => setTimeout(r, 3500));
      const elapsed = Math.round((Date.now() - started) / 1000);
      if (onProgress) onProgress(elapsed);

      const statusRes = await fetch(`/api/job/${jobId}`, {
        headers: { 'x-client-id': getClientId() },
      });
      if (!statusRes.ok) throw new Error('Lost connection to job.');
      const status = await statusRes.json();
      if (status.status === 'error') throw new Error(status.error || 'Generation failed.');
      if (status.status === 'done') {
        const resultRes = await fetch(`/api/job/${jobId}/result`, {
          headers: { 'x-client-id': getClientId() },
        });
        if (!resultRes.ok) throw new Error('Failed to retrieve video stream.');
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

  // Two-step generation pipeline:
  // For 'technique' (Motion & Transitions): Generate all 4 branches directly from the start with camera directives.
  // For 'style' (Post FX): Generate foundational Base Video first, then apply 4 Post FX styles onto it.
  const handleGenerateDrafts = async ({
    basePrompt,
    dimension,
    variants,
  }: {
    basePrompt: string;
    dimension: VariationDimension;
    variants: VariationOption[];
  }) => {
    const batchId = Date.now().toString();
    setIsGenerating(true);

    if (dimension === 'technique') {
      // Direct Parallel Generation from start for Motion & Transition
      const initialVariants: DraftVariant[] = variants.map((v, idx) => ({
        id: `${batchId}-${idx}`,
        name: `Variant ${String.fromCharCode(65 + idx)}`,
        variationLabel: v.label,
        prompt: `${v.promptModifier} | Base: ${basePrompt}`.trim(),
        url: '',
        data: '',
        mimeType: 'video/mp4',
        status: 'generating',
        quality: 'draft',
        timestamp: Date.now(),
      }));

      const newBatch: DraftBatch = {
        id: batchId,
        title: basePrompt.slice(0, 36) + (basePrompt.length > 36 ? '...' : ''),
        basePrompt,
        dimension,
        variants: initialVariants,
        createdAt: new Date(),
        selectedVariantId: initialVariants[0].id,
        stage: 'variations_generating',
      };

      setBatches((prev) => [newBatch, ...prev]);
      setActiveBatchId(batchId);
      setSelectedVariantId(initialVariants[0].id);
      setActiveTab('matrix');

      try {
        const variationPromises = variants.map(async (variantOption, idx) => {
          const variantId = `${batchId}-${idx}`;
          const motionPromptInstruction = `Task: Generate a high-quality cinematic video in 360p Draft Mode.
SCENE PROMPT: ${basePrompt}
CAMERA MOTION & TECHNIQUE DIRECTIVE: ${variantOption.label} - ${variantOption.promptModifier}
CRITICAL EXECUTION:
1. Follow the camera motion directive strictly from the very beginning (${variantOption.promptModifier}).
2. Render a clean, cohesive, cinematic shot with high visual fidelity and natural movement.`;

          try {
            const res = await fetch('/api/omni', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-client-id': getClientId() },
              body: JSON.stringify({
                prompt: motionPromptInstruction,
                format: 'video',
                quality: 'draft',
              }),
            });

            const { jobId: varJobId, error: varJobError } = await res.json();
            if (varJobError || !varJobId) throw new Error(varJobError || 'Failed to start motion variation render');

            const varResult = await pollJob(varJobId);

            setBatches((prev) =>
              prev.map((b) => {
                if (b.id !== batchId) return b;
                const updatedVariants = b.variants.map((v) => {
                  if (v.id !== variantId) return v;
                  return {
                    ...v,
                    url: varResult.url,
                    data: varResult.data,
                    mimeType: varResult.mimeType,
                    status: 'done' as const,
                  };
                });
                return { ...b, variants: updatedVariants };
              })
            );

            // Store active source media for conversational refine context
            setCurrentSourceMedia((prev) => {
              if (prev.length === 0 || variantId === `${batchId}-0`) {
                return [
                  {
                    url: varResult.url,
                    data: varResult.data,
                    mimeType: varResult.mimeType,
                    name: variantOption.label,
                  },
                ];
              }
              return prev;
            });
          } catch (err: any) {
            console.error('Motion variation error:', err);
            setBatches((prev) =>
              prev.map((b) => {
                if (b.id !== batchId) return b;
                const updatedVariants = b.variants.map((v) => {
                  if (v.id !== variantId) return v;
                  return {
                    ...v,
                    status: 'error' as const,
                    error: err.message || 'Motion variation failed',
                  };
                });
                return { ...b, variants: updatedVariants };
              })
            );
          }
        });

        await Promise.allSettled(variationPromises);

        setBatches((prev) =>
          prev.map((b) => (b.id === batchId ? { ...b, stage: 'completed' } : b))
        );
      } catch (err: any) {
        console.error('Motion generation error:', err);
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // Default Post FX workflow (dimension === 'style')
    const initialBaseVideo: BaseVideoState = {
      id: `${batchId}-base`,
      prompt: basePrompt,
      url: '',
      data: '',
      mimeType: 'video/mp4',
      status: 'generating',
      timestamp: Date.now(),
    };

    const initialVariants: DraftVariant[] = variants.map((v, idx) => ({
      id: `${batchId}-${idx}`,
      name: `Variant ${String.fromCharCode(65 + idx)}`,
      variationLabel: v.label,
      prompt: `${v.promptModifier} | Base: ${basePrompt}`.trim(),
      url: '',
      data: '',
      mimeType: 'video/mp4',
      status: 'idle',
      quality: 'draft',
      timestamp: Date.now(),
    }));

    const newBatch: DraftBatch = {
      id: batchId,
      title: basePrompt.slice(0, 36) + (basePrompt.length > 36 ? '...' : ''),
      basePrompt,
      dimension,
      baseVideo: initialBaseVideo,
      variants: initialVariants,
      createdAt: new Date(),
      selectedVariantId: initialVariants[0].id,
      stage: 'base_generating',
    };

    setBatches((prev) => [newBatch, ...prev]);
    setActiveBatchId(batchId);
    setSelectedVariantId(initialVariants[0].id);
    setActiveTab('matrix');

    try {
      // Step 1: Generate Foundational Base Video
      const basePromptInstruction = `Task: Generate a high-quality cinematic video in 360p Draft Mode matching the user prompt.
SCENE PROMPT: ${basePrompt}
CRITICAL EXECUTION:
1. Render a clean, continuous, cohesive cinematic video shot with natural camera movement.
2. Establish the primary subjects, scene geography, and lighting with high temporal consistency.`;

      const baseRes = await fetch('/api/omni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': getClientId() },
        body: JSON.stringify({
          prompt: basePromptInstruction,
          format: 'video',
          quality: 'draft',
        }),
      });

      const { jobId: baseJobId, error: baseError } = await baseRes.json();
      if (baseError || !baseJobId) throw new Error(baseError || 'Failed to start base video render');

      const baseResult = await pollJob(baseJobId);

      // Store generated base media for conversational refine context
      setCurrentSourceMedia([
        {
          url: baseResult.url,
          data: baseResult.data,
          mimeType: baseResult.mimeType,
          name: 'Base Video',
        },
      ]);

      // Update Base Video to 'done' and switch batch stage to 'variations_generating'
      setBatches((prev) =>
        prev.map((b) => {
          if (b.id !== batchId) return b;
          return {
            ...b,
            baseVideo: {
              ...b.baseVideo!,
              url: baseResult.url,
              data: baseResult.data,
              mimeType: baseResult.mimeType,
              status: 'done',
            },
            stage: 'variations_generating',
            variants: b.variants.map((v) => ({ ...v, status: 'generating' })),
          };
        })
      );

      // Step 2: Apply the variations in parallel directly onto the exact generated base video!
      const variationPromises = variants.map(async (variantOption, idx) => {
        const variantId = `${batchId}-${idx}`;
        const variationPrompt = `Task: Apply the following stylistic variation directive directly onto this exact base video.
BASE SCENE: ${basePrompt}
VARIATION DIRECTIVE: ${variantOption.promptModifier}
CRITICAL RULES:
1. Maintain the underlying camera motion trajectory, character movements, timing, and scene layout from the base video.
2. Boldly apply the requested camera optics, lens characteristics (e.g. anamorphic flares, halation, bloom), environmental lighting, and post-production color grading.`;

        try {
          const res = await fetch('/api/omni', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-client-id': getClientId() },
            body: JSON.stringify({
              mode: 'variation',
              video: baseResult.data,
              mimeType: baseResult.mimeType,
              prompt: variationPrompt,
              format: 'video',
              quality: 'draft',
            }),
          });

          const { jobId: varJobId, error: varJobError } = await res.json();
          if (varJobError || !varJobId) throw new Error(varJobError || 'Failed to start variation render');

          const varResult = await pollJob(varJobId);

          setBatches((prev) =>
            prev.map((b) => {
              if (b.id !== batchId) return b;
              const updatedVariants = b.variants.map((v) => {
                if (v.id !== variantId) return v;
                return {
                  ...v,
                  url: varResult.url,
                  data: varResult.data,
                  mimeType: varResult.mimeType,
                  status: 'done' as const,
                };
              });
              return { ...b, variants: updatedVariants };
            })
          );
        } catch (err: any) {
          console.error(err);
          setBatches((prev) =>
            prev.map((b) => {
              if (b.id !== batchId) return b;
              const updatedVariants = b.variants.map((v) => {
                if (v.id !== variantId) return v;
                return {
                  ...v,
                  status: 'error' as const,
                  error: err.message || 'Variation generation failed',
                };
              });
              return { ...b, variants: updatedVariants };
            })
          );
        }
      });

      await Promise.allSettled(variationPromises);

      setBatches((prev) =>
        prev.map((b) => (b.id === batchId ? { ...b, stage: 'completed' } : b))
      );
    } catch (err: any) {
      console.error('Base video generation error:', err);
      setBatches((prev) =>
        prev.map((b) => {
          if (b.id !== batchId) return b;
          return {
            ...b,
            stage: 'error',
            baseVideo: {
              ...b.baseVideo!,
              status: 'error',
              error: err.message || 'Base video generation failed',
            },
            variants: b.variants.map((v) => ({
              ...v,
              status: 'error',
              error: 'Base video failed to render',
            })),
          };
        })
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Re-use current batch's existing base prompt / video to apply fresh variation dimensions
  const handleGenerateOnExistingBase = async ({
    dimension,
    variants,
  }: {
    dimension: VariationDimension;
    variants: VariationOption[];
  }) => {
    if (!activeBatch) return;
    const batchId = activeBatch.id;
    const scenePrompt = activeBatch.basePrompt || (activeBatch.baseVideo ? activeBatch.baseVideo.prompt : '');
    setIsGenerating(true);

    const initialVariants: DraftVariant[] = variants.map((v, idx) => ({
      id: `${batchId}-rerun-${Date.now()}-${idx}`,
      name: `Variant ${String.fromCharCode(65 + idx)}`,
      variationLabel: v.label,
      prompt: `${v.promptModifier} | Base: ${scenePrompt}`.trim(),
      url: '',
      data: '',
      mimeType: 'video/mp4',
      status: 'generating',
      quality: 'draft',
      timestamp: Date.now(),
    }));

    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        return {
          ...b,
          dimension,
          variants: initialVariants,
          stage: 'variations_generating',
          selectedVariantId: initialVariants[0].id,
        };
      })
    );
    setSelectedVariantId(initialVariants[0].id);

    if (dimension === 'technique') {
      // Direct generation for motion
      const variationPromises = initialVariants.map(async (vObj, idx) => {
        const variantOption = variants[idx];
        const motionPromptInstruction = `Task: Generate a high-quality cinematic video in 360p Draft Mode.
SCENE PROMPT: ${scenePrompt}
CAMERA MOTION & TECHNIQUE DIRECTIVE: ${variantOption.label} - ${variantOption.promptModifier}
CRITICAL EXECUTION:
1. Follow the camera motion directive strictly from the very beginning (${variantOption.promptModifier}).
2. Render a clean, cohesive, cinematic shot with high visual fidelity and natural movement.`;

        try {
          const res = await fetch('/api/omni', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-client-id': getClientId() },
            body: JSON.stringify({
              prompt: motionPromptInstruction,
              format: 'video',
              quality: 'draft',
            }),
          });

          const { jobId, error: jobError } = await res.json();
          if (jobError || !jobId) throw new Error(jobError || 'Failed to start motion variation');

          const varResult = await pollJob(jobId);

          setBatches((prev) =>
            prev.map((b) => {
              if (b.id !== batchId) return b;
              const updatedVariants = b.variants.map((v) => {
                if (v.id !== vObj.id) return v;
                return {
                  ...v,
                  url: varResult.url,
                  data: varResult.data,
                  mimeType: varResult.mimeType,
                  status: 'done' as const,
                };
              });
              return { ...b, variants: updatedVariants };
            })
          );
        } catch (err: any) {
          setBatches((prev) =>
            prev.map((b) => {
              if (b.id !== batchId) return b;
              const updatedVariants = b.variants.map((v) => {
                if (v.id !== vObj.id) return v;
                return {
                  ...v,
                  status: 'error' as const,
                  error: err.message || 'Variation failed',
                };
              });
              return { ...b, variants: updatedVariants };
            })
          );
        }
      });

      await Promise.allSettled(variationPromises);
      setBatches((prev) =>
        prev.map((b) => (b.id === batchId ? { ...b, stage: 'completed' } : b))
      );
      setIsGenerating(false);
      return;
    }

    // If style (Post FX) and base video data exists
    if (!activeBatch.baseVideo || !activeBatch.baseVideo.data) {
      setIsGenerating(false);
      return;
    }
    const baseVideo = activeBatch.baseVideo;

    const variationPromises = initialVariants.map(async (vObj, idx) => {
      const variantOption = variants[idx];
      const variationPrompt = `Task: Apply the following stylistic variation directive directly onto this exact base video.
BASE SCENE: ${baseVideo.prompt}
VARIATION DIRECTIVE: ${variantOption.promptModifier}
CRITICAL RULES:
1. Maintain the underlying camera motion trajectory, character movements, timing, and scene layout from the base video.
2. Boldly apply the requested camera optics, lens characteristics (e.g. anamorphic flares, halation, bloom), environmental lighting, and post-production color grading.`;

      try {
        const res = await fetch('/api/omni', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-client-id': getClientId() },
          body: JSON.stringify({
            mode: 'variation',
            video: baseVideo.data,
            mimeType: baseVideo.mimeType,
            prompt: variationPrompt,
            format: 'video',
            quality: 'draft',
          }),
        });

        const { jobId, error: jobError } = await res.json();
        if (jobError || !jobId) throw new Error(jobError || 'Failed to start variation');

        const varResult = await pollJob(jobId);

        setBatches((prev) =>
          prev.map((b) => {
            if (b.id !== batchId) return b;
            const updatedVariants = b.variants.map((v) => {
              if (v.id !== vObj.id) return v;
              return {
                ...v,
                url: varResult.url,
                data: varResult.data,
                mimeType: varResult.mimeType,
                status: 'done' as const,
              };
            });
            return { ...b, variants: updatedVariants };
          })
        );
      } catch (err: any) {
        setBatches((prev) =>
          prev.map((b) => {
            if (b.id !== batchId) return b;
            const updatedVariants = b.variants.map((v) => {
              if (v.id !== vObj.id) return v;
              return {
                ...v,
                status: 'error' as const,
                error: err.message || 'Variation failed',
              };
            });
            return { ...b, variants: updatedVariants };
          })
        );
      }
    });

    await Promise.allSettled(variationPromises);
    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, stage: 'completed' } : b))
    );
    setIsGenerating(false);
  };

  const handleUpdateDraftVideo = (updatedDraft: DraftVariant) => {
    if (!activeBatchId) return;
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== activeBatchId) return b;
        return {
          ...b,
          variants: b.variants.map((v) => (v.id === updatedDraft.id ? updatedDraft : v)),
        };
      })
    );
  };

  return (
    <div className="flex h-screen w-full bg-[#F8F9FA] text-zinc-900 font-sans overflow-hidden">
      
      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-16 border-b border-zinc-200/90 bg-white/95 backdrop-blur-md flex items-center justify-center px-6 z-20 flex-shrink-0">
          {/* Workflow Stage Navigation Tabs */}
          <div className="flex items-center gap-1 bg-zinc-100 border border-zinc-200/80 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900 font-medium'
              }`}
            >
              <Layers size={13} />
              <span>1. Exploration Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('refine')}
              disabled={!selectedVariant || selectedVariant.status !== 'done'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'refine'
                  ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900 font-medium'
              }`}
            >
              <MessageSquare size={13} />
              <span>2. Conversational Refine</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('master')}
              disabled={!selectedVariant || selectedVariant.status !== 'done'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'master'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 font-medium'
              }`}
            >
              <span>3. Master Lab</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </header>

        {/* Dynamic Main Body Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10 scrollbar-hide">
          <div className="w-full max-w-6xl xl:max-w-7xl mx-auto space-y-8">
            
            {/* Big and Center Bold Title / Logo in Display Font Style */}
            <div className="text-center pt-2 sm:pt-4 pb-2 flex flex-col items-center justify-center">
              <div className="inline-flex items-baseline justify-center">
                <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase text-zinc-950 tracking-[-0.04em] select-none leading-none">
                  THE DRAFT ROOM
                </h1>
              </div>
            </div>

            {/* View 1: Exploration Matrix */}
            {activeTab === 'matrix' && (
              <div className="space-y-8">
                {/* Generation Setup Form */}
                <DraftGenerator
                  onGenerateDrafts={handleGenerateDrafts}
                  isGenerating={isGenerating}
                />

                {/* Draft Variations Grid */}
                {activeBatch && (activeBatch.baseVideo || activeBatch.variants.length > 0) && (
                  <DraftGrid
                    baseVideo={activeBatch.baseVideo}
                    variants={activeBatch.variants}
                    stage={activeBatch.stage}
                    dimension={activeBatch.dimension}
                    selectedVariantId={selectedVariantId}
                    onSelectVariant={(id) => setSelectedVariantId(id)}
                    onRefineVariant={(v) => {
                      setSelectedVariantId(v.id);
                      setActiveTab('refine');
                    }}
                    onMasterVariant={(v) => {
                      setSelectedVariantId(v.id);
                      setActiveTab('master');
                    }}
                  />
                )}
              </div>
            )}

            {/* View 2: Conversational Refine */}
            {activeTab === 'refine' && selectedVariant && (
              <ConversationalEditor
                draft={selectedVariant}
                sourceMedia={currentSourceMedia}
                onBackToGrid={() => setActiveTab('matrix')}
                onMasterDraft={(v) => {
                  setSelectedVariantId(v.id);
                  setActiveTab('master');
                }}
                onUpdateDraftVideo={handleUpdateDraftVideo}
              />
            )}

            {/* View 3: Master Lab */}
            {activeTab === 'master' && selectedVariant && (
              <MasteringDeck
                draft={selectedVariant}
                onBackToEditing={() => setActiveTab('refine')}
                onMasterComplete={handleUpdateDraftVideo}
              />
            )}
          </div>
        </main>
      </div>

      {/* History Slide-Out / Sidebar */}
      {showHistory && (
        <HistorySidebar
          batches={batches}
          activeBatchId={activeBatchId}
          onSelectBatch={(b) => {
            setActiveBatchId(b.id);
            setSelectedVariantId(b.variants[0]?.id || null);
            setActiveTab('matrix');
          }}
          onSelectVariant={(v) => {
            setSelectedVariantId(v.id);
            setActiveTab('refine');
          }}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}

export default App;
