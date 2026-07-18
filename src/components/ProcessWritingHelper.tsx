import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Info, 
  Check, 
  Copy, 
  BookOpen, 
  ChevronRight, 
  HelpCircle,
  HelpCircle as HelpIcon,
  RotateCcw,
  Maximize2
} from 'lucide-react';

interface ProcessWritingHelperProps {
  currentText: string;
  onApply: (text: string) => void;
  onClose: () => void;
}

const CATEGORIES = {
  theme: {
    title: 'Theme',
    desc: 'Big Picture ideas to explore/investigate',
    examples: [
      'Emotion', 'Travel', 'Storytelling', 'Decay', 'Motion', 'Anatomy', 'History', 
      'Heritage', 'Social Justice', 'Journey', 'Experience', 'Escape', 'Self Discovery', 
      'Surrealism', 'Discovery', 'Realism', 'Humor', 'Growth', 'Identity', 'Pop Art', 
      'Love', 'Faith', 'Reflection', 'Connection', 'Isolation', 'Movement'
    ]
  },
  actions: {
    title: 'Actions',
    desc: 'Methods (physical/conceptual) to alter/personalize art',
    examples: [
      'Express', 'Warp', 'Stretch', 'Illustrate', 'Repeat', 'Blur', 'Overlap', 
      'Texturize', 'Layer', 'Merge', 'Distort', 'Twist', 'Exaggerate', 'Isolate', 
      'Smooth', 'Connect', 'Reveal'
    ]
  },
  concepts: {
    title: 'Art Concepts',
    desc: 'Foundation elements and principles explored',
    examples: [
      'Balance', 'Contrast', 'Value', 'Line', 'Dimension', 'Depth', 'Foreshortening', 
      'Motion', 'Scale/Size', 'Point of View', 'Macro', 'Texture', 'Pattern', 
      'Repetition', 'Asymmetry', 'Symmetry', 'Rhythm', 'Movement', 'Reflection', 
      'Focus Surface', 'Space', 'Emphasis', 'Color'
    ]
  },
  media: {
    title: 'Media',
    desc: 'Specific material used to complete the art process',
    examples: [
      'Color Pencils', 'Pen', 'Charcoal', 'Markers', 'Graphite', 'Pencil', 'Oil Pastel', 
      'Chalk Pastel', 'Gouache', 'Watercolor', 'Acrylic Paint', 'Gel Pen', 'Digital Media', 
      'Mixed Media'
    ]
  }
};

const SENTENCE_STEMS = [
  {
    id: 'stem-1',
    template: 'Exploration of {MEDIA} is used to convey the {THEME_OR_CONCEPT} in my drawing.',
    fields: ['MEDIA', 'THEME_OR_CONCEPT']
  },
  {
    id: 'stem-2',
    template: 'Experimentation with {MEDIA} highlights {THEME_OR_CONCEPT}. This is shown by {ACTION_OR_CONCEPT}.',
    fields: ['MEDIA', 'THEME_OR_CONCEPT', 'ACTION_OR_CONCEPT']
  },
  {
    id: 'stem-3',
    template: '{MEDIA} emphasizes {CONCEPT} and explores the {THEME_OR_IDEA}.',
    fields: ['MEDIA', 'CONCEPT', 'THEME_OR_IDEA']
  },
  {
    id: 'stem-4',
    template: 'Emphasis on {MEDIA} and {CONCEPT} to show {THEME}.',
    fields: ['MEDIA', 'CONCEPT', 'THEME']
  }
];

const WORKSHEET_EXAMPLES = [
  'I used repeated cropping, red lighting, and close-up hands to show anxiety around social performance.',
  'Layered acrylic washes with sand texture, selective palette knife scraping to reveal raw underlayers.',
  'Experimented with high-contrast graphite shading and fragmented mirrors to represent split reflection.',
  'Direct transfer print of newsprint, modified with heavy charcoal organic scribbles for visual distortion.',
  'Sequential close-up digital photographs, high saturation color curves to track organic fruit decay.'
];

