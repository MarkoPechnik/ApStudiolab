import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Zap, 
  Calendar, 
  ShieldCheck,
  Compass,
  Layers,
  FileText,
  Clock,
  BookOpen
} from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void | Promise<void>;
}

export function LandingPage({ onSignIn }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-paper text-ink relative pb-16 overflow-y-auto">
      {/* 1. STICKY HEADER NAVBAR */}
      <header className="border-b border-ink/5 bg-paper/95 backdrop-blur-md sticky top-0 z-[100] px-6 py-4 md:px-12 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold font-serif shadow-sm">
            A
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-black tracking-tight text-base md:text-lg text-brand-primary leading-none">AP Art Studio</span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink/40 mt-1">Classroom Companion</span>
          </div>
        </div>
        <button
          onClick={onSignIn}
          className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider bg-ink text-white hover:bg-brand-primary transition-all duration-300 px-5 py-3 rounded-full shadow-md cursor-pointer hover:shadow-brand-primary/10 hover:scale-[1.02] active:scale-[0.98]"
          id="landing-navbar-signin"
        >
          <Zap size={11} className="fill-white" />
          <span>Google Sign In</span>
        </button>
      </header>

      {/* 2. HERO CONTEXT AND DESCRIPTION */}
      <section className="px-6 md:px-12 max-w-5xl mx-auto pt-16 md:pt-24 pb-12 text-center space-y-8 select-none">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-brand-primary/5 text-brand-primary border border-brand-primary/12">
          <Sparkles size={12} className="animate-pulse" />
          <span>Sustained Investigation Workspace</span>
        </div>

        <h1 className="text-5xl md:text-8xl font-serif font-black text-brand-primary tracking-tighter leading-[1.05] max-w-4xl mx-auto">
          Your Art Portfolio, Synthesized & Structured.
        </h1>

        <p className="text-sm md:text-lg text-ink/65 leading-relaxed max-w-3xl mx-auto font-sans font-normal">
          AP Art Studio is a specialized digital ecosystem constructed specifically for AP Art & Design portfolios. From raw sketchbook mind mapping to curated visual keywords, adaptive pacing, and structured rubrics, we bring professional rigor to your Sustained Investigation.
        </p>

        <div className="pt-4 flex items-center justify-center">
          <button 
            onClick={onSignIn}
            className="art-btn-primary px-8 py-4.5 text-[11px] font-mono font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer"
            id="hero-cta-signin"
          >
            <Zap size={14} />
            <span>Launch Workspace</span>
          </button>
        </div>
      </section>

      {/* 3. DYNAMIC FEATURES SYSTEM BENTO GRID */}
      <section className="px-6 md:px-12 max-w-5xl mx-auto pt-8 pb-16 space-y-12 select-none">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-mono font-semibold text-ink/40 uppercase tracking-[0.3em]">Core Components</span>
          <h2 className="text-3xl md:text-5xl font-serif font-black text-brand-primary tracking-tight">Structured Studio Workflow</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card 1: Step-by-Step Inquiry */}
          <div className="brutal-card p-8 bg-white border border-ink/8 rounded-[28px] text-left space-y-4">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700">
              <Compass size={18} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-serif font-bold text-ink">Inquiry Development</h3>
              <p className="text-xs text-ink/60 leading-relaxed font-sans">
                Guide students step-by-step from raw sketchbook mapping to curated custom keywords of choices, AP synthesis guidelines, and evolution shift logs.
              </p>
            </div>
          </div>

          {/* Card 2: SI & Selected Works */}
          <div className="brutal-card p-8 bg-white border border-ink/8 rounded-[28px] text-left space-y-4">
            <div className="w-10 h-10 rounded-full bg-brand-primary/5 flex items-center justify-center text-brand-primary">
              <Layers size={18} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-serif font-bold text-ink">Sustained Investigation</h3>
              <p className="text-xs text-ink/60 leading-relaxed font-sans">
                Fully organize outstanding visual portfolios. Log and review up to 15 structured investigation pieces alongside 5 curated Selected Works.
              </p>
            </div>
          </div>

          {/* Card 3: Written Evidence */}
          <div className="brutal-card p-8 bg-white border border-ink/8 rounded-[28px] text-left space-y-4">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileText size={18} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-serif font-bold text-ink">Written Evidence</h3>
              <p className="text-xs text-ink/60 leading-relaxed font-sans">
                Draft and validate AP statements seamlessly. Interactive countdown counters guard the strict 1,200 character ceiling for materials & processes.
              </p>
            </div>
          </div>

          {/* Card 4: Holiday pacing */}
          <div className="brutal-card p-8 bg-white border border-ink/8 rounded-[28px] text-left space-y-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Calendar size={18} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-serif font-bold text-ink">Holiday-Padded Roadmaps</h3>
              <p className="text-xs text-ink/60 leading-relaxed font-sans">
                Paces and re-calculates deadlines to protect authentic studio time from being cut short by district holidays or weekends.
              </p>
            </div>
          </div>

          {/* Card 5: Teacher feedback */}
          <div className="brutal-card p-8 bg-white border border-ink/8 rounded-[28px] text-left space-y-4">
            <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-600">
              <ShieldCheck size={18} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-serif font-bold text-ink">Dual-role Portals</h3>
              <p className="text-xs text-ink/60 leading-relaxed font-sans">
                Allows students to iterate, whilst instructors review progress, track deadlines, assign scores, and leave feedback on active drafts.
              </p>
            </div>
          </div>

          {/* Card 6: Critique Companion */}
          <div className="brutal-card p-8 bg-white border border-ink/8 rounded-[28px] text-left space-y-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <Clock size={18} className="animate-spin-slow" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-serif font-bold text-ink">Critique Companion</h3>
              <p className="text-xs text-ink/60 leading-relaxed font-sans">
                Review portfolios against standard AP criteria guidelines. Identify visual gaps, process flow disconnects, and align alignment before submitting drafts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. BOTTOM CALL-TO-ACTION PRE-LOGIN */}
      <section className="px-6 md:px-12 max-w-5xl mx-auto pt-6 pb-12 select-none">
        <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-[36px] p-8 md:p-14 text-center space-y-8 relative overflow-hidden">
          {/* Subtle abstract backdrop */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />

          <div className="space-y-4 max-w-xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight text-brand-primary">Ready to design your visual studio?</h2>
            <p className="text-xs md:text-sm text-ink/65 leading-relaxed">
              Unlock the full potential of AP Art Studio. Structure your sketchbook reflections, explore Custom Keywords, track pieces, and evaluate evidence with confidence.
            </p>
          </div>

          <button 
            onClick={onSignIn}
            className="art-btn-primary px-10 py-5 text-xs font-mono font-bold uppercase tracking-[0.25em] flex items-center justify-center gap-3 shadow-xl mx-auto cursor-pointer hover:shadow-brand-primary/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
            id="bottom-cta-signin"
          >
            <Zap size={14} />
            <span>Launch with Google</span>
          </button>
        </div>
      </section>
    </div>
  );
}
