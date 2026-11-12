export interface MediaState {
  url: string;
  data: string;
  mimeType: string;
  isExtracted?: boolean;
  name?: string;
}

export type VariationDimension = 'style' | 'technique';

export interface VariationOption {
  id: string;
  label: string;
  promptModifier: string;
  description: string;
  badge?: string;
}

export interface DraftVariant {
  id: string;
  name: string;
  variationLabel: string;
  prompt: string;
  url: string;
  data: string;
  mimeType: string;
  status: 'idle' | 'generating' | 'done' | 'error';
  error?: string;
  quality: 'draft' | '1080p';
  duration?: number;
  timestamp: number;
}

export interface BaseVideoState {
  id: string;
  prompt: string;
  url: string;
  data: string;
  mimeType: string;
  status: 'idle' | 'generating' | 'done' | 'error';
  error?: string;
  timestamp: number;
}

export interface RefinementMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  videoUrl?: string;
}

export interface DraftBatch {
  id: string;
  title: string;
  basePrompt: string;
  dimension: VariationDimension;
  baseVideo?: BaseVideoState;
  variants: DraftVariant[];
  createdAt: Date;
  selectedVariantId?: string;
  stage?: 'base_generating' | 'variations_generating' | 'completed' | 'error';
}

let fallbackClientId = '';
export function getClientId(): string {
  const key = 'aistudio_client_id';
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing && /^[a-zA-Z0-9._-]{8,128}$/.test(existing)) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.sessionStorage.setItem(key, generated);
    return generated;
  } catch {
    if (!fallbackClientId) {
      fallbackClientId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    }
    return fallbackClientId;
  }
}

