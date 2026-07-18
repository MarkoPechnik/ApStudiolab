import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Sparkles, 
  Layers, 
  Award, 
  FileText, 
  Clock, 
  CheckCircle, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Calendar, 
  AlertCircle,
  Play,
  Monitor,
  Printer,
  Compass,
  ArrowRight,
  Plus,
  Trash2,
  Globe,
  ExternalLink
} from 'lucide-react';
import { ClassRoom, User, Artwork } from '../types';

interface TeachingHubProps {
  activeClass: ClassRoom;
  onSaveClass: (updated: ClassRoom) => Promise<void>;
  students: User[];
  onSwitchToRoster: () => void;
}

interface Slide {
  id: string;
  tabLabel: string;
  title: string;
  subtitle: string;
  objective: string;
  icon: React.ReactNode;
  concept: string;
  steps: string[];
  teacherScript: {
    prompt: string;
    action: string;
  }[];
  templates: {
    title: string;
    description: string;
    content: string;
  }[];
  scoringTraps: string[];
}

export function TeachingHub({ activeClass, onSaveClass, students, onSwitchToRoster }: TeachingHubProps) {
  const [activeSlideTab, setActiveSlideTab] = useState<string>('si');
  const [slideMode, setSlideMode] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  
  // Deadline individual / bulk state
  const [isSavingDeadlines, setIsSavingDeadlines] = useState<boolean>(false);
  const [deadlineInterval, setDeadlineInterval] = useState<number>(14); // default 2 weeks
  const [skipWeekends, setSkipWeekends] = useState<boolean>(true);
  const [skipBreaks, setSkipBreaks] = useState<boolean>(true);

  // Custom break states
  const [newBreakName, setNewBreakName] = useState<string>('');
  const [newBreakStart, setNewBreakStart] = useState<string>('');
  const [newBreakEnd, setNewBreakEnd] = useState<string>('');
  const [isSavingBreak, setIsSavingBreak] = useState<boolean>(false);

  // PDF Calendar parsing states
  const [isParsingPdf, setIsParsingPdf] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string>('');
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string>('');

  // Copy template callback helper
  const handleCopyText = (text: string, identifier: string | number) => {
    navigator.clipboard.writeText(text);
    if (typeof identifier === 'number') {
      setCopiedIndex(identifier);
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      setCopiedTemplate(identifier);
      setTimeout(() => setCopiedTemplate(null), 2000);
    }
  };

  const slides: Slide[] = [
    {
      id: 'si',
      tabLabel: '1. SI Pieces',
      title: 'Sustained Investigation (SI)',
      subtitle: 'Documenting 15 works of material, process, and idea development.',
      objective: 'Teach students how to align physical media, creation processes, and foundational ideas for each of their 15 portfolio slots.',
      icon: <Layers size={18} className="text-brand-primary" />,
      concept: 'The Sustained Investigation requires 15 slides that demonstrate intensive, inquiry-guided practice, experimentation, and revision. Each image is not a standalone masterpiece; it is a frame in a chronological movie showing conceptual growth.',
      steps: [
        'Establish the Inquiry: Every piece must relate to the student’s guiding theme/question.',
        'Document Process: Take photos of works-in-progress, test prints, or color swatches. Submit these as pieces to prove process.',
        'Write Precisely: For each piece, students must strictly detail Materials (what physical substance), Processes (how it was handled), and Ideas (what conceptual connection).',
        'Analyze Scale: Include exact, accurate dimensions for each work.'
      ],
      teacherScript: [
        {
          prompt: '"Class, look at the visual evidence grid in your SI workspace. Each slide here is part of a single story. You cannot arbitrary throw unrelated sketches together. Look at the workspace and ask: how does Piece 3 lead directly to Piece 4?"',
          action: 'Project the SI Pieces Workspace page. Demo how to select a piece, reorder it Chronologically, and write standard descriptions.'
        },
        {
          prompt: '"Notice how the system tracks characters. AP enforces hard limits. You must write with extreme brevity. Avoid florid descriptors like \'beautiful representation of\'. Write action-verbs: \'carved, tested, layered\'."',
          action: 'Hover over the Process and Ideas input boxes to show character threshold limits.'
        }
      ],
      templates: [
        {
          title: 'SI Artifact Drafting Sheet',
          description: 'A structural copy-paste framework for students to plan each image entry in Google Docs or their local notes first.',
          content: `### Portfolio Item Entry: Piece # [1-15]
- **Image/Process Slide Purpose**: [Finished Work / Work-In-Progress / Swatches & Sketchbook layout / Revision Comparative]
- **Title**: [Descriptive Working Title]
- **Materials (100 char limit)**: [E.g., Gouache, graphite pencil, and hand-cut recycled cardboard on wooden panel]
- **Process / Steps (100 char limit)**: [E.g., Layered wash backgrounds, masked negative space, hand-carved textures, and assembled dimensional planes]
- **Ideas & Context (100 char limit)**: [E.g., Explores the physical layers of geological time mirroring personal memory excavation processes]
- **Dimensions (Size)**: [Height] x [Width] x [Depth] Inches`
        },
        {
          title: 'Fictional AP-Score 5 Description Example',
          description: 'Use this example on the projector screen to demonstrate high-scoring vocabulary and structure.',
          content: `- **Materials**: Acrylic gel medium, digital photographic transfer, slate shingle, rust dust.
- **Process**: Mixed gel with iron dust, transferred portrait under-image onto slate, scraped surface with wire brush.
- **Ideas**: Expresses the weathering of industrial icons over time; material decay directly mimics mental erosion.`
        }
      ],
      scoringTraps: [
        'TRAP: Submitting 15 finished, pristine paintings without any process sketches, test swatches, or trial-and-error layouts. (Causes low score in Row B - Experimentation & Revision).',
        'TRAP: Copy-pasting the exact same Materials & Process text onto multiple slides. Examiners look for customized detail representing specific work done.',
        'TRAP: Focusing descriptions solely on narrative stories rather than structural, artistic choices.'
      ]
    },
    {
      id: 'selected',
      tabLabel: '2. Selected Works',
      title: 'Selected Works (The Top 5)',
      subtitle: 'Showcasing 5 physical masterworks demonstrating synthesis of materials, processes, and ideas.',
      objective: 'Help students review their portfolio and select five specific pieces that show peak technical expertise and absolute conceptual alignment.',
      icon: <Award size={18} className="text-brand-primary" />,
      concept: 'Unlike the SI section where progression matters, the Selected Works page requires five independent physical works (or digital files) demonstrating the absolute ceiling of the student\'s artistic skills. Concept, material, and methodology must crash together in perfect harmony (Synthesis).',
      steps: [
        'Select by Synthesis: Pick five pieces where the media used perfectly serves the physical concept.',
        'Isolate the Masterworks: These can be selected from the 15 SI pieces, or exist as standalone pieces outside the 15.',
        'Rigorous Physical Prep: For non-digital portfolios, these will be physically shipped or photographed with impeccable lighting.',
        'Double-Check Rubrics: Maximize score in Row C (Synthesis) and Row D (Technical Skills) by matching formal design principles.'
      ],
      teacherScript: [
        {
          prompt: '"Take a look at your top 5. If I pull any piece away from its title and description, does it still project outstanding craftsmanship? Does the choice of oil paint versus digital collage feel intentional?"',
          action: 'Display the Selected Works view. Model how to choose works and align them with synthesis checklists on the whiteboard.'
        }
      ],
      templates: [
        {
          title: 'Selected Works Critical Critique Outline',
          description: 'Distribute this peer-review questionnaire to students to evaluate whether a piece belongs in their Selected Works.',
          content: `### Selected Works Self-Critique Checklist
1. **Material Mastery**: What physical material was chosen? Is there an advanced physical handling of this medium? (Score Point 4-5)
2. **Process Precision**: How is the technical execution of mark-making, volume, color control, or composition?
3. **Idea Synthesis**: Does the medium actually enhance the concept? (E.g., painting a delicate portrait on a fragile autumn leaf to emphasize impermanence).
4. **Is there any disconnect**: Does the process or idea feel separate? If yes, it is "evident but unclear" (Score Point 3) rather than synthesized (Score Point 5).`
        }
      ],
      scoringTraps: [
        'TRAP: Displaying works with poor photographic quality, distracting backgrounds, or skewed canvas frames. (Instant drop in technical impression).',
        'TRAP: Lack of variety or depth. Five pieces that are simple revisions of the exact same sketch look redundant; selection should highlight a complete formal range.'
      ]
    },
    {
      id: 'evidence',
      tabLabel: '3. Written Evidence',
      title: 'Written Evidence (P1 & P2)',
      subtitle: 'Drafting the theoretical thesis of the portfolio under AP strict character constraints.',
      objective: 'Train students to answer Writing Prompt 1 (Inquiry statement) and Writing Prompt 2 (Practice, Exp, Revision description) flawlessly.',
      icon: <FileText size={18} className="text-brand-primary" />,
      concept: 'Written evidence is scored in Rows A & B. It consists of two writing fields (max 1200 characters each). These words must act as annotations to the 15 visual slides, explaining the hidden intellectual inquiry that cannot be seen solely with the naked eye.',
      steps: [
        'Writing Prompt 1 (Inquiry): Must name what questions, curiosity, or artistic study guided the entire class portfolio.',
        'Writing Prompt 2 (Processes of Practice): Must tell a story of evolution. Specify how they revised work, shifted directions, and discovered things during making.',
        'Character Efficiency: Every word must be structured. Avoid filler, utilize abbreviations if necessary, stay hyper-concrete.'
      ],
      teacherScript: [
        {
          prompt: '"Let\'s talk about Writing Prompt 1. A central mistake is stating a topic and calling it an inquiry. \'My portfolio is about mental health\' is NOT an inquiry. That is a topic. \'My portfolio investigates how digital glitch filters can distort portraits to symbolize memory corrosion\' IS an inquiry. See the difference?"',
          action: 'Type these contrasting statements live in the Written Evidence text boxes to show how the system displays guidance.'
        }
      ],
      templates: [
        {
          title: 'Writing Prompt 1 - Guided Paragraph Maker',
          description: 'A fill-in-the-blank formula to ensure students state a verifiable inquiry question.',
          content: `### Writing Prompt 1 - Inquiry Blueprint
- **Core Formula**: "My Sustained Investigation was guided by the inquiry of how [Target Subject/Subject Matter] can be combined with [Specific Medium/Processes] to represent, study, or challenge the concept of [Guiding Artistic Theme/Idea]."
- **Supporting Detail (2-3 sentences)**: 
  - "Specifically, I began by asking: [First Sub-Question] (Piece 1-3)?"
  - "This developed into an exploration of [Second Substructural Shift] (Piece 4-10)?"
  - "Ultimately, my inquiry led me to analyze: [Final Evolution Question] (Piece 11-15)?"`
        },
        {
          title: 'Writing Prompt 2 - Evolutionary Process Draft',
          description: 'Help students map out their story of Practice, Experimentation, and Revision over 15 slots.',
          content: `### Writing Prompt 2 - Process & Revision Formula
- **Section A (Practice/Mediums)**: "I practiced skills in [Medium/Form] by [Action/Study] (Artifacts #, #). This allowed me to master [Technical Principle]."
- **Section B (Experimentation/Risk)**: "I experimented with [Action/Risk] (Artifacts #, #) to break standard conventions. For example, in Piece #, I intentionally [Risk Taken] which discovered [Key Realization]."
- **Section C (Revision/Evolution)**: "Revision was critical. When reviewing feedback on Piece #, I noticed [Flaw/Opportunity]. I revised this in Piece # by [Specific Modification], transforming the theme from [Point A] to [Point B]."
- **Section D (Synthesis Result)**: "Ultimately, this process led to a complete synthesis of [Medium] and [Idea] in final works."`
        }
      ],
      scoringTraps: [
        'TRAP: Explaining *why* they like art instead of answering the exact prompt. (Yields automatic Score 1).',
        'TRAP: Writing an inquiry statement that does not match what is actually visible in the 15 visual slides.',
        'TRAP: Simply repeating "I practiced and revised" without pointing to specific slide index numbers (e.g., "as seen in Piece 4 and Piece 7").'
      ]
    },
    {
      id: 'roadmap',
      tabLabel: '4. Roadmap & Pacing',
      title: 'Roadmap & Production Pacing',
      subtitle: 'Managing stress and deadlines over the course of the Academic Studio Year.',
      objective: 'Help students construct self-regulation habits and map out their 15-piece workload using the timeline visualization.',
      icon: <Clock size={18} className="text-brand-primary" />,
      concept: 'An AP Art portfolio cannot be crunched in the last week. The timeline provides a standard 14-day production rhythm. Showing progress visually helps detect bottlenecks early, and gives teachers a concrete tool to keep students on task.',
      steps: [
        'Align Studio Schedule: Set clear landmarks where each piece should finish.',
        'Keep process logs: Students log materials the day they finish the work.',
        'Buffer for revision: Leave the final month of the schedule purely for revising earlier pieces, formatting write-ups, or finalizing digital layouts.'
      ],
      teacherScript: [
        {
          prompt: '"Look at the Roadmap dashboard on the board. You can see the target deadlines. If you fall behind on Piece 4, you are eating into your revision buffer in April. Our goal is to maintain a rhythm. Let\'s review our class deadlines."',
          action: 'Display the Classroom Roadmap tab. Point out how the timelines flags pieces as "Pending" or "Late < No of Days" and show how deadlines can be adjusted.'
        }
      ],
      templates: [
        {
          title: 'Classroom Daily Sketchbook Routine Handout',
          description: 'A simple lesson workflow for the start of every studio hour to guarantee students meet their deadlines.',
          content: `### The 10-Minute Daily Studio Anchoring Routine
1. **The Sketchbook Log (Minutes 1-3)**: Note down current target Piece # from the Classroom Roadmap. Write down the materials you are handling today.
2. **Concept Check (Minutes 4-5)**: Is what you are drawing today directly helping answer your Writing Prompt 1?
3. **Execution Span (Minutes 6-10)**: Fast drafting, sketch swatch trials, or media mixing.
4. **Clean up & Status**: Update the current roadmap progress indicator in the app.`
        }
      ],
      scoringTraps: [
        'TRAP: Missing deadlines and trying to submit 5-6 pieces compiled in the final two weeks of school. (Causes extreme stress and poor technical quality).',
        'TRAP: Spending 8 weeks on one single massive oil painting while leaving the remaining 14 slides empty or filled with 5-minute sketches.'
      ]
    },
    {
      id: 'guidelines',
      tabLabel: '5. Calibrating Rubrics',
      title: 'Classroom Grading Calibration',
      subtitle: 'Grading portfolios like an AP Reader using official 2025 College Board rubrics.',
      objective: 'Instruct students on how they are scored so they can self-grade and peer-evaluate works accurately.',
      icon: <CheckCircle size={18} className="text-brand-primary" />,
      concept: 'Empower students to look objectively at their work through the four rubric assessment rows. Peer review acts as a critical calibration tool that removes cognitive bias from their self-assessment.',
      steps: [
        'Score Row A (Inquiry): Is there visual evidence of inquiries guiding development? (Score 3 vs 2).',
        'Score Row B (Revision): Can you see a comparative before/after or physical change between pieces? (Score 3 vs 2).',
        'Score Row C (Synthesis): Do Materials, Processes, and Ideas seamlessly merge? (Score 3 vs 2).',
        'Score Row D (Design/Drawing Skills): Is the execution rudimentary (1), moderate (2), or advanced (3)?'
      ],
      teacherScript: [
        {
          prompt: '"We are going to put three portfolios up on the wall and act as the AP Scoring Committee. Let\'s pull up the Official Rubric Terminology on the board. We will map Row B. Do we see sequential development? If so, where is the physical revision shown?"',
          action: 'Open the Guidelines Tab. Toggle the "SI Rubric" and "Selected Works" sheets. Use the Terminology filter live to search for the definitions of keywords.'
        }
      ],
      templates: [
        {
          title: 'Direct Peer Calibration Rubric sheet',
          description: 'A simplified, clear grading scorecard that students can use to review classmates\' portfolios in class.',
          content: `### AP Portfolio Calibration Scorecard
- **Artist Name**: ____________ / **Reviewer**: ____________
- **Classroom Course Type**: [2-D / 3-D / Drawing]

#### ROW A: INQUIRY (Score 1-3)
[   ] **1 Point**: Ideas stated but no question/inquiry found; slides are random.
[   ] **2 Points**: Inquiry is declared; visual evidence matches theme but does not evolve.
[   ] **3 Points**: Clear inquiry; portfolio actively advances, changes, and answers questions as it develops.
*Reviewer Notes/Evidence*: "Visual development is clear from Piece # to Piece # because..."

#### ROW B: PRACTICE, EXPERIMENTATION & REVISION (Score 1-3)
[   ] **1 Point**: Random pieces; no process shown.
[   ] **2 Points**: Process relates to theme but work-in-progress slides or sketches are missing or described weakly.
[   ] **3 Points**: Impeccable process; visible sketches, color trials, revised versions of earlier mistakes clearly marked.
*Reviewer Notes/Evidence*: "Specific experiment/revision is seen in Piece # where..."

#### ROW C: SYNTHESIS (Score 1-3)
[   ] **1 Point**: Materials and processes do not relate to the underlying ideas.
[   ] **2 Points**: Relationships are evident but some pieces feel disjointed.
[   ] **3 Points**: Masterful synthesis. Handled materials actively amplify the narrative/idea.
*Reviewer Notes/Evidence*: "Perfect synthesis is seen in Piece # where..."

#### ROW D: ARTISTIC SKILLS (Score 1-3)
[   ] **1 Point**: Rudimentary skills. Issues with composition, proportion, or control.
[   ] **2 Points**: Proficient / Good skills. Well-balanced, clean execution.
[   ] **3 Points**: Advanced/Highly developed skills. Complexity and extraordinary formal control.
*Reviewer Notes/Evidence*: "Skill level shown in Piece # is excellent due to..."`
        }
      ],
      scoringTraps: [
        'TRAP: Grading friends high with "I love this, it looks great" instead of using strict rubric phrases.',
        'TRAP: Confusing "pretty artwork" with "rubric synthesis". A beautiful landscape could score low in Row A/B/C if there is no guiding inquiry or visible developmental process.'
      ]
    }
  ];

  const activeSlide = slides.find(s => s.id === activeSlideTab) || slides[0];

  const handleNextSlide = () => {
    const currentIndex = slides.findIndex(s => s.id === activeSlideTab);
    if (currentIndex < slides.length - 1) {
      setActiveSlideTab(slides[currentIndex + 1].id);
    }
  };

  const handlePrevSlide = () => {
    const currentIndex = slides.findIndex(s => s.id === activeSlideTab);
    if (currentIndex > 0) {
      setActiveSlideTab(slides[currentIndex - 1].id);
    }
  };

  // Determine if a specific timestamp falls on a weekend or school-off day
  const isSchoolDay = (timeMs: number, checkWeekends: boolean, checkBreaks: boolean, customBreaks = activeClass.schoolBreaks) => {
    const date = new Date(timeMs);
    if (checkWeekends) {
      const day = date.getDay();
      if (day === 0 || day === 6) return false; // Weekend
    }
    
    if (checkBreaks && customBreaks && customBreaks.length > 0) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const checkStr = `${y}-${m}-${d}`;

      for (const brk of customBreaks) {
        if (checkStr >= brk.startDate && checkStr <= brk.endDate) {
          return false; // School Break / Day Off
        }
      }
    }
    
    return true;
  };

  // Skip forward to find the next available school day
  const getNextAvailableSchoolDay = (startTimeMs: number, checkWeekends: boolean, checkBreaks: boolean, customBreaks = activeClass.schoolBreaks) => {
    let curr = startTimeMs;
    for (let limit = 0; limit < 365; limit++) {
      if (isSchoolDay(curr, checkWeekends, checkBreaks, customBreaks)) {
        return curr;
      }
      curr += 24 * 60 * 60 * 1000;
    }
    return curr;
  };

  // Reusable helper to calculate default draft dates before weekend/break resolution
  const draftDeadlineForIndex = (baseDate: number, idx: number, intervalDays = deadlineInterval) => {
    const fDate = new Date(baseDate);
    const fDay = fDate.getDay();
    // Monday of starting week
    const daysToSubtract = fDay === 0 ? 6 : fDay - 1;
    const mondayOfWeek1 = baseDate - (daysToSubtract * 24 * 60 * 60 * 1000);
    // Friday of the 3rd week of school is Monday of week 1 + 18 days
    const fridayOfThirdWeek = mondayOfWeek1 + (18 * 24 * 60 * 60 * 1000);
    
    // index i starts at 0 -> Friday of Week 3
    // index i starts at 1, 2... -> spaced by intervalDays following that first initial date
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
    return fridayOfThirdWeek + (idx * intervalMs);
  };

  // Reusable helper to calculate and assign new deadlines using custom breaks
  const recalculateDeadlinesUsingBreaks = (
    customBreaks: any[], 
    intervalDays = deadlineInterval, 
    checkWeekends = skipWeekends, 
    checkBreaks = skipBreaks,
    customStartDate?: number
  ) => {
    const anchorDate = customStartDate || activeClass.startDate || activeClass.createdAt || Date.now();
    const newDeadlines: number[] = [];
    
    for (let i = 0; i < 15; i++) {
      const draftDate = draftDeadlineForIndex(anchorDate, i, intervalDays);
      const resolvedDate = getNextAvailableSchoolDay(draftDate, checkWeekends, checkBreaks, customBreaks);
      newDeadlines.push(resolvedDate);
    }
    return newDeadlines;
  };

  const handleToggleSkipWeekends = async (checked: boolean) => {
    setSkipWeekends(checked);
    try {
      const newDeadlines = recalculateDeadlinesUsingBreaks(activeClass.schoolBreaks || [], deadlineInterval, checked, skipBreaks);
      const updatedClass = {
        ...activeClass,
        deadlines: newDeadlines
      };
      await onSaveClass(updatedClass);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSkipBreaks = async (checked: boolean) => {
    setSkipBreaks(checked);
    try {
      const newDeadlines = recalculateDeadlinesUsingBreaks(activeClass.schoolBreaks || [], deadlineInterval, skipWeekends, checked);
      const updatedClass = {
        ...activeClass,
        deadlines: newDeadlines
      };
      await onSaveClass(updatedClass);
    } catch (e) {
      console.error(e);
    }
  };

  // Compute Deadlines based on Class Start Date and interval, incorporating breaks/weekends if selected
  const generateBulkDeadlines = async (intervalDays: number) => {
    setIsSavingDeadlines(true);
    try {
      const newDeadlines = recalculateDeadlinesUsingBreaks(activeClass.schoolBreaks || [], intervalDays);
      const updatedClass = {
        ...activeClass,
        deadlines: newDeadlines
      };
      await onSaveClass(updatedClass);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingDeadlines(false);
    }
  };

  const handleIndividualDeadlineChange = async (index: number, dateString: string) => {
    const selectedTime = new Date(dateString + 'T00:00:00').getTime();
    const currentDeadlines = activeClass.deadlines ? [...activeClass.deadlines] : [];
    
    // Fill up to index if missing
    const anchorDate = activeClass.startDate || activeClass.createdAt || Date.now();
    
    for (let i = 0; i < 15; i++) {
      if (currentDeadlines[i] === undefined) {
        currentDeadlines[i] = draftDeadlineForIndex(anchorDate, i, 14);
      }
    }
    
    // Enforce that even custom selected dates slide to school days and not weekends or breaks
    const resolvedTime = getNextAvailableSchoolDay(selectedTime, skipWeekends, skipBreaks, activeClass.schoolBreaks || []);
    currentDeadlines[index] = resolvedTime;
    
    const updatedClass = {
      ...activeClass,
      deadlines: currentDeadlines
    };
    await onSaveClass(updatedClass);
  };

  // Instantly load standard US K-12 school term breaks
  const loadDefaultAcademicBreaks = async () => {
    const defaultBreaks = [
      { id: 'b1', name: 'Labor Day Weekend', startDate: '2025-09-01', endDate: '2025-09-01' },
      { id: 'b2', name: 'Thanksgiving Recess', startDate: '2025-11-24', endDate: '2025-11-28' },
      { id: 'b3', name: 'Winter holiday recess', startDate: '2025-12-22', endDate: '2026-01-02' },
      { id: 'b4', name: 'Martin Luther King Jr. Day', startDate: '2026-01-19', endDate: '2026-01-19' },
      { id: 'b5', name: 'Presidential Recess', startDate: '2026-02-16', endDate: '2026-02-16' },
      { id: 'b6', name: 'Spring break term', startDate: '2026-03-23', endDate: '2026-03-27' },
    ];
    
    const newDeadlines = recalculateDeadlinesUsingBreaks(defaultBreaks);
    const updatedClass = {
      ...activeClass,
      schoolBreaks: defaultBreaks,
      deadlines: newDeadlines
    };
    await onSaveClass(updatedClass);
  };

  const handleAddCustomBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBreakName || !newBreakStart || !newBreakEnd) return;
    setIsSavingBreak(true);
    try {
      const currentBreaks = activeClass.schoolBreaks ? [...activeClass.schoolBreaks] : [];
      const newId = 'break_' + Date.now();
      currentBreaks.push({
        id: newId,
        name: newBreakName,
        startDate: newBreakStart,
        endDate: newBreakEnd
      });
      // Sort breaks chronologically
      currentBreaks.sort((a, b) => a.startDate.localeCompare(b.startDate));

      const newDeadlines = recalculateDeadlinesUsingBreaks(currentBreaks);
      const updatedClass = {
        ...activeClass,
        schoolBreaks: currentBreaks,
        deadlines: newDeadlines
      };
      await onSaveClass(updatedClass);
      
      // Clear inputs
      setNewBreakName('');
      setNewBreakStart('');
      setNewBreakEnd('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingBreak(false);
    }
  };

  const handleDeleteBreak = async (id: string) => {
    const currentBreaks = activeClass.schoolBreaks ? [...activeClass.schoolBreaks] : [];
    const filtered = currentBreaks.filter(b => b.id !== id);
    const newDeadlines = recalculateDeadlinesUsingBreaks(filtered);
    const updatedClass = {
      ...activeClass,
      schoolBreaks: filtered,
      deadlines: newDeadlines
    };
    await onSaveClass(updatedClass);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setPdfError('Please support your academic year by uploading a valid PDF file.');
      return;
    }

    setIsParsingPdf(true);
    setPdfError('');
    setPdfSuccessMessage('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64WithHeader = reader.result as string;
        const base64Data = base64WithHeader.split(',')[1];
        
        try {
          const res = await fetch('/api/parse-calendar-pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pdfBase64: base64Data }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Server returned an error during PDF processing.');
          }

            const data = await res.json();
            if (data.breaks && Array.isArray(data.breaks)) {
              const currentBreaks = activeClass.schoolBreaks ? [...activeClass.schoolBreaks] : [];
              const mergedBreaks = [...currentBreaks];
              let addedCount = 0;

              for (const pb of data.breaks) {
                const exists = currentBreaks.some(
                  cb => cb.startDate === pb.startDate && cb.endDate === pb.endDate
                );
                if (!exists) {
                  mergedBreaks.push({
                    id: 'pdf_' + Math.random().toString(36).substr(2, 9),
                    name: pb.name,
                    startDate: pb.startDate,
                    endDate: pb.endDate
                  });
                  addedCount++;
                }
              }

              mergedBreaks.sort((a, b) => a.startDate.localeCompare(b.startDate));

              let parsedStartDate = activeClass.startDate;
              let successStringExtra = "";
              if (data.firstDayOfSchool) {
                const checkTime = new Date(data.firstDayOfSchool + 'T00:00:00').getTime();
                if (!isNaN(checkTime)) {
                  parsedStartDate = checkTime;
                  successStringExtra = ` Identified First Day of School from the academic calendar as ${new Date(parsedStartDate).toLocaleDateString("en-US", { dateStyle: "long" })}.`;
                }
              }

              // Pass the parsed start date to calculate deadlines correctly
              const newDeadlines = recalculateDeadlinesUsingBreaks(
                mergedBreaks,
                deadlineInterval,
                skipWeekends,
                skipBreaks,
                parsedStartDate
              );

              const updatedClass = {
                ...activeClass,
                startDate: parsedStartDate,
                schoolBreaks: mergedBreaks,
                deadlines: newDeadlines
              };

              await onSaveClass(updatedClass);
              setPdfSuccessMessage(`Success!${successStringExtra} Automatically extracted and registered ${data.breaks.length} school off-days/breaks. The 1st Sustained Investigation is now scheduled for Friday of the 3rd week of classes, with subsequent deadlines paced every other week around district holidays!`);
            } else {
            throw new Error('Invalid formatting of extracted breaks from the calendar.');
          }

        } catch (err: any) {
          console.error(err);
          setPdfError(err.message || 'Failed to communicate with calendar parsing engine.');
        } finally {
          setIsParsingPdf(false);
        }
      };

      reader.onerror = () => {
        setPdfError('Error occurred reading the file.');
        setIsParsingPdf(false);
      };

      reader.readAsDataURL(file);

    } catch (err: any) {
      console.error(err);
      setPdfError('Failed to upload file.');
      setIsParsingPdf(false);
    }
  };

  return (
    <div id="teaching-hub-container" className="space-y-10 animate-in fade-in duration-500 text-left">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-ink/5 pb-8">
        <div>
          <span className="text-[10px] uppercase font-mono font-bold tracking-[0.4em] text-brand-primary/60 block mb-2">Educator Suite</span>
          <h2 className="text-4xl editorial-title text-brand-primary">Front-of-Class Lecturer & Deadlines</h2>
          <p className="text-sm text-ink/60 mt-1">Presentation materials, lesson structures, copyable student blueprints, and class-wide schedule customization.</p>
        </div>

        <div className="flex bg-ink/5 p-1 rounded-2xl items-center gap-1 self-start font-mono text-[10px] uppercase tracking-wider font-bold shrink-0 shadow-inner">
          <button
            onClick={() => { setSlideMode(false); onSwitchToRoster(); }}
            className="px-4 py-2.5 rounded-xl text-ink/60 hover:text-ink transition-all"
          >
            Student Roster
          </button>
          
          <button
            onClick={() => setSlideMode(false)}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 ${!slideMode ? 'bg-white text-brand-primary shadow-sm' : 'text-ink/60 hover:text-ink'}`}
          >
            <Settings size={12} /> Scheduling
          </button>
          
          <button
            onClick={() => setSlideMode(true)}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 ${slideMode ? 'bg-white text-brand-primary shadow-sm' : 'text-ink/60 hover:text-ink'}`}
          >
            <Play size={12} /> Present Slides
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!slideMode ? (
          /* REGULAR SCHEDULING MODE & DETAILED TEMPLATE EXPLORER */
          <motion.div 
            key="scheduling-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-10"
          >
            {/* COLUMN 1 & 2: DEADLINE BUILDER PANEL */}
            <div className="xl:col-span-2 space-y-8">
              <div className="brutal-card bg-white p-8 border border-ink/5 space-y-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-ink/5 pb-6 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-brand-primary shrink-0" size={24} />
                    <div>
                      <h3 className="text-2xl font-serif text-brand-primary font-bold">Class Submission Deadlines</h3>
                      <p className="text-xs text-ink/50 font-mono mt-0.5">Custom timeline mapping for {activeClass.name}</p>
                    </div>
                  </div>
                  
                  <div className="text-xs font-mono bg-paper/60 border border-ink/10 px-4 py-2 rounded-xl text-[11px] text-ink/60">
                    Students: <strong>{students.length}</strong> Enrolled
                  </div>
                </div>

                {/* BULK DATE AUTOMATOR PANEL */}
                <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-2xl p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <Compass size={18} className="text-brand-primary shrink-0 mt-1" />
                    <div>
                      <h4 className="text-sm font-bold text-brand-primary font-mono uppercase tracking-wider">Bulk Deadline Autogenerator</h4>
                      <p className="text-xs text-brand-primary/80 leading-relaxed mt-1">
                        Select an average production cycle per piece. We will automatically put your first portfolio piece due on Friday of the 3rd week of school, and then space everyone else at intervals following that initial date.
                      </p>
                    </div>
                  </div>

                  {/* Calendar Anchor Editor */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white/60 border border-brand-primary/15 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono font-bold text-brand-primary uppercase block tracking-wider">Calendar Anchor (First Day of School)</span>
                      <p className="text-[10px] text-ink/65 leading-tight">All portfolio deadlines align dynamically based on this class starting calendar date.</p>
                    </div>
                    <input
                      type="date"
                      value={new Date(activeClass.startDate || activeClass.createdAt).toISOString().split('T')[0]}
                      onChange={async (e) => {
                        const selectedDate = new Date(e.target.value + 'T00:00:00').getTime();
                        if (!isNaN(selectedDate)) {
                          const newDeadlines = recalculateDeadlinesUsingBreaks(activeClass.schoolBreaks || [], deadlineInterval, skipWeekends, skipBreaks, selectedDate);
                          const updatedClass = {
                            ...activeClass,
                            startDate: selectedDate,
                            deadlines: newDeadlines
                          };
                          await onSaveClass(updatedClass);
                        }
                      }}
                      className="bg-white text-brand-primary border border-brand-primary/20 focus:border-brand-primary focus:outline-none rounded-xl px-3 py-2 text-xs font-mono font-bold cursor-pointer hover:bg-brand-primary/5 transition-colors self-start md:self-center"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {[
                      { days: 7, label: '1 Week (Intensive)' },
                      { days: 14, label: '2 Weeks (AP Recommended)' },
                      { days: 21, label: '3 Weeks (Relaxed)' },
                      { days: 30, label: '1 Month (Slow pacing)' }
                    ].map((opt) => (
                      <button
                        key={opt.days}
                        onClick={() => {
                          setDeadlineInterval(opt.days);
                          generateBulkDeadlines(opt.days);
                        }}
                        disabled={isSavingDeadlines}
                        className={`text-[9px] font-mono font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg border transition-all ${
                          deadlineInterval === opt.days 
                            ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                            : 'bg-white hover:bg-brand-primary/5 text-ink/75 border-ink/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    
                    {isSavingDeadlines && (
                      <span className="text-[10px] font-mono text-brand-primary font-bold animate-pulse uppercase ml-2">Saving...</span>
                    )}
                  </div>

                  {/* Skip Options Toggles */}
                  <div className="flex flex-wrap items-center gap-6 border-t border-brand-primary/15 pt-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-mono text-brand-primary">
                      <input 
                        type="checkbox" 
                        checked={skipWeekends} 
                        onChange={(e) => handleToggleSkipWeekends(e.target.checked)} 
                        className="rounded accent-brand-primary border-brand-primary/20 cursor-pointer w-3.5 h-3.5 bg-white"
                      />
                      <span>Skip Weekends (Sat/Sun)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-mono text-brand-primary">
                      <input 
                        type="checkbox" 
                        checked={skipBreaks} 
                        onChange={(e) => handleToggleSkipBreaks(e.target.checked)} 
                        className="rounded accent-brand-primary border-brand-primary/20 cursor-pointer w-3.5 h-3.5 bg-white"
                      />
                      <span>Skip Registered Breaks</span>
                    </label>
                  </div>
                </div>

                {/* INDIVIDUAL DEADLINE MATRIX */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-ink/40">Portfolio Slots #1 - #15 Timeline</span>
                    <span className="text-[10px] font-mono text-ink/30 italic">Click calendar to change specific dates</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[440px] overflow-y-auto pr-2 custom-scrollbar">
                    {Array.from({ length: 15 }).map((_, i) => {
                      const anchorDate = activeClass.startDate || activeClass.createdAt || Date.now();
                      const currentVal = activeClass.deadlines && activeClass.deadlines[i] !== undefined
                        ? activeClass.deadlines[i]
                        : draftDeadlineForIndex(anchorDate, i, 14);

                      const htmlDateString = new Date(currentVal).toISOString().split('T')[0];

                      return (
                        <div 
                          key={i}
                          className="flex items-center justify-between p-3.5 bg-paper/40 rounded-xl border border-ink/5 hover:border-brand-primary/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-ink text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink/80">PIECE {i + 1}</p>
                              <p className="text-[9px] font-mono text-ink/30">Target Slot</p>
                            </div>
                          </div>

                          <div className="relative">
                            <input 
                              type="date" 
                              value={htmlDateString}
                              onChange={(e) => handleIndividualDeadlineChange(i, e.target.value)}
                              className="bg-white border border-ink/10 rounded-lg px-2 py-1.5 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-brand-primary w-28 text-end"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ACADEMIC CALENDAR & HOLIDAY PACING PANEL */}
              <div className="brutal-card bg-white p-8 border border-ink/5 space-y-8 shadow-sm">
                
                {/* Panel Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-ink/5 pb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-brand-primary shrink-0" size={24} />
                    <div>
                      <h3 className="text-xl font-serif text-brand-primary font-bold">Academic Calendar & Holiday Pacing</h3>
                      <p className="text-xs text-ink/50 font-mono mt-0.5">Upload your official school calendar PDF; portfolio deadlines will automatically shift around loaded holidays and weekends.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Left Column: PDF Uploader */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-brand-primary flex items-center gap-2">
                        <FileText size={14} /> Upload Calendar PDF
                      </h4>
                      <p className="text-[11px] text-ink/50 mt-1">Upload your district's official annual calendar PDF. The system automatically identifies the school start date and extracts recess periods.</p>
                    </div>

                    {/* AUTOMATED PDF CALENDAR UPLOADER */}
                    <div className="bg-brand-primary/5 rounded-2xl p-5 border border-brand-primary/10 space-y-3 relative text-left">
                      <div className="flex items-start gap-3">
                        <div className="bg-brand-primary/10 rounded-xl p-2 text-brand-primary shrink-0 mt-0.5">
                          <FileText size={16} />
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="text-[11px] font-bold font-mono uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                            Auto-Import Academic Calendar PDF
                            <span className="bg-brand-primary text-white text-[8px] px-1.5 py-0.5 rounded-full font-sans tracking-normal font-medium capitalize">Smart Parser</span>
                          </h5>
                          <p className="text-[10px] text-ink/65 leading-normal">
                            Once uploaded, the parser automatically extracts vacations, teacher in-service off-days, and school breaks to configure student deadlines around them.
                          </p>
                        </div>
                      </div>

                      {/* PDF Interaction Box */}
                      <div>
                        {isParsingPdf ? (
                          <div className="flex flex-col items-center justify-center py-5 px-3 bg-white/70 border border-dashed border-brand-primary/30 rounded-xl space-y-2">
                            <div className="w-5 h-5 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
                            <div className="text-center">
                              <span className="text-[10px] font-mono font-bold text-brand-primary block uppercase tracking-wide">Processing PDF...</span>
                              <p className="text-[9px] text-ink/50 mt-0.5 animate-pulse max-w-[280px]">
                                Extracting holiday schedules, spring/winter recesses, and teacher workshop days...
                              </p>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center py-4 px-3 bg-white border border-dashed border-ink/10 hover:border-brand-primary/30 rounded-xl cursor-pointer hover:bg-brand-primary/5 transition-all text-center">
                            <span className="text-[9px] font-mono font-bold text-brand-primary tracking-widest uppercase mb-1 flex items-center gap-1">
                              ⚡ Select / drop school calendar PDF
                            </span>
                            <span className="text-[8px] text-ink/40 font-mono">Accepts PDF documents up to 15MB</span>
                            <input 
                              type="file" 
                              accept="application/pdf" 
                              onChange={handlePdfUpload} 
                              className="hidden" 
                            />
                          </label>
                        )}
                      </div>

                      {/* Parsing errors and status reports */}
                      {pdfError && (
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-500/10 text-red-600 border border-red-500/15 text-[10px]">
                          <AlertCircle size={12} className="shrink-0" />
                          <span className="font-mono">{pdfError}</span>
                        </div>
                      )}

                      {pdfSuccessMessage && (
                        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-green-500/10 text-green-700 border border-green-500/15 text-[10px]">
                          <CheckCircle size={12} className="shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold block">Parsing Complete!</span>
                            <p className="text-[9.5px] text-green-700/80 leading-tight font-sans">{pdfSuccessMessage}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Registered School Breaks list */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-brand-primary flex items-center gap-2">
                        <Calendar size={14} /> Registered School Breaks & Off Days
                      </h4>
                      <p className="text-[11px] text-ink/50 mt-1">Due dates landing on these dates slide forward dynamically to ensure no student loses studio time during breaks.</p>
                    </div>

                    {/* Empty state if none loaded */}
                    {(!activeClass.schoolBreaks || activeClass.schoolBreaks.length === 0) ? (
                      <div className="bg-paper/50 rounded-2xl p-8 text-center border border-dashed border-ink/10 space-y-2">
                        <Calendar className="text-ink/20 mx-auto" size={28} />
                        <span className="text-[10px] font-mono font-bold text-ink/40 uppercase tracking-widest block">No Holidays Loaded</span>
                        <p className="text-[11px] text-ink/50 leading-relaxed max-w-[240px] mx-auto">
                          Upload your academic calendar PDF to automatically extract school holidays, recesses, and teacher training days.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1 scrollbar-thin">
                        <div className="space-y-2">
                          {activeClass.schoolBreaks.map((brk) => (
                            <div 
                              key={brk.id}
                              className="flex items-center justify-between px-3.5 py-2.5 bg-paper/40 rounded-xl border border-ink/5 text-xs hover:border-brand-primary/10 transition-colors"
                            >
                              <div className="space-y-0.5 text-left">
                                <span className="font-mono font-medium text-ink/80 block">{brk.name}</span>
                                <span className="text-[10px] font-mono text-ink/40">
                                  {new Date(brk.startDate + 'T00:00:00').toLocaleDateString()}
                                  {brk.startDate !== brk.endDate && ` - ${new Date(brk.endDate + 'T00:00:00').toLocaleDateString()}`}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteBreak(brk.id)}
                                className="text-ink/30 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-all shrink-0"
                                title="Delete Break"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>

            {/* COLUMN 3: TEXT REFERENCE SIDEBAR */}
            <div className="space-y-8">
              {/* QUICK TIP FOR AP PORTFOLIO */}
              <div className="brutal-card bg-white p-8 border border-ink/5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-brand-primary" />
                  <h4 className="font-mono text-[10px] uppercase font-bold tracking-wider text-ink">Classroom Pacing Guidelines</h4>
                </div>
                <p className="text-xs text-ink/60 leading-relaxed">
                  The standard portfolio requires <strong>15 Sustained Investigation</strong> slides and <strong>5 Selected Works</strong>, due in early May. We recommend starting the collection build no later than September, targeting 1 artifact finished and documented every two weeks to leave April open purely for revision and written annotations.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          /* PRESENTATION SLIDESHOW MODE */
          <motion.div 
            key="presentation-tab"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
            {/* SUB-TABS ON SLIDE */}
            <div className="flex flex-wrap gap-2 border-b border-ink/5 pb-4 font-mono text-[10px] uppercase tracking-wider font-bold">
              {slides.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSlideTab(s.id)}
                  className={`px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                    activeSlideTab === s.id 
                      ? 'bg-ink text-white border-ink shadow-sm' 
                      : 'bg-white hover:bg-ink/5 text-ink/65 border-ink/10'
                  }`}
                >
                  {s.tabLabel}
                </button>
              ))}
            </div>

            {/* MAIN PROJECTOR VIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
              
              {/* LARGE SLIDE SCREEN ON PROJECTOR */}
              <div className="lg:col-span-3 space-y-6">
                <div className="brutal-card bg-white border border-ink/10 shadow-lg overflow-hidden flex flex-col justify-between min-h-[580px]">
                  
                  {/* Slide Slate Top */}
                  <div className="p-8 border-b border-ink/5 bg-paper/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {activeSlide.icon}
                      <span className="font-mono text-xs font-bold tracking-widest text-[#00000080] uppercase">Presenting Unit</span>
                    </div>
                    <span className="font-mono text-[10px] bg-red-100 text-red-600 px-3 py-1 rounded-full uppercase font-bold tracking-tighter">Projector Mode</span>
                  </div>

                  {/* Body Presentation Slide text */}
                  <div className="p-10 flex-1 flex flex-col justify-center space-y-6 text-center max-w-2xl mx-auto">
                    <div className="space-y-2">
                      <span className="font-mono text-[10px] uppercase text-brand-primary leading-tight block tracking-[0.2em] font-bold">AP® Art and Design Master Series</span>
                      <h3 className="text-4xl lg:text-5xl font-serif font-black tracking-tight text-ink leading-tight">
                        {activeSlide.title}
                      </h3>
                      <p className="text-sm text-ink/50 mt-4 leading-relaxed italic">{activeSlide.subtitle}</p>
                    </div>

                    <div className="bg-[#00000003] border-l-4 border-brand-primary p-6 text-left rounded-r-xl">
                      <h4 className="text-[10px] font-mono uppercase text-brand-primary font-bold tracking-widest mb-1.5">UNIT OBJECTIVE FOR THE BOARD</h4>
                      <p className="text-xs text-ink/75 leading-relaxed font-sans font-medium">{activeSlide.objective}</p>
                    </div>
                  </div>

                  {/* Navigation Footer */}
                  <div className="p-6 bg-paper/10 border-t border-ink/5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider font-bold">
                    <button
                      onClick={handlePrevSlide}
                      disabled={slides.findIndex(s => s.id === activeSlideTab) === 0}
                      className="px-4 py-2 border border-ink/10 rounded-lg hover:bg-paper hover:text-brand-primary transition-all disabled:opacity-20 shrink-0 flex items-center gap-2"
                    >
                      <ChevronLeft size={12} /> Previous
                    </button>
                    
                    <span className="text-ink/40">Slide {slides.findIndex(s => s.id === activeSlideTab) + 1} of {slides.length}</span>
                    
                    <button
                      onClick={handleNextSlide}
                      disabled={slides.findIndex(s => s.id === activeSlideTab) === slides.length - 1}
                      className="px-4 py-2 border border-ink/10 rounded-lg hover:bg-paper hover:text-brand-primary transition-all disabled:opacity-20 shrink-0 flex items-center gap-2"
                    >
                      Next <ChevronRight size={12} />
                    </button>
                  </div>
                </div>

                {/* SCORING TRAPS / COMMON MISTAKE BLOCK ON MAIN SCREEN */}
                <div className="brutal-card bg-red-50/40 border border-red-100 rounded-2xl p-8 space-y-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle size={18} />
                    <h4 className="font-mono text-[10px] uppercase font-bold tracking-widest">AP Scoring Traps & Common Rubric Pitfalls</h4>
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeSlide.scoringTraps.map((trap, idx) => (
                      <li key={idx} className="bg-white border border-red-100/50 p-4 rounded-xl text-xs text-ink/70 leading-relaxed list-none relative">
                        <span className="absolute top-2 right-3 font-mono text-[10px] text-red-300 font-bold">!</span>
                        {trap}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* SIDEBAR FOR TEACHER: LESSON OUTLINE, KEY SCRIPTS, AND COPYABLE HANDOUT BLUEPRINTS */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* LECTURER INSTRUCTIONS */}
                <div className="brutal-card bg-white border border-ink/5 p-8 space-y-6 shadow-sm">
                  <span className="text-[9px] uppercase font-mono font-bold tracking-[0.3em] text-brand-primary block mb-2 border-b border-ink/5 pb-2">Teacher\'s Script & Action Cues</span>

                  <div className="space-y-6">
                    {activeSlide.teacherScript.map((script, idx) => (
                      <div key={idx} className="space-y-2 text-xs border-l-2 border-ink/10 pl-4 py-1">
                        <p className="font-serif italic text-ink/80 leading-relaxed font-semibold">
                          {script.prompt}
                        </p>
                        <p className="text-[10px] font-mono text-[#00000050] uppercase tracking-tighter">
                          Action Cue: {script.action}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COPYABLE STUDENT HANDOUTS & TEMPLATES */}
                <div className="brutal-card bg-white border border-ink/10 p-8 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-ink/5 pb-4">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-brand-primary">Student Template Handouts</span>
                    <span className="text-[9px] font-mono text-ink/30 uppercase">Copy & Share</span>
                  </div>

                  <div className="space-y-6">
                    {activeSlide.templates.map((tmpl, idx) => (
                      <div key={idx} className="space-y-3 bg-paper/30 border border-ink/5 p-5 rounded-2xl relative group">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-bold text-ink leading-tight">{tmpl.title}</h4>
                            <p className="text-[10px] text-ink/40 mt-1 leading-snug">{tmpl.description}</p>
                          </div>
                          
                          <button
                            onClick={() => handleCopyText(tmpl.content, idx)}
                            className="text-ink/40 hover:text-brand-primary p-2 border border-ink/5 hover:border-brand-primary/10 rounded-lg bg-white shadow-sm transition-all shrink-0"
                            title="Copy Template"
                          >
                            {copiedIndex === idx ? <Check className="text-green-500" size={14} /> : <Copy size={14} />}
                          </button>
                        </div>

                        <pre className="bg-white border border-ink/10 rounded-xl p-4 text-[10px] font-mono text-ink/75 overflow-x-auto max-h-40 leading-relaxed whitespace-pre-wrap select-all">
                          {tmpl.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
