import { VariationDimension, VariationOption } from '../types';

export const VARIATION_DIMENSIONS: { id: VariationDimension; label: string; description?: string }[] = [
  {
    id: 'style',
    label: 'Post FX',
  },
  {
    id: 'technique',
    label: 'Motion & Transition',
  },
];

export const VARIATION_PRESETS: Record<VariationDimension, VariationOption[]> = {
  style: [
    {
      id: 'monochrome',
      label: 'Monochrome',
      description: 'High-contrast black-and-white, deep crushed shadows, sharp chiaroscuro lighting, and 1940s film grain',
      promptModifier: 'High-contrast black-and-white color effect, deep crushed shadows, sharp pools of light, dramatic chiaroscuro. Moody, mysterious, cinematic 1940s film color grading with subtle film grain.',
    },
    {
      id: 'vhs',
      label: 'VHS',
      description: 'Retro VHS tape aesthetic with soft focus, faded colors, scan lines, tracking distortion, and analog noise',
      promptModifier: 'Heavy horizontal scan lines, tracking bars, tape noise, static interference, chromatic color bleed, and subtle frame warping layered across the image. Add timestamp-style overlays, REC indicators, signal glitches, and worn analog texture for an authentic 1980s–90s VHS playback feel.',
    },
    {
      id: 'duotone',
      label: 'Duotone',
      description: 'Stylized duotone treatment using two bold dominant colors for graphic, high-contrast poster separation',
      promptModifier: 'Stylized duotone treatment using only two dominant colors, with shadows rendered in one tone and highlights in another. Bold, graphic, poster-like contrast with simplified color separation and a contemporary editorial feel.',
    },
    {
      id: 'cool-grade',
      label: 'Cool Grade',
      description: 'Cool blue and cyan color grading with restrained warmth, crisp highlights, and slightly desaturated skin tones.',
      promptModifier: 'Cool blue and cyan color grading with restrained warmth, crisp highlights, and slightly desaturated skin tones.',
    },
  ],

  technique: [
    {
      id: 'locked-frame',
      label: 'Locked Frame',
      description: 'Camera remains completely fixed in place with no pan, tilt, zoom, or shake.',
      promptModifier: 'Camera remains completely fixed in place with no pan, tilt, zoom, or shake. The subject moves naturally within the frame while the composition stays perfectly steady.',
    },
    {
      id: 'tracking-shot',
      label: 'Tracking Shot',
      description: 'Camera smoothly tracks alongside or behind the moving subject at a consistent speed and distance.',
      promptModifier: 'Camera smoothly tracks alongside or behind the moving subject at a consistent speed and distance. Fluid, stabilized movement keeps the subject framed continuously with no sudden acceleration or reframing.',
    },
    {
      id: 'overhead-crane',
      label: 'Overhead Crane',
      description: 'Camera begins from an elevated overhead position and moves in a slow, controlled aerial sweep or vertical descent.',
      promptModifier: 'Camera begins from an elevated overhead position and moves in a slow, controlled aerial sweep or vertical descent. Smooth cinematic motion reveals the environment while gradually bringing attention toward the subject.',
    },
    {
      id: 'cinematic-push-in',
      label: 'Cinematic Push-In',
      description: 'Camera makes a continuous, gentle forward push toward the subject, gradually tightening the composition.',
      promptModifier: 'Camera makes a continuous, gentle forward push toward the subject, gradually tightening the composition. Slow, steady movement with no abrupt changes, creating increasing focus and visual intimacy.',
    },
  ],
};