export function ProcessWritingHelper({ currentText, onApply, onClose }: ProcessWritingHelperProps) {
  const [activeTab, setActiveTab] = useState<'stems' | 'examples' | 'planning'>('stems');
  const [selectedStemId, setSelectedStemId] = useState<string>(SENTENCE_STEMS[0].id);
  
  // Sentence builder state
  const [inputs, setInputs] = useState<Record<string, string>>({
    MEDIA: '',
    THEME_OR_CONCEPT: '',
    ACTION_OR_CONCEPT: '',
    CONCEPT: '',
    THEME_OR_IDEA: '',
    THEME: '',
    SUBJECT: ''
  });

  const [activeInputField, setActiveInputField] = useState<string>('MEDIA');
  const [previewText, setPreviewText] = useState('');

  // Update preview when stem or inputs change
  useEffect(() => {
    if (activeTab === 'stems') {
      const selectedStem = SENTENCE_STEMS.find(s => s.id === selectedStemId);
      if (selectedStem) {
        let text = selectedStem.template;
        selectedStem.fields.forEach(f => {
          const val = inputs[f] ? inputs[f] : `[${f.replace(/_/g, ' ')}]`;
          text = text.replace(`{${f}}`, val);
        });
        setPreviewText(text);
      }
    }
  }, [selectedStemId, inputs, activeTab]);

  const handleChipClick = (categoryKey: string, value: string) => {
    // Attempt to smartly assign values to field based on category or active input field
    const fieldMap: Record<string, string> = {
      media: 'MEDIA',
      theme: 'THEME_OR_CONCEPT',
      concepts: 'CONCEPT',
      actions: 'ACTION_OR_CONCEPT'
    };

    let targetField = activeInputField;
    
    // Automatically match field if clicking from a obvious category
    if (categoryKey === 'media') targetField = 'MEDIA';
    else if (categoryKey === 'theme' && !inputs.THEME_OR_CONCEPT) targetField = 'THEME_OR_CONCEPT';
    else if (categoryKey === 'concepts' && !inputs.CONCEPT) targetField = 'CONCEPT';
    else if (categoryKey === 'actions' && !inputs.ACTION_OR_CONCEPT) targetField = 'ACTION_OR_CONCEPT';

    setInputs(prev => ({
      ...prev,
      [targetField]: value
    }));
  };

  const handleApply = (textToApply: string) => {
    onApply(textToApply.slice(0, 100));
    onClose();
  };

  const currentStem = SENTENCE_STEMS.find(s => s.id === selectedStemId);
  const isOverLimit = previewText.length > 100;

  return (
    <div className="brutal-card p-6 bg-white border-2 border-ink space-y-6 max-w-2xl mx-auto shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-ink/10 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-brand-primary uppercase tracking-wider block mb-1">AP Art Companion</span>
          <h4 className="text-2xl editorial-title text-brand-secondary">Process Writing Springboard</h4>
          <p className="text-xs text-ink/60 mt-1">
            "Art Process" captures choices of media, technique, and concepts to explain how they contribute to your artwork's overall meaning.
          </p>
        </div>
        <button 
          onClick={onClose}
          className="text-xs font-mono border border-ink/20 hover:border-ink px-2 py-1 rounded transition-colors"
        >
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink/10">
        <button
          onClick={() => { setActiveTab('stems'); setActiveInputField('MEDIA'); }}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors -mb-px ${
            activeTab === 'stems'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-ink/40 hover:text-ink/80'
          }`}
        >
          1. Interactive Sentences
        </button>
        <button
          onClick={() => setActiveTab('planning')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors -mb-px ${
            activeTab === 'planning'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-ink/40 hover:text-ink/80'
          }`}
        >
          2. Vocabulary Bank
        </button>
        <button
          onClick={() => setActiveTab('examples')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors -mb-px ${
            activeTab === 'examples'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-ink/40 hover:text-ink/80'
          }`}
        >
          3. Springboard Examples
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'stems' && (
        <div className="space-y-6">
          {/* Step 1: Choose Stem */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold text-ink/40 uppercase tracking-widest block">Step 1: Select a stem starter</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SENTENCE_STEMS.map(stem => (
                <button
                  key={stem.id}
                  onClick={() => {
                    setSelectedStemId(stem.id);
                    // Match default inputs
                    if (stem.fields.length > 0) {
                      setActiveInputField(stem.fields[0]);
                    }
                  }}
                  className={`p-3 text-left rounded-xl border text-xs leading-relaxed transition-all ${
                    selectedStemId === stem.id
                      ? 'border-brand-primary bg-brand-primary/[0.03] font-medium text-ink'
                      : 'border-ink/10 hover:border-ink/30 text-ink/60 bg-transparent'
                  }`}
                >
                  {stem.template.replace(/{([A-Z_]+)}/g, '[$1]')}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Input variables */}
          {currentStem && (
            <div className="space-y-4">
              <span className="text-[10px] font-mono font-bold text-ink/40 uppercase tracking-widest block">Step 2: Customize variables</span>
              
              {/* Variable Input Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {currentStem.fields.map(field => (
                  <div key={field} className="space-y-1">
                    <label className="text-[9px] font-mono font-bold text-ink/50 uppercase tracking-wide block">
                      {field.replace(/_/g, ' ')}
                    </label>
                    <input
                      type="text"
                      value={inputs[field] || ''}
                      onFocus={() => setActiveInputField(field)}
                      onChange={(e) => setInputs(prev => ({ ...prev, [field]: e.target.value }))}
                      placeholder={`e.g. ${
                        field === 'MEDIA' ? 'watercolor' :
                        field === 'THEME_OR_CONCEPT' || field === 'THEME' || field === 'THEME_OR_IDEA' ? 'Surrealism' :
                        field === 'CONCEPT' ? 'depth' : 'experimentation'
                      }`}
                      className={`w-full text-xs font-mono p-2 border rounded-lg focus:outline-none transition-all ${
                        activeInputField === field
                          ? 'border-brand-primary bg-brand-primary/[0.02]'
                          : 'border-ink/15 bg-transparent'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Suggestions chips for the ACTIVE field */}
              <div className="bg-ink/[0.02] p-4 rounded-xl border border-ink/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-ink/60 uppercase">
                    Suggested words for <span className="text-brand-primary">{activeInputField.replace(/_/g, ' ')}</span>:
                  </span>
                  <span className="text-[9px] font-mono text-ink/30 italic">Click to insert</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-2 pb-1">
                  {/* Media options */}
                  {activeInputField === 'MEDIA' && CATEGORIES.media.examples.map(m => (
                    <button
                      key={m}
                      onClick={() => handleChipClick('media', m)}
                      className="text-[10px] font-mono border border-brand-primary/20 bg-brand-primary/[0.02] hover:bg-brand-primary hover:text-white hover:border-brand-primary text-brand-primary px-2 py-1 rounded-full transition-all"
                    >
                      {m}
                    </button>
                  ))}
                  
                  {/* Theme options */}
                  {(activeInputField === 'THEME_OR_CONCEPT' || activeInputField === 'THEME' || activeInputField === 'THEME_OR_IDEA') && CATEGORIES.theme.examples.map(t => (
                    <button
                      key={t}
                      onClick={() => handleChipClick('theme', t)}
                      className="text-[10px] font-sans border border-brand-secondary/20 bg-brand-secondary/[0.02] hover:bg-brand-secondary hover:text-white hover:border-brand-secondary text-brand-secondary px-2 py-0.5 rounded-full transition-all"
                    >
                      {t}
                    </button>
                  ))}

                  {/* Art Concept options */}
                  {(activeInputField === 'CONCEPT' || activeInputField === 'ACTION_OR_CONCEPT') && CATEGORIES.concepts.examples.map(c => (
                    <button
                      key={c}
                      onClick={() => handleChipClick('concepts', c)}
                      className="text-[10px] font-sans border border-emerald-600/20 bg-emerald-600/[0.02] hover:bg-emerald-600 hover:text-white hover:border-emerald-600 text-emerald-800 px-2 py-0.5 rounded-full transition-all"
                    >
                      {c}
                    </button>
                  ))}

                  {/* Actions / Process options */}
                  {activeInputField === 'ACTION_OR_CONCEPT' && CATEGORIES.actions.examples.map(a => (
                    <button
                      key={a}
                      onClick={() => handleChipClick('actions', a)}
                      className="text-[10px] font-sans border border-amber-600/20 bg-amber-600/[0.03] hover:bg-amber-600 hover:text-white hover:border-amber-600 text-amber-800 px-2 py-0.5 rounded-full transition-all"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Builder Output Preview */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-ink/40 uppercase tracking-widest">Workspace Output Preview</span>
              <span className={`text-[10px] font-mono font-bold ${isOverLimit ? 'text-red-500 font-extrabold' : 'text-emerald-600'}`}>
                {previewText.length} / 100 Char Limit
              </span>
            </div>
            
            <div className={`p-4 rounded-xl border-2 transition-colors ${
              isOverLimit ? 'border-red-400 bg-red-50/50' : 'border-ink bg-slate-50'
            }`}>
              <p className="text-sm font-display leading-relaxed italic text-ink">
                "{previewText}"
              </p>
              
              {isOverLimit && (
                <div className="mt-2 text-[10px] font-mono text-red-600 flex items-center gap-1 bg-red-100/50 px-2 py-1 rounded">
                  ⚠️ AP Sustained Investigation allows max 100 characters per process label. Keep it concise!
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setInputs({
                  MEDIA: '',
                  THEME_OR_CONCEPT: '',
                  ACTION_OR_CONCEPT: '',
                  CONCEPT: '',
                  THEME_OR_IDEA: '',
                  THEME: '',
                  SUBJECT: ''
                })}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-ink/10 hover:border-ink/30 text-ink/60 rounded-xl text-xs font-mono transition-all"
              >
                <RotateCcw size={12} /> Clear Stem
              </button>
              <button
                type="button"
                disabled={previewText.trim().length === 0 || isOverLimit}
                onClick={() => handleApply(previewText)}
                className="flex items-center gap-2 px-5 py-2 bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-md"
              >
                Apply to Process Label
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'planning' && (
        <div className="space-y-4">
          <p className="text-xs text-ink/60">
            Brainstorming worksheets categorize process thinking ideas into 4 categories. Click any vocabulary word below to copy it or help formulate your sustained investigation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
            {Object.entries(CATEGORIES).map(([key, category]) => (
              <div key={key} className="p-4 rounded-xl border border-ink/10 bg-slate-50 space-y-2">
                <div>
                  <h5 className="font-bold text-sm text-ink">{category.title}</h5>
                  <p className="text-[10px] text-ink/40 italic leading-none">{category.desc}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {category.examples.map(ex => (
                    <button
                      key={ex}
                      onClick={() => {
                        // Copy to clipboard helper & notify
                        navigator.clipboard.writeText(ex);
                        // Briefly update input state if matched
                        if (key === 'media') setInputs(p => ({ ...p, MEDIA: ex }));
                        else if (key === 'theme') setInputs(p => ({ ...p, THEME_OR_CONCEPT: ex, THEME_OR_IDEA: ex, THEME: ex }));
                        else if (key === 'concepts') setInputs(p => ({ ...p, CONCEPT: ex }));
                        else if (key === 'actions') setInputs(p => ({ ...p, ACTION_OR_CONCEPT: ex }));
                      }}
                      className="text-[10px] font-mono bg-white hover:bg-brand-primary hover:text-white border border-ink/10 text-ink/75 px-2 py-0.5 rounded transition-all"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'examples' && (
        <div className="space-y-4">
          <p className="text-xs text-ink/60">
            Successful 100-character Sustained Investigation process details from AP portfolios. Keep them short, objective, and specific.
          </p>
          <div className="space-y-3">
            {WORKSHEET_EXAMPLES.map((example, i) => (
              <div key={i} className="p-4 rounded-xl border border-ink/10 hover:border-brand-primary hover:bg-brand-primary/[0.01] transition-all flex justify-between items-center gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-ink italic leading-relaxed">
                    "{example}"
                  </p>
                  <span className="text-[9px] font-mono text-ink/30 block mb-1">
                    Char Count: {example.length} chars
                  </span>
                </div>
                <button
                  onClick={() => handleApply(example)}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-brand-primary/[0.08] hover:bg-brand-primary hover:text-white text-brand-primary rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all"
                >
                  Apply <ChevronRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
