const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add TRANSITIONS above function App
const transitionsCode = `const TRANSITIONS = [
  {
    id: 'object-portal',
    name: 'Object Portal',
    hint: 'Travel through an object into the next scene',
    block: 'TECHNIQUE — OBJECT PORTAL: The camera pushes toward and INTO an object present in the first frame (a doorway, window, mirror, cup, phone screen, or any circular/rectangular opening). Passing through its interior becomes the gateway: emerge out the other side already inside the last frame\\'s scene. The object\\'s interior fills the frame completely at the midpoint so the scenes never visibly cut.'
  },
  {
    id: 'whip-pan',
    name: 'Whip Pan',
    hint: 'Fast blur pan hides the seam',
    block: 'TECHNIQUE — WHIP PAN: The camera whips horizontally with strong motion blur out of the first scene; mid-blur, the environment swaps; the whip decelerates smoothly to land composed on the last frame. The blur must fully obscure the switch; entry speed and exit speed must match so it reads as one physical pan.'
  },
  {
    id: 'match-cut-morph',
    name: 'Match Morph',
    hint: 'A shape in scene one becomes a shape in scene two',
    block: 'TECHNIQUE — MATCH MORPH: Identify a dominant shape, silhouette, or line shared between the two frames (a circle, a horizon, a figure). Move the camera so that shape aligns center-frame, then seamlessly morph its material and surroundings from the first scene into the matching shape in the last frame. The shared geometry stays locked in place through the whole transformation.'
  },
  {
    id: 'sky-drop',
    name: 'Sky Drop',
    hint: 'Rise into sky or lights, descend into the new scene',
    block: 'TECHNIQUE — SKY DROP: The camera tilts or cranes UP out of the first scene into sky, clouds, ceiling lights, or canopy; the overhead texture drifts and transforms; then the camera descends OUT of the new scene\\'s sky/ceiling down into the last frame\\'s composition. The overhead fill is the bridge; no cut.'
  },
  {
    id: 'through-the-crowd',
    name: 'Foreground Wipe',
    hint: 'Something crosses the lens and wipes the scene',
    block: 'TECHNIQUE — FOREGROUND WIPE: A foreground element crosses close to the lens (a passing person, vehicle, wall, pillar, or the subject themselves) and briefly fills the frame; as it clears, the environment behind it has become the last frame\\'s scene. The wiping element must plausibly belong to BOTH scenes.'
  },
  {
    id: 'time-machine',
    name: 'Time Machine',
    hint: 'Same place, time transforms around a fixed camera',
    block: 'TECHNIQUE — TIME MACHINE: Treat both frames as the SAME location at different times. Lock the camera position (or push in very slowly) while the world transforms in accelerated time-lapse around it: light sweeps, seasons shift, objects age, decay, or renew, people flicker through. Architecture and layout persist; time is the only traveler. End settled exactly on the last frame.'
  }
] as const;

function App() {`;
code = code.replace('function App() {', transitionsCode);

// 2. Add technique state
code = code.replace('const [prompt, setPrompt] = useState("");', 'const [prompt, setPrompt] = useState("");\n  const [technique, setTechnique] = useState<string | null>(null);');

// 3. Add chip row
const chipRow = `<div className="max-w-4xl mx-auto mb-3 flex flex-wrap gap-2">
            {TRANSITIONS.map(t => (
              <button
                key={t.id}
                onClick={() => setTechnique(technique === t.id ? null : t.id)}
                disabled={isGenerating}
                title={t.hint}
                className={\`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 \${technique === t.id ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'}\`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="max-w-4xl mx-auto flex items-center space-x-3">`;
code = code.replace('<div className="max-w-4xl mx-auto flex items-center space-x-3">', chipRow);

// 4. handleGenerate validation
code = code.replace('if (!prompt.trim() || !video1 || !video2) {\n      setError("Please provide both frames and a prompt.");', 'if ((!prompt.trim() && !technique) || !video1 || !video2) {\n      setError("Pick a transition style or describe one, and provide both frames.");');

// 5. handleGenerate fullPrompt and history
const oldFullPrompt = /const fullPrompt = `Task: Interpolate smoothly from the First frame to the Last frame without cutting. The camera should perform a single continuous move to bridge the gap.\\nAdditional user instructions: \$\{prompt\}\\nCRITICAL RULES:\\n1. Single continuous camera move; begin exactly on the First frame and end exactly on the Last frame.`;/;
const newFullPrompt = `const selected = TRANSITIONS.find(t => t.id === technique);
      const fullPrompt = \`Task: Create one continuous, uncut cinematic transition from the First frame to the Last frame.
\${selected ? selected.block : 'TECHNIQUE — DIRECTOR\\'S CHOICE: Choose the single most visually striking transition technique that suits these two frames (object portal, whip pan, match morph, sky drop, foreground wipe, or time-lapse transformation). Commit to it fully.'}
Additional user instructions: \${prompt || 'None.'}
CRITICAL RULES:
1. Single continuous camera move; begin exactly on the First frame and end exactly on the Last frame.
2. Execute the named technique boldly — this is a showcase transition, not a subtle dissolve.
3. No hard cuts, no crossfades, no new characters.\`;`;
code = code.replace(oldFullPrompt, newFullPrompt);

// 6. history saving in handleGenerate
const oldHistory = /prompt,\n\s*quality,\n\s*timestamp: new Date\(\)/;
const newHistory = `prompt: \`\${selected ? selected.name + ': ' : ''}\${prompt}\`,
          quality,
          timestamp: new Date()`;
code = code.replace(oldHistory, newHistory);

// 7. handleGenerate button disable
code = code.replace('disabled={isGenerating || !video1 || !video2}', 'disabled={isGenerating || (!prompt.trim() && !technique) || !video1 || !video2}');

// 8. prompt input placeholder
code = code.replace('placeholder="Describe the transition..."', 'placeholder="Optional: add details (pace, mood, what to pass through)..."');

fs.writeFileSync('src/App.tsx', code);
