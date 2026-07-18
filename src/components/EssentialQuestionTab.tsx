import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  HelpCircle, 
  GitFork, 
  BookOpen, 
  Clock, 
  Edit3, 
  Sparkles, 
  CheckCircle, 
  Compass, 
  ArrowRight, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';

interface EssentialQuestionTabProps {
  portfolioData: any;
  isEditable: boolean;
  onSave: (newQuestion: string, evolutionReason?: string, mindMapData?: { who: string; what: string; how: string }) => Promise<void>;
  onSaveInquiryProgress?: (data: {
    who?: string;
    what?: string;
    how?: string;
    generatedVocabulary?: Array<{ term: string; category: 'subject' | 'medium' }>;
    selectedVocabulary?: string[];
    step2Completed?: boolean;
  }) => Promise<void>;
}

export const EssentialQuestionTab: React.FC<EssentialQuestionTabProps> = ({
  portfolioData,
  isEditable,
  onSave,
  onSaveInquiryProgress
}) => {
  const currentQuestion = portfolioData?.portfolioName || '';
  const history = portfolioData?.essentialQuestionHistory || [];

  // Mind map drafts
  const [whoDraft, setWhoDraft] = useState(portfolioData?.mindMapWho || '');
  const [whatDraft, setWhatDraft] = useState(portfolioData?.mindMapWhat || '');
  const [howDraft, setHowDraft] = useState(portfolioData?.mindMapHow || '');

  // Sync state when portfolioData changes (e.g. initial load)
  useEffect(() => {
    if (portfolioData) {
      setWhoDraft(portfolioData.mindMapWho || '');
      setWhatDraft(portfolioData.mindMapWhat || '');
      setHowDraft(portfolioData.mindMapHow || '');
      setSelectedVocabulary(portfolioData.mindMapSelectedVocabulary || []);
    }
  }, [portfolioData]);

  // Generated vocabulary from backend
  const generatedVocabulary = portfolioData?.mindMapGeneratedVocabulary || [];
  const [selectedVocabulary, setSelectedVocabulary] = useState<string[]>(portfolioData?.mindMapSelectedVocabulary || []);
  const step2Completed = portfolioData?.mindMapStep2Completed || false;

  // Loading & transactional states
  const [isSavingMindMap, setIsSavingMindMap] = useState(false);
  const [isGeneratingVocab, setIsGeneratingVocab] = useState(false);
  const [vocabError, setVocabError] = useState<string | null>(null);
  
  // Step 3 editing state
  const [isEditing, setIsEditing] = useState(!currentQuestion);
  const [questionInput, setQuestionInput] = useState(currentQuestion || '');
  const [evolutionInput, setEvolutionInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Helper properties to check progress
  const isPillarsDrafted = whoDraft.trim() && whatDraft.trim() && howDraft.trim();
  const numSelected = selectedVocabulary.length;
  const isStep1Complete = numSelected >= 5;
  const isStep2Complete = isStep1Complete && step2Completed;

  // Firebase save proxy helper
  const handleSaveInquiryProgressProp = async (data: any) => {
    if (onSaveInquiryProgress) {
      await onSaveInquiryProgress(data);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) {
      alert("Please enter a valid Essential Question.");
      return;
    }
    
    setIsSaving(true);
    try {
      const isChanging = currentQuestion && currentQuestion !== questionInput;
      await onSave(
        questionInput.trim(),
        isChanging ? (evolutionInput.trim() || 'Refined inquiry parameters during creative synthesis.') : undefined,
        { who: whoDraft, what: whatDraft, how: howDraft }
      );
      setIsEditing(false);
      setEvolutionInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMindMap = async () => {
    setIsSavingMindMap(true);
    try {
      await handleSaveInquiryProgressProp({
        who: whoDraft.trim(),
        what: whatDraft.trim(),
        how: howDraft.trim()
      });
      alert("Sketchbook blueprint successfully saved to your portfolio!");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingMindMap(false);
    }
  };

  // Generate Vocabulary from Sketchbook Inputs
  const handleGenerateVocabulary = async () => {
    if (!isPillarsDrafted) {
      alert("Please make sure you have drafted responses in all three pillars under Step 1 before generating custom vocabulary suggestions!");
      return;
    }
    setIsGeneratingVocab(true);
    setVocabError(null);
    try {
      const res = await fetch("/api/generate-vocabulary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          who: whoDraft,
          what: whatDraft,
          how: howDraft
        })
      });
      if (!res.ok) {
        throw new Error("Failed to generate inquiry keywords. Review API settings and retry.");
      }
      const data = await res.json();
      if (data && data.vocabulary) {
        await handleSaveInquiryProgressProp({
          who: whoDraft,
          what: whatDraft,
          how: howDraft,
          generatedVocabulary: data.vocabulary,
          selectedVocabulary: [] // reset selections since new pool is presented
        });
        setSelectedVocabulary([]);
      } else {
        throw new Error("Model response was empty or incorrectly structured.");
      }
    } catch (err: any) {
      console.error(err);
      setVocabError(err.message || "Something went wrong.");
    } finally {
      setIsGeneratingVocab(false);
    }
  };

  // Toggle tag selection
  const handleToggleVocabulary = async (term: string) => {
    if (!isEditable) return;
    let updatedSelected = [];
    if (selectedVocabulary.includes(term)) {
      updatedSelected = selectedVocabulary.filter(t => t !== term);
    } else {
      updatedSelected = [...selectedVocabulary, term];
    }
    // Optimistic UI state update
    setSelectedVocabulary(updatedSelected);
    
    // Save selection to cloud database
    try {
      await handleSaveInquiryProgressProp({ selectedVocabulary: updatedSelected });
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Step 2 completed state
  const handleCompleteStep2 = async () => {
    if (!isStep1Complete) return;
    try {
      await handleSaveInquiryProgressProp({ step2Completed: true });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="essential-question-container" className="space-y-12 max-w-5xl mx-auto">
      
      {/* HEADER EXPLANATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink/5 pb-6">
        <div>
          <h3 className="text-3xl font-display font-semibold text-ink flex items-center gap-2">
            <Compass className="text-brand-primary animate-pulse" size={28} />
            Inquiry Development Workspace
          </h3>
          <p className="text-sm text-ink/60 mt-1.5 max-w-2xl">
            The guiding blueprint of your AP Art portfolio. Step-by-step, draft your sketchbook, map the generated vocabulary, learn AP-compliant synthesis, and lock in your Essential Question.
          </p>
        </div>
      </div>

      {/* LIVE ESSENTIAL QUESTION DISPLAY AT THE VERY TOP */}
      {currentQuestion && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-primary p-6 md:p-8 text-white rounded-[32px] shadow-lg relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/50 bg-white/10 px-3 py-1 rounded-full w-fit">
                Live Essential Question
              </span>
              <h4 className="text-xl md:text-2xl font-serif italic font-bold leading-relaxed pr-6 select-text">
                &ldquo;{currentQuestion}&rdquo;
              </h4>
            </div>
            {isEditable && (
              <button
                onClick={() => {
                  const step3Element = document.getElementById("essential-question-step3-container");
                  if (step3Element) {
                    step3Element.scrollIntoView({ behavior: 'smooth' });
                  }
                  setQuestionInput(currentQuestion);
                  setIsEditing(true);
                }}
                className="bg-white text-brand-primary font-mono text-[10px] uppercase font-bold tracking-wider px-5 py-3 rounded-full hover:bg-paper hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 cursor-pointer shadow-md"
              >
                Revise Inquiry
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* SEQUENTIAL STEPS PROGRESS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-50 border border-ink/5 p-4 rounded-3xl text-xs font-mono">
        <div className={`p-4 rounded-2xl flex items-start gap-3 transition-colors ${!isStep1Complete ? 'bg-amber-500/10 border border-amber-500/20 text-ink' : 'bg-emerald-500/5 text-ink/40'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0 ${isStep1Complete ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
            {isStep1Complete ? "✓" : "1"}
          </span>
          <div>
            <p className="font-bold uppercase tracking-wider text-[10px]">Step 1: Sketchbook Mapping</p>
            <p className="mt-0.5 font-sans">Map background & select 5-10 custom keywords. ({numSelected}/5 selected)</p>
          </div>
        </div>
        
        <div className={`p-4 rounded-2xl flex items-start gap-3 transition-colors ${isStep1Complete && !step2Completed ? 'bg-brand-primary/10 border border-brand-primary/20 text-ink' : step2Completed ? 'bg-emerald-500/5 text-ink/40' : 'text-ink/30'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0 ${step2Completed ? 'bg-emerald-600 text-white' : isStep1Complete ? 'bg-brand-primary text-white' : 'bg-ink/5 text-ink/30'}`}>
            {step2Completed ? "✓" : "2"}
          </span>
          <div>
            <p className="font-bold uppercase tracking-wider text-[10px]">Step 2: Learn AP Synthesis</p>
            <p className="mt-0.5 font-sans">Examine synthesis and acknowledge criteria.</p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl flex items-start gap-3 transition-colors ${isStep2Complete ? 'bg-emerald-500/10 border border-emerald-500/20 text-ink' : 'text-ink/30'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0 ${currentQuestion ? 'bg-emerald-600 text-white' : isStep2Complete ? 'bg-indigo-600 text-white' : 'bg-ink/5 text-ink/30'}`}>
            {currentQuestion ? "✓" : "3"}
          </span>
          <div>
            <p className="font-bold uppercase tracking-wider text-[10px]">Step 3: Establish Inquiry</p>
            <p className="mt-0.5 font-sans">Fuse selected tokens into your guiding question.</p>
          </div>
        </div>
      </div>

      {/* STEP 1: INTERACTIVE SKETCHBOOK MIND MAP EXPLORATION */}
      <div className="bg-white border-2 border-dashed border-orange-200 hover:border-orange-300 transition-colors rounded-3xl p-6 md:p-8 space-y-6 shadow-xs relative">
        <div className="absolute top-4 right-4 bg-orange-100 text-orange-850 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
          Required Step 1
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700 shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-ink">Personal Background Sketchbook Mapping</h4>
            <p className="text-xs text-ink/50 mt-0.5">Translate your background, themes, and methods into the portfolio planning workspace.</p>
          </div>
        </div>

        <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-xs space-y-2 text-ink/80 leading-relaxed max-w-4xl">
          <p className="font-semibold text-amber-900 flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-600 animate-pulse" />
            Developing Authentic Inquiries Before Writing Your Question
          </p>
          <p className="text-amber-800">
            A strong AP Sustained Investigation is not born in a vacuum! Open your sketchbook, brainstorm who you are, what subjects intrigue you, and how you love to work physically. Capture those raw ideas into the three pillars below.
          </p>
        </div>

        {/* Three pillars input fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 flex flex-col justify-between">
            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-ink/75 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[9px] font-sans font-bold">1</span>
                Who You Are
              </label>
              <p className="text-[10.5px] text-ink/45 mb-2 leading-snug">Personal lense: Identity, memories, heritage, community, or nostalgic landmarks.</p>
            </div>
            <textarea
              value={whoDraft}
              onChange={(e) => setWhoDraft(e.target.value)}
              rows={4}
              disabled={!isEditable}
              placeholder="What experiences, environments, or elements define your point of view? (e.g. growing up in a high-density apartment complex in Chicago, being third-generation Japanese-American)..."
              className="w-full text-xs font-sans text-ink bg-zinc-50 border border-ink/10 rounded-xl p-3 outline-none focus:bg-white focus:ring-1 focus:ring-brand-primary transition-all leading-relaxed"
            />
          </div>

          <div className="space-y-2 flex flex-col justify-between">
            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-ink/75 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[9px] font-sans font-bold">2</span>
                What You Like
              </label>
              <p className="text-[10.5px] text-ink/45 mb-2 leading-snug">Subjects: Objects, environments, natural patterns, or structural forms.</p>
            </div>
            <textarea
              value={whatDraft}
              onChange={(e) => setWhatDraft(e.target.value)}
              rows={4}
              disabled={!isEditable}
              placeholder="What physical objects, architectural forms, or thematic questions spark your curiosity? (e.g. brutalist concrete blocks, geometric shadows, decay of organic petals)..."
              className="w-full text-xs font-sans text-ink bg-zinc-50 border border-ink/10 rounded-xl p-3 outline-none focus:bg-white focus:ring-1 focus:ring-brand-primary transition-all leading-relaxed"
            />
          </div>

          <div className="space-y-2 flex flex-col justify-between">
            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-ink/75 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[9px] font-sans font-bold">3</span>
                How You Work
              </label>
              <p className="text-[10.5px] text-ink/45 mb-2 leading-snug">Materials: Mediums, texture depth, layers, light direction, or scale styles.</p>
            </div>
            <textarea
              value={howDraft}
              onChange={(e) => setHowDraft(e.target.value)}
              rows={4}
              disabled={!isEditable}
              placeholder="What materials and techniques define your physical practice? (e.g. charcoal dust spread with fingers, double-exposed analog film, translucent ink dilution)..."
              className="w-full text-xs font-sans text-ink bg-zinc-50 border border-ink/10 rounded-xl p-3 outline-none focus:bg-white focus:ring-1 focus:ring-brand-primary transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* Action to preserve */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-ink/5 pt-4">
          <div className="text-xs text-ink/50">
            Confirm your pillars to enable thematic word mapping.
          </div>
          <div className="flex items-center gap-3 self-end">
            {isEditable && (
              <button
                type="button"
                onClick={handleSaveMindMap}
                disabled={isSavingMindMap}
                className="bg-[#cf7d4d] hover:bg-[#cf7d4d]/90 text-white font-mono text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                {isSavingMindMap ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Saving Draft...
                  </>
                ) : (
                  <>
                    <CheckCircle size={13} />
                    Save Sketchbook Blueprint
                  </>
                )}
              </button>
            )}

            {isEditable && (
              <button
                type="button"
                onClick={handleGenerateVocabulary}
                disabled={isGeneratingVocab || !isPillarsDrafted}
                className={`font-mono text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 ${
                  isPillarsDrafted 
                    ? 'bg-brand-primary text-white hover:opacity-95 cursor-pointer' 
                    : 'bg-zinc-150 text-ink/30 cursor-not-allowed border border-ink/5'
                }`}
              >
                {isGeneratingVocab ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Generating 25-50 Terms...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    {generatedVocabulary.length > 0 ? "Regenerate Keywords" : "Generate Custom Inquiry Keywords"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {vocabError && (
          <div className="text-xs text-red-500 bg-red-500/5 p-3 rounded-xl border border-red-500/10 flex items-center gap-2">
            <AlertCircle size={14} />
            {vocabError}
          </div>
        )}

        {/* INTERACTIVE VOCABULARY SELECTION BOARD */}
        {generatedVocabulary.length > 0 && (
          <div className="border border-ink/10 rounded-2xl p-6 bg-zinc-50 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-3 border-b border-ink/5">
              <div>
                <h5 className="text-sm font-bold text-ink">AP Portfolio Inquiry Keyword Board</h5>
                <p className="text-xs text-ink/50">Select at least 5 keywords representing what you want to investigate physically and conceptually.</p>
              </div>
              <div className="text-xs font-mono font-bold bg-white border border-ink/5 px-3 py-1.5 rounded-xl shrink-0">
                Selection status: <span className={`${numSelected >= 5 ? 'text-emerald-600' : 'text-amber-600'}`}>{numSelected} / 5+ Selected</span> {numSelected >= 5 && "✓ Completed"}
              </div>
            </div>

            {/* Sub-Category 1: Subject / Themes */}
            <div className="space-y-3">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-pink-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                SUBJECT & CONCEPTUAL DISCOVERIES (Ideas, themes, narratives)
              </p>
              <div className="flex flex-wrap gap-2">
                {generatedVocabulary
                  .filter((item: any) => item.category === "subject")
                  .map((item: any, i: number) => {
                    const isSelected = selectedVocabulary.includes(item.term);
                    return (
                      <motion.button
                        key={`sub-${i}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleToggleVocabulary(item.term)}
                        className={`text-xs px-3.5 py-2 rounded-xl transition-all border font-sans cursor-pointer text-left ${
                          isSelected
                            ? "bg-pink-100 border-pink-400 text-pink-900 font-medium shadow-xs"
                            : "bg-white border-ink/10 text-ink/70 hover:bg-zinc-100 hover:text-ink hover:border-ink/20"
                        }`}
                      >
                        {item.term} {isSelected && "✓"}
                      </motion.button>
                    );
                  })}
              </div>
            </div>

            {/* Sub-Category 2: Media / Techniques */}
            <div className="space-y-3">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                MEDIUMS & COMPOSITIONAL METHODS (Materials, processes, lighting)
              </p>
              <div className="flex flex-wrap gap-2">
                {generatedVocabulary
                  .filter((item: any) => item.category === "medium")
                  .map((item: any, i: number) => {
                    const isSelected = selectedVocabulary.includes(item.term);
                    return (
                      <motion.button
                        key={`med-${i}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleToggleVocabulary(item.term)}
                        className={`text-xs px-3.5 py-2 rounded-xl transition-all border font-sans cursor-pointer text-left ${
                          isSelected
                            ? "bg-indigo-100 border-indigo-400 text-indigo-900 font-medium shadow-xs"
                            : "bg-white border-ink/10 text-ink/70 hover:bg-zinc-100 hover:text-ink hover:border-ink/20"
                        }`}
                      >
                        {item.term} {isSelected && "✓"}
                      </motion.button>
                    );
                  })}
              </div>
            </div>
            
            <div className="pt-2 flex justify-between items-center text-xs text-ink/45">
              <span>Selected values will be displayed as floating visual inspiration tokens in Step 3.</span>
              <span>{numSelected < 5 ? `Select ${5 - numSelected} more to unlock Step 2` : "Step 2 is unlocked below!"}</span>
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: THE ART OF AP QUESTIONNAIRE SYNTHESIS - UNLOCKS ONLY WHEN STEP 1 HAS 5 SELECTED */}
      {isStep1Complete ? (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-zinc-50 border border-indigo-100 rounded-3xl p-6 md:p-8 space-y-6 relative"
        >
          <div className="absolute top-4 right-4 bg-indigo-100 text-indigo-850 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
            Unlocked Step 2
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-150 flex items-center justify-center text-indigo-700 shrink-0">
              <HelpCircle size={20} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-ink">Step 2: Learning AP Synthesis</h4>
              <p className="text-xs text-ink/50 mt-0.5">Synthesize the elements in Step 1 to create an open-ended investigation parameters.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed text-xs">
            <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10 space-y-2">
              <p className="font-bold text-red-905 flex items-center gap-1.5">
                <span>❌ Weak & Literal Idea (No Synthesis)</span>
              </p>
              <p className="text-xs text-red-700 font-serif italic bg-white p-3 rounded-xl border border-red-100">
                &quot;How can I draw fish species in my town using colored pencil?&quot;
              </p>
              <p className="text-[11px] text-red-650 leading-relaxed">
                <strong>Why it fails:</strong> This is a simple statement of materials and subject. It has no depth, does not integrate identity, and becomes repetitive after 3 or 4 pieces because there is no underlying conceptual inquiry. It fails to demonstrate high marks in material synthesis.
              </p>
            </div>

            <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 space-y-2">
              <p className="font-bold text-emerald-905 flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-700" />
                <span>✅ Strong Synthesized AP Inquiry</span>
              </p>
              <p className="text-xs text-emerald-700 font-serif italic bg-white p-3 rounded-xl border border-emerald-100">
                &quot;How can I use translucent acrylic sheets with floating organic ink washes to explore the fragility and ecological decay of aquatic species native to my upbringing by Lake Superior?&quot;
              </p>
              <p className="text-[11px] text-emerald-650 leading-relaxed">
                <strong>Why it succeeds:</strong> It merges your personal upbringing/lenses (Lake Superior), your subject (aquatic fragility), and your experimental technique (acrylic layers and ink washes) into an open-ended investigation!
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-ink/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-ink/50 max-w-xl">
              Acknowledging guidelines unlocks Step 3 where you fuse your vocabulary into your final inquiry question.
            </p>
            {isEditable && (
              <button
                type="button"
                onClick={handleCompleteStep2}
                disabled={step2Completed}
                className={`font-mono text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 ${
                  step2Completed
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-brand-primary text-white hover:opacity-90 cursor-pointer'
                }`}
              >
                {step2Completed ? (
                  <>
                    <CheckCircle size={13} />
                    AP Synthesis Reviewed ✓
                  </>
                ) : (
                  <>
                    <span>Confirm Review & Unlock Step 3</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      ) : null}

      {/* STEP 3: ESTABLISH AND REGISTER THE ACTIVE ESSENTIAL QUESTION - FADES IN ONLY WHEN STEP 2 IS REVIEWED */}
      {isStep2Complete ? (
        <motion.div 
          id="essential-question-step3-container"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl bg-brand-primary/[0.03] border border-brand-primary/15 p-8 md:p-10 shadow-xs space-y-6"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-brand-primary/5 rounded-full blur-3xl -mr-12 -mt-12" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-brand-primary mb-1">
                Completed Step 2 • Active Registry
              </p>
              <h4 className="text-xl font-bold text-ink">Step 3: Establish Active Essential Question</h4>
              <p className="text-xs text-ink/50 mt-1 max-w-xl">
                Fuse the concepts drafted in Step 1 following the AP guidelines reviewed in Step 2.
              </p>
            </div>
            
            {isEditable && !isEditing && currentQuestion && (
              <button
                onClick={() => {
                  setQuestionInput(currentQuestion);
                  setIsEditing(true);
                }}
                className="flex items-center gap-2 bg-brand-primary text-white text-xs font-mono font-bold uppercase tracking-wider px-5 py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
              >
                <Edit3 size={13} />
                Revise & Evolve Question
              </button>
            )}
          </div>

          {/* ACTIVE TOKENS DISPLAYING SELECTIONS BEFORE FORMULATING */}
          <div className="relative z-10 border border-brand-primary/10 bg-white/50 backdrop-blur-md p-4 rounded-2xl space-y-2">
            <p className="text-[10px] font-mono font-bold text-brand-primary uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} className="text-brand-primary" />
              Your Selected Synthesized Ideas & Visual Indicators:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedVocabulary.map((term, idx) => (
                <span key={idx} className="bg-brand-primary/5 border border-brand-primary/10 text-brand-primary text-xs px-2.5 py-1 rounded-lg">
                  {term}
                </span>
              ))}
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveQuestion} className="space-y-5 relative z-10 bg-white border border-ink/10 rounded-2xl p-6 shadow-xs">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-ink/70 mb-2">
                  Your Cohesive Inquiry Question (Synthesized)
                </label>
                <textarea
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  rows={3}
                  placeholder="Formulate and enter your own cohesive inquiry question here..."
                  className="w-full text-sm md:text-base font-serif italic text-ink bg-zinc-50 border border-ink/15 rounded-xl p-4 focus:bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none shadow-inner leading-relaxed"
                  maxLength={400}
                  required
                />
                <p className="text-[10px] font-mono text-ink/40 mt-1.5 text-right">
                  {questionInput.length}/400 characters (AP portfolios recommend keeping it concise and highly focused)
                </p>
              </div>

              {currentQuestion && currentQuestion !== questionInput && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-orange-50 border border-orange-250 p-4 rounded-xl space-y-2"
                >
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-orange-850">
                    <Clock size={14} className="animate-pulse" />
                    CONCEPTUAL SHIFT LOG
                  </div>
                  <p className="text-xs text-orange-850 leading-normal">
                    You are editing an existing active question. The AP College Board values and awards points for visible artistic evolution! Describe why your thinking or parameters shifted (e.g., &quot;Realized at piece 4 that the tracing sheets added a more organic weight to represent fog.&quot;):
                  </p>
                  <input
                    type="text"
                    value={evolutionInput}
                    onChange={(e) => setEvolutionInput(e.target.value)}
                    placeholder="Explain why your artistic inquiry is shifting parameters..."
                    className="w-full text-xs font-sans bg-white border border-orange-300 rounded-lg px-3 py-2 text-ink outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </motion.div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-brand-primary text-white text-xs font-mono font-bold uppercase tracking-wider px-5 py-3 rounded-lg hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Locking in..." : "Lock in Question & Log"}
                </button>
                {currentQuestion && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setQuestionInput(currentQuestion);
                      setEvolutionInput('');
                    }}
                    className="text-ink/60 hover:text-ink text-xs font-mono font-bold uppercase tracking-wider px-4 py-3 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="relative z-10 bg-white border border-brand-primary/15 p-6 md:p-8 rounded-2xl shadow-xs">
              {currentQuestion ? (
                <div className="space-y-4">
                  <p className="text-xs font-mono font-bold text-brand-primary uppercase tracking-[0.1em]">Currently Registered AP Portfolio Question</p>
                  <blockquote className="text-lg md:text-xl font-serif italic text-ink leading-relaxed border-l-4 border-brand-primary pl-4 py-1">
                    &ldquo;{currentQuestion}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-2 mt-2 text-[10.5px] font-mono text-emerald-700 bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/10 w-fit">
                    <CheckCircle size={13} className="text-emerald-700" />
                    <span>Aligned and published in your Sustained Investigation. Ready for feedback.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4 text-center max-w-lg mx-auto">
                  <p className="text-sm font-sans text-ink/50">
                    Your primary portfolio Essential Question is currently unformulated. Utilize your custom vocabulary tokens above to establish your guiding investigation question.
                  </p>
                  {isEditable && (
                    <button
                      onClick={() => {
                        setQuestionInput('');
                        setIsEditing(true);
                      }}
                      className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand-primary hover:underline mx-auto mt-2 cursor-pointer"
                    >
                      Draft primary Essential Question <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      ) : null}

      {/* CHRONOLOGICAL EVOLUTION LOG */}
      <div className="bg-white border border-ink/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-750 shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h4 className="text-base font-bold text-ink">Inquiry Evolution Log</h4>
            <p className="text-xs text-ink/50 mt-0.5">Chronological record showing how your conceptual and physical processes developed.</p>
          </div>
        </div>

        {(history.length > 0 || currentQuestion) ? (
          <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-ink/5">
            {history.map((record: any, index: number) => (
              <div key={index} className="flex gap-4 relative pl-8 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-purple-100 border-2 border-purple-600 flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-purple-600" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-mono text-purple-700 uppercase tracking-widest font-bold">
                    Stage {index + 1} — {new Date(record.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs font-serif italic text-ink/75 leading-relaxed bg-zinc-50 border border-zinc-100 p-3 rounded-xl">
                    &ldquo;{record.value}&rdquo;
                  </p>
                  {record.evolutionReason && (
                    <p className="text-[10px] font-mono text-zinc-500 leading-tight">
                      <span className="font-semibold text-zinc-700">Change rationale:</span> {record.evolutionReason}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {/* Active Item at the end of hierarchy */}
            {currentQuestion && (
              <div className="flex gap-4 relative pl-8">
                <div className="absolute left-1 top-1.5 w-4 h-4 rounded-full bg-brand-primary border-4 border-brand-primary/25 animate-ping" />
                <div className="absolute left-1 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-brand-primary flex items-center justify-center z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-mono text-brand-primary uppercase tracking-widest font-bold flex items-center gap-1.5">
                    ACTIVE DIRECTION (NOW)
                  </p>
                  <p className="text-xs font-serif italic text-brand-primary font-medium leading-relaxed bg-brand-primary/5 border border-brand-primary/10 p-3 rounded-xl">
                    &ldquo;{currentQuestion}&rdquo;
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center space-y-4 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-full border border-dashed border-ink/20 mx-auto flex items-center justify-center text-ink/30">
              <GitFork size={18} />
            </div>
            <p className="text-xs text-ink/40 leading-normal">
              No past historical revisions recorded yet. Any refinements or redirection notes you log as your pieces evolve from Piece 1 through 15 will be archived here to display developmental process to AP evaluators.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
