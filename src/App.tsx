import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Download, 
  ChevronLeft,
  ChevronRight,
  X,
  Info,
  CheckCircle2,
  AlertCircle,
  Search,
  UserPlus,
  Sparkles,
  Zap,
  Wand2,
  BookOpen,
  ArrowRight,
  Eye,
  Award,
  Clock,
  Calendar,
  FileText,
  Edit2
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { jsPDF } from 'jspdf';
import { ClassRoom, Artwork, User, Feedback, UserRole, WrittenEvidence, PeerCritique, ProgressPhoto } from './types';
import { storageService } from './services/storage';
import { geminiService } from './services/geminiService';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { ProcessWritingHelper } from './components/ProcessWritingHelper';
import { TeachingHub } from './components/TeachingHub';
import { LandingPage } from './components/LandingPage';
import { ProgressPhotosTab } from './components/ProgressPhotosTab';
import { EssentialQuestionTab } from './components/EssentialQuestionTab';

// --- Helpers ---

const getDeadline = (startDate: number, index: number) => {
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;
  return startDate + (index * twoWeeks);
};

const formatDelay = (delayMs: number) => {
  if (delayMs <= 0) return 'On Time';
  const days = Math.floor(delayMs / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Late (< 1 day)';
  return `${days} ${days === 1 ? 'day' : 'days'} late`;
};

// --- Components ---

function SubmissionTimeline({ artworks, activeClass }: { artworks: Artwork[], activeClass: ClassRoom }) {
  const siPieces = artworks.filter(a => a.type === 'SI').sort((a, b) => a.createdAt - b.createdAt);
  const startDate = activeClass?.startDate || activeClass?.createdAt || Date.now();
  
  return (
    <div className="space-y-12 py-12 border-t border-ink/5 mt-12 overflow-visible">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl editorial-title text-brand-primary">Submission Roadmap</h3>
          <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest mt-2">Target Pace: 1 Piece / 2 Weeks</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono opacity-30 uppercase mb-1">Course Start</p>
          <p className="text-xs font-bold">{new Date(startDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="relative">
        {/* Connection Line */}
        <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-ink/5 z-0" />
        
        <div className="space-y-6 relative z-10">
          {Array.from({ length: 15 }).map((_, i) => {
            const piece = siPieces[i];
            const deadline = activeClass?.deadlines && activeClass.deadlines[i] !== undefined
              ? activeClass.deadlines[i]
              : startDate + (i * 14 * 24 * 60 * 60 * 1000);
            const isSubmitted = !!piece;
            const delay = piece ? (piece.submittedAt || piece.createdAt) - deadline : Date.now() - deadline;
            const isLate = delay > 0;

            return (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-6 group"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all border shrink-0 ${
                  isSubmitted 
                    ? 'bg-ink text-white border-ink' 
                    : 'bg-paper text-ink/20 border-ink/10 group-hover:border-ink/30'
                }`}>
                  {i + 1}
                </div>
                
                <div className="flex-1 min-w-0 pb-6 border-b border-ink/[0.03]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className={`text-sm font-bold uppercase tracking-widest ${isSubmitted ? 'text-ink' : 'text-ink/30'}`}>
                        {isSubmitted ? `Piece ${i + 1} Submitted` : `Piece ${i + 1} Pending`}
                      </h4>
                      <p className="text-[10px] font-mono opacity-30 mt-1 uppercase tracking-tighter">
                        Deadline: {new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>

                    {isSubmitted ? (
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest ${
                          isLate ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
                        }`}>
                          {formatDelay(delay)}
                        </div>
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-ink/5">
                          <img src={piece.imageUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                      </div>
                    ) : (
                      isLate && (
                        <div className="px-3 py-1 bg-red-50 text-red-400 border border-red-100 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest">
                          {formatDelay(delay)} Past due
                        </div>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Components ---
const CharacterCounter = ({ current, limit }: { current: number | undefined, limit: number }) => (
  <div className={`text-[9px] font-mono mt-2 text-right tracking-widest ${(current || 0) > limit ? 'text-red-500 font-bold' : 'text-ink/60 uppercase'}`}>
    {current || 0} / {limit}
  </div>
);

function StudentCard({ studentId, classId, onClick }: { studentId: string, classId: string, onClick: () => void | Promise<any> }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [artCount, setArtCount] = useState(0);
  const [portfolio, setPortfolio] = useState<any>(null);

  useEffect(() => {
    storageService.getPublicUser(studentId).then(setProfile);
    if (classId) {
      storageService.getArtworks(classId, studentId).then(arts => setArtCount(arts.length));
      storageService.getPortfolio(classId, studentId).then(setPortfolio);
    } else {
      storageService.getClassesByStudent(studentId).then(classes => {
        if (classes.length > 0) {
          storageService.getArtworks(classes[0].id, studentId).then(arts => setArtCount(arts.length));
          storageService.getPortfolio(classes[0].id, studentId).then(setPortfolio);
        }
      });
    }
  }, [studentId, classId]);

  if (!profile) return null;

  return (
    <motion.button 
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="brutal-card p-8 bg-white border-ink/5 hover:border-brand-primary transition-all text-left flex flex-col justify-between h-64 group"
    >
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold">
              {profile.displayName?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xl editorial-title text-ink">{profile.displayName}</h4>
                {profile.isExample && (
                  <span className="bg-yellow-400 text-[8px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">Example</span>
                )}
              </div>
              <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest">{profile.email || 'Artist'}</p>
              {portfolio?.portfolioName && (
                <p className="text-xs font-serif italic text-[#cf7d4d] mt-1 leading-normal line-clamp-1">
                  “{portfolio.portfolioName}”
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            {portfolio?.portfolioSubmitted ? (
              <span className={`px-2 py-1 text-[8px] font-mono font-bold rounded-md uppercase tracking-wider border ${
                portfolio.portfolioSubmissionStatus === 'on-time' 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {portfolio.portfolioSubmissionStatus === 'on-time' ? 'On-Time' : 'Late'}
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 text-[8px] font-mono font-bold rounded-md uppercase tracking-wider">
                Pending
              </span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
            <span className="opacity-40">Artifacts</span>
            <span className="font-bold">{artCount} / 20</span>
          </div>
          <div className="w-full h-1 bg-ink/5 rounded-full overflow-hidden">
            <div className="h-full bg-brand-primary transition-all duration-1000" style={{ width: `${(artCount / 20) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 text-[9px] font-mono font-bold uppercase tracking-widest text-brand-primary group-hover:gap-4 transition-all">
          View Portfolio <span>→</span>
        </div>
        {portfolio?.teacherGrade && (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-wider bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
            <Award size={10} /> Graded
          </span>
        )}
      </div>
    </motion.button>
  );
}

function FeedbackSection({ classId, studentId, targetType, currentUser }: { classId: string, studentId: string, targetType: string, currentUser: User | null }) {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [newFeedback, setNewFeedback] = useState('');

  useEffect(() => {
    if (classId && studentId) {
      storageService.getFeedback(classId, studentId).then(setFeedback);
    }
  }, [classId, studentId]);

  const handleAddFeedback = async () => {
    if (!newFeedback.trim() || !currentUser) return;
    const fb: Feedback = {
      id: Math.random().toString(36).substr(2, 9),
      teacherId: currentUser.uid,
      artworkId: targetType === 'general' ? null : targetType, // Simplified for now
      text: newFeedback,
      createdAt: Date.now()
    };
    await storageService.addFeedback(classId, studentId, fb);
    setFeedback([fb, ...feedback]);
    setNewFeedback('');
  };

  return (
    <div className="mt-12 bg-gray-50 p-8 rounded-[32px] border border-ink/5">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-primary mb-6">Instructor Feedback</h4>
      <div className="space-y-4 mb-8">
        {feedback.map(fb => (
          <div key={fb.id} className="bg-white p-6 rounded-2xl border border-ink/5 shadow-sm">
            <p className="text-sm text-ink/80 leading-relaxed">{fb.text}</p>
            <p className="text-[9px] font-mono opacity-30 uppercase mt-4">{new Date(fb.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
        {feedback.length === 0 && <p className="text-xs text-ink/30 italic">No feedback provided yet.</p>}
      </div>
      {currentUser?.role === 'educator' && (
        <div className="flex gap-4">
          <textarea 
            value={newFeedback}
            onChange={(e) => setNewFeedback(e.target.value)}
            placeholder="Add constructive feedback..."
            className="flex-grow bg-white border border-ink/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary placeholder:opacity-20 h-20 resize-none"
          />
          <button 
            onClick={handleAddFeedback}
            className="bg-brand-primary text-white p-4 rounded-2xl hover:opacity-90 transition-opacity self-end"
          >
            <Plus size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [activeClass, setActiveClass] = useState<ClassRoom | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [writtenEvidence, setWrittenEvidence] = useState<WrittenEvidence>({
    inquiry: '',
    practice: '',
    experimentation: '',
    revision: ''
  });
  const [activeTab, setActiveTab] = useState<'Essential' | 'SI' | 'Selected' | 'Progress' | 'Evidence' | 'Roadmap' | 'Guidelines' | 'Assessment'>('Essential');
  const [evidenceSubTab, setEvidenceSubTab] = useState<'inquiry' | 'practice' | 'experimentation' | 'revision'>('inquiry');
  const [rubricSubTab, setRubricSubTab] = useState<'si_rubric' | 'selected_rubric' | 'terminology'>('si_rubric');
  const [terminologySearch, setTerminologySearch] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showSelectedWorksGuide, setShowSelectedWorksGuide] = useState(false);
  const [showWrittenEvidenceGuide, setShowWrittenEvidenceGuide] = useState(false);
  const [showSubmissionGuide, setShowSubmissionGuide] = useState(false);
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [showExamplesTab, setShowExamplesTab] = useState(false);
  const [isActingAsStudent, setIsActingAsStudent] = useState(false);
  const [educatorViewMode, setEducatorViewMode] = useState<'roster' | 'teaching_hub'>('roster');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);

  // --- New Submission, Self-Guided Reflection, and Assessment State Variables ---
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [showSubmitReflectionModal, setShowSubmitReflectionModal] = useState(false);
  const [isSubmittingReflection, setIsSubmittingReflection] = useState(false);

  // Peer critique states
  const [peerCritiques, setPeerCritiques] = useState<PeerCritique[]>([]);
  const [peerCritiqueInput, setPeerCritiqueInput] = useState('');
  const [isVerifyingCritique, setIsVerifyingCritique] = useState(false);
  const [critiqueAiFeedback, setCritiqueAiFeedback] = useState<any>(null);

  const handleVerifyAndSavePeerCritique = async (artworkId: string, artworkTitle: string) => {
    if (!selectedStudent || !user || !activeClass) return;
    if (!peerCritiqueInput.trim()) return;

    setIsVerifyingCritique(true);
    setCritiqueAiFeedback(null);

    try {
      const response = await fetch("/api/verify-peer-critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: peerCritiqueInput })
      });

      if (response.ok) {
        const result = await response.json();
        setCritiqueAiFeedback(result);

        if (result.isValid) {
          const critique: PeerCritique = {
            id: Math.random().toString(36).substring(2, 11),
            classId: activeClass.id,
            authorId: user.uid,
            authorName: user.displayName || 'Anonymous Classmate',
            targetStudentId: selectedStudent.uid,
            targetStudentName: selectedStudent.displayName || 'Artist',
            artworkId: artworkId,
            artworkTitle: artworkTitle,
            text: peerCritiqueInput,
            isVerified: true,
            aiVerificationDetails: result.reasoning,
            createdAt: Date.now()
          };

          await storageService.savePeerCritique(activeClass.id, critique);
          
          const allCrits = await storageService.getAllPeerCritiques(activeClass.id);
          setPeerCritiques(allCrits);
          setPeerCritiqueInput('');
        }
      } else {
        const errorText = await response.text();
        console.error("API error during peer critique verification:", errorText);
      }
    } catch (err) {
      console.error("Error verifying peer critique:", err);
    } finally {
      setIsVerifyingCritique(false);
    }
  };
  
  // Teacher & Portfolio Assessment
  const [teacherRubricScores, setTeacherRubricScores] = useState({ criteria1: 3, criteria2: 3, criteria3: 3 });
  const [teacherFeedbackText, setTeacherFeedbackText] = useState('');
  const [isSavingTeacherGrade, setIsSavingTeacherGrade] = useState(false);
  const [isRunningAiJudge, setIsRunningAiJudge] = useState(false);
  const saveTimeoutRef = useRef<any>(null);
  const evidenceSaveTimeoutRef = useRef<any>(null);
  const artworksRef = useRef<Artwork[]>([]);
  const writtenEvidenceRef = useRef<WrittenEvidence>({
    inquiry: '',
    practice: '',
    experimentation: '',
    revision: ''
  });

  useEffect(() => {
    artworksRef.current = artworks;
  }, [artworks]);

  useEffect(() => {
    writtenEvidenceRef.current = writtenEvidence;
  }, [writtenEvidence]);

  const effectiveRole = (user?.role === 'educator' && isActingAsStudent) ? 'student' : user?.role;
  const isEditable = !!user && !!selectedStudent && (selectedStudent.uid === user.uid || (user.role === 'educator' && isActingAsStudent));

  const handleAiBrainstorm = async () => {
    if (effectiveRole === 'educator') return;
    setIsAiProcessing(true);
    setAiSuggestions(null);
    try {
      const targetText = writtenEvidence[evidenceSubTab];
      const targetUid = selectedStudent ? selectedStudent.uid : user?.uid;
      
      const result = await geminiService.brainstormResponse(
        evidenceSubTab, 
        targetText,
        writtenEvidence.inquiry
      );
      setAiSuggestions(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const [aiArtProcessingId, setAiArtProcessingId] = useState<string | null>(null);
  const [activeHelperArtId, setActiveHelperArtId] = useState<string | null>(null);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'details' | 'assessment'>('details');
  const [criteriaScores, setCriteriaScores] = useState({ criteria1: 3, criteria2: 3, criteria3: 3 });
  const [localFeedbackText, setLocalFeedbackText] = useState('');
  const [isSubmittingProj, setIsSubmittingProj] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  useEffect(() => {
    if (selectedArtworkId) {
      const activeArtwork = artworks.find(a => a.id === selectedArtworkId);
      if (activeArtwork) {
        setCriteriaScores({
          criteria1: activeArtwork.rubricScores?.criteria1 || 3,
          criteria2: activeArtwork.rubricScores?.criteria2 || 3,
          criteria3: activeArtwork.rubricScores?.criteria3 || 3
        });
        setLocalFeedbackText(activeArtwork.teacherFeedback || '');
      }
    }
  }, [selectedArtworkId]);

  const handleScoreClick = (criterion: 'criteria1' | 'criteria2' | 'criteria3', score: number) => {
    setCriteriaScores(prev => ({
      ...prev,
      [criterion]: score
    }));
  };
  const [adminClassFilter, setAdminClassFilter] = useState<'my' | 'other' | 'all-portfolios'>('my');
  const [globalProfiles, setGlobalProfiles] = useState<User[]>([]);

  const handleAiRefineForArt = async (artId: string, type: 'ideas' | 'processText', currentText: string) => {
    if (effectiveRole === 'educator' || !currentText) return;
    setAiArtProcessingId(`${artId}_${type}`);
    try {
      const refined = await geminiService.refineDraft(
        type,
        currentText,
        writtenEvidence.inquiry
      );
      updateArtwork(artId, { [type]: refined });
    } catch (err) {
      console.error(err);
    } finally {
      setAiArtProcessingId(null);
    }
  };

  const handleAiRefine = async () => {
    if (effectiveRole === 'educator' || !writtenEvidence[evidenceSubTab]) return;
    setIsAiProcessing(true);
    try {
      const refined = await geminiService.refineDraft(
        evidenceSubTab,
        writtenEvidence[evidenceSubTab],
        writtenEvidence.inquiry
      );
      updateEvidence({ [evidenceSubTab]: refined });
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiProcessing(false);
    }
  };
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [exampleStudents, setExampleStudents] = useState<{ [year: string]: User[] }>({});
  const [studentsList, setStudentsList] = useState<User[]>([]);
  const [isEditingPortfolioName, setIsEditingPortfolioName] = useState(false);
  const [tempPortfolioName, setTempPortfolioName] = useState('');
  const [isSavingPortfolioName, setIsSavingPortfolioName] = useState(false);
  const [newClassData, setNewClassData] = useState({
    name: '',
    teacherName: 'Mr. Doe',
    courseType: '2D' as const,
    academicYear: '2024-2025'
  });
  const [showJoinClassModal, setShowJoinClassModal] = useState(false);
  const [classIdToDelete, setClassIdToDelete] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const academicYears = Array.from({ length: 30 }, (_, i) => {
    const start = 2024 + i;
    return `${start}-${start + 1}`;
  });

  const apCourses = [
    { id: '2D', label: 'AP 2-D Art and Design' },
    { id: '3D', label: 'AP 3-D Art and Design' },
    { id: 'Drawing', label: 'AP Drawing' },
    { id: 'ArtHistory', label: 'AP Art History' },
    { id: 'MusicTheory', label: 'AP Music Theory' }
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        const userData = await storageService.getUser(fbUser.uid);
        if (userData && userData.role) {
          setUser(userData);
          setActiveClass(null);
          setSelectedStudent(null);
          setIsActingAsStudent(false);
          loadDashboard(userData);
          setShowRoleSelection(false);
        } else {
          // New user or missing role, wait for role selection
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            role: userData?.role || null
          });
          setActiveClass(null);
          setSelectedStudent(null);
          setIsActingAsStudent(false);
          setShowRoleSelection(true);
        }
      } else {
        setUser(null);
        setClasses([]);
        setActiveClass(null);
        setSelectedStudent(null);
        setIsActingAsStudent(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOut = async () => {
    try {
      await flushArtworkSave();
      await flushEvidenceSave();
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  const [isSettingRole, setIsSettingRole] = useState(false);

  const handleSwitchRole = async (targetRole: 'student' | 'educator') => {
    if (!user) return;
    
    setShowProfileMenu(false);
    
    // Save any pending work first before resetting context
    await flushArtworkSave();
    await flushEvidenceSave();
    
    // Reset view states that depend on previous role
    setActiveClass(null);
    setSelectedStudent(null);
    setSelectedArtworkId(null);
    setIsActingAsStudent(false);
    setShowExamplesTab(false);
    
    // Switch role inside database/local state
    await handleSetRole(targetRole);
  };

  const handleSetRole = async (role: 'student' | 'educator') => {
    console.log('handleSetRole called with role:', role);
    if (!user || isSettingRole) return;
    
    setIsSettingRole(true);
    try {
      const finalUser: User = {
        ...user,
        role: role,
        displayName: user.displayName || (role === 'educator' ? 'Mr. Doe' : 'Artist')
      };
      
      console.log('Attempting to save user profile:', finalUser);
      await storageService.saveUser(finalUser);
      
      console.log('User profile saved successfully');
      setUser(finalUser);
      setActiveClass(null);
      setSelectedStudent(null);
      setIsActingAsStudent(false);
      setShowRoleSelection(false);
      loadDashboard(finalUser);
    } catch (err) {
      console.error('Failed to set role:', err);
      alert('Failed to save your profile. Please check your connection and try again.');
    } finally {
      setIsSettingRole(false);
    }
  };

  const loadDashboard = async (currUser: User) => {
    // Proactively self-heal/reconcile the global profile whenever anyone loads their dashboard
    try {
      if (currUser && currUser.uid && currUser.role) {
        const pubProfile = await storageService.getPublicUser(currUser.uid);
        if (!pubProfile) {
          console.log("Self-healing missing global profile for:", currUser.uid);
          await storageService.saveUser(currUser);
        }
      }
    } catch (e) {
      console.warn("Could not self-heal global profile on load:", e);
    }

    if (currUser.role === 'educator') {
      // Ensure the sample course exists for everyone to try
      await storageService.ensureSampleCourse(currUser.uid, currUser.displayName || 'Marko Pechnik');
      
      let fetchedClasses: ClassRoom[] = [];
      if (currUser.email === 'markopechnik@gmail.com') {
        fetchedClasses = await storageService.getAllClasses();
        try {
          const profiles = await storageService.getGlobalProfiles();
          setGlobalProfiles(profiles);
        } catch (err) {
          console.error("Failed to load global profiles:", err);
        }
      } else {
        fetchedClasses = await storageService.getClassesByTeacher(currUser.uid);
      }
      setClasses(fetchedClasses);
    } else {
      const studentClasses = await storageService.getClassesByStudent(currUser.uid);
      setClasses(studentClasses);
      // Auto-heal class membership for current user in physical database collections
      studentClasses.forEach(async (c) => {
        try {
          await storageService.addClassMember(c.id, currUser);
        } catch (err) {
          console.warn(`Could not self-heal membership for ${currUser.uid} in class ${c.id}:`, err);
        }
      });
    }
  };

  useEffect(() => {
    if (user && user.role === 'educator') {
      storageService.getAllExampleStudents().then(setExampleStudents);
    }
  }, [user]);

  useEffect(() => {
    if (activeClass && user) {
      const loadRoster = async () => {
        try {
          const profiles = await storageService.getStudentProfiles(activeClass.id);
          const loadedUids = new Set(profiles.map(p => p.uid));
          const missingUids = (activeClass.studentIds || []).filter(uid => !loadedUids.has(uid));
          
          let finalRoster = [...profiles];
          
          if (missingUids.length > 0) {
            console.log("Reconciling and healing classmate profiles:", missingUids);
            const resolvedPromises = missingUids.map(async (uid) => {
              const pubProfile = await storageService.getPublicUser(uid);
              if (pubProfile) {
                try {
                  const canWrite = user.uid === uid || (user.role === 'educator' && activeClass.teacherId === user.uid);
                  if (canWrite) {
                    await storageService.addClassMember(activeClass.id, pubProfile);
                  }
                } catch (e) {
                  console.warn(`Could not heal classmate membership for ${uid}:`, e);
                }
                return pubProfile;
              }
              return null;
            });
            const resolved = (await Promise.all(resolvedPromises)).filter((p): p is User => p !== null);
            finalRoster = [...profiles, ...resolved];
          }
          
          // Purely enforce security/correctness: filter out the teacher/educator's own profile 
          // from the student list so they never show up in the Student Gallery or Student Roster.
          finalRoster = finalRoster.filter(p => 
            p.uid !== activeClass.teacherId && 
            p.email?.toLowerCase() !== 'markopechnik@gmail.com' && 
            p.role !== 'educator'
          );
          
          setStudentsList(finalRoster);
        } catch (err) {
          console.error("Error loading roster:", err);
        }
      };
      
      loadRoster();
      storageService.getAllPeerCritiques(activeClass.id).then(setPeerCritiques);
    }
  }, [activeClass, user]);

  const loadArtworks = async (classId: string, userId: string) => {
    const [arts, evidence, pData, photos] = await Promise.all([
      storageService.getArtworks(classId, userId),
      storageService.getWrittenEvidence(classId, userId),
      storageService.getPortfolio(classId, userId),
      storageService.getProgressPhotos(classId, userId)
    ]);
    const finalArts = arts || [];
    setArtworks(finalArts);
    setWrittenEvidence(evidence);
    artworksRef.current = finalArts;
    writtenEvidenceRef.current = evidence;
    setPortfolioData(pData);
    setProgressPhotos(photos || []);
    setIsEditingPortfolioName(false);
    
    if (pData?.teacherGrade) {
      setTeacherRubricScores(pData.teacherGrade.rubricScores || { criteria1: 3, criteria2: 3, criteria3: 3 });
      setTeacherFeedbackText(pData.teacherGrade.feedbackText || '');
    } else {
      setTeacherRubricScores({ criteria1: 3, criteria2: 3, criteria3: 3 });
      setTeacherFeedbackText('');
    }
  };

  const handleSavePortfolioName = async () => {
    if (!activeClass || !selectedStudent) return;
    setIsSavingPortfolioName(true);
    try {
      await storageService.savePortfolioName(activeClass.id, selectedStudent.uid, tempPortfolioName);
      const pData = await storageService.getPortfolio(activeClass.id, selectedStudent.uid);
      setPortfolioData(pData);
      setIsEditingPortfolioName(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingPortfolioName(false);
    }
  };

  const handleSaveActiveEssentialQuestion = async (
    newQuestion: string,
    evolutionReason?: string,
    mindMapData?: { who: string; what: string; how: string }
  ) => {
    if (!activeClass || !selectedStudent) return;
    try {
      const currentHistory = portfolioData?.essentialQuestionHistory || [];
      let updatedHistory = [...currentHistory];
      
      // If there is an existing active question, archive it to history
      if (portfolioData?.portfolioName && portfolioData.portfolioName.trim() !== "" && portfolioData.portfolioName !== newQuestion) {
        const isAlreadyLast = currentHistory.length > 0 && currentHistory[currentHistory.length - 1].value === portfolioData.portfolioName;
        if (!isAlreadyLast) {
          updatedHistory.push({
            value: portfolioData.portfolioName,
            timestamp: Date.now(),
            evolutionReason: evolutionReason || "Evolved during process"
          });
        }
      }

      await storageService.savePortfolioName(activeClass.id, selectedStudent.uid, newQuestion, updatedHistory, mindMapData);
      const pData = await storageService.getPortfolio(activeClass.id, selectedStudent.uid);
      setPortfolioData(pData);
    } catch (err) {
      console.error("Error saving active essential question:", err);
    }
  };

  const handleSaveInquiryProgress = async (data: {
    who?: string;
    what?: string;
    how?: string;
    generatedVocabulary?: Array<{ term: string; category: 'subject' | 'medium' }>;
    selectedVocabulary?: string[];
    step2Completed?: boolean;
  }) => {
    if (!activeClass || !selectedStudent) return;
    try {
      await storageService.saveInquiryDevelopment(activeClass.id, selectedStudent.uid, data);
      const pData = await storageService.getPortfolio(activeClass.id, selectedStudent.uid);
      setPortfolioData(pData);
    } catch (err) {
      console.error("Error saving inquiry progress:", err);
    }
  };

  const [reflectionForm, setReflectionForm] = useState({
    rating: 3,
    inquiryText: '',
    experimentText: '',
    generalText: ''
  });

  const handlePortfolioSubmit = async () => {
    if (!activeClass || !user) return;
    setIsSubmittingReflection(true);
    try {
      // Calculate submission status
      const finalDeadline = activeClass.deadlines && activeClass.deadlines[14] !== undefined
        ? activeClass.deadlines[14]
        : (activeClass.startDate || activeClass.createdAt || Date.now()) + (14 * 14 * 24 * 60 * 60 * 1000);
      const isLate = Date.now() > finalDeadline;
      const status = isLate ? 'late' : 'on-time';

      // 1. Ask Gemini for a summary of self reflection
      let summary = '';
      try {
        const response = await fetch('/api/summarize-reflection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selfReflection: reflectionForm })
        });
        if (response.ok) {
          const resJson = await response.json();
          summary = resJson.summary;
        }
      } catch (err) {
        console.error("Gemini self reflection summary api failed:", err);
        summary = `Student self-rated their portfolio a ${reflectionForm.rating}/5 stars. They focused their inquiry on: "${reflectionForm.inquiryText.substring(0, 100)}...". They highlighted their experimentation with: "${reflectionForm.experimentText.substring(0, 100)}...".`;
      }

      const targetUid = selectedStudent ? selectedStudent.uid : user.uid;
      // 2. Save portfolio document
      await storageService.savePortfolioSelfReflection(
        activeClass.id,
        targetUid,
        {
          rating: reflectionForm.rating,
          inquiryResponse: reflectionForm.inquiryText,
          experimentResponse: reflectionForm.experimentText,
          generalComments: reflectionForm.generalText
        },
        summary,
        status
      );

      // Reload
      await loadArtworks(activeClass.id, targetUid);
      setShowSubmitReflectionModal(false);
    } catch (e) {
      console.error("Failed to submit final portfolio:", e);
    } finally {
      setIsSubmittingReflection(false);
    }
  };

  const handleCreateClass = async () => {
    if (!user || !newClassData.teacherName) return;
    
    const courseLabel = apCourses.find(c => c.id === newClassData.courseType)?.label || newClassData.courseType;
    const generatedCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const newClass: ClassRoom = {
      id: Math.random().toString(36).substr(2, 9),
      code: generatedCode,
      teacherId: user.uid,
      name: courseLabel,
      teacherName: newClassData.teacherName,
      courseType: newClassData.courseType as any,
      academicYear: newClassData.academicYear,
      startDate: Date.now(),
      createdAt: Date.now(),
      studentIds: []
    };
    await storageService.saveClass(newClass);
    await loadDashboard(user);
    setShowNewClassModal(false);
    setNewClassData({ name: '', teacherName: '', courseType: '2D', academicYear: '2024-2025' });
  };

  const handleJoinClass = async () => {
    if (!user || !joinCode) return;
    const joined = await storageService.joinClass(joinCode, user.uid);
    if (joined) {
      await loadDashboard(user);
      setShowJoinClassModal(false);
      setJoinCode('');
    } else {
      alert('Class not found. Please check the code.');
    }
  };

  const handleCreateExampleStudent = async () => {
    if (!activeClass || !user) return;
    const studentNames = [
      'Avery Sterling', 'Riley Finch', 'Morgan Pierce', 
      'Jordan Vance', 'Skyler Moss', 'Cameron Teal', 
      'Alex Rivers', 'Taylor Clay', 'Dana Ochre'
    ];
    const randomName = studentNames[Math.floor(Math.random() * studentNames.length)];
    const exampleId = `example_${Math.random().toString(36).substr(2, 9)}`;
    const exampleUser: User = {
      uid: exampleId,
      displayName: randomName,
      email: null,
      role: 'student',
      isExample: true
    };
    await storageService.saveUser(exampleUser);
    await storageService.addClassMember(activeClass.id, exampleUser);
    
    const updatedClass = { 
      ...activeClass, 
      studentIds: [...activeClass.studentIds, exampleId] 
    };
    await storageService.saveClass(updatedClass);
    setActiveClass(updatedClass);
    
    // Refresh student profile roster
    const updatedProfiles = await storageService.getStudentProfiles(activeClass.id);
    const filteredProfiles = updatedProfiles.filter(p => 
      p.uid !== activeClass.teacherId && 
      p.email?.toLowerCase() !== 'markopechnik@gmail.com' && 
      p.role !== 'educator'
    );
    setStudentsList(filteredProfiles);
    
    // Refresh example students list
    const examples = await storageService.getAllExampleStudents();
    setExampleStudents(examples);
  };

  const toggleExampleMode = async (student: User) => {
    const updated = { ...student, isExample: !student.isExample };
    await storageService.saveUser(updated);
    if (selectedStudent?.uid === student.uid) {
      setSelectedStudent(updated);
    }
    // Refresh example students list
    const examples = await storageService.getAllExampleStudents();
    setExampleStudents(examples);
  };

  const saveActiveClass = async () => {
    if (!activeClass) return;
    await storageService.saveClass(activeClass);
    if (user) await loadDashboard(user);
  };

  const deleteClass = (id: string) => {
    setClassIdToDelete(id);
  };

  const confirmDeleteClass = async () => {
    if (!classIdToDelete) return;
    const id = classIdToDelete;
    setClassIdToDelete(null);
    await storageService.deleteClass(id, user!.uid);
    await loadDashboard(user!);
    if (activeClass?.id === id) {
      setActiveClass(null);
    }
  };

  const downloadArtworkImage = (art: Artwork) => {
    const link = document.createElement('a');
    link.href = art.imageUrl;
    const safeTitle = (art.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const ext = art.imageUrl.startsWith('data:image/png') ? 'png' : 'jpg';
    link.download = `ap-art-${art.type.toLowerCase()}-${safeTitle || 'piece'}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addArtwork = async (file: File, type: 'SI' | 'Selected') => {
    if (!activeClass || !user) return;
    
    // Constraint 1: Max 4 MB size
    if (file.size > 4 * 1024 * 1024) {
      alert(`Upload Failed: Image file exceeds 4 MB. Your file size is ${(file.size / (1024 * 1024)).toFixed(2)} MB.`);
      return;
    }

    // Constraint 2: Only JPG or PNG format allowed
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isJpg = file.type === 'image/jpeg' || file.type === 'image/jpg' || ext === 'jpg' || ext === 'jpeg';
    const isPng = file.type === 'image/png' || ext === 'png';

    if (!isJpg && !isPng) {
      alert("Upload Failed: Only JPG (JPEG) or PNG image formats are supported. WebP, HEIC, TIFF, and PDF represent non-permitted AP Art portfolio assets.");
      return;
    }

    // Constraint 3: RGB Color Space Check (Not CMYK) for JPEGs
    if (isJpg) {
      const isCMYK = await new Promise<boolean>((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
          const buffer = e.target?.result as ArrayBuffer;
          if (!buffer) {
            resolve(false);
            return;
          }
          const view = new DataView(buffer);
          let offset = 2; // skip SOI marker FFD8
          const length = view.byteLength;
          while (offset < length - 1) {
            const marker = view.getUint16(offset);
            if (marker === 0xFFD9) break; // EOI
            if ((marker >= 0xFFC0 && marker <= 0xFFC3) || (marker >= 0xFFC5 && marker <= 0xFFC7) || (marker >= 0xFFC9 && marker <= 0xFFCF)) {
              if (offset + 9 < length) {
                const numComponents = view.getUint8(offset + 9);
                // 4 components corresponds to CMYK or YCCK
                if (numComponents === 4) {
                  resolve(true);
                  return;
                }
              }
              break;
            }
            if (offset + 2 + 1 < length) {
              const segmentLength = view.getUint16(offset + 2);
              offset += segmentLength + 2;
            } else {
              break;
            }
          }
          resolve(false);
        };
        reader.onerror = () => resolve(false);
        reader.readAsArrayBuffer(file.slice(0, 128 * 1024)); // first 128KB is plenty
      });

      if (isCMYK) {
        alert("Upload Failed: This image is using the CMYK color space. Standard RGB is required to maintain correct display and accurate grading colors in your AP Art portfolio. Please save/export your original artwork file in standard sRGB or RGB mode and try uploading again.");
        return;
      }
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      // Canvas converts everything to standard sRGB space natively. We save as high-quality image/jpeg.
      const base64 = canvas.toDataURL('image/jpeg', 0.8);

      const typeSpecificArtworks = artworks.filter(a => a.type === type);
      
      const newArt: Artwork = {
        id: Math.random().toString(36).substr(2, 9),
        order: typeSpecificArtworks.length,
        imageUrl: base64,
        materials: '',
        processText: '',
        dimensions: '',
        ideas: '',
        citation: '',
        digitalTools: '',
        type: type,
        createdAt: Date.now(),
        submittedAt: Date.now(),
      };
      const targetUid = selectedStudent ? selectedStudent.uid : user.uid;
      const updated = artworks ? [...artworks, newArt] : [newArt];
      setArtworks(updated);
      await storageService.saveArtworks(activeClass.id, targetUid, updated);
    };
  };

  const flushArtworkSave = async () => {
    const isEducator = user?.role === 'educator';
    if (!isEditable && !isEducator) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (activeClass && user && artworksRef.current) {
      const targetUid = selectedStudent ? selectedStudent.uid : user.uid;
      try {
        await storageService.saveArtworks(activeClass.id, targetUid, artworksRef.current);
      } catch (err) {
        console.error("Failed to flush artwork save:", err);
      }
    }
  };

  const flushEvidenceSave = async () => {
    const isEducator = user?.role === 'educator';
    if (!isEditable && !isEducator) return;
    if (evidenceSaveTimeoutRef.current) {
      clearTimeout(evidenceSaveTimeoutRef.current);
      evidenceSaveTimeoutRef.current = null;
    }
    if (activeClass && user && writtenEvidenceRef.current) {
      const targetUid = selectedStudent ? selectedStudent.uid : user.uid;
      try {
        await storageService.saveWrittenEvidence(activeClass.id, targetUid, writtenEvidenceRef.current);
      } catch (err) {
        console.error("Failed to flush evidence save:", err);
      }
    }
  };

  // Flush pending changes on unmount or profile change
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (evidenceSaveTimeoutRef.current) {
        clearTimeout(evidenceSaveTimeoutRef.current);
      }
      const isEducator = user?.role === 'educator';
      const canSave = isEditable || isEducator;
      if (canSave && auth.currentUser && activeClass && user && artworksRef.current && artworksRef.current.length > 0) {
        const targetUid = selectedStudent ? selectedStudent.uid : user.uid;
        storageService.saveArtworks(activeClass.id, targetUid, artworksRef.current).catch(err => {
          console.error("Unmount save artworks error:", err);
        });
      }
      if (canSave && auth.currentUser && activeClass && user && writtenEvidenceRef.current) {
        const targetUid = selectedStudent ? selectedStudent.uid : user.uid;
        storageService.saveWrittenEvidence(activeClass.id, targetUid, writtenEvidenceRef.current).catch(err => {
          console.error("Unmount save evidence error:", err);
        });
      }
    };
  }, [activeClass && activeClass.id, user && user.uid, selectedStudent && selectedStudent.uid, isEditable]);

  const updateArtwork = (artId: string, updates: Partial<Artwork>) => {
    // Synchronously update the ref first!
    const updated = artworksRef.current.map(a => a.id === artId ? { ...a, ...updates } : a);
    artworksRef.current = updated;
    
    // Set the state so React UI updates immediately
    setArtworks(updated);

    if (activeClass && user) {
      const targetUid = selectedStudent ? selectedStudent.uid : user.uid;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await storageService.saveArtworks(activeClass.id, targetUid, artworksRef.current);
          saveTimeoutRef.current = null;
        } catch (err) {
          console.error("Failed to save artworks:", err);
        }
      }, 700);
    }
  };

  const deleteArtwork = async (artId: string) => {
    const updated = artworksRef.current.filter(a => a.id !== artId);
    artworksRef.current = updated;
    setArtworks(updated);
    
    if (activeClass && user) {
      const targetUid = selectedStudent ? selectedStudent.uid : user.uid;
      try {
        await storageService.deleteArtwork(activeClass.id, targetUid, artId);
        await storageService.saveArtworks(activeClass.id, targetUid, updated);
      } catch (err) {
        console.error("Failed to delete artwork:", err);
      }
    }
  };

  const updateEvidence = (updates: Partial<WrittenEvidence>) => {
    // Synchronously update the ref first!
    const updated = { ...writtenEvidenceRef.current, ...updates };
    writtenEvidenceRef.current = updated;

    // Set the state so React UI updates immediately
    setWrittenEvidence(updated);

    if (activeClass && user) {
      const targetUid = selectedStudent ? selectedStudent.uid : user.uid;
      if (evidenceSaveTimeoutRef.current) {
        clearTimeout(evidenceSaveTimeoutRef.current);
      }
      evidenceSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await storageService.saveWrittenEvidence(activeClass.id, targetUid, writtenEvidenceRef.current);
          evidenceSaveTimeoutRef.current = null;
        } catch (err) {
          console.error("Failed to save written evidence:", err);
        }
      }, 700);
    }
  };

  const generatePDF = () => {
    if (!activeClass) return;
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(activeClass.name, 20, 30);
    doc.setFontSize(12);
    doc.text(`Teacher: ${activeClass.teacherName} | Year: ${activeClass.academicYear}`, 20, 38);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('1. Inquiry Response:', 20, 50);
    doc.setFontSize(10);
    doc.text(writtenEvidence.inquiry || 'No response draft yet.', 20, 57, { maxWidth: 170 });
    doc.setFontSize(12);
    doc.text('2. Practice, Experimentation, & Revision Response:', 20, 85);
    doc.setFontSize(10);
    doc.text(writtenEvidence.practice || 'No response draft yet.', 20, 92, { maxWidth: 170 });

    let y = 125;
    doc.setFont('helvetica', 'bold');
    doc.text('Sustained Investigation Pieces', 20, y);
    y += 10;
    
    artworks.filter(a => a.type === 'SI').forEach((art, i) => {
      if (y > 235) { doc.addPage(); y = 30; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`SI Piece ${i + 1}${art.title ? `: ${art.title}` : ''}`, 20, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Size: ${art.dimensions || 'N/A'}`, 20, y + 8, { maxWidth: 160 });
      doc.text(`Materials: ${art.materials || 'N/A'}`, 20, y + 16, { maxWidth: 160 });
      doc.text(`Process: ${art.processText || 'N/A'}`, 20, y + 24, { maxWidth: 160 });
      doc.text(`Digital Tools: ${art.digitalTools || 'N/A'}`, 20, y + 32, { maxWidth: 160 });
      if (art.citation) {
        doc.text(`Citation: ${art.citation}`, 20, y + 40, { maxWidth: 160 });
        y += 8;
      }
      y += 45;
    });

    if (artworks.filter(a => a.type === 'Selected').length > 0) {
      doc.addPage();
      y = 30;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Selected Works', 20, y);
      y += 15;
      
      artworks.filter(a => a.type === 'Selected').forEach((art, i) => {
        if (y > 235) { doc.addPage(); y = 30; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`Selected Work ${i + 1}${art.title ? `: ${art.title}` : ''}`, 20, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Ideas: ${art.ideas || 'N/A'}`, 20, y + 8, { maxWidth: 160 });
        doc.text(`Materials: ${art.materials || 'N/A'}`, 20, y + 16, { maxWidth: 160 });
        doc.text(`Process: ${art.processText || 'N/A'}`, 20, y + 24, { maxWidth: 160 });
        doc.text(`Digital Tools: ${art.digitalTools || 'N/A'}`, 20, y + 32, { maxWidth: 160 });
        if (art.citation) {
          doc.text(`Citation: ${art.citation}`, 20, y + 40, { maxWidth: 160 });
          y += 8;
        }
        y += 45;
      });
    }
    
    doc.save(`${activeClass.name}_Portfolio.pdf`);
  };

  if (!user || user.role === null) {
    if (loading) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono uppercase tracking-widest opacity-30">Synchronizing Aura...</p>
          </div>
        </div>
      );
    }

    if (!auth.currentUser) {
      return (
        <LandingPage onSignIn={handleSignIn} />
      );
    }

    if (showRoleSelection) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-8">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="text-center space-y-12"
          >
            <div className="space-y-4">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-brand-primary/40 block mb-4">Identity Selection</span>
              <h2 className="text-6xl editorial-title text-brand-secondary">Choose your role</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <button 
                type="button"
                disabled={isSettingRole}
                onClick={() => handleSetRole('student')}
                className={`brutal-card p-12 bg-white text-left group hover:border-brand-primary transition-all cursor-pointer w-full ${isSettingRole ? 'opacity-50 cursor-not-allowed' : ''}`}
                id="select-student-role"
              >
                <div className="w-16 h-16 rounded-full bg-brand-primary/5 flex items-center justify-center mb-8 group-hover:bg-brand-primary group-hover:text-white transition-all pointer-events-none">
                  <Wand2 size={32} />
                </div>
                <h3 className="text-3xl editorial-title mb-4 pointer-events-none">Student</h3>
                <p className="text-sm text-ink/40 leading-relaxed italic pointer-events-none">Join class-rooms with a code, document your art-making process, construct your Sustained Investigation, and download/submit assets.</p>
                {isSettingRole && <div className="mt-4 text-[10px] font-mono animate-pulse">Initializing...</div>}
              </button>

              <button 
                type="button"
                disabled={isSettingRole}
                onClick={() => handleSetRole('educator')}
                className={`brutal-card p-12 bg-white text-left group hover:border-brand-secondary transition-all cursor-pointer w-full ${isSettingRole ? 'opacity-50 cursor-not-allowed' : ''}`}
                id="select-teacher-role"
              >
                <div className="w-16 h-16 rounded-full bg-brand-secondary/5 flex items-center justify-center mb-8 group-hover:bg-brand-secondary group-hover:text-white transition-all pointer-events-none">
                  <UserPlus size={32} />
                </div>
                <h3 className="text-3xl editorial-title mb-4 pointer-events-none">Teacher</h3>
                <p className="text-sm text-ink/40 leading-relaxed italic pointer-events-none">Create new AP Art classrooms, generate joinable codes, review portfolios, leave critiques, and bookmark example rosters.</p>
                {isSettingRole && <div className="mt-4 text-[10px] font-mono animate-pulse">Initializing...</div>}
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-10 max-w-7xl mx-auto">

      {/* Header */}
      <header className="flex justify-between items-center mb-[40px] border-b border-ink/5 pb-6">
        <div 
          onClick={() => {
            setActiveClass(null);
            setSelectedStudent(null);
            setShowExamplesTab(false);
          }}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold font-serif shadow-sm group-hover:scale-105 transition-transform">
            A
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-black tracking-tight text-base md:text-lg text-brand-primary leading-none">
              AP Art Studio
            </span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink/40 mt-1">
              Classroom Companion
            </span>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowGuide(true)}
              className="w-9 h-9 border border-ink/10 rounded-full flex items-center justify-center text-ink/50 hover:text-ink hover:border-ink/20 transition-all"
              title="Rubric Guide"
            >
              <Info size={16} />
            </button>
            
            {/* Interactive User Menu Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left cursor-pointer font-sans"
                id="profile-menu-button"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-[9px] font-mono opacity-45 uppercase tracking-widest leading-none mb-1 font-bold">
                    {user.role === 'educator' ? 'Teacher' : 'Student'}
                  </p>
                  <p className="text-xs font-semibold text-ink leading-none">{user.displayName}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold shadow-sm text-sm">
                  {user.displayName?.charAt(0) || 'A'}
                </div>
              </button>
              
              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    {/* Backdrop to close */}
                    <div 
                      className="fixed inset-0 z-[190]" 
                      onClick={() => setShowProfileMenu(false)} 
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-72 bg-white border border-ink/10 rounded-2xl shadow-xl p-5 z-[200] text-left space-y-4"
                    >
                      <div className="border-b border-ink/5 pb-3">
                        <p className="text-[10px] font-mono text-ink/40 uppercase tracking-widest">Signed In As</p>
                        <p className="font-semibold text-ink text-sm truncate mt-1">{user.displayName}</p>
                        <p className="text-xs text-ink/50 truncate font-mono">{user.email}</p>
                        <div className="inline-flex mt-2 items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono bg-brand-primary/5 text-brand-primary uppercase tracking-wider border border-brand-primary/10 font-bold">
                          Current Role: {user.role === 'educator' ? 'Teacher' : 'Student'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {user.role === 'student' ? (
                          <div className="p-2.5 rounded-xl bg-[#cf7d4d]/5 border border-[#cf7d4d]/10 space-y-2">
                            <p className="text-[10px] text-[#cf7d4d] uppercase font-mono font-bold tracking-wider pl-1 font-extrabold">Signed in as a Student by mistake?</p>
                            <button 
                              onClick={() => handleSwitchRole('educator')}
                              className="w-full text-left font-mono text-[10px] uppercase tracking-wider py-2.5 px-3 rounded-lg border border-[#cf7d4d]/20 bg-[#cf7d4d]/10 text-[#cf7d4d] hover:bg-[#cf7d4d] hover:text-white hover:border-transparent transition-all font-bold flex items-center gap-2"
                            >
                              <Sparkles size={12} className="shrink-0" />
                              Switch to Teacher Account
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleSwitchRole('student')}
                            className="w-full text-left font-mono text-[10px] uppercase tracking-wider py-2.5 px-3 rounded-lg border border-brand-primary/10 bg-brand-primary/5 text-brand-primary hover:bg-brand-primary hover:text-white hover:border-transparent transition-all font-bold flex items-center gap-2"
                          >
                            <Sparkles size={12} className="shrink-0" />
                            Switch to Student Role
                          </button>
                        )}
                        
                        <p className="text-[9px] text-ink/40 italic pl-1 leading-normal">
                          *Switch roles at any time to manage classrooms or view portfolios.
                        </p>
                      </div>

                      <div className="border-t border-ink/5 pt-3">
                        <button 
                          onClick={() => {
                            setShowProfileMenu(false);
                            handleSignOut();
                          }}
                          className="w-full text-left font-mono text-[10px] uppercase tracking-wider text-red-500 hover:text-red-600 transition-colors flex items-center gap-2 py-1 pl-1 font-bold"
                        >
                          <Trash2 size={12} />
                          Sign Out Account
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* VIEW 1: DASHBOARD */}
        {!activeClass && user && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-8">
                <button 
                  onClick={() => setShowExamplesTab(false)}
                  className={`text-4xl editorial-title transition-opacity ${showExamplesTab ? 'opacity-20' : 'opacity-100'}`}
                >
                  Your Classes
                </button>
                {user.role === 'educator' && !isActingAsStudent && (
                  <button 
                    onClick={() => setShowExamplesTab(true)}
                    className={`text-4xl editorial-title transition-opacity ${!showExamplesTab ? 'opacity-20' : 'opacity-100'}`}
                  >
                    Example Portfolios
                  </button>
                )}
              </div>
              {effectiveRole === 'student' && (
                <button 
                  onClick={() => setShowJoinClassModal(true)}
                  className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] border border-ink/10 px-8 py-4 rounded-full hover:bg-ink hover:text-white transition-all"
                >
                  Join Class with Code
                </button>
              )}
              {user.email === 'markopechnik@gmail.com' && !showExamplesTab && (
                <div className="flex items-center gap-3 bg-white border border-ink/10 rounded-full px-6 py-3 shadow-md">
                  <span className="text-[10px] font-mono opacity-55 uppercase tracking-widest font-bold">Class Scope:</span>
                  <select 
                    value={adminClassFilter}
                    onChange={(e) => setAdminClassFilter(e.target.value as any)}
                    className="bg-transparent text-xs font-mono font-bold uppercase tracking-wider text-brand-primary focus:outline-none cursor-pointer pr-4 border-none"
                  >
                    <option value="my">My Classes</option>
                    <option value="other">Other Classes</option>
                    <option value="all-portfolios">All Registered Students</option>
                  </select>
                </div>
              )}
            </div>

            {showExamplesTab ? (
              <div className="space-y-16">
                <div className="flex justify-between items-center mb-8">
                  <div className="relative group max-w-md w-full">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 group-focus-within:text-brand-primary transition-colors" />
                    <input 
                      type="text"
                      placeholder="Search example portfolios..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="bg-white border border-ink/10 rounded-full py-3 pl-12 pr-6 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary w-full placeholder:opacity-40"
                    />
                  </div>
                </div>
                
                {Object.entries(exampleStudents).length === 0 && (
                  <div className="text-center py-32 border-2 border-dashed border-ink/5 rounded-[40px]">
                    <p className="editorial-title text-3xl opacity-20">No example portfolios saved yet</p>
                    <p className="text-xs font-mono opacity-30 uppercase tracking-widest mt-4">Mark student portfolios as examples to see them here</p>
                  </div>
                )}
                {(Object.entries(exampleStudents) as [string, User[]][])
                  .sort((a,b) => b[0].localeCompare(a[0]))
                  .map(([year, students]) => {
                    const filtered = students.filter(s => s.displayName?.toLowerCase().includes(studentSearchQuery.toLowerCase()));
                    if (filtered.length === 0 && studentSearchQuery) return null;
                    
                    return (
                      <div key={year} className="space-y-8">
                        <div className="flex items-center gap-4">
                          <h3 className="text-xl font-mono uppercase tracking-[0.3em] text-brand-primary">{year}</h3>
                          <div className="flex-grow h-[1px] bg-brand-primary/10" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {filtered.map(student => (
                            <div key={student.uid}>
                              <StudentCard 
                                studentId={student.uid}
                                classId="" 
                                onClick={async () => {
                                  const classesWithStudent = await storageService.getClassesByStudent(student.uid);
                                  if (classesWithStudent.length > 0) {
                                    setActiveClass(classesWithStudent[0]);
                                    setSelectedStudent(student);
                                    loadArtworks(classesWithStudent[0].id, student.uid);
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div>
                {user?.email === 'markopechnik@gmail.com' && adminClassFilter === 'all-portfolios' ? (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex flex-col gap-2 mb-8">
                      <h3 className="text-4xl editorial-title text-brand-primary">All Registered Students</h3>
                      <p className="text-sm text-ink/60">Every student profile and portfolio created across all courses in the entire platform.</p>
                    </div>
                    {(() => {
                      const filteredGlobal = globalProfiles.filter(student => student.role !== 'educator' && student.email?.toLowerCase() !== 'markopechnik@gmail.com');
                      return filteredGlobal.length === 0 ? (
                        <div className="text-center py-24 border-2 border-dashed border-ink/5 rounded-[40px] bg-white/50">
                          <p className="editorial-title text-2xl opacity-20">No portfolios created yet</p>
                          <p className="text-xs font-mono opacity-30 uppercase tracking-[0.2em] mt-3">When students sign up, they will appear here</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {filteredGlobal.map((student) => (
                            <div key={student.uid}>
                              <StudentCard 
                                studentId={student.uid} 
                                classId="" 
                                onClick={async () => {
                                  const studentClasses = await storageService.getClassesByStudent(student.uid);
                                  if (studentClasses.length > 0) {
                                    setActiveClass(studentClasses[0]);
                                    setSelectedStudent(student);
                                    loadArtworks(studentClasses[0].id, student.uid);
                                  } else {
                                    const fallbackClass: ClassRoom = {
                                      id: 'sample_course_111111',
                                      code: '111111',
                                      teacherId: 'educator_demo',
                                      teacherName: 'Mr. Doe',
                                      name: 'AP Art Sample Course',
                                      courseType: '2D',
                                      academicYear: '2023-2024',
                                      studentIds: [student.uid],
                                      startDate: Date.now(),
                                      createdAt: Date.now()
                                    };
                                    setActiveClass(fallbackClass);
                                    setSelectedStudent(student);
                                    loadArtworks(fallbackClass.id, student.uid);
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
                    {user.role === 'educator' && !isActingAsStudent && (user.email !== 'markopechnik@gmail.com' || adminClassFilter === 'my') && (
                      <motion.button 
                        whileHover={{ scale: 1.01 }}
                        onClick={() => setShowNewClassModal(true)}
                        className="brutal-card p-12 flex flex-col items-center justify-center gap-6 group cursor-pointer h-80 bg-white/50 border-dashed border-2"
                      >
                        <div className="w-16 h-16 border border-ink/10 rounded-full flex items-center justify-center bg-white group-hover:bg-brand-primary group-hover:text-white transition-all duration-500">
                          <Plus size={24} />
                        </div>
                        <div className="text-center">
                          <p className="font-display font-medium text-2xl text-ink/60 group-hover:text-ink transition-colors">Create Brand New Class</p>
                          <p className="text-[10px] font-mono opacity-30 uppercase tracking-[0.2em] mt-2">Generate Enrollment Code</p>
                        </div>
                      </motion.button>
                    )}

                    {(user?.email === 'markopechnik@gmail.com'
                      ? classes.filter(c => adminClassFilter === 'my' ? c.teacherId === user.uid : c.teacherId !== user.uid)
                      : classes
                    ).map((c, idx) => (
                      <motion.div 
                        key={c.id} 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="brutal-card p-10 flex flex-col justify-between h-80 group"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-mono bg-ink/5 text-ink/60 border border-ink/10 px-3 py-1 rounded-full uppercase tracking-widest w-fit">AP {c.courseType}</span>
                              <span className="text-[10px] font-mono opacity-30 uppercase tracking-[0.2em]">Code: {c.code}</span>
                            </div>
                            {user.role === 'educator' && !isActingAsStudent && c.teacherId === user.uid && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteClass(c.id); }} 
                                className="p-2 text-ink/30 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Class"
                                id={`delete-class-btn-${c.id}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                          <h3 className="text-4xl editorial-title line-clamp-2 leading-tight pr-4">{c.name}</h3>
                          <p className="text-[10px] font-mono opacity-40 mt-3 uppercase tracking-[0.2em]">
                            {effectiveRole === 'educator' ? `${c.studentIds.length} Students Enrolled` : `Teacher: ${c.teacherName}`}
                          </p>
                        </div>
                        <button 
                          onClick={() => { 
                            setActiveClass(c); 
                            if (effectiveRole === 'student') {
                              setSelectedStudent(user);
                              loadArtworks(c.id, user.uid);
                            } else {
                              loadArtworks(c.id, user.uid);
                            }
                          }}
                          className="mt-8 art-btn-primary w-full text-center py-4 text-xs uppercase tracking-[0.2em] font-bold"
                        >
                          {effectiveRole === 'educator' ? 'Manage Students' : 'Open Portfolio'}
                        </button>
                      </motion.div>
                    ))}

                    {effectiveRole === 'student' && (user?.email === 'markopechnik@gmail.com'
                      ? classes.filter(c => adminClassFilter === 'my' ? c.teacherId === user.uid : c.teacherId !== user.uid)
                      : classes
                    ).length === 0 && (
                      <div className="col-span-full text-center py-12 px-8 max-w-xl mx-auto bg-white border border-ink/8 rounded-[36px] shadow-sm flex flex-col items-center justify-center mt-6">
                        <div className="w-14 h-14 rounded-full bg-brand-primary/5 flex items-center justify-center mb-6 text-[#cf7d4d]">
                          <Sparkles size={20} />
                        </div>
                        <h3 className="text-3xl font-display font-medium text-brand-primary mb-2">Join Your Classroom</h3>
                        <p className="text-sm text-ink/60 mb-8 max-w-md leading-relaxed">
                          Enter the 6-character classroom code provided by your AP Art teacher to securely link your portfolio and begin uploading your Sustained Investigation pieces!
                        </p>
                        
                        <div className="w-full space-y-4 max-w-xs">
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-ink/40 block text-center">Classroom Code</label>
                            <input 
                              type="text" 
                              maxLength={6}
                              value={joinCode}
                              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                              className="w-full text-3xl font-mono tracking-[0.3em] pl-[0.3em] text-center bg-ink/[0.02] border border-ink/10 rounded-2xl py-4 uppercase focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary focus:bg-white transition-all placeholder:text-ink/15"
                              placeholder="XXXXXX"
                            />
                          </div>
                          
                          <button 
                            onClick={handleJoinClass}
                            disabled={joinCode.length !== 6}
                            className="w-full bg-brand-primary text-white font-mono font-bold uppercase tracking-wider py-4 px-6 rounded-2xl border-2 border-ink shadow-sm hover:scale-[1.01] hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:scale-100 disabled:pointer-events-none"
                          >
                            Link Portfolio & Enroll
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 2: SI STUDIO (Directly inside Class) */}
        {activeClass && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex items-center justify-between mb-10">
              <button 
                onClick={async () => { 
                  await flushArtworkSave();
                  await flushEvidenceSave();
                  if (selectedStudent) {
                    setSelectedStudent(null);
                  } else {
                    setActiveClass(null); 
                    setActiveTab('SI'); 
                  }
                }}
                className="group flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/80 hover:text-ink transition-opacity"
              >
                <ChevronLeft size={14} className="group-hover:translate-x-[-2px] transition-transform" /> 
                {selectedStudent ? (effectiveRole === 'student' ? 'Critique & Collaboration Hub' : 'Back to Student List') : 'Back to Classes'}
              </button>
              
              <div className="flex items-center gap-3">
                {effectiveRole === 'student' && (
                  portfolioData?.portfolioSubmitted ? (
                    <div className={`flex items-center gap-2 text-[9px] font-mono font-bold uppercase tracking-[0.15em] border px-5 py-3 rounded-full ${
                      portfolioData.portfolioSubmissionStatus === 'on-time'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      <CheckCircle2 size={12} />
                      Submitted {portfolioData.portfolioSubmissionStatus === 'on-time' ? 'On-Time' : 'Late'}
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowSubmitReflectionModal(true)} 
                      className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] bg-brand-primary text-white px-6 py-3 rounded-full hover:brightness-105 hover:shadow-md transition-all font-sans"
                    >
                      <Sparkles size={14} /> Submit Portfolio
                    </button>
                  )
                )}

                <button 
                  onClick={generatePDF} 
                  className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] bg-ink text-white px-6 py-3 rounded-full hover:bg-brand-primary transition-all"
                >
                  <Download size={14} /> Export Portfolio
                </button>
              </div>
            </div>

            {user?.role === 'educator' && !selectedStudent ? (
              educatorViewMode === 'teaching_hub' ? (
                <TeachingHub 
                  activeClass={activeClass} 
                  onSaveClass={async (updated) => {
                    await storageService.saveClass(updated);
                    setActiveClass(updated);
                    if (user) {
                      const liveClasses = await storageService.getClassesByTeacher(user.uid);
                      setClasses(liveClasses);
                    }
                  }}
                  students={studentsList}
                  onSwitchToRoster={() => setEducatorViewMode('roster')}
                />
              ) : (
                <div className="space-y-12">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                      <div className="flex items-center gap-4">
                        <h3 className="text-4xl editorial-title text-brand-primary">Student Roster</h3>
                        
                        <button
                          onClick={() => setEducatorViewMode('teaching_hub')}
                          className="flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all text-[9px] uppercase font-mono font-bold tracking-widest px-4 py-2.5 rounded-xl border border-brand-primary/20 hover:border-transparent mt-1 ml-2 shadow-sm"
                        >
                          <BookOpen size={12} /> Present & Class Deadlines
                        </button>
                      </div>
                      <p className="text-sm text-ink/60 mt-2">Manage portfolio progress and provide feedback.</p>
                    </div>
                  
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="relative group">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 group-focus-within:text-brand-primary transition-colors" />
                      <input 
                        type="text"
                        placeholder="Search students..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="bg-white border border-ink/10 rounded-full py-3 pl-12 pr-6 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary w-full md:w-64 placeholder:opacity-40"
                      />
                    </div>
                    
                    <button 
                      onClick={handleCreateExampleStudent}
                      className="flex items-center justify-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] border border-brand-primary/20 text-brand-primary px-6 py-3 rounded-full hover:bg-brand-primary hover:text-white transition-all bg-brand-primary/5"
                    >
                      <UserPlus size={14} /> Create Example Artist
                    </button>
                    
                    <div className="flex items-center gap-4 bg-brand-primary/5 px-6 py-3 rounded-full border border-brand-primary/10">
                      <p className="text-[10px] font-mono font-bold text-brand-primary uppercase tracking-widest">Enrollment Code: {activeClass.code}</p>
                    </div>

                    {user.uid === activeClass.teacherId && (
                      <button 
                        onClick={() => deleteClass(activeClass.id)}
                        className="flex items-center justify-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] border border-red-200 text-red-500 hover:bg-red-600 hover:text-white hover:border-transparent transition-all px-6 py-3 rounded-full bg-red-50/50"
                        title="Delete this classroom"
                        id="delete-current-class-btn"
                      >
                        <Trash2 size={14} /> Delete Class
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {studentsList
                    .filter(s => s.displayName?.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                    .map((student) => (
                    <div key={student.uid}>
                      <StudentCard 
                        studentId={student.uid} 
                        classId={activeClass.id} 
                        onClick={async () => {
                          setSelectedStudent(student);
                          loadArtworks(activeClass.id, student.uid);
                        }}
                      />
                    </div>
                  ))}
                  {studentsList.length > 0 && studentsList.filter(s => s.displayName?.toLowerCase().includes(studentSearchQuery.toLowerCase())).length === 0 && (
                    <div className="col-span-full py-16 text-center">
                      <p className="editorial-title text-2xl opacity-20">No students match your search</p>
                    </div>
                  )}
                  {studentsList.filter(s => s.uid !== activeClass.teacherId).length === 0 && (
                    <div className="col-span-full py-32 text-center border-2 border-dashed border-ink/5 rounded-[40px]">
                      <p className="editorial-title text-3xl opacity-20 mb-4">No students enrolled yet</p>
                      <p className="text-xs font-mono opacity-30 uppercase tracking-widest">Share code {activeClass.code} with your class</p>
                    </div>
                  )}
                </div>
              </div>
            )
            ) : user?.role === 'student' && !selectedStudent ? (
              <div className="space-y-12">
                {/* Peer Critique Commitment Goal Progress */}
                <div className="bg-paper p-8 md:p-10 border border-ink/10 rounded-[40px] shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -translate-y-16 translate-x-16 animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-primary/2 rounded-full translate-y-24 -translate-x-24" />
                  
                  <div className="relative flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                    <div className="space-y-3 max-w-2xl animate-in slide-in-from-left duration-500">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-brand-primary/10 text-brand-primary text-[10px] font-mono font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full">
                          AP Art Peer Critique Tracker
                        </span>
                        <span className="text-[10px] font-mono text-ink/40 tracking-wider">Active Period: Bi-weekly Commitment</span>
                      </div>
                      <h3 className="text-3xl font-display font-medium text-brand-primary tracking-tight">Your Critique & Collaboration Goal</h3>
                      <p className="text-sm text-ink/70 leading-relaxed font-sans mt-2">
                        The College Board encourages active investigation of design elements and principles. Every two weeks, you are required to critique 
                        <strong className="text-brand-primary"> 3 or more classmates'</strong> works with thoughtful, detailed, 
                        four-sentence reflections utilizing design elements and principles verified by AI.
                      </p>
                    </div>

                    {/* Circular or slider progress bar */}
                    <div className="w-full md:w-56 bg-white p-6 rounded-3xl border border-ink/8 flex flex-col items-center justify-center text-center shadow-sm shrink-0 animate-in zoom-in duration-500">
                      {(() => {
                        const myCount = peerCritiques.filter(c => c.authorId === user?.uid && c.isVerified).length;
                        const target = 3;
                        const percentage = Math.min((myCount / target) * 100, 100);
                        const isAchieved = myCount >= target;

                        return (
                          <>
                            <div className="relative flex items-center justify-center mb-3">
                              <span className={`text-4xl font-display font-bold ${isAchieved ? "text-green-600" : "text-brand-primary"}`}>
                                {myCount} <span className="text-sm text-ink/40 font-mono">/ {target}</span>
                              </span>
                            </div>
                            <div className="w-full bg-ink/5 h-2 rounded-full overflow-hidden mb-3">
                              <div 
                                className={`h-full transition-all duration-1000 ${isAchieved ? "bg-green-500" : "bg-brand-primary"}`} 
                                style={{ width: `${percentage}%` }} 
                              />
                            </div>
                            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-ink/60">
                              {isAchieved ? "✓ Goal Met!" : "Goal Status"}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* List of critiques already completed by the student */}
                  {(() => {
                    const myCritiques = peerCritiques.filter(c => c.authorId === user?.uid && c.isVerified);
                    if (myCritiques.length > 0) {
                      return (
                        <div className="mt-8 pt-8 border-t border-ink/5 animate-in fade-in duration-700">
                          <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-ink/40 mb-4">Your Completed Peer Reflections This Period:</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {myCritiques.map(critique => (
                              <div key={critique.id} className="bg-white/50 backdrop-blur-sm p-4 border border-ink/5 rounded-2xl flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center gap-1 text-[9px] text-[#cf7d4d] font-mono mb-2">
                                    <Sparkles size={10} /> Fully AI-Verified Crit
                                  </div>
                                  <p className="text-xs text-ink/80 italic line-clamp-3">"{critique.text}"</p>
                                </div>
                                <div className="mt-3 pt-3 border-t border-ink/5 flex items-center justify-between text-[9px] font-mono text-ink/40">
                                  <span>To: {critique.targetStudentName}</span>
                                  <span>{new Date(critique.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
                  {/* Left 1/3 COLUMN: "My Studio Space" */}
                  <div className="lg:col-span-1 space-y-6">
                    <h3 className="text-2xl font-display font-medium text-brand-primary">My Studio Space</h3>
                    
                    <motion.button
                      whileHover={{ y: -4 }}
                      onClick={() => {
                        setSelectedStudent(user);
                        loadArtworks(activeClass.id, user?.uid || '');
                      }}
                      className="w-full text-left bg-gradient-to-br from-brand-primary to-brand-primary/95 text-white p-8 rounded-[36px] shadow-sm relative group overflow-hidden border border-brand-primary block"
                    >
                      <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform duration-500" />
                      <div className="flex flex-col justify-between h-48 relative">
                        <div>
                          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20 mb-6">
                            <span className="font-bold text-lg select-none">{user?.displayName?.charAt(0)}</span>
                          </div>
                          <h4 className="text-2xl font-display font-bold mb-1">My AP Portfolio</h4>
                          <p className="text-[10px] font-mono tracking-widest text-white/50 uppercase">Open My Canvas Workspace</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono bg-white/15 px-3 py-1.5 rounded-full font-bold uppercase tracking-wide">
                            Enter Studio
                          </span>
                          <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
                        </div>
                      </div>
                    </motion.button>
                  </div>

                  {/* Right 2/3 COLUMN: "Classmate Galleries" */}
                  <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-2xl font-display font-medium text-brand-primary">Classmate Galleries</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {studentsList
                        .filter(s => 
                          s.uid !== user?.uid && 
                          s.email?.toLowerCase() !== user?.email?.toLowerCase() && 
                          s.uid !== activeClass.teacherId && 
                          s.email?.toLowerCase() !== 'markopechnik@gmail.com' &&
                          s.role !== 'educator'
                        )
                        .map(classmate => {
                          const hasCritiqued = peerCritiques.some(crit => crit.authorId === user?.uid && crit.targetStudentId === classmate.uid);
                          return (
                            <div key={classmate.uid} className="relative">
                              {hasCritiqued && (
                                <div className="absolute top-4 right-4 z-10 bg-green-500 text-white font-mono font-bold text-[8px] tracking-widest uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                  <CheckCircle2 size={10} /> Critiqued
                                </div>
                              )}
                              <StudentCard
                                studentId={classmate.uid}
                                classId={activeClass.id}
                                onClick={async () => {
                                  setSelectedStudent(classmate);
                                  loadArtworks(activeClass.id, classmate.uid);
                                }}
                              />
                            </div>
                          );
                        })}

                      {studentsList.filter(s => 
                        s.uid !== user?.uid && 
                        s.email?.toLowerCase() !== user?.email?.toLowerCase() && 
                        s.uid !== activeClass.teacherId && 
                        s.email?.toLowerCase() !== 'markopechnik@gmail.com' &&
                        s.role !== 'educator'
                      ).length === 0 && (
                        <div className="col-span-full py-16 text-center border border-dashed border-ink/8 rounded-[32px] bg-paper">
                          <p className="editorial-title text-xl opacity-30">No classmates enrolled yet</p>
                          <p className="text-xs font-mono opacity-40 uppercase mt-2">Class Code: {activeClass.code}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-[9px] font-mono bg-ink/5 text-ink/75 px-3 py-1 rounded-full uppercase tracking-[0.18em] border border-ink/8 font-bold">
                      {apCourses.find(course => course.id === activeClass.courseType)?.label || `AP ${activeClass.courseType}`}
                    </span>
                    <span className="text-[9px] font-mono text-ink/65 px-3 py-1 uppercase tracking-[0.18em] border border-ink/8 rounded-full">{activeClass.academicYear}</span>
                    {selectedStudent && (
                      <span className="text-[9px] font-mono bg-ink text-white px-3 py-1 uppercase tracking-[0.18em] rounded-full font-bold">Student: {selectedStudent.displayName}</span>
                    )}
                    {selectedStudent && user?.role === 'educator' && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleExampleMode(selectedStudent)}
                          className={`text-[9px] font-mono px-3 py-1 uppercase tracking-[0.15em] rounded-full font-bold transition-all ${
                            selectedStudent.isExample 
                              ? 'bg-yellow-400 text-black border-yellow-500' 
                              : 'bg-white text-ink/40 border border-ink/10 hover:border-brand-primary hover:text-brand-primary'
                          }`}
                        >
                          {selectedStudent.isExample ? '★ Example Portfolio' : 'Mark as Example'}
                        </button>
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-ink tracking-tight mb-1">{activeClass.name}</h2>
                  <p className="text-[10px] font-mono text-ink/50 uppercase tracking-[0.15em] mb-4">Studio Instructor: {activeClass.teacherName}</p>


                </div>

                {/* Studio Navigation Tabs */}
                <div className="flex items-center gap-8 border-b border-ink/10 mb-10 overflow-x-auto no-scrollbar scroll-smooth pb-0.5">
                  {[
                    { id: 'Essential', label: 'Essential Question' },
                    { id: 'SI', label: 'SI Pieces', count: artworks.filter(a => a.type === 'SI').length, total: 15 },
                    { id: 'Selected', label: 'Selected Works', count: artworks.filter(a => a.type === 'Selected').length, total: 5 },
                    { id: 'Progress', label: 'Progress Photos' },
                    { id: 'Evidence', label: 'Written Evidence' },
                    { id: 'Roadmap', label: 'Roadmap' },
                    { id: 'Guidelines', label: 'Scoring Rubric' },
                    { id: 'Assessment', label: 'Assessment' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={async () => {
                        await flushArtworkSave();
                        await flushEvidenceSave();
                        setActiveTab(tab.id as any);
                      }}
                      className={`pb-4 text-[10px] font-mono font-bold uppercase tracking-[0.18em] transition-all relative whitespace-nowrap flex items-center gap-2 group ${
                        activeTab === tab.id ? 'text-brand-primary' : 'text-ink/65 hover:text-brand-primary/80'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold transition-all duration-300 ${
                          activeTab === tab.id 
                            ? 'bg-brand-primary text-white scale-105' 
                            : 'bg-ink/5 text-ink/40 group-hover:bg-brand-primary/10 group-hover:text-brand-primary'
                        }`}>
                          {tab.count}/{tab.total}
                        </span>
                      )}
                      {activeTab === tab.id && (
                        <motion.div layoutId="studioTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-primary" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tabbed Content Area */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="pb-32"
                  >
                    {activeTab === 'Essential' && (
                      <EssentialQuestionTab
                        portfolioData={portfolioData}
                        isEditable={isEditable}
                        onSave={handleSaveActiveEssentialQuestion}
                        onSaveInquiryProgress={handleSaveInquiryProgress}
                      />
                    )}

                    {activeTab === 'SI' && (
                  <div className="space-y-12">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-4xl editorial-title text-brand-primary">Sustained Investigation</h3>
                        <p className="text-sm text-ink/60 mt-2">A body of related works that demonstrate inquiry-based exploration.</p>
                      </div>
                      <div className="flex items-center gap-8">
                        <button 
                          onClick={() => setShowGuide(true)}
                          className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-brand-primary hover:opacity-70 transition-opacity"
                        >
                          <Info size={14} /> SI Requirement Guide
                        </button>
                        <span className="text-[10px] font-mono font-bold text-ink/80 uppercase tracking-widest">{artworks.filter(a => a.type === 'SI').length} / 15</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
                      {artworks.filter(a => a.type === 'SI').map((art, idx) => (
                        <div 
                          key={art.id} 
                          onClick={() => setSelectedArtworkId(art.id)}
                          className="brutal-card group overflow-hidden flex flex-col hover:translate-y-[-4px] cursor-pointer transition-all bg-white border border-ink/5 hover:border-brand-primary/20 shadow-sm"
                        >
                          <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
                            <img src={art.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={`SI Piece ${idx + 1}`} />
                            <div className="absolute inset-0 bg-ink/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 translate-y-[-10px] group-hover:opacity-100 group-hover:translate-y-0 transition-all z-10">
                              <button 
                                onClick={(e) => { e.stopPropagation(); downloadArtworkImage(art); }}
                                className="bg-white hover:bg-brand-primary/10 shadow-xl p-3 rounded-full text-brand-primary hover:scale-110 transition-all flex items-center justify-center"
                                title="Download image"
                              >
                                <Download size={14} />
                              </button>
                              {effectiveRole === 'student' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteArtwork(art.id); }}
                                  className="bg-white hover:bg-red-50 shadow-xl p-3 rounded-full text-red-500 hover:scale-110 transition-all flex items-center justify-center"
                                  title="Delete piece"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            <div className="absolute bottom-6 left-6 px-3 py-1 bg-white/90 backdrop-blur-md text-ink text-[9px] font-mono rounded-full uppercase tracking-[0.2em] shadow-sm font-bold z-10">
                              SI {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                            </div>
                          </div>
                          <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                            <div className="space-y-1">
                              <h4 className="text-xl md:text-2xl font-display font-bold text-ink truncate group-hover:text-brand-primary transition-colors leading-tight">
                                {art.title || `Untitled SI Piece ${idx + 1}`}
                              </h4>
                              <p className="text-xs font-mono text-ink/50 uppercase tracking-widest">
                                {art.dimensions || 'Size: Not specified'}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-ink/5 flex justify-between items-center text-[10px] uppercase tracking-wider font-mono font-bold text-brand-primary/80 group-hover:text-brand-primary transition-colors">
                              <span>View & Edit Portfolio Piece</span>
                              <ChevronRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
                            </div>
                          </div>
                        </div>
                      ))}
                      {artworks.filter(a => a.type === 'SI').length < 15 && isEditable && <FileUploader onFile={(f) => addArtwork(f, 'SI')} label="Add SI Piece" />}
                    </div>
                    <FeedbackSection 
                      classId={activeClass.id} 
                      studentId={selectedStudent?.uid || user.uid} 
                      targetType="SI"
                      currentUser={user}
                    />
                  </div>
                )}

                {activeTab === 'Progress' && activeClass && (
                  <ProgressPhotosTab
                    classId={activeClass.id}
                    studentUid={selectedStudent?.uid || user.uid}
                    artworks={artworks}
                    progressPhotos={progressPhotos}
                    onPhotosUpdated={(photos) => setProgressPhotos(photos)}
                    onArtworkAddedFromComposite={async (newArtwork) => {
                      const targetUid = selectedStudent ? selectedStudent.uid : user.uid;
                      const updated = [...artworks, newArtwork];
                      setArtworks(updated);
                      artworksRef.current = updated;
                      await storageService.saveArtworks(activeClass.id, targetUid, updated);
                    }}
                    isEditable={isEditable}
                    currentUser={user}
                  />
                )}

                {activeTab === 'Selected' && (
                  <div className="space-y-12">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-4xl editorial-title text-brand-primary">Selected Works</h3>
                        <p className="text-sm text-ink/60 mt-2">Works that best demonstrate visual proficiency and mastery.</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <button 
                          onClick={() => setShowSelectedWorksGuide(true)}
                          className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-brand-primary hover:opacity-70 transition-opacity"
                        >
                          <Info size={14} /> Selected Works Guide
                        </button>
                        <span className="text-[10px] font-mono font-bold text-ink/80 uppercase tracking-widest">{artworks.filter(a => a.type === 'Selected').length} / 5</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
                      {artworks.filter(a => a.type === 'Selected').map((art, idx) => (
                        <div 
                          key={art.id} 
                          onClick={() => setSelectedArtworkId(art.id)}
                          className="brutal-card group overflow-hidden flex flex-col hover:translate-y-[-4px] cursor-pointer transition-all bg-white border border-ink/5 hover:border-brand-primary/20 shadow-sm"
                        >
                          <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
                            <img src={art.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={`Selected Work ${idx + 1}`} />
                            <div className="absolute inset-0 bg-ink/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 translate-y-[-10px] group-hover:opacity-100 group-hover:translate-y-0 transition-all z-10">
                              <button 
                                onClick={(e) => { e.stopPropagation(); downloadArtworkImage(art); }}
                                className="bg-white hover:bg-brand-primary/10 shadow-xl p-3 rounded-full text-brand-primary hover:scale-110 transition-all flex items-center justify-center"
                                title="Download image"
                              >
                                <Download size={14} />
                              </button>
                              {effectiveRole === 'student' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteArtwork(art.id); }}
                                  className="bg-white hover:bg-red-50 shadow-xl p-3 rounded-full text-red-500 hover:scale-110 transition-all flex items-center justify-center"
                                  title="Delete piece"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            <div className="absolute bottom-6 left-6 px-3 py-1 bg-white/90 backdrop-blur-md text-ink text-[9px] font-mono rounded-full uppercase tracking-[0.2em] shadow-sm font-bold z-10">
                              SW {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                            </div>
                          </div>
                          <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                            <div className="space-y-1">
                              <h4 className="text-xl md:text-2xl font-display font-bold text-ink truncate group-hover:text-brand-primary transition-colors leading-tight">
                                {art.title || `Untitled Selected Work ${idx + 1}`}
                              </h4>
                              <p className="text-xs font-mono text-ink/50 uppercase tracking-widest">
                                {art.dimensions || 'Size: Not specified'}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-ink/5 flex justify-between items-center text-[10px] uppercase tracking-wider font-mono font-bold text-brand-primary/80 group-hover:text-brand-primary transition-colors">
                              <span>View & Edit Portfolio Piece</span>
                              <ChevronRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
                            </div>
                          </div>
                        </div>
                      ))}
                      {artworks.filter(a => a.type === 'Selected').length < 5 && isEditable && <FileUploader onFile={(f) => addArtwork(f, 'Selected')} label="Add Selected Work" />}
                    </div>
                    <FeedbackSection 
                      classId={activeClass.id} 
                      studentId={selectedStudent?.uid || user.uid} 
                      targetType="Selected"
                      currentUser={user}
                    />
                  </div>
                )}

                {activeTab === 'Evidence' && (
                  <div className="space-y-12">
                    <div>
                      <h3 className="text-4xl editorial-title text-brand-primary">Written Evidence</h3>
                      <p className="text-sm text-ink/60 mt-2">Document your inquiry and development process.</p>
                    </div>

                    <div className="flex items-center gap-6 border-b border-ink/5 mt-[20px] mb-[20px] pt-[20px] pb-[20px] overflow-x-auto no-scrollbar">
                      {[
                        { id: 'inquiry', label: 'Inquiry Response' },
                        { id: 'practice', label: 'Practice, Experimentation, & Revision' }
                      ].map((stab) => (
                        <button
                          key={stab.id}
                          onClick={async () => {
                            await flushEvidenceSave();
                            setEvidenceSubTab(stab.id as any);
                          }}
                          className={`pb-3 text-[9px] font-mono font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
                            evidenceSubTab === stab.id ? 'text-brand-primary' : 'text-ink/40 hover:text-ink'
                          }`}
                        >
                          {stab.label}
                          {evidenceSubTab === stab.id && (
                            <motion.div layoutId="evidenceSubTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-primary" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="brutal-card p-12 bg-white/50 backdrop-blur-sm min-h-[400px] flex flex-col">
                      <div className="flex justify-between items-start mb-8">
                        <span className="text-[10px] font-mono bg-ink text-white px-4 py-2 rounded-full uppercase tracking-widest">
                          {evidenceSubTab === 'inquiry' ? 'Inquiry-Based Prompts' : 'Developmental Evidence'}
                        </span>
                        <div className="text-right">
                          <p className="text-[10px] font-mono opacity-40 uppercase tracking-[0.2em] mb-1">Character Count</p>
                          <p className={`text-sm font-bold ${writtenEvidence[evidenceSubTab].length > 550 ? 'text-red-500' : 'text-brand-primary'}`}>
                            {writtenEvidence[evidenceSubTab].length} / 600
                          </p>
                        </div>
                      </div>

                      <textarea 
                        value={writtenEvidence[evidenceSubTab]}
                        readOnly={!isEditable}
                        onChange={(e) => updateEvidence({ [evidenceSubTab]: e.target.value.slice(0, 600) })}
                        className="text-2xl font-display font-light w-full bg-transparent border-b border-ink/10 focus:border-brand-primary transition-all py-6 resize-none flex-grow focus:outline-none placeholder:opacity-20 leading-relaxed mb-8 min-h-[300px]"
                        placeholder={
                          evidenceSubTab === 'inquiry' 
                            ? "Prompt: Identify the inquiry that guided your sustained investigation." 
                            : "Prompt: Describe how your sustained investigation shows evidence of practice, experimentation, and revision guided by your inquiry."
                        }
                      />

                      {isEditable && (
                        <div className="flex flex-wrap gap-4 mb-8">
                          <button 
                            onClick={handleAiBrainstorm}
                            disabled={isAiProcessing}
                            className="flex items-center gap-2 bg-brand-primary/10 text-brand-primary px-6 py-3 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all disabled:opacity-50"
                          >
                            <Sparkles size={14} className={isAiProcessing ? 'animate-pulse' : ''} />
                            Inquiry & Practice Advisor
                          </button>
                          {writtenEvidence[evidenceSubTab].length > 10 && (
                            <button 
                               onClick={handleAiRefine}
                               disabled={isAiProcessing}
                               className="flex items-center gap-2 bg-brand-secondary/10 text-brand-secondary px-6 py-3 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-brand-secondary hover:text-white transition-all disabled:opacity-50"
                            >
                              <Wand2 size={14} className={isAiProcessing ? 'animate-pulse' : ''} />
                              Refine My Draft
                            </button>
                          )}
                        </div>
                      )}

                      <AnimatePresence>
                        {aiSuggestions && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-amber-50/75 border border-amber-200/50 p-8 rounded-[32px] mb-8 relative shadow-sm"
                          >
                            <button 
                              onClick={() => setAiSuggestions(null)}
                              className="absolute top-6 right-6 text-amber-700/50 hover:text-amber-900 transition-colors"
                            >
                              <Plus size={16} className="rotate-45" />
                            </button>
                            <div className="flex items-center gap-2.5 mb-4 text-amber-800">
                              <Sparkles size={14} />
                              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em]">Studio Critic Review</span>
                            </div>
                            <div className="text-sm text-amber-950/85 leading-relaxed italic font-serif">
                              {aiSuggestions}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="bg-brand-primary/5 p-8 rounded-[24px] flex items-start gap-4">
                        <Info size={18} className="text-brand-primary shrink-0 mt-1" />
                        <div className="space-y-4 text-xs text-ink/65 leading-relaxed font-sans w-full">
                          {evidenceSubTab === 'inquiry' ? (
                            <>
                              <p className="font-bold text-brand-primary text-sm">Identifying the Inquiry (Max 600 characters)</p>
                              <p>This should explain the question, idea, or investigation driving the work. It should not just be a topic like “identity” or “nature.” It needs to sound like an actual exploration.</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl space-y-1">
                                  <p className="font-bold text-red-600 uppercase text-[9px] tracking-wider">Weak response:</p>
                                  <p className="italic text-ink/80 animate-fade-in">“My sustained investigation is about identity.”</p>
                                </div>
                                <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-xl space-y-1">
                                  <p className="font-bold text-green-700 uppercase text-[9px] tracking-wider">Stronger response:</p>
                                  <p className="italic text-ink/90 font-medium">“I investigated how distorted self-portraits can show the difference between how I see myself and how others expect me to appear.”</p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-brand-primary text-sm">Practice, Experimentation, & Revision (Max 600 characters)</p>
                              <p>This should explain how the work changed over time. Mention specific things you tried, changed, repeated, refined, or abandoned. Be direct and specific with your artistic actions.</p>
                              <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-xl space-y-1 mt-2">
                                <p className="font-bold text-brand-primary uppercase text-[9px] tracking-wider">Strong Example:</p>
                                <p className="italic text-ink/90 font-medium">“I began with direct self-portraits, then experimented with layered reflections, blurred facial features, and fragmented compositions. After critiques, I revised the work by increasing contrast and using repeated mirror shapes to better show the tension between public and private identity.”</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="max-w-4xl mx-auto w-full space-y-8">
                      <div className="brutal-card p-10 bg-white border-ink/10 shadow-sm">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-primary mb-8 border-b border-ink/5 pb-4 text-center">AP Portfolio Vocabulary Reference</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                           {[
                             { t: 'Inquiry', d: 'Process of asking questions to guide your exploration.' },
                             { t: 'Revision', d: 'Evidence of changing and developing your work based on feedback.' },
                             { t: 'Experimentation', d: 'Trying new materials or risks to impact your guiding question.' },
                             { t: 'Synthesis', d: 'When materials, processes, and ideas work together perfectly.' },
                             { t: 'Practice', d: 'Repeatedly building skills and methods over time.' }
                           ].map(item => (
                             <div key={item.t}>
                               <p className="text-[10px] font-mono font-bold uppercase text-brand-primary/60 mb-1">{item.t}</p>
                               <p className="text-[11px] text-ink/70 leading-relaxed italic">{item.d}</p>
                             </div>
                           ))}
                        </div>
                      </div>
                    </div>

                    <FeedbackSection 
                      classId={activeClass.id} 
                      studentId={selectedStudent?.uid || user.uid} 
                      targetType={`Evidence_${evidenceSubTab}`}
                      currentUser={user}
                    />
                  </div>
                )}

                 {activeTab === 'Roadmap' && (
                  <div className="space-y-16">
                    <div>
                      <h3 className="text-4xl editorial-title text-brand-primary mb-2">Submission Roadmap</h3>
                      <p className="text-sm text-ink/60">Track your progress against the school year calendar.</p>
                    </div>
                    
                    <SubmissionTimeline artworks={artworks} activeClass={activeClass} />
                    
                    <div className="flex justify-center pt-12 border-t border-ink/5">
                      <div className="space-y-4 text-center">
                        <p className="text-[10px] font-mono text-ink/40 uppercase tracking-[0.2em]">Adjust School Year Start</p>
                        <div className="flex items-center gap-4 bg-white p-2 rounded-full border border-ink/10 shadow-sm">
                          <input 
                            type="date" 
                            value={new Date(activeClass.startDate || activeClass.createdAt).toISOString().split('T')[0]}
                            onChange={(e) => {
                              const date = new Date(e.target.value).getTime();
                              const updated = { ...activeClass, startDate: date };
                              setActiveClass(updated);
                              storageService.saveClass(updated);
                            }}
                            className="bg-transparent text-xs font-mono px-4 py-2 focus:outline-none"
                          />
                          <span className="text-[10px] font-mono text-ink/30 px-4 uppercase">Calendar Anchor</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Guidelines' && (
                  <div className="space-y-10 animate-in fade-in duration-500 text-left">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-ink/5 pb-8">
                      <div>
                        <span className="text-[10px] uppercase font-mono font-bold tracking-[0.4em] text-brand-primary/60 block mb-2">Official Reference</span>
                        <h3 className="text-4xl editorial-title text-brand-primary">Scoring & Grading Guidelines</h3>
                        <p className="text-sm text-ink/60 mt-2">Comprehensive 2025 AP® Art and Design evaluation criteria for Sustained Investigation and Selected Works.</p>
                      </div>
                      
                      {/* Rubric View Sub-tabs */}
                      <div className="flex bg-ink/5 p-1 rounded-xl items-center gap-1 self-start font-mono text-[10px] uppercase tracking-wider font-bold">
                        <button
                          onClick={() => setRubricSubTab('si_rubric')}
                          className={`px-4 py-2.5 rounded-lg transition-all ${rubricSubTab === 'si_rubric' ? 'bg-white text-brand-primary shadow-sm' : 'text-ink/60 hover:text-ink'}`}
                        >
                          SI Rubric
                        </button>
                        <button
                          onClick={() => setRubricSubTab('selected_rubric')}
                          className={`px-4 py-2.5 rounded-lg transition-all ${rubricSubTab === 'selected_rubric' ? 'bg-white text-brand-primary shadow-sm' : 'text-ink/60 hover:text-ink'}`}
                        >
                          Selected Works
                        </button>
                        <button
                          onClick={() => setRubricSubTab('terminology')}
                          className={`px-4 py-2.5 rounded-lg transition-all ${rubricSubTab === 'terminology' ? 'bg-white text-brand-primary shadow-sm' : 'text-ink/60 hover:text-ink'}`}
                        >
                          Terminology
                        </button>
                      </div>
                    </div>

                    {/* SUBTAB 1: Sustained Investigation Rubric */}
                    {rubricSubTab === 'si_rubric' && (
                      <div className="space-y-12">
                        <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-2xl p-6 flex gap-4 items-start">
                          <Info className="text-brand-primary shrink-0 mt-0.5" size={18} />
                          <div className="space-y-1">
                            <p className="font-mono text-[10px] uppercase tracking-wider text-brand-primary font-bold">General Evaluation Rule</p>
                            <p className="text-xs text-brand-primary/95 leading-relaxed">
                              When evaluating Sustained Investigations, the score for each instruction row should be considered <strong>independently</strong> from the other rows. Determine the score of each row based solely upon the criteria indicated, according to the <strong>preponderance of evidence</strong>.
                            </p>
                          </div>
                        </div>

                        {/* ROW A */}
                        <div className="brutal-card bg-white p-8 space-y-6 shadow-sm border border-ink/5">
                          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-ink/5 pb-4 gap-4">
                            <div>
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/5 text-brand-primary text-[10px] font-mono font-bold uppercase tracking-widest border border-brand-primary/10 mb-2">
                                Row A — Inquiry
                              </div>
                              <h4 className="text-2xl font-display font-semibold text-ink">Inquiry Guidance</h4>
                            </div>
                            <div className="text-xs font-mono bg-paper px-4 py-2 border border-ink/10 rounded-lg text-ink/75 max-w-sm md:text-right">
                              <strong>Writing Prompt 1:</strong> Identify the inquiry that guided your sustained investigation.
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-5 rounded-xl border border-ink/5 bg-paper/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-ink/40">SCORE POINT 1</span>
                                <span className="w-6 h-6 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-xs">1</span>
                              </div>
                              <p className="text-sm font-semibold text-ink">Limited/No Inquiry</p>
                              <p className="text-xs text-ink/65 leading-relaxed">Written evidence <strong>does not identify</strong> an inquiry.</p>
                            </div>

                            <div className="p-5 rounded-xl border border-ink/5 bg-paper/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-ink/40">SCORE POINT 2</span>
                                <span className="w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-600 flex items-center justify-center font-bold text-xs">2</span>
                              </div>
                              <p className="text-sm font-semibold text-ink">Identified & Demonstrated</p>
                              <p className="text-xs text-ink/65 leading-relaxed">
                                Written evidence <strong>identifies</strong> an inquiry <strong>AND</strong> visual evidence <strong>demonstrates</strong> the inquiry.
                              </p>
                            </div>

                            <div className="p-5 rounded-xl border border-brand-primary/20 bg-brand-primary/5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-brand-primary/60">SCORE POINT 3</span>
                                <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs">3</span>
                              </div>
                              <p className="text-sm font-semibold text-brand-primary">Guided Development</p>
                              <p className="text-xs text-brand-primary/80 leading-relaxed">
                                Written evidence <strong>identifies</strong> an inquiry <strong>AND</strong> visual evidence <strong>demonstrates</strong> the inquiry <strong>AND</strong> the inquiry <strong>guides</strong> the development of the sustained investigation.
                              </p>
                            </div>
                          </div>

                          <div className="bg-paper p-5 rounded-xl border border-ink/10 space-y-3 font-sans">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-ink/50 font-bold">Decision Rules & Scoring Notes</p>
                            <ul className="text-xs text-ink/70 space-y-2 list-disc pl-4 leading-relaxed">
                              <li>Does the <strong>written</strong> evidence identify an inquiry by describing discovery or exploration? <span className="italic text-ink/50">(A question or statement that merely identifies a theme or topic is NOT an inquiry.)</span> If no, award 1 point.</li>
                              <li>Does the <strong>visual</strong> evidence demonstrate the inquiry? If yes, move to criteria for score point 3.</li>
                              <li>Does the inquiry <strong>guide</strong> the development of the sustained investigation? If yes, award 3 points. Otherwise, award 2.</li>
                            </ul>
                          </div>
                        </div>

                        {/* ROW B */}
                        <div className="brutal-card bg-white p-8 space-y-6 shadow-sm border border-ink/5">
                          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-ink/5 pb-4 gap-4">
                            <div>
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/5 text-brand-primary text-[10px] font-mono font-bold uppercase tracking-widest border border-brand-primary/10 mb-2">
                                Row B — Practice, Experimentation, and Revision
                              </div>
                              <h4 className="text-2xl font-display font-semibold text-ink">Development Through Process</h4>
                            </div>
                            <div className="text-xs font-mono bg-paper px-4 py-2 border border-ink/10 rounded-lg text-ink/75 max-w-sm md:text-right">
                              <strong>Writing Prompt 2:</strong> Describe ways your sustained investigation developed through practice, experimentation, and revision.
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-5 rounded-xl border border-ink/5 bg-paper/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-ink/40">SCORE POINT 1</span>
                                <span className="w-6 h-6 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-xs">1</span>
                              </div>
                              <p className="text-sm font-semibold text-ink">Unrelated Evidence</p>
                              <p className="text-xs text-ink/65 leading-relaxed">
                                Visual evidence of practice, experimentation, and revision <strong>does not relate</strong> to a sustained investigation.
                              </p>
                            </div>

                            <div className="p-5 rounded-xl border border-ink/5 bg-paper/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-ink/40">SCORE POINT 2</span>
                                <span className="w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-600 flex items-center justify-center font-bold text-xs">2</span>
                              </div>
                              <p className="text-sm font-semibold text-ink">Relates to Investigation</p>
                              <p className="text-xs text-ink/65 leading-relaxed">
                                Visual <strong>and</strong> written evidence of practice, experimentation, and revision <strong>relates</strong> to a sustained investigation.
                              </p>
                            </div>

                            <div className="p-5 rounded-xl border border-brand-primary/20 bg-brand-primary/5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-brand-primary/60">SCORE POINT 3</span>
                                <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs">3</span>
                              </div>
                              <p className="text-sm font-semibold text-brand-primary">Demonstrates Development</p>
                              <p className="text-xs text-brand-primary/80 leading-relaxed">
                                Visual evidence of practice, experimentation, and revision <strong>demonstrates development</strong> of the sustained investigation <strong>AND</strong> written evidence <strong>describes ways</strong> it developed.
                              </p>
                            </div>
                          </div>

                          <div className="bg-paper p-5 rounded-xl border border-ink/10 space-y-3">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-ink/50 font-bold">Decision Rules & Scoring Notes</p>
                            <ul className="text-xs text-ink/70 space-y-2 list-disc pl-4 leading-relaxed">
                              <li>Is there visual evidence of practice, experimentation, and revision? AND does it relate to a sustained investigation? If no for either, award 1 point.</li>
                              <li>Does the written evidence of process relate to a sustained investigation? If yes, move to score point 3.</li>
                              <li>Does the visual evidence demonstrate deep, sequential development of the sustained investigation? AND does the written text describe those evolutionary choices? If yes, award 3 points.</li>
                            </ul>
                          </div>
                        </div>

                        {/* ROW C */}
                        <div className="brutal-card bg-white p-8 space-y-6 shadow-sm border border-ink/5">
                          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-ink/5 pb-4 gap-4">
                            <div>
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/5 text-brand-primary text-[10px] font-mono font-bold uppercase tracking-widest border border-brand-primary/10 mb-2">
                                Row C — Materials, Processes, and Ideas
                              </div>
                              <h4 className="text-2xl font-display font-semibold text-ink">Synthesis of Materials, Processes & Ideas</h4>
                            </div>
                            <div className="text-xs font-mono text-ink/40">
                              *Evaluated across all pieces of visual and written evidence
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-5 rounded-xl border border-ink/5 bg-paper/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-ink/40">SCORE POINT 1</span>
                                <span className="w-6 h-6 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-xs">1</span>
                              </div>
                              <p className="text-sm font-semibold text-ink">Little/No Synthesis</p>
                              <p className="text-xs text-ink/65 leading-relaxed">
                                Little to no evidence of <strong>visual relationships</strong> among materials, processes, and ideas.
                              </p>
                            </div>

                            <div className="p-5 rounded-xl border border-ink/5 bg-paper/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-ink/40">SCORE POINT 2</span>
                                <span className="w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-600 flex items-center justify-center font-bold text-xs">2</span>
                              </div>
                              <p className="text-sm font-semibold text-ink">Relationships Evident</p>
                              <p className="text-xs text-ink/65 leading-relaxed">
                                Visual relationships among materials, processes, and ideas are <strong>evident</strong> in the portfolio pieces.
                              </p>
                            </div>

                            <div className="p-5 rounded-xl border border-brand-primary/20 bg-brand-primary/5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-brand-primary/60">SCORE POINT 3</span>
                                <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs">3</span>
                              </div>
                              <p className="text-sm font-semibold text-brand-primary">Demonstrate Synthesis</p>
                              <p className="text-xs text-brand-primary/80 leading-relaxed">
                                Visual relationships among materials, processes, and ideas are <strong>evident and demonstrate synthesis</strong>.
                              </p>
                            </div>
                          </div>

                          <div className="bg-paper p-5 rounded-xl border border-ink/10 space-y-3">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-ink/50 font-bold">Decision Rules & Scoring Notes</p>
                            <ul className="text-xs text-ink/70 space-y-2 list-disc pl-4 leading-relaxed">
                              <li>In this row, written evidence is not scored independently, but reading student responses may inform the examiner of the visual relationships.</li>
                              <li>Do the visual relationships among materials, processes, and ideas demonstrate <strong>synthesis</strong> (the deliberate coalescent integration of concept with physical format)? If yes, award 3 points. Otherwise, award 2.</li>
                            </ul>
                          </div>
                        </div>

                        {/* ROW D */}
                        <div className="brutal-card bg-white p-8 space-y-6 shadow-sm border border-ink/5">
                          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-ink/5 pb-4 gap-4">
                            <div>
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/5 text-brand-primary text-[10px] font-mono font-bold uppercase tracking-widest border border-brand-primary/10 mb-2">
                                Row D — 2-D/3-D/Drawing Skills
                              </div>
                              <h4 className="text-2xl font-display font-semibold text-ink">Technical & Formal Artistic Skills</h4>
                            </div>
                            <div className="text-xs font-mono text-ink/40">
                              *Evaluated upon visual elements, composition, and execution
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-5 rounded-xl border border-ink/5 bg-paper/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-ink/40">SCORE POINT 1</span>
                                <span className="w-6 h-6 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-xs">1</span>
                              </div>
                              <p className="text-sm font-semibold text-ink">Rudimentary to Moderate</p>
                              <p className="text-xs text-ink/65 leading-relaxed">
                                Visual evidence of <strong>rudimentary and moderate</strong> skills within 2-D, 3-D, or Drawing.
                              </p>
                            </div>

                            <div className="p-5 rounded-xl border border-ink/5 bg-paper/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-ink/40">SCORE POINT 2</span>
                                <span className="w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-600 flex items-center justify-center font-bold text-xs">2</span>
                              </div>
                              <p className="text-sm font-semibold text-ink">Moderate to Good</p>
                              <p className="text-xs text-ink/65 leading-relaxed">
                                Visual evidence of <strong>moderate and good (proficient)</strong> skills within 2-D, 3-D, or Drawing.
                              </p>
                            </div>

                            <div className="p-5 rounded-xl border border-brand-primary/20 bg-brand-primary/5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-brand-primary/60">SCORE POINT 3</span>
                                <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs">3</span>
                              </div>
                              <p className="text-sm font-semibold text-brand-primary">Good to Advanced</p>
                              <p className="text-xs text-brand-primary/80 leading-relaxed">
                                Visual evidence of <strong>good and advanced</strong> (highly developed, complex execution) skills.
                              </p>
                            </div>
                          </div>

                          <div className="bg-paper p-5 rounded-xl border border-ink/10 space-y-3">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-ink/50 font-bold">Decision Rules & Scoring Notes</p>
                            <ul className="text-xs text-ink/70 space-y-2 list-disc pl-4 leading-relaxed">
                              <li>Does the visual evidence include some works with good/proficient skills? If yes, check for advanced skills.</li>
                              <li>Does the visual evidence across <strong>all</strong> works include a range of good to advanced skills? If yes, award 3 points. Otherwise, award 2.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUBTAB 2: Selected Works Rubric */}
                    {rubricSubTab === 'selected_rubric' && (
                      <div className="space-y-12 animate-in fade-in duration-300">
                        <div className="bg-brand-secondary/5 border border-brand-secondary/10 rounded-2xl p-6 flex gap-4 items-start">
                          <Info className="text-brand-secondary shrink-0 mt-0.5" size={18} />
                          <div className="space-y-1">
                            <p className="font-mono text-[10px] uppercase tracking-wider text-brand-secondary font-bold">General Selected Works Note</p>
                            <p className="text-xs text-brand-secondary/95 leading-relaxed">
                              Evaluate selected works according to the preponderance of evidence. However, if the written evidence is <strong>completely unrelated</strong> to the artworks submitted, the maximum possible overall score is capped at <strong>2</strong>.
                            </p>
                          </div>
                        </div>

                        <div className="border border-ink/10 rounded-3xl overflow-hidden bg-white shadow-md">
                          <div className="bg-ink text-white p-6 grid grid-cols-5 md:grid-cols-5 gap-4 text-center font-mono text-[10px] uppercase tracking-wider font-bold">
                            <div className="text-left font-serif text-lg tracking-normal">Score 1</div>
                            <div className="text-left font-serif text-lg tracking-normal">Score 2</div>
                            <div className="text-left font-serif text-lg tracking-normal">Score 3</div>
                            <div className="text-left font-serif text-lg tracking-normal">Score 4</div>
                            <div className="text-left font-serif text-lg tracking-normal">Score 5</div>
                          </div>

                          <div className="divide-y divide-ink/10">
                            {/* A. WRITTEN EVIDENCE ROW */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
                              <div className="space-y-2 md:col-span-1">
                                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink/40">Written Evidence</span>
                                <p className="text-xs text-ink/70">Written evidence may identify materials, processes, and ideas.</p>
                              </div>
                              <div className="space-y-2 md:col-span-1 border-t md:border-t-0 md:border-l border-ink/5 pt-4 md:pt-0 md:pl-4">
                                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink/40">Written Evidence</span>
                                <p className="text-xs text-ink/70">Written evidence may identify materials, processes, and ideas.</p>
                              </div>
                              <div className="space-y-2 md:col-span-3 border-t md:border-t-0 md:border-l border-ink/5 pt-4 md:pt-0 md:pl-4">
                                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-brand-primary">Written Evidence (Points 3-5)</span>
                                <p className="text-xs text-brand-primary font-medium">Written evidence <strong>identifies</strong> materials, processes, and ideas.</p>
                              </div>
                            </div>

                            {/* B. ART & DESIGN SKILLS */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6 bg-paper/20">
                              <div className="space-y-2">
                                <span className="text-[9px] font-mono font-semibold text-ink/40 uppercase">Skills (level 1)</span>
                                <p className="text-xs font-semibold text-ink">Little to No Evidence</p>
                                <p className="text-[11px] text-ink/65">Visual evidence of 2-D/3-D/Drawing skills is extremely limited.</p>
                              </div>
                              <div className="space-y-2 border-t md:border-t-0 md:border-l border-ink/5 pt-4 md:pt-0 md:pl-4">
                                <span className="text-[9px] font-mono font-semibold text-ink/40 uppercase">Skills (level 2)</span>
                                <p className="text-xs font-semibold text-ink">Rudimentary</p>
                                <p className="text-[11px] text-ink/65">Visual evidence of rudimentary 2-D/3-D/Drawing skills.</p>
                              </div>
                              <div className="space-y-2 border-t md:border-t-0 md:border-l border-ink/5 pt-4 md:pt-0 md:pl-4">
                                <span className="text-[9px] font-mono font-semibold text-ink/40 uppercase">Skills (level 3)</span>
                                <p className="text-xs font-semibold text-ink">Moderate</p>
                                <p className="text-[11px] text-ink/65">Visual evidence exhibits moderate 2-D/3-D/Drawing skills.</p>
                              </div>
                              <div className="space-y-2 border-t md:border-t-0 md:border-l border-ink/5 pt-4 md:pt-0 md:pl-4">
                                <span className="text-[9px] font-mono font-semibold text-brand-primary uppercase">Skills (level 4)</span>
                                <p className="text-xs font-semibold text-brand-primary">Good/Proficient</p>
                                <p className="text-[11px] text-brand-primary/80">Visual evidence highlights good 2-D/3-D/Drawing skills.</p>
                              </div>
                              <div className="space-y-2 border-t md:border-t-0 md:border-l border-ink/5 pt-4 md:pt-0 md:pl-4">
                                <span className="text-[9px] font-mono font-semibold text-brand-primary uppercase">Skills (level 5)</span>
                                <p className="text-xs font-semibold text-brand-primary">Advanced</p>
                                <p className="text-[11px] text-brand-primary/80">Visual evidence exhibits complex, advanced 2-D/3-D/Drawing skills.</p>
                              </div>
                            </div>

                            {/* C. VISUAL RELATIONSHIPS ROW */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
                              <div className="space-y-2">
                                <span className="text-[9px] font-mono font-semibold text-ink/40 uppercase">Relationships</span>
                                <p className="text-xs text-ink/70">Little to no evidence of visual relationships among materials, processes, and ideas.</p>
                              </div>
                              <div className="space-y-2 border-t md:border-t-0 md:border-l border-ink/5 pt-4 md:pt-0 md:pl-4">
                                <span className="text-[9px] font-mono font-semibold text-ink/40 uppercase">Relationships</span>
                                <p className="text-xs text-ink/70">Little to no evidence of visual relationships among materials, processes, and ideas.</p>
                              </div>
                              <div className="space-y-2 border-t md:border-t-0 md:border-l border-ink/5 pt-4 md:pt-0 md:pl-4">
                                <span className="text-[9px] font-mono font-semibold text-ink/40 uppercase">Relationships</span>
                                <p className="text-xs text-ink/70">Visual relationships are <strong>evident but unclear</strong> or inconsistently demonstrated.</p>
                              </div>
                              <div className="space-y-2 border-t md:border-t-0 md:border-l border-ink/5 pt-4 md:pt-0 md:pl-4">
                                <span className="text-[9px] font-mono font-semibold text-brand-primary uppercase">Relationships</span>
                                <p className="text-xs text-brand-primary/95">Visual relationships are clearly <strong>evident</strong>.</p>
                              </div>
                              <div className="space-y-2 border-t md:border-t-0 md:border-l border-ink/5 pt-4 md:pt-0 md:pl-4">
                                <span className="text-[9px] font-mono font-semibold text-brand-primary uppercase">Relationships</span>
                                <p className="text-xs text-brand-primary/95">Visual relationships are clearly <strong>evident and demonstrate synthesis</strong>.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUBTAB 3: AP Art & Design Rubric Terminology */}
                    {rubricSubTab === 'terminology' && (
                      <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white border border-ink/10 rounded-2xl p-4 shadow-sm">
                          <Search size={18} className="text-ink/30 shrink-0 ml-2" />
                          <input 
                            type="text"
                            placeholder="Filter AP rubric terminology (e.g., inquiry, synthesis, revision)..."
                            value={terminologySearch}
                            onChange={(e) => setTerminologySearch(e.target.value)}
                            className="bg-transparent text-sm font-sans w-full focus:outline-none text-ink placeholder-ink/30"
                          />
                          {terminologySearch && (
                            <button onClick={() => setTerminologySearch('')} className="text-xs font-mono font-bold text-brand-primary/60 hover:text-brand-primary px-3 uppercase tracking-wider">
                              Clear
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[
                            { term: '2-D Art and Design Skills', def: 'The application of two-dimensional elements and principles—point, line, shape, plane, layer, form, space, texture, color, value, opacity, transparency, time; unity, variety, rhythm, movement, proportion, scale, balance, emphasis, contrast, repetition, figure/ground relationship, connection, juxtaposition, hierarchy.' },
                            { term: '3-D Art and Design Skills', def: 'The application of three-dimensional elements and principles—point, line, shape, plane, layer, form, volume, mass, occupied/unoccupied space, texture, color, value, opacity, transparency, time; unity, variety, rhythm, movement, proportion, scale, balance, emphasis, contrast, repetition, connection, juxtaposition, hierarchy.' },
                            { term: 'Drawing Skills', def: 'The application of mark-making, line, surface, space, light and shade, composition.' },
                            { term: 'Inquiry', def: 'The intentional process of questioning to guide exploration and discovery over time.' },
                            { term: 'Synthesis', def: 'Coalescence/integration of materials, processes, and ideas.' },
                            { term: 'Sustained Investigation', def: 'An inquiry-based and in-depth study of materials, processes, and ideas over time.' },
                            { term: 'Practice', def: 'The repeated use of materials, processes, and/or ideas.' },
                            { term: 'Processes', def: 'Physical and conceptual activities including applications involved with making works of art and design.' },
                            { term: 'Revision', def: 'To modify, clarify, or reimagine works and ideas.' },
                            { term: 'Development', def: 'The furthering or advancing of an inquiry in a sustained investigation (through in-depth exploration of materials, processes, and ideas).' },
                            { term: 'Selected Works', def: 'Works of art that demonstrate synthesis of materials, processes, and ideas using 2-D/3-D/Drawing skills.' },
                            { term: 'Discovery', def: 'To learn something through the process of making.' },
                            { term: 'Evidence', def: 'To make obvious, seen, or understood.' },
                            { term: 'Visual Relationships', def: 'Connections between the visual components included in a student’s works of art and design.' },
                            { term: 'Written Evidence', def: 'The written components that accompany the student’s works of art and design.' }
                          ]
                          .filter(item => 
                            item.term.toLowerCase().includes(terminologySearch.toLowerCase()) || 
                            item.def.toLowerCase().includes(terminologySearch.toLowerCase())
                          )
                          .map((item, idx) => (
                            <div key={idx} className="brutal-card p-6 bg-white border border-ink/5 hover:border-brand-primary/15 transition-all space-y-2">
                              <h5 className="font-serif text-xl text-brand-primary font-bold">{item.term}</h5>
                              <p className="text-xs text-ink/70 leading-relaxed font-sans">{item.def}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Assessment' && (
                  <div className="space-y-10 animate-in fade-in duration-500 text-left">
                    {/* Header */}
                    <div className="border-b border-ink/5 pb-6">
                      <span className="text-[10px] uppercase font-mono font-bold tracking-[0.4em] text-brand-primary/60 block mb-2">Portfolio Assessment</span>
                      <h3 className="text-4xl font-display font-medium text-ink">Rubric Grading & Critique Companion</h3>
                      <p className="text-sm text-ink/60 mt-2">Evaluate the portfolio's alignment with strict AP standards using self-reflection summaries, instructor rubric grading, and standard-aligned gap analysis.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left and Middle Columns - Rubric & Reflections */}
                      <div className="lg:col-span-2 space-y-8">
                        
                        {/* 1. Student Self-Reflection Summary */}
                        <div className="brutal-card p-8 bg-amber-50/40 border-amber-200/50">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-amber-600 block mb-3">Student Self-Reflection & Summary</span>
                          
                          {portfolioData?.portfolioSubmitted ? (
                            <div className="space-y-6">
                              <div className="flex items-center gap-4 border-b border-ink/5 pb-4">
                                <div className="text-center bg-white border border-amber-200 p-2.5 rounded-2xl">
                                  <span className="block text-2xl font-serif font-black text-amber-700 leading-none">
                                    {portfolioData.selfReflection?.rating || 3}
                                  </span>
                                  <span className="text-[8px] font-mono text-amber-600 uppercase tracking-wider block mt-0.5">Self Score</span>
                                </div>
                                <div>
                                  <h4 className="text-lg font-serif font-bold text-zinc-800">Submitted {portfolioData.portfolioSubmissionStatus === 'on-time' ? 'On-Time' : 'Late'}</h4>
                                  <p className="text-xs text-zinc-500 font-mono">
                                    Date: {new Date(portfolioData.portfolioSubmittedAt).toLocaleDateString()} at {new Date(portfolioData.portfolioSubmittedAt).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="bg-amber-100/30 border border-amber-200/30 p-5 rounded-2xl">
                                  <span className="text-[8px] font-mono text-amber-800 font-black tracking-widest uppercase block mb-2">AI Summary for Teacher</span>
                                  <p className="text-xs text-zinc-700 leading-relaxed italic">
                                    &ldquo;{portfolioData.reflectionSummary || "Reflection summary is currently being compiled..."}&rdquo;
                                  </p>
                                </div>

                                <details className="group border border-ink/5 rounded-2xl bg-white overflow-hidden transition-all duration-300">
                                  <summary className="flex justify-between items-center p-4 cursor-pointer select-none font-mono text-[9px] uppercase tracking-widest font-bold text-ink/60 hover:text-brand-primary">
                                    View Student's Full Responses
                                    <span className="transform group-open:rotate-180 transition-transform">▼</span>
                                  </summary>
                                  <div className="p-5 border-t border-ink/5 bg-zinc-50 space-y-4 text-xs font-sans text-ink">
                                    <div className="space-y-1">
                                      <span className="font-bold text-brand-primary uppercase tracking-wider text-[9px]">Prompt 1: Guiding Inquiry Response</span>
                                      <p className="p-3 bg-white border border-zinc-100 rounded-xl leading-relaxed italic text-zinc-700">
                                        &ldquo;{portfolioData.selfReflection?.inquiryResponse || "N/A"}&rdquo;
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="font-bold text-brand-primary uppercase tracking-wider text-[9px]">Prompt 2: practice, experimentation & revision response</span>
                                      <p className="p-3 bg-white border border-zinc-100 rounded-xl leading-relaxed italic text-zinc-700">
                                        &ldquo;{portfolioData.selfReflection?.experimentResponse || "N/A"}&rdquo;
                                      </p>
                                    </div>
                                    {portfolioData.selfReflection?.generalComments && (
                                      <div className="space-y-1">
                                        <span className="font-bold text-brand-primary uppercase tracking-wider text-[9px]">Open Reflection Comments</span>
                                        <p className="p-3 bg-white border border-zinc-100 rounded-xl leading-relaxed italic text-zinc-700">
                                          &ldquo;{portfolioData.selfReflection.generalComments}&rdquo;
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </details>
                              </div>
                            </div>
                          ) : (
                            <div className="py-6 text-center">
                              <p className="font-serif text-lg text-amber-800">Self-Reflection Pending</p>
                              <p className="text-xs text-amber-600/60 mt-1 max-w-sm mx-auto font-sans leading-relaxed">
                                {user?.role === 'educator' 
                                  ? "The student has not officially finalized and submitted their self-guided reflection yet. They can still be graded below at any time."
                                  : "You haven't submitted your final portfolio reflection sheet yet! Click the orange 'Submit Portfolio' button in the toolbar above to submit on time."
                                }
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 2. Educator Touchpoint Rubric */}
                        <div className="brutal-card p-8 bg-white border border-ink/5">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-brand-primary block mb-6">Instructor Rubric Grading</span>
                          
                          {user?.role === 'educator' ? (
                            <div className="space-y-8">
                              {/* Criterion 1 */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-baseline">
                                  <h4 className="text-md font-serif font-bold text-ink">Criterion 1: Inquiry & Written Evidence</h4>
                                  <span className="text-xs font-mono font-bold text-brand-primary">Score: {teacherRubricScores.criteria1} / 3</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {[1, 2, 3].map((num) => (
                                    <button
                                      key={num}
                                      onClick={() => setTeacherRubricScores({ ...teacherRubricScores, criteria1: num })}
                                      className={`p-3 rounded-xl border text-left transition-all ${
                                        teacherRubricScores.criteria1 === num
                                          ? 'border-brand-primary bg-brand-primary/5 text-ink ring-2 ring-brand-primary/10 font-bold'
                                          : 'border-zinc-200/80 hover:bg-zinc-50 text-zinc-500'
                                      }`}
                                    >
                                      <span className="block font-mono text-[9px] font-black uppercase mb-0.5">Score {num}</span>
                                      <span className="text-[10px] font-sans leading-tight block">
                                        {num === 1 && "Inquiry does not guide or relate to investigation."}
                                        {num === 2 && "Inquiry guides, and evidence identifies components."}
                                        {num === 3 && "Inquiry guides, clearly identifying synthesis of components."}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Criterion 2 */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-baseline">
                                  <h4 className="text-md font-serif font-bold text-ink">Criterion 2: Practice & Growth</h4>
                                  <span className="text-xs font-mono font-bold text-brand-primary">Score: {teacherRubricScores.criteria2} / 3</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {[1, 2, 3].map((num) => (
                                    <button
                                      key={num}
                                      onClick={() => setTeacherRubricScores({ ...teacherRubricScores, criteria2: num })}
                                      className={`p-3 rounded-xl border text-left transition-all ${
                                        teacherRubricScores.criteria2 === num
                                          ? 'border-brand-primary bg-brand-primary/5 text-ink ring-2 ring-brand-primary/10 font-bold'
                                          : 'border-zinc-200/80 hover:bg-zinc-50 text-zinc-500'
                                      }`}
                                    >
                                      <span className="block font-mono text-[9px] font-black uppercase mb-0.5">Score {num}</span>
                                      <span className="text-[10px] font-sans leading-tight block">
                                        {num === 1 && "Little to no practice, testing, or revisions."}
                                        {num === 2 && "Clear evidence of practice, growth, or testing edits."}
                                        {num === 3 && "Interconnected evidence of testing, growth, and practice."}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Criterion 3 */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-baseline">
                                  <h4 className="text-md font-serif font-bold text-ink">Criterion 3: Composition & Synthesis</h4>
                                  <span className="text-xs font-mono font-bold text-brand-primary">Score: {teacherRubricScores.criteria3} / 3</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {[1, 2, 3].map((num) => (
                                    <button
                                      key={num}
                                      onClick={() => setTeacherRubricScores({ ...teacherRubricScores, criteria3: num })}
                                      className={`p-3 rounded-xl border text-left transition-all ${
                                        teacherRubricScores.criteria3 === num
                                          ? 'border-brand-primary bg-brand-primary/5 text-ink ring-2 ring-brand-primary/10 font-bold'
                                          : 'border-zinc-200/80 hover:bg-zinc-50 text-zinc-500'
                                      }`}
                                    >
                                      <span className="block font-mono text-[9px] font-black uppercase mb-0.5">Score {num}</span>
                                      <span className="text-[10px] font-sans leading-tight block">
                                        {num === 1 && "Materials/ideas are loose or lack clear relation."}
                                        {num === 2 && "Materials and ideas are related but not integrated."}
                                        {num === 3 && "Perfect structural synthesis of materials, processes, and ideas."}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Critique Feedback */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold text-ink/50 uppercase tracking-widest block font-bold">Written Instructor Evaluation Critique</label>
                                <textarea
                                  rows={5}
                                  value={teacherFeedbackText}
                                  onChange={e => setTeacherFeedbackText(e.target.value)}
                                  placeholder="Type your qualitative feedback here to sync with the student portfolio..."
                                  className="w-full p-4 border border-ink/10 rounded-xl bg-white font-sans text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all resize-none"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={async () => {
                                  if (!activeClass || !selectedStudent) return;
                                  setIsSavingTeacherGrade(true);
                                  try {
                                    await storageService.saveTeacherGrade(activeClass.id, selectedStudent.uid, {
                                      rubricScores: teacherRubricScores,
                                      feedbackText: teacherFeedbackText,
                                      gradedAt: Date.now()
                                    });
                                    // Trigger reload to sync up
                                    await loadArtworks(activeClass.id, selectedStudent.uid);
                                    alert("Grade posted and synchronized successfully!");
                                  } catch (err) {
                                    console.error("Save Teacher Grade failed:", err);
                                  } finally {
                                    setIsSavingTeacherGrade(false);
                                  }
                                }}
                                disabled={isSavingTeacherGrade}
                                className="w-full py-4 bg-ink text-white font-mono text-[10px] uppercase font-bold tracking-widest rounded-full hover:bg-brand-primary active:scale-[0.99] transition-all disabled:opacity-45"
                              >
                                {isSavingTeacherGrade ? "Saving Grade..." : "Save & Post Evaluation Rubrics"}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {portfolioData?.teacherGrade ? (
                                <div className="space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-ink/5 pb-6">
                                    <div className="p-4 bg-zinc-50 rounded-2xl border text-center">
                                      <span className="block text-2xl font-serif font-black text-brand-primary leading-none">
                                        {portfolioData.teacherGrade.rubricScores?.criteria1 || 3} / 3
                                      </span>
                                      <span className="text-[8px] font-mono text-ink/40 uppercase tracking-wider mt-1 block">Inquiry score</span>
                                    </div>
                                    <div className="p-4 bg-zinc-50 rounded-2xl border text-center">
                                      <span className="block text-2xl font-serif font-black text-brand-primary leading-none">
                                        {portfolioData.teacherGrade.rubricScores?.criteria2 || 3} / 3
                                      </span>
                                      <span className="text-[8px] font-mono text-ink/40 uppercase tracking-wider mt-1 block">practice score</span>
                                    </div>
                                    <div className="p-4 bg-zinc-50 rounded-2xl border text-center">
                                      <span className="block text-2xl font-serif font-black text-brand-primary leading-none">
                                        {portfolioData.teacherGrade.rubricScores?.criteria3 || 3} / 3
                                      </span>
                                      <span className="text-[8px] font-mono text-ink/40 uppercase tracking-wider mt-1 block">synthesis score</span>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink/40">Instructor Grading Comments</span>
                                    <p className="p-5 bg-zinc-50 tracking-wide leading-relaxed text-zinc-700 rounded-2xl border text-xs font-sans italic">
                                      &ldquo;{portfolioData.teacherGrade.feedbackText || "No qualitative comments attached."}&rdquo;
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-8 text-center bg-zinc-50 rounded-3xl border text-zinc-500">
                                  <p className="font-serif text-lg">Evaluation Pending</p>
                                  <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
                                    Your studio instructor has not scored or commented on this final portfolio yet. Once posted, details will appear here.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column - AP Critique Companion */}
                      <div className="space-y-6">
                        <div className="brutal-card p-6 md:p-8 bg-zinc-950 text-white rounded-[32px] space-y-6 relative overflow-hidden shadow-2xl border-none">
                          {/* Ambient Visual Backing */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
                          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white">
                              <Sparkles size={18} />
                            </div>
                            <div>
                              <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-brand-primary">College Board Companion</span>
                              <h4 className="text-lg font-serif font-bold tracking-tight">AP Critique Companion</h4>
                            </div>
                          </div>

                          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                            Review alignment of the portfolio's visual and written evidence against official AP standards. This highlights gaps or alignment blindspots to assist the instructor with feedback and class critique sessions.
                          </p>

                          {user?.role === 'educator' && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!activeClass || !selectedStudent) return;
                                setIsRunningAiJudge(true);
                                try {
                                  const response = await fetch('/api/ai-judge', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      writtenEvidence,
                                      artworks,
                                      teacherFeedbackText: teacherFeedbackText || "None provided yet."
                                    })
                                  });
                                  if (response.ok) {
                                    const result = await response.json();
                                    await storageService.saveAiJudgeData(activeClass.id, selectedStudent.uid, result.aiJudgeResult);
                                    await loadArtworks(activeClass.id, selectedStudent.uid);
                                    alert("Critique Companion analysis completed successfully!");
                                  } else {
                                    alert("Analysis endpoint error. See logs.");
                                  }
                                } catch (e) {
                                  console.error("AP Critique Companion call failed:", e);
                                  alert("AP Companion server communication failed. Try again.");
                                } finally {
                                  setIsRunningAiJudge(false);
                                }
                              }}
                              disabled={isRunningAiJudge || artworks.length === 0}
                              className="w-full py-3.5 bg-brand-primary font-mono text-[9px] uppercase font-bold tracking-wider hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale text-white rounded-full flex items-center justify-center gap-2 cursor-pointer"
                            >
                              {isRunningAiJudge ? (
                                <>Reviewing Portfolio...</>
                              ) : (
                                <>
                                  <Wand2 size={12} /> Generate Alignment Critique
                                </>
                              )}
                            </button>
                          )}

                          {portfolioData?.aiJudgeResult ? (
                            <div className="space-y-6 pt-4 border-t border-white/5 animate-in fade-in duration-500">
                              <div className="space-y-4 text-xs font-sans leading-relaxed text-zinc-300">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                                  <span className="text-[8px] font-mono text-brand-primary uppercase tracking-widest font-bold block">AP Rubric Critique Highlights</span>
                                  <p className="italic text-zinc-300">
                                    &ldquo;{portfolioData.aiJudgeResult.overallFeedback}&rdquo;
                                  </p>
                                </div>

                                <div className="p-4 bg-brand-primary/10 rounded-2xl border border-brand-primary/20 space-y-2">
                                  <span className="text-[8px] font-mono text-brand-primary uppercase tracking-widest font-bold block">🚨 Feedback Alignment & Gap Analysis</span>
                                  <p className="text-zinc-300 text-xs">
                                    {portfolioData.aiJudgeResult.gapAnalysis || "Evaluated items are fully aligned!"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 border border-white/5 bg-white/5 rounded-3xl animate-pulse">
                              <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">AP Analysis Pending</p>
                              <p className="text-[10px] text-zinc-600 mt-2 max-w-xs mx-auto leading-relaxed">
                                {user?.role === 'educator' 
                                  ? "Click the button above to generate a standard-aligned AP Critique Companion analysis of this student's inquiry, processes, and synthesis."
                                  : "Once your instructor generates the AP Critique Companion assessment, the critique highlights and gap analysis will appear here."
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    )}

        {/* New Class Modal */}
        <AnimatePresence>
          {classIdToDelete && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-ink/90 backdrop-blur-md"
              onClick={() => setClassIdToDelete(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="brutal-card bg-paper p-12 max-w-md w-full border-t-4 border-red-500 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-4xl editorial-title text-red-500">Delete Classroom</h2>
                  <button onClick={() => setClassIdToDelete(null)} className="opacity-20 hover:opacity-100 transition-opacity font-bold">✕</button>
                </div>
                <div className="space-y-6">
                  <p className="text-sm text-ink/70 leading-relaxed font-sans">
                    Are you sure you want to delete <strong className="text-ink font-bold">&ldquo;{classes.find(c => c.id === classIdToDelete)?.name || 'this class'}&rdquo;</strong>?
                  </p>
                  <p className="text-xs text-ink/50 italic leading-relaxed">
                    This action is permanent and cannot be undone. All students and student-artworks enrolled inside this workspace will lose active connection immediately.
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <button 
                      onClick={() => setClassIdToDelete(null)}
                      className="font-mono text-[10px] uppercase tracking-widest py-4 border border-ink/10 text-ink/60 hover:text-ink hover:bg-ink/5 rounded-lg font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={confirmDeleteClass}
                      className="font-mono text-[10px] uppercase tracking-widest py-4 bg-red-500 text-white hover:bg-red-600 rounded-lg font-bold transition-all shadow-md cursor-pointer"
                      id="confirm-delete-class-btn"
                    >
                      Delete Class
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showJoinClassModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-ink/90 backdrop-blur-md"
              onClick={() => setShowJoinClassModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="brutal-card bg-paper p-16 max-w-md w-full border-t-4 border-brand-primary"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-4xl editorial-title text-brand-primary">Join Studio</h2>
                  <button onClick={() => setShowJoinClassModal(false)} className="opacity-20 hover:opacity-100 transition-opacity">✕</button>
                </div>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-ink/60">Enter 6-Digit Class Code</label>
                    <input 
                      type="text" 
                      maxLength={6}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="w-full text-4xl font-mono tracking-[0.5em] text-center border-b-2 border-ink/20 focus:border-brand-primary focus:outline-none pb-4 uppercase"
                      placeholder="XXXXXX"
                    />
                  </div>
                  <button 
                    onClick={handleJoinClass}
                    className="art-btn-primary w-full py-5 text-xs font-bold uppercase tracking-widest"
                  >
                    Enroll in Class
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showSubmitReflectionModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-ink/95 backdrop-blur-sm overflow-y-auto"
              onClick={() => setShowSubmitReflectionModal(false)}
            >
              <motion.div 
                initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
                className="brutal-card bg-paper p-8 md:p-12 max-w-2xl w-full border-t-4 border-brand-primary shadow-2xl my-8 text-left"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-brand-primary">Self-Guided Reflection & Submit</span>
                    <h2 className="text-3xl font-display font-bold text-ink tracking-tight mt-1">Finalize Portfolio</h2>
                  </div>
                  <button onClick={() => setShowSubmitReflectionModal(false)} className="opacity-40 hover:opacity-100 transition-opacity p-2 text-xl">✕</button>
                </div>

                <div className="space-y-6">
                  {/* Rating */}
                  <div>
                    <label className="text-[10px] font-mono font-bold text-ink/50 uppercase tracking-widest mb-1.5 block">
                      Self-Guided Rubric Score (How strongly did your work connect materials, processes, and ideas?)
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setReflectionForm({ ...reflectionForm, rating: num })}
                          className={`w-12 h-12 rounded-xl border font-bold text-sm transition-all flex items-center justify-center ${
                            reflectionForm.rating === num
                              ? 'bg-brand-primary text-white border-brand-primary shadow-md'
                              : 'bg-white text-ink/60 border-ink/10 hover:border-brand-primary hover:text-brand-primary'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inquiry Prompt */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[10px] font-mono font-bold text-ink/50 uppercase tracking-widest">
                        Prompt 1: Guiding Inquiry
                      </label>
                      <span className={`text-[9px] font-mono font-bold ${
                        reflectionForm.inquiryText.length > 550 ? 'text-red-500' : 'text-zinc-400'
                      }`}>
                        {reflectionForm.inquiryText.length} / 600
                      </span>
                    </div>
                    <p className="text-[10px] font-sans text-ink/50 leading-tight">
                      Identify the inquiry that guided your sustained investigation. (Explain the question, idea, or exploration driving the work.)
                    </p>
                    <textarea
                      maxLength={600}
                      rows={4}
                      value={reflectionForm.inquiryText}
                      onChange={e => setReflectionForm({ ...reflectionForm, inquiryText: e.target.value })}
                      placeholder="e.g., I investigated how distorted self-portraits can show the difference between how I see myself and how others expect me to appear."
                      className="w-full p-4 border border-ink/10 rounded-xl bg-white font-sans text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all resize-none"
                    />
                  </div>

                  {/* Practice Prompt */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[10px] font-mono font-bold text-ink/50 uppercase tracking-widest">
                        Prompt 2: Practice, Experimentation, & Revision
                      </label>
                      <span className={`text-[9px] font-mono font-bold ${
                        reflectionForm.experimentText.length > 550 ? 'text-red-500' : 'text-zinc-400'
                      }`}>
                        {reflectionForm.experimentText.length} / 600
                      </span>
                    </div>
                    <p className="text-[10px] font-sans text-ink/50 leading-tight">
                      Describe how your sustained investigation shows evidence of practice, experimentation, and revision guided by your inquiry.
                    </p>
                    <textarea
                      maxLength={600}
                      rows={4}
                      value={reflectionForm.experimentText}
                      onChange={e => setReflectionForm({ ...reflectionForm, experimentText: e.target.value })}
                      placeholder="e.g., I began with direct self-portraits, then experimented with layered reflections, double exposures, and color distortion using acrylic glazes to symbolize cognitive dissonance..."
                      className="w-full p-4 border border-ink/10 rounded-xl bg-white font-sans text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all resize-none"
                    />
                  </div>

                  {/* General Reflection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-ink/50 uppercase tracking-widest block">
                      Additional Reflections & Lessons (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={reflectionForm.generalText}
                      onChange={e => setReflectionForm({ ...reflectionForm, generalText: e.target.value })}
                      placeholder="What roadblocks did you hit? What did you leave behind?"
                      className="w-full p-4 border border-ink/10 rounded-xl bg-white font-sans text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all resize-none"
                    />
                  </div>

                  {/* Security/Deployment Notes */}
                  <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1">
                    <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                      <AlertCircle size={10} /> Data Integrity & Security
                    </p>
                    <p className="text-[10px] font-sans text-zinc-500 leading-normal">
                      Submitting locks your portfolio and triggers artificial AP assessment compilation in addition to teacher grading sync. Ensure your materials, processes, and written logs are fully complete before submitting.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowSubmitReflectionModal(false)}
                      className="flex-1 py-4 font-mono text-[10px] uppercase font-bold tracking-widest border border-ink/10 hover:bg-ink/5 rounded-full transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handlePortfolioSubmit}
                      disabled={isSubmittingReflection || !reflectionForm.inquiryText.trim() || !reflectionForm.experimentText.trim()}
                      className="flex-1 py-4 font-mono text-[10px] uppercase font-bold tracking-widest bg-brand-primary hover:brightness-105 active:scale-[0.99] disabled:opacity-40 disabled:grayscale text-white rounded-full transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmittingReflection ? (
                        <>Processing Reflection...</>
                      ) : (
                        <>Complete Submission</>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showNewClassModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-ink/90 backdrop-blur-md"
              onClick={() => setShowNewClassModal(false)}
            >
              <motion.div 
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="brutal-card bg-paper p-16 max-w-xl w-full border-t-4 border-brand-primary shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-5xl editorial-title text-brand-primary tracking-tight">Studio Setup</h2>
                  <button onClick={() => setShowNewClassModal(false)} className="opacity-20 hover:opacity-100 transition-opacity">✕</button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-widest">Teacher Name</label>
                    <input 
                      type="text"
                      className="w-full text-2xl font-display font-medium border-b-2 border-ink/10 focus:border-brand-primary focus:outline-none pb-2 bg-transparent"
                      placeholder="e.g. Ms. Pechnik"
                      value={newClassData.teacherName}
                      onChange={e => setNewClassData({...newClassData, teacherName: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-widest">AP Course Type</label>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                      {apCourses.map(type => (
                        <button
                          key={type.id}
                          onClick={() => setNewClassData({...newClassData, courseType: type.id as any})}
                          className={`text-left p-4 rounded-xl border-2 transition-all ${newClassData.courseType === type.id ? 'border-brand-primary bg-brand-primary/5 text-brand-primary font-bold' : 'border-ink/5 hover:border-ink/20'}`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-widest">Academic Year</label>
                    <select 
                      className="w-full text-lg font-mono border-b-2 border-ink/10 focus:border-brand-primary focus:outline-none pb-2 bg-transparent appearance-none cursor-pointer"
                      value={newClassData.academicYear}
                      onChange={e => setNewClassData({...newClassData, academicYear: e.target.value})}
                    >
                      {academicYears.map(year => (
                        <option key={year} value={year} className="bg-paper">{year}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={handleCreateClass}
                    className="art-btn-primary w-full py-4 mt-4 font-bold disabled:opacity-50 disabled:grayscale"
                    disabled={!newClassData.teacherName}
                  >
                    Create Class
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Feedback Overlay removed */}
        
        {/* Guide Modal (Already handled inside SI view but can be global) */}
        <AnimatePresence>
          {showWrittenEvidenceGuide && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-ink/90 backdrop-blur-md"
              onClick={() => setShowWrittenEvidenceGuide(false)}
            >
              <motion.div 
                initial={{ y: 20 }} animate={{ y: 0 }}
                className="brutal-card bg-paper p-12 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-10 border-b-2 border-brand-primary pb-6">
                  <div>
                    <h2 className="text-4xl editorial-title text-brand-primary">Writing Guide: Sustained Investigation</h2>
                    <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest mt-2">Written Evidence Best Practices</p>
                  </div>
                  <button onClick={() => setShowWrittenEvidenceGuide(false)} className="w-12 h-12 rounded-full border border-ink/10 flex items-center justify-center hover:bg-ink hover:text-white transition-all text-xl">✕</button>
                </div>

                <div className="prose prose-sm max-w-none space-y-10 text-ink">
                  <p className="text-lg leading-relaxed font-display text-ink/70">
                    Along with uploading images of your work, you’ll write and submit answers to prompts about your work and your creative process.
                  </p>

                  <div className="space-y-8">
                    <div className="flex gap-6">
                      <div className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center font-mono font-bold shrink-0">1</div>
                      <div className="space-y-2">
                        <h4 className="font-bold uppercase tracking-widest text-sm">Open the Written Evidence tab</h4>
                        <p className="text-xs opacity-70 leading-relaxed">While you’re in the Sustained Investigation section, open the Written Evidence tab to access your responses.</p>
                      </div>
                    </div>

                    <div className="flex gap-6">
                      <div className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center font-mono font-bold shrink-0">2</div>
                      <div className="space-y-4">
                        <h4 className="font-bold uppercase tracking-widest text-sm">Respond to the two prompts</h4>
                        <ul className="space-y-3 text-xs opacity-80 list-disc pl-4 italic">
                          <li>Identify the inquiry that guided your sustained investigation.</li>
                          <li>Describe ways your sustained investigation developed through practice, experimentation, and revision.</li>
                        </ul>
                        <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Character Limit</p>
                          <p className="text-xs mt-1">Your written evidence is limited to <span className="font-bold">600 characters</span> per response, including spaces.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-6">
                      <div className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center font-mono font-bold shrink-0">3</div>
                      <div className="space-y-2">
                        <h4 className="font-bold uppercase tracking-widest text-sm">Saving Your Work</h4>
                        <p className="text-xs opacity-70 leading-relaxed">
                          Your progress is currently being saved to local storage. When you submit officially, remember that the College Board site does NOT auto-save.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-6">
                      <div className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center font-mono font-bold shrink-0">4</div>
                      <div className="space-y-2">
                        <h4 className="font-bold uppercase tracking-widest text-sm">Incremental Editing</h4>
                        <p className="text-xs opacity-70 leading-relaxed">
                          You can edit your responses any time before you submit this portfolio component as final. Use this studio to draft and refine your text as your visual work evolves.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-ink/5 flex justify-end">
                  <button 
                    onClick={() => setShowWrittenEvidenceGuide(false)}
                    className="art-btn-primary px-8 py-3 text-xs uppercase font-bold tracking-widest"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showSelectedWorksGuide && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-ink/90 backdrop-blur-md"
              onClick={() => setShowSelectedWorksGuide(false)}
            >
              <motion.div 
                initial={{ y: 20 }} animate={{ y: 0 }}
                className="brutal-card bg-paper p-12 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-12 border-b-2 border-brand-primary pb-6">
                  <div>
                    <h2 className="text-5xl editorial-title text-brand-primary">Selected Works Overview</h2>
                    <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest mt-2">Section Score: 40% of Total Portfolio</p>
                  </div>
                  <button onClick={() => setShowSelectedWorksGuide(false)} className="w-12 h-12 rounded-full border border-ink/10 flex items-center justify-center hover:bg-ink hover:text-white transition-all text-xl">✕</button>
                </div>

                <div className="prose prose-sm max-w-none space-y-12 text-ink">
                  <section className="space-y-6">
                    <p className="text-lg leading-relaxed font-display text-ink/70">
                      The Selected Works section of your portfolio exam should feature five artworks that best demonstrate skillful synthesis of materials, processes, and ideas. <span className="font-bold text-brand-primary">This section is 40% of your exam score.</span>
                    </p>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-8 bg-brand-primary/5 rounded-[32px] border border-brand-primary/10">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4">2-D & Drawing</h4>
                      <p className="text-xs opacity-70">Submit <span className="font-bold text-ink">five digital images</span> of five distinct artworks.</p>
                    </div>
                    <div className="p-8 bg-brand-primary/5 rounded-[32px] border border-brand-primary/10">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4">3-D Art & Design</h4>
                      <p className="text-xs opacity-70">Submit <span className="font-bold text-ink">ten digital images</span> of five artworks (two views of each work).</p>
                    </div>
                    <div className="p-8 bg-ink text-white rounded-[32px]">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-70">Core Goal</h4>
                      <p className="text-xs opacity-90 leading-relaxed">Synthesis of materials, processes, and ideas. There is no preferred style or content.</p>
                    </div>
                  </div>

                  <section className="space-y-6 pt-12 border-t border-ink/5">
                    <h3 className="text-xs font-mono bg-ink text-white px-4 py-2 rounded-full w-fit uppercase tracking-widest">Submission Guidelines</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-4">
                        <ul className="space-y-3 text-xs opacity-70 list-disc pl-4">
                          <li>Works may be related, unrelated, or a combination.</li>
                          <li>Selected Works may be used in SI section, but they don't have to be.</li>
                          <li>Identify materials, processes, and visually evident ideas for each work.</li>
                          <li>Strongest responses describe materials/processes in DIRECT relation to the work.</li>
                        </ul>
                      </div>
                      <div className="bg-paper border border-ink/10 p-8 rounded-3xl">
                        <h5 className="font-bold text-[10px] uppercase tracking-widest mb-4 text-brand-primary">Acceptable Symbols</h5>
                        <div className="font-mono text-xs opacity-60 flex flex-wrap gap-2">
                          {", . ? ! _ - ` ~ @ # $ % ^ & * ( ) + = / \\ | < > : ; \" ' [ ] { }".split(" ").map(s => <span key={s} className="bg-ink/5 px-2 py-1 rounded">{s}</span>)}
                        </div>
                        <p className="text-[10px] mt-4 opacity-40 italic">Do not use other special characters or symbols.</p>
                      </div>
                    </div>
                  </section>

                  <div className="p-8 bg-brand-primary/5 rounded-[40px] flex items-start gap-6">
                    <CheckCircle2 size={32} className="text-brand-primary shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold uppercase tracking-widest text-sm mb-2">Clarity is Key</h4>
                      <p className="text-xs opacity-70 leading-relaxed font-display">
                        While grammar isn't evaluated, your responses must be written clearly. Avoid extreme "text speak." Mention digital tools and include citations where applicable.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-ink/5 flex justify-end">
                  <button 
                    onClick={() => setShowSelectedWorksGuide(false)}
                    className="art-btn-primary px-8 py-3 text-xs uppercase font-bold tracking-widest"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showSubmissionGuide && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-ink/90 backdrop-blur-md"
              onClick={() => setShowSubmissionGuide(false)}
            >
              <motion.div 
                initial={{ y: 20 }} animate={{ y: 0 }}
                className="brutal-card bg-paper p-12 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-12 border-b border-ink/10 pb-6">
                  <div>
                    <h2 className="text-5xl editorial-title text-brand-primary">Official Exam Process</h2>
                    <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest mt-2">College Board Submission Requirements</p>
                  </div>
                  <button onClick={() => setShowSubmissionGuide(false)} className="w-10 h-10 rounded-full border border-ink/10 flex items-center justify-center hover:bg-ink hover:text-white transition-all">✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-xs font-mono bg-ink text-white px-3 py-1 rounded w-fit uppercase tracking-widest mb-4">1. Access & Login</h3>
                      <div className="space-y-4 text-sm opacity-70">
                        <p>Access your portfolio at: <a href="https://digitalportfolio.collegeboard.org" target="_blank" className="text-brand-primary underline">digitalportfolio.collegeboard.org</a></p>
                        <p>Select <strong>Student</strong> and enter your College Board login (same as My AP).</p>
                        <p>Select your course (2-D, 3-D, or Drawing).</p>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-mono bg-ink text-white px-3 py-1 rounded w-fit uppercase tracking-widest mb-4">2. Integrity Agreement</h3>
                      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-2xl text-xs space-y-3 italic">
                        <p>"Work must entirely be your original creation and reflect your own unique vision."</p>
                        <p>Attribute all pre-existing material in your responses and written evidence.</p>
                        <p className="font-bold text-red-600 uppercase">The use of AI tools is categorically prohibited at any stage of the creative process.</p>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-8">
                    <section>
                      <h3 className="text-xs font-mono bg-ink text-white px-3 py-1 rounded w-fit uppercase tracking-widest mb-4">3. Portfolio Components</h3>
                      <div className="space-y-6">
                        <div className="border-l-2 border-brand-primary pl-4">
                          <h4 className="font-bold text-xs uppercase mb-1">SI Images (15 Max)</h4>
                          <ul className="text-[11px] opacity-60 space-y-1">
                            <li>• Materials: 100 characters max</li>
                            <li>• Processes: 100 characters max</li>
                            <li>• Dimensions: (H x W x D)</li>
                            <li>• Citation: 100 characters max</li>
                          </ul>
                        </div>
                        <div className="border-l-2 border-brand-primary pl-4">
                          <h4 className="font-bold text-xs uppercase mb-1">Written Evidence</h4>
                          <p className="text-[11px] opacity-60">Two prompts, 600 characters each max.</p>
                        </div>
                      </div>
                    </section>

                    <section className="bg-ink text-white p-6 rounded-3xl">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle size={20} className="text-brand-primary" />
                        <h4 className="font-bold uppercase tracking-widest text-xs">Crucial Warning</h4>
                      </div>
                      <p className="text-xs opacity-80 leading-relaxed font-mono">
                        "Remember to SAVE every 15 minutes! The official website will NOT save automatically. It will time out and you will have to start over."
                      </p>
                    </section>
                  </div>
                </div>

                <div className="mt-12 pt-12 border-t border-ink/5 text-center">
                  <p className="text-[10px] font-mono opacity-30 uppercase">Finalize by Monday, 5/4 @ 3:00 PM</p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showGuide && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-ink/90 backdrop-blur-md"
              onClick={() => setShowGuide(false)}
            >
              <motion.div 
                initial={{ y: 20 }} animate={{ y: 0 }}
                className="brutal-card bg-paper p-12 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-12 border-b-2 border-brand-primary pb-6">
                  <div>
                    <h2 className="text-5xl editorial-title text-brand-primary">Sustained Investigation</h2>
                    <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest mt-2">60% of AP Score • Portfolio Guide</p>
                  </div>
                  <button onClick={() => setShowGuide(false)} className="w-12 h-12 rounded-full border border-ink/10 flex items-center justify-center hover:bg-ink hover:text-white transition-all text-xl">✕</button>
                </div>

                <div className="prose prose-sm max-w-none space-y-12 text-ink font-sans">
                  <section className="space-y-6">
                    <p className="text-lg leading-relaxed font-display text-ink/70">
                      Submit <strong className="text-brand-primary">15 images</strong> showing a connected investigation over time. Your images can include fully finished work, process images, sketches, experiments, plans, or revisions.
                    </p>
                    <div className="p-6 bg-brand-primary/5 rounded-[24px] border border-brand-primary/10 space-y-2">
                      <p className="text-xs font-mono uppercase tracking-wider font-bold text-brand-primary">Your work must show evidence of:</p>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-ink/80">
                        <li className="flex items-center gap-2">✦ A guiding inquiry driving all artistic choices</li>
                        <li className="flex items-center gap-2">✦ Ongoing practice and experimentation</li>
                        <li className="flex items-center gap-2">✦ Purposeful revision and growth over time</li>
                        <li className="flex items-center gap-2">✦ Strong synthesis of materials, processes, and ideas</li>
                      </ul>
                    </div>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                    {/* Sustained Investigation Image Fields */}
                    <section className="space-y-6">
                      <h3 className="text-xs font-mono bg-ink text-white px-4 py-2 rounded-full w-fit uppercase tracking-widest">SI Image Requirements</h3>
                      <div className="space-y-4">
                        <p className="text-xs text-ink/70">For each of the 15 images, you must specify:</p>
                        <ul className="space-y-3 text-xs">
                          <li><strong className="text-brand-primary">Materials used</strong> — <span className="opacity-60 text-[10px]">100 characters max</span></li>
                          <li><strong className="text-brand-primary">Processes used</strong> — <span className="opacity-60 text-[10px]">100 characters max</span></li>
                          <li><strong className="text-brand-primary">Digital tools</strong> — <span className="opacity-60 text-[10px]">100 characters max, if any (e.g., Photoshop, Procreate)</span></li>
                          <li><strong className="text-brand-primary">Size</strong> — <span className="opacity-60 text-[10px]">Dimensions (height x width in inches)</span></li>
                          <li><strong className="text-brand-primary">Image citation</strong> — <span className="opacity-60 text-[10px]">100 characters max, if reference is used</span></li>
                        </ul>
                      </div>
                    </section>

                    {/* Written Evidence prompts */}
                    <section className="space-y-6">
                      <h3 className="text-xs font-mono bg-ink text-white px-4 py-2 rounded-full w-fit uppercase tracking-widest">Written Evidence Prompts</h3>
                      <div className="space-y-6">
                        <div className="p-4 bg-paper border border-ink/10 rounded-2xl space-y-2">
                          <p className="text-xs font-mono uppercase tracking-wider text-brand-primary font-bold">1. Inquiry Question <span className="text-ink/40 font-normal">(600 max)</span></p>
                          <p className="text-xs font-medium text-ink/80 leading-relaxed italic">"Identify the inquiry that guided your sustained investigation."</p>
                          <p className="text-[11px] text-ink/50 leading-relaxed">This should explain the question, idea, or investigation driving the work. It should not be a single topic like "identity" or "nature." It must represent an actual exploration.</p>
                        </div>
                        
                        <div className="p-4 bg-paper border border-ink/10 rounded-2xl space-y-2">
                          <p className="text-xs font-mono uppercase tracking-wider text-brand-primary font-bold">2. Process Development <span className="text-ink/40 font-normal">(600 max)</span></p>
                          <p className="text-xs font-medium text-ink/80 leading-relaxed italic">"Describe how your work developed through practice, experimentation, and revision."</p>
                          <p className="text-[11px] text-ink/50 leading-relaxed">Describe progress over time, mentioning specific things tried, repeated, revised, abandoned, or refined.</p>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Processes Writing Block */}
                  <section className="pt-8 border-t border-ink/5 space-y-6">
                    <h3 className="text-xs font-mono bg-ink text-white px-4 py-2 rounded-full w-fit uppercase tracking-widest">Writing the "Processes Used" Section</h3>
                    <p className="text-sm text-ink/70 leading-relaxed">
                      With a strict <strong className="text-brand-primary">100-character limit</strong>, write short and highly specific descriptions focusing precisely on actions taken. Describe how decisions developed or visually integrated.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                      <div className="space-y-3">
                        <h4 className="text-xs font-mono text-brand-primary uppercase font-bold tracking-wider">Good Process Examples:</h4>
                        <ul className="space-y-2 text-xs font-mono text-ink/80 pl-2">
                          <li>• "Layered acrylic, revised composition, added contrast"</li>
                          <li>• "Shot 35mm film, developed negatives, darkroom printed"</li>
                          <li>• "Sketched thumbnails, tested color palettes, refined final design"</li>
                          <li>• "Cropped image, adjusted contrast, layered digital textures"</li>
                          <li>• "Built collage, scanned pieces, rearranged composition"</li>
                          <li>• "Tested lighting, reshot portrait, edited in Photoshop"</li>
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-mono text-indigo-600 uppercase font-bold tracking-wider">Action Words to Include:</h4>
                        <p className="text-xs leading-relaxed text-ink/70">
                          Integrate active physical verbs to show deliberate artistic hand and choices:
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {['sketched', 'layered', 'printed', 'revised', 'cropped', 'tested', 'developed', 'arranged', 'painted', 'scanned', 'edited', 'refined'].map(word => (
                            <span key={word} className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md border border-indigo-100">{word}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Anti AI Integrity */}
                  <div className="p-8 bg-paper border-2 border-ink rounded-[32px] flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left shadow-sm">
                    <AlertCircle size={40} className="text-brand-primary shrink-0" />
                    <div>
                      <h4 className="font-bold uppercase tracking-widest text-xs mb-1">Portfolio Integrity Rule</h4>
                      <p className="text-xs opacity-70 leading-relaxed font-sans">
                        Photoshop filters and digital tools are fully allowed to clean, crop, or process your physical documentation photos or digital artwork. However, <span className="font-bold text-red-600">AI-generated work is strictly prohibited</span> and will result in score invalidation. Cite any external sources you reference.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-ink/5 flex justify-between items-center">
                  <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest italic">Sustained Investigation • Classroom Companion</p>
                  <button 
                    onClick={() => setShowGuide(false)}
                    className="art-btn-primary px-8 py-3.5 text-xs uppercase font-bold tracking-wider flex items-center gap-2"
                  >
                    <span>Got it</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Portfolio Piece Edit Modal */}
      <AnimatePresence>
        {selectedArtworkId && (() => {
          const activeArtwork = artworks.find(a => a.id === selectedArtworkId);
          if (!activeArtwork) return null;

          const filteredArtworks = artworks.filter(a => a.type === activeArtwork.type);
          const currentArtIdx = filteredArtworks.findIndex(a => a.id === selectedArtworkId);
          const hasPrev = currentArtIdx > 0;
          const hasNext = currentArtIdx < filteredArtworks.length - 1;

          const handlePrev = async () => {
            if (hasPrev) {
              await flushArtworkSave();
              setSelectedArtworkId(filteredArtworks[currentArtIdx - 1].id);
              setActiveHelperArtId(null);
            }
          };

          const handleNext = async () => {
            if (hasNext) {
              await flushArtworkSave();
              setSelectedArtworkId(filteredArtworks[currentArtIdx + 1].id);
              setActiveHelperArtId(null);
            }
          };

          return (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/75 backdrop-blur-md z-[500] flex items-center justify-center p-4 md:p-8 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative bg-white text-ink border-2 border-ink rounded-[40px] w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[85vh]"
              >
                {/* Image & Navigation Column */}
                <div className="w-full md:w-1/2 bg-gray-50 flex flex-col justify-between p-4 md:p-8 border-b md:border-b-0 md:border-r border-ink/10 h-auto md:h-full relative select-none shrink-0">
                  <div className="flex-1 flex items-center justify-center relative overflow-hidden rounded-2xl bg-paper border border-ink/5 p-4 min-h-[200px] md:min-h-[450px]">
                    <img 
                      src={activeArtwork.imageUrl} 
                      alt={activeArtwork.title || 'Untitled Piece'} 
                      referrerPolicy="no-referrer"
                      className="max-w-full max-h-[35vh] md:max-h-[60vh] object-contain rounded-lg shadow-md" 
                    />

                    {/* Download Floating Button */}
                    <button
                      onClick={() => downloadArtworkImage(activeArtwork)}
                      className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-ink border border-ink/10 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all z-20 text-[10px] font-mono font-bold uppercase tracking-wider"
                      title="Download image"
                    >
                      <Download size={12} className="text-brand-primary" />
                      <span>Download Image</span>
                    </button>

                    {/* Navigation Arrows Floating Over Image Area */}
                    {hasPrev && (
                      <button 
                        onClick={handlePrev} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-ink border border-ink/10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all z-20"
                        title="Previous Piece"
                      >
                        <ChevronLeft size={24} />
                      </button>
                    )}
                    {hasNext && (
                      <button 
                        onClick={handleNext} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-ink border border-ink/10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all z-20"
                        title="Next Piece"
                      >
                        <ChevronRight size={24} />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-brand-primary">
                      {activeArtwork.type === 'SI' ? 'Sustained Investigation' : 'Selected Work'} #{currentArtIdx + 1 < 10 ? `0${currentArtIdx + 1}` : currentArtIdx + 1}
                    </span>
                    <span className="text-[10px] font-mono text-ink/40">Created {new Date(activeArtwork.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Details Column (Scrollable Form Fields) */}
                <div className="w-full md:w-1/2 flex flex-col flex-1 min-h-0 md:h-full overflow-y-auto">
                  <div className="p-6 md:p-8 pb-4 border-b border-ink/5 flex items-center justify-between sticky top-0 bg-white z-10">
                    <h3 className="text-3xl editorial-title text-brand-primary">Portfolio Details Helper</h3>
                    <button 
                      onClick={async () => {
                        await flushArtworkSave();
                        setSelectedArtworkId(null);
                        setActiveHelperArtId(null);
                        setModalTab('details');
                      }} 
                      className="w-10 h-10 border border-ink/10 hover:border-ink rounded-full flex items-center justify-center hover:bg-ink text-ink hover:text-white transition-all"
                      title="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Tab Selector inside Detail Modal */}
                  <div className="px-6 md:px-8 border-b border-ink/5 flex gap-6 bg-white select-none shrink-0 sticky top-[77px] z-10 py-2.5">
                    <button
                      type="button"
                      onClick={() => setModalTab('details')}
                      className={`pb-1 text-[11px] font-mono font-bold uppercase tracking-wider relative transition-all ${
                        modalTab === 'details' 
                          ? 'text-brand-primary border-b-2 border-brand-primary font-extrabold' 
                          : 'text-ink/40 hover:text-brand-primary'
                      }`}
                    >
                      Project Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalTab('assessment')}
                      className={`pb-1 text-[11px] font-mono font-bold uppercase tracking-wider relative transition-all flex items-center gap-1.5 ${
                        modalTab === 'assessment' 
                          ? 'text-brand-primary border-b-2 border-brand-primary font-extrabold' 
                          : 'text-ink/40 hover:text-brand-primary'
                      }`}
                    >
                      <span>Submission & Feedback</span>
                      {activeArtwork.submitted && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                      )}
                    </button>
                  </div>

                  {modalTab === 'details' ? (
                    <div className="p-6 md:p-8 space-y-8 flex-1 pb-20">
                      {/* Title Input */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-ink/80 uppercase tracking-[0.2em] block">Piece Title</label>
                        <input 
                          type="text" 
                          value={activeArtwork.title || ''}
                          readOnly={!isEditable}
                          onChange={(e) => updateArtwork(activeArtwork.id, { title: e.target.value.slice(0, 100) })}
                          placeholder="e.g. Self Portrait in Grayscale, etc." 
                          className="w-full text-lg border-b border-ink/15 focus:border-brand-primary focus:outline-none pb-2 bg-transparent transition-colors font-semibold placeholder:opacity-30"
                        />
                      </div>

                      {/* Size / Dimensions Input (SI Only) */}
                      {activeArtwork.type === 'SI' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-ink/80 uppercase tracking-[0.2em] block">Size / Dimensions</label>
                          <input 
                            type="text" 
                            value={activeArtwork.dimensions || ''}
                            readOnly={!isEditable}
                            onChange={(e) => updateArtwork(activeArtwork.id, { dimensions: e.target.value.slice(0, 50) })}
                            placeholder="e.g. 18 x 24 in" 
                            className="w-full text-sm font-mono border-b border-ink/15 focus:border-brand-primary focus:outline-none pb-2 bg-transparent transition-colors placeholder:opacity-30"
                          />
                        </div>
                      )}

                      {/* Idea(s) visually evident Input (Selected Only) */}
                      {activeArtwork.type === 'Selected' && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-ink/80 uppercase tracking-[0.2em] block">Idea(s) Visually Evident (Max 100 characters)</label>
                            {isEditable && (activeArtwork.ideas?.length || 0) > 10 && (
                              <button 
                                onClick={() => handleAiRefineForArt(activeArtwork.id, 'ideas', activeArtwork.ideas)}
                                disabled={!!aiArtProcessingId}
                                className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-brand-primary px-2.5 py-1 rounded-lg border border-brand-primary/15 bg-brand-primary/5 hover:bg-brand-primary/10 transition-all disabled:opacity-50"
                                title="Refine Ideas"
                              >
                                <Sparkles size={10} className={aiArtProcessingId === `${activeArtwork.id}_ideas` ? 'animate-pulse' : ''} /> Auto Refine
                              </button>
                            )}
                          </div>
                          <textarea 
                            value={activeArtwork.ideas || ''}
                            readOnly={!isEditable}
                            onChange={(e) => updateArtwork(activeArtwork.id, { ideas: e.target.value.slice(0, 100) })}
                            placeholder="Describe the central idea(s) visually evident in this work..." 
                            className="w-full text-sm bg-ink/[0.02] p-4 border border-ink/5 rounded-2xl h-20 resize-none focus:outline-none focus:ring-1 focus:ring-brand-primary/20 focus:border-brand-primary/20 transition-all placeholder:opacity-30"
                          />
                          <CharacterCounter current={activeArtwork.ideas?.length} limit={100} />
                        </div>
                      )}

                      {/* Materials used Input */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-ink/80 uppercase tracking-[0.2em] block">Materials Used (Max 100 characters)</label>
                        <input 
                          type="text" 
                          value={activeArtwork.materials || ''}
                          readOnly={!isEditable}
                          onChange={(e) => updateArtwork(activeArtwork.id, { materials: e.target.value.slice(0, 100) })}
                          placeholder="e.g. Charcoal on toned paper, acrylic paint, pencil" 
                          className="w-full text-sm border-b border-ink/15 focus:border-brand-primary focus:outline-none pb-2 bg-transparent transition-colors placeholder:opacity-30"
                        />
                        <CharacterCounter current={activeArtwork.materials?.length} limit={100} />
                      </div>

                      {/* Processes used Input & Worksheet Helper */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <label className="text-[10px] font-bold text-ink/80 uppercase tracking-[0.2em] block">Processes Used (Max 100 characters)</label>
                          <div className="flex items-center gap-2">
                            {isEditable && (
                              <button
                                type="button"
                                onClick={() => setActiveHelperArtId(activeHelperArtId === activeArtwork.id ? null : activeArtwork.id)}
                                className={`flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all ${
                                  activeHelperArtId === activeArtwork.id
                                    ? 'bg-brand-primary text-white border-brand-primary'
                                    : 'bg-brand-primary/5 hover:bg-brand-primary/10 text-brand-primary border-brand-primary/10'
                                  }`}
                              >
                                <BookOpen size={10} /> {activeHelperArtId === activeArtwork.id ? 'Close Helper' : 'Worksheet Helper'}
                              </button>
                            )}
                            {isEditable && (activeArtwork.processText?.length || 0) > 10 && (
                              <button 
                                onClick={() => handleAiRefineForArt(activeArtwork.id, 'processText', activeArtwork.processText)}
                                disabled={!!aiArtProcessingId}
                                className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-brand-primary px-2.5 py-1 rounded-lg border border-brand-primary/15 bg-brand-primary/5 hover:bg-brand-primary/10 transition-all disabled:opacity-50"
                                title="Refine Process"
                              >
                                <Sparkles size={10} className={aiArtProcessingId === `${activeArtwork.id}_processText` ? 'animate-pulse' : ''} /> Auto Refine
                              </button>
                            )}
                          </div>
                        </div>

                        {activeHelperArtId === activeArtwork.id && isEditable && (
                          <div className="p-4 border border-brand-primary/20 rounded-3xl bg-brand-primary/[0.01]">
                            <ProcessWritingHelper
                              currentText={activeArtwork.processText || ''}
                              onApply={(text) => {
                                updateArtwork(activeArtwork.id, { processText: text });
                                setActiveHelperArtId(null);
                              }}
                              onClose={() => setActiveHelperArtId(null)}
                            />
                          </div>
                        )}

                        <textarea 
                          value={activeArtwork.processText || ''}
                          readOnly={!isEditable}
                          onChange={(e) => updateArtwork(activeArtwork.id, { processText: e.target.value.slice(0, 100) })}
                          placeholder="e.g. Multi-layer watercolor washes followed by ink linework, selective erasing for highlights" 
                          className="w-full text-sm bg-ink/[0.02] p-4 border border-ink/5 rounded-2xl h-20 resize-none focus:outline-none focus:ring-1 focus:ring-brand-primary/20 focus:border-brand-primary/20 transition-all placeholder:opacity-30"
                        />
                        <CharacterCounter current={activeArtwork.processText?.length} limit={100} />
                      </div>

                      {/* Digital Tools Input */}
                      <div className="space-y-4 font-sans">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-ink/80 uppercase tracking-[0.2em] block">Digital Tools (Max 100 characters)</label>
                          {isEditable && (activeArtwork.digitalTools?.length || 0) > 10 && (
                            <button 
                              onClick={() => handleAiRefineForArt(activeArtwork.id, 'processText', activeArtwork.digitalTools || '')}
                              disabled={!!aiArtProcessingId}
                              className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-brand-primary px-2.5 py-1 rounded-lg border border-brand-primary/15 bg-brand-primary/5 hover:bg-brand-primary/10 transition-all disabled:opacity-50"
                              title="Refine Digital Tools"
                            >
                              <Sparkles size={10} className={aiArtProcessingId === `${activeArtwork.id}_digitalTools` ? 'animate-pulse' : ''} /> Auto Refine
                            </button>
                          )}
                        </div>
                        <input 
                          type="text" 
                          value={activeArtwork.digitalTools || ''}
                          readOnly={!isEditable}
                          onChange={(e) => updateArtwork(activeArtwork.id, { digitalTools: e.target.value.slice(0, 100) })}
                          placeholder="e.g. Adobe Photoshop, Procreate with custom dry ink brush, iPad Pro, or 'none' if physical" 
                          className="w-full text-sm border-b border-ink/15 focus:border-brand-primary focus:outline-none pb-2 bg-transparent transition-colors placeholder:opacity-30"
                        />
                        <CharacterCounter current={activeArtwork.digitalTools?.length} limit={100} />
                      </div>

                      {/* Image Citation Input */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-ink/80 uppercase tracking-[0.2em] block">Image Citation (Max 100 characters)</label>
                        <input 
                          type="text" 
                          value={activeArtwork.citation || ''}
                          readOnly={!isEditable}
                          onChange={(e) => updateArtwork(activeArtwork.id, { citation: e.target.value.slice(0, 100) })}
                          placeholder="e.g. Reference photo by student, copyright free image from Unsplash" 
                          className="w-full text-sm border-b border-ink/15 focus:border-brand-primary focus:outline-none pb-2 bg-transparent transition-colors placeholder:opacity-30"
                        />
                        <CharacterCounter current={activeArtwork.citation?.length} limit={100} />
                      </div>
                    </div>
                  ) : (
                    // Submission & Feedback Tab Content
                    <div className="p-6 md:p-8 space-y-8 flex-1 pb-20 animate-in fade-in duration-300">
                      <div className="border-b border-ink/5 pb-4">
                        <h4 className="text-xl md:text-2xl font-display font-medium text-brand-primary">
                          {effectiveRole === 'student' ? 'Individual Project Submission' : 'Educator Project Evaluation'}
                        </h4>
                        <p className="text-xs text-ink/60 mt-1">
                          {effectiveRole === 'student' 
                            ? 'Submit this project individually to tie AP rubrics and receive targeted teacher critiques.'
                            : 'Review student reflections, scan summaries, and assign project-level rubric scores.'}
                        </p>
                      </div>

                      {/* STUDENT VIEW - SUBMISSION FORM */}
                      {isEditable && !activeArtwork.submitted && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-ink/80 uppercase tracking-[0.2em] block">
                              Student Self-Reflection / Statement (Max 1000 characters)
                            </label>
                            <p className="text-[11px] text-ink/50 block leading-normal">
                              Explain how this specific piece connects to your central inquiry, and details about your experimentation, decisions, or revisions.
                            </p>
                            <textarea
                              value={activeArtwork.studentReflection || ''}
                              onChange={(e) => updateArtwork(activeArtwork.id, { studentReflection: e.target.value.slice(0, 1000) })}
                              placeholder="Describe your goals, discoveries, and the creative decisions behind materials and processes..."
                              className="w-full text-sm bg-ink/[0.02] p-4 border border-ink/5 rounded-2xl h-40 resize-none focus:outline-none focus:ring-1 focus:ring-brand-primary/20 focus:border-brand-primary/20 transition-all placeholder:opacity-30"
                            />
                            <CharacterCounter current={activeArtwork.studentReflection?.length} limit={1000} />
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              if (!activeArtwork.studentReflection?.trim()) {
                                alert("Please write a short self-reflection statement before submitting.");
                                return;
                              }
                              setIsSubmittingProj(true);
                              try {
                                const submittedAt = Date.now();
                                // 1. Set submit state
                                updateArtwork(activeArtwork.id, { 
                                  submitted: true, 
                                  submittedAt 
                                });
                                await flushArtworkSave();

                                // 2. Call Gemini service to generate summary
                                const summaryRes = await fetch("/api/summarize-project-reflection", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    title: activeArtwork.title,
                                    materials: activeArtwork.materials,
                                    processText: activeArtwork.processText,
                                    studentReflection: activeArtwork.studentReflection
                                  })
                                });
                                if (summaryRes.ok) {
                                  const sData = await summaryRes.json();
                                  updateArtwork(activeArtwork.id, {
                                    submitted: true,
                                    submittedAt,
                                    reflectionSummary: sData.summary
                                  });
                                  await flushArtworkSave();
                                }
                              } catch (err) {
                                console.error("Error submitting project:", err);
                              } finally {
                                setIsSubmittingProj(false);
                              }
                            }}
                            disabled={isSubmittingProj}
                            className="w-full bg-brand-primary text-white font-mono font-bold uppercase tracking-wider py-4 px-6 rounded-2xl border-2 border-ink shadow-brutal hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isSubmittingProj ? 'Generating Summary...' : 'Submit SI Project Piece'}
                          </button>
                        </div>
                      )}

                      {/* STUDENT VIEW - SUBMITTED STATE */}
                      {isEditable && activeArtwork.submitted && (
                        <div className="space-y-6">
                          <div className="bg-green-50 border border-green-200 p-5 rounded-3xl flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 font-extrabold">✓</span>
                            <div>
                              <p className="font-bold text-sm text-green-900">Project Piece Submitted Successfully</p>
                              <p className="text-xs text-green-700/80 mt-1">
                                Submitted on {new Date(activeArtwork.submittedAt || Date.now()).toLocaleDateString()} at {new Date(activeArtwork.submittedAt || Date.now()).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-ink/40">Your Reflection Statement</span>
                            <div className="bg-ink/[0.02] p-5 rounded-2xl text-sm leading-relaxed border border-ink/5">
                              {activeArtwork.studentReflection}
                            </div>
                          </div>

                          {activeArtwork.reflectionSummary && (
                            <div className="space-y-2">
                              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#cf7d4d]">AI-Generated Reflection Summary (Educator View)</span>
                              <div className="bg-[#cf7d4d]/5 border border-[#cf7d4d]/10 p-5 rounded-2xl text-xs leading-relaxed text-[#5a3922]">
                                {activeArtwork.reflectionSummary}
                              </div>
                            </div>
                          )}

                          {/* CLASSMATE PEER CRITIQUES RECEIVED (OWNER VIEW) */}
                          <div className="pt-6 border-t border-ink/5 space-y-4">
                            <h4 className="text-sm font-bold uppercase font-mono tracking-widest text-[#cf7d4d]">Classmate Peer Critiques Received</h4>
                            <div className="space-y-3">
                              {peerCritiques
                                .filter(crit => crit.artworkId === activeArtwork.id)
                                .map(crit => (
                                  <div key={crit.id} className="bg-white p-5 border border-ink/10 rounded-2xl shadow-sm">
                                    <p className="text-xs text-ink/85 leading-relaxed italic font-sans">"{crit.text}"</p>
                                    <div className="mt-4 pt-3 border-t border-ink/5 flex justify-between items-center text-[9px] font-mono text-ink/40">
                                      <span className="font-bold text-brand-primary">Classmate: {crit.authorName}</span>
                                      <span>{new Date(crit.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                ))}

                              {peerCritiques.filter(crit => crit.artworkId === activeArtwork.id).length === 0 && (
                                <p className="text-xs text-ink/30 italic">No classmates have left critiques on this work yet.</p>
                              )}
                            </div>
                          </div>

                          {/* TEACHER EVALUATION RESULTS FOR STUDENT */}
                          <div className="pt-6 border-t border-ink/5 space-y-6">
                            <h4 className="text-lg font-display font-bold text-ink">Educator Evaluation Status</h4>
                            {activeArtwork.feedbackAt ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-paper p-3 border border-ink/5 rounded-xl text-center">
                                    <span className="text-[9px] font-mono uppercase text-ink/40 block">Criteria 1</span>
                                    <span className="text-base font-bold text-brand-primary">{activeArtwork.rubricScores?.criteria1}/3</span>
                                  </div>
                                  <div className="bg-paper p-3 border border-ink/5 rounded-xl text-center">
                                    <span className="text-[9px] font-mono uppercase text-ink/40 block">Criteria 2</span>
                                    <span className="text-base font-bold text-brand-primary">{activeArtwork.rubricScores?.criteria2}/3</span>
                                  </div>
                                  <div className="bg-paper p-3 border border-ink/5 rounded-xl text-center">
                                    <span className="text-[9px] font-mono uppercase text-ink/40 block">Criteria 3</span>
                                    <span className="text-base font-bold text-brand-primary">{activeArtwork.rubricScores?.criteria3}/3</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-ink/40">Instructor Critique</span>
                                  <div className="bg-white p-5 border border-ink/10 rounded-2xl text-sm italic text-ink/80 leading-relaxed shadow-sm">
                                    "{activeArtwork.teacherFeedback}"
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-yellow-50 border border-yellow-101 p-4 rounded-2xl text-sm text-yellow-850">
                                Pending review and rubric grading by your studio instructor.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* CLASSMATE PEER CRITIQUE WORKSPACE (WHEN VIEWING PEER PORTFOLIOS) */}
                      {user?.role === 'student' && !isEditable && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                          <div className="bg-[#cf7d4d]/10 border border-[#cf7d4d]/15 p-5 rounded-3xl flex items-start gap-4">
                            <Sparkles size={22} className="text-[#cf7d4d] shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-sm text-ink font-display">Bi-Weekly Peer Critique Hub</p>
                              <p className="text-xs text-ink/75 leading-relaxed mt-1">
                                To complete your bi-weekly critique requirement, submit a meaningful design reflection of at least <strong className="text-brand-primary">four full sentences</strong>. 
                                You are required to include <strong className="text-brand-primary font-mono">Elements or Principles of Design</strong> vocabulary (e.g., balance, contrast, rhythm, texture, line, scale).
                              </p>
                            </div>
                          </div>

                          {/* Interactive Writing Area */}
                          <div className="space-y-3 bg-paper p-6 rounded-3xl border border-ink/8 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#cf7d4d]">Submit Design Reflection</span>
                              <span className="text-[9px] font-mono text-ink/40 italic">Quality checks performed live by AI</span>
                            </div>
                            <textarea
                              value={peerCritiqueInput}
                              onChange={(e) => setPeerCritiqueInput(e.target.value)}
                              placeholder={`E.g., Your composition exhibits compelling rhythm through the repetition of line. The high contrast of dark charcoal fields adds extreme dramatic depth. This dynamic scale forces the eye across the organic shapes. Your application of negative space acts as a balanced focal point.`}
                              className="w-full text-xs bg-white p-4 border border-ink/10 rounded-2xl h-36 resize-none focus:outline-none focus:ring-1 focus:ring-brand-primary placeholder:opacity-30 leading-relaxed"
                            />

                            {critiqueAiFeedback && (
                              <div className={`p-4 border rounded-2xl animate-in stroke-in duration-300 ${
                                critiqueAiFeedback.isValid 
                                  ? "bg-green-50/50 border-green-200 text-green-900" 
                                  : "bg-red-50/50 border-red-200 text-red-900"
                              }`}>
                                <div className="flex items-center gap-1.5 font-bold text-xs">
                                  {critiqueAiFeedback.isValid ? (
                                    <span className="text-green-600 font-extrabold flex items-center gap-1">
                                      <CheckCircle2 size={14} /> Critique Requirement Verified & Stamped Successfully!
                                    </span>
                                  ) : (
                                    <span className="text-red-500 font-extrabold flex items-center gap-1">
                                      <AlertCircle size={14} /> Critique Requirement Not Met
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs mt-1.5 leading-normal opacity-90">{critiqueAiFeedback.reasoning}</p>
                                
                                <div className="mt-3 pt-3 border-t border-ink/5 flex flex-wrap gap-4 text-[10px] font-mono opacity-80">
                                  <span>Sentences: <strong>{critiqueAiFeedback.sentencesCount} (Required: 4)</strong></span>
                                  <span>Design Terms Used: <strong>{critiqueAiFeedback.designTerminologyUsed?.length ? critiqueAiFeedback.designTerminologyUsed.join(", ") : "None Detected"}</strong></span>
                                </div>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleVerifyAndSavePeerCritique(activeArtwork.id, activeArtwork.title || "Untitled Piece")}
                              disabled={isVerifyingCritique || !peerCritiqueInput.trim()}
                              className="w-full bg-brand-primary text-white font-mono font-bold uppercase tracking-wider py-3.5 px-6 rounded-2xl border-2 border-ink shadow-sm hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isVerifyingCritique ? "AI Reviewing Your Writing..." : "Analyze & Submit Peer Critique"}
                            </button>
                          </div>

                          {/* Existing critiques for this specific piece */}
                          <div className="space-y-4">
                            <h5 className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#cf7d4d]">Classmate Peer Critiques Left on this Artwork</h5>
                            <div className="space-y-3">
                              {peerCritiques
                                .filter(crit => crit.artworkId === activeArtwork.id)
                                .map(crit => (
                                  <div key={crit.id} className="bg-white p-5 border border-ink/8 rounded-2xl shadow-sm">
                                    <p className="text-xs text-ink/85 leading-relaxed italic font-sans font-medium">"{crit.text}"</p>
                                    <div className="mt-4 pt-3 border-t border-ink/5 flex justify-between items-center text-[9px] font-mono text-ink/40">
                                      <span className="font-bold text-brand-primary">Classmate: {crit.authorName}</span>
                                      <span>{new Date(crit.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                ))}

                              {peerCritiques.filter(crit => crit.artworkId === activeArtwork.id).length === 0 && (
                                <p className="text-xs text-ink/30 italic py-6 text-center border mr-2 border-dashed border-ink/10 rounded-2xl bg-paper/[0.3]">No classmates have reviewed this piece yet. Take the lead!</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* EDUCATOR VIEW */}
                      {effectiveRole === 'educator' && (
                        <div className="space-y-6">
                          {!activeArtwork.submitted ? (
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl text-sm text-yellow-800 leading-relaxed">
                              This student has not yet submitted an individual self-reflection statement for this project piece. You can still pre-grade and leave feedback.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-ink/40">Student Self-Reflection</span>
                                <div className="bg-ink/[0.02] p-5 rounded-2xl text-sm leading-relaxed border border-ink/5 max-h-48 overflow-y-auto">
                                  {activeArtwork.studentReflection}
                                </div>
                              </div>

                              {activeArtwork.reflectionSummary ? (
                                <div className="space-y-2">
                                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#cf7d4d] flex items-center gap-1.5 font-bold">
                                    <Sparkles size={12} /> Synthesis & Process Summary (Curated for Rubrics)
                                  </span>
                                  <div className="bg-[#cf7d4d]/5 border border-[#cf7d4d]/10 p-5 rounded-2xl text-xs leading-relaxed text-[#5a3922]">
                                    {activeArtwork.reflectionSummary}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setIsGeneratingSummary(true);
                                    try {
                                      const res = await fetch("/api/summarize-project-reflection", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          title: activeArtwork.title,
                                          materials: activeArtwork.materials,
                                          processText: activeArtwork.processText,
                                          studentReflection: activeArtwork.studentReflection
                                        })
                                      });
                                      if (res.ok) {
                                        const sData = await res.json();
                                        updateArtwork(activeArtwork.id, { reflectionSummary: sData.summary });
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    } finally {
                                      setIsGeneratingSummary(false);
                                    }
                                  }}
                                  disabled={isGeneratingSummary}
                                  className="text-xs text-brand-primary border border-brand-primary/10 bg-brand-primary/5 hover:bg-brand-primary/10 transition-all font-mono py-2.5 px-4 rounded-xl flex items-center gap-1.5 font-bold"
                                >
                                  <Sparkles size={12} /> {isGeneratingSummary ? 'Summarizing...' : 'Generate Process & Material Summary'}
                                </button>
                              )}
                            </div>
                          )}

                          {/* GRADING INSTRUCTIONS & INPUT */}
                          <div className="pt-6 border-t border-ink/5 space-y-6">
                            <h4 className="text-lg font-display font-medium text-ink">Rubric Grading & Feedback Critique</h4>
                            
                            {/* Criteria 1 */}
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[9px] font-mono uppercase bg-ink/5 px-2 py-0.5 rounded text-ink/70 font-bold block w-fit mb-1">Criterion 1</span>
                                  <span className="text-xs font-bold text-ink leading-tight block">Inquiry Alignment & Formulation</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-brand-primary">Rating: {criteriaScores.criteria1}/3</span>
                              </div>
                              <p className="text-[11px] text-ink/50 leading-relaxed">Does the piece relate meaningfully and expressively to the student's central inquiry question?</p>
                              <div className="flex gap-2">
                                {[1, 2, 3].map((score) => (
                                  <button
                                    key={score}
                                    type="button"
                                    onClick={() => handleScoreClick('criteria1', score)}
                                    className={`flex-1 py-2 font-mono font-bold text-[11px] rounded-xl border transition-all ${
                                      criteriaScores.criteria1 === score 
                                        ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                                        : 'bg-white text-ink/50 border-ink/10 hover:border-ink/30'
                                    }`}
                                  >
                                    {score === 1 && '1 • Weak'}
                                    {score === 2 && '2 • Evident'}
                                    {score === 3 && '3 • Synergistic'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Criteria 2 */}
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[9px] font-mono uppercase bg-ink/5 px-2 py-0.5 rounded text-ink/70 font-bold block w-fit mb-1">Criterion 2</span>
                                  <span className="text-xs font-bold text-ink leading-tight block">Practice, Design Elements & Progress</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-brand-primary">Rating: {criteriaScores.criteria2}/3</span>
                              </div>
                              <p className="text-[11px] text-ink/50 leading-relaxed">Does the project demonstrate practice, visual design mastery, and deliberate experiments/growth?</p>
                              <div className="flex gap-2">
                                {[1, 2, 3].map((score) => (
                                  <button
                                    key={score}
                                    type="button"
                                    onClick={() => handleScoreClick('criteria2', score)}
                                    className={`flex-1 py-1.5 font-mono font-bold text-[11px] rounded-xl border transition-all ${
                                      criteriaScores.criteria2 === score 
                                        ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                                        : 'bg-white text-ink/50 border-ink/10 hover:border-ink/30'
                                    }`}
                                  >
                                    {score === 1 && '1 • Weak'}
                                    {score === 2 && '2 • Evident'}
                                    {score === 3 && '3 • Advanced'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Criteria 3 */}
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[9px] font-mono uppercase bg-ink/5 px-2 py-0.5 rounded text-ink/70 font-bold block w-fit mb-1">Criterion 3</span>
                                  <span className="text-xs font-bold text-ink leading-tight block">Synthesis of Materials & Ideas</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-brand-primary">Rating: {criteriaScores.criteria3}/3</span>
                              </div>
                              <p className="text-[11px] text-ink/50 leading-relaxed">Are materials, processes, and ideas perfectly integrated where they support one another?</p>
                              <div className="flex gap-2">
                                {[1, 2, 3].map((score) => (
                                  <button
                                    key={score}
                                    type="button"
                                    onClick={() => handleScoreClick('criteria3', score)}
                                    className={`flex-1 py-2 font-mono font-bold text-[11px] rounded-xl border transition-all ${
                                      criteriaScores.criteria3 === score 
                                        ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                                        : 'bg-white text-ink/50 border-ink/10 hover:border-ink/30'
                                    }`}
                                  >
                                    {score === 1 && '1 • Weak'}
                                    {score === 2 && '2 • Evident'}
                                    {score === 3 && '3 • Synthesized'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Written Feedback Textarea */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-ink/80 uppercase tracking-[0.2em] block">
                                Educator Critique / Feedback Statement
                              </label>
                              <textarea
                                value={localFeedbackText}
                                onChange={(e) => setLocalFeedbackText(e.target.value)}
                                placeholder="Provide constructive critique, highlight design strengths, and list recommendations for development..."
                                className="w-full text-xs p-4 bg-ink/[0.01] border border-ink/10 rounded-2xl h-24 focus:outline-none focus:ring-1 focus:ring-brand-primary/20 placeholder:opacity-30"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                setIsSavingFeedback(true);
                                try {
                                  updateArtwork(activeArtwork.id, {
                                    rubricScores: criteriaScores,
                                    teacherFeedback: localFeedbackText,
                                    feedbackAt: Date.now()
                                  });
                                  await flushArtworkSave();
                                } catch (err) {
                                  console.error(err);
                                } finally {
                                  setIsSavingFeedback(false);
                                }
                              }}
                              disabled={isSavingFeedback}
                              className="w-full bg-brand-primary text-white font-mono font-bold uppercase tracking-wider py-4 px-6 rounded-2xl border-2 border-ink shadow-brutal hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                            >
                              {isSavingFeedback ? 'Saving Critique...' : 'Save Evaluation & Feedback'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {loading && (
        <div className="fixed bottom-10 right-10 z-[100] brutal-card bg-ink text-white px-6 py-4 flex items-center gap-4">
          <div className="w-2 h-2 bg-brand-primary rounded-full animate-ping" />
          <span className="font-bold text-sm tracking-widest uppercase">Processing...</span>
        </div>
      )}
    </div>
  );
}

function FileUploader({ onFile, label = "Add Artwork" }: { onFile: (f: File) => void, label?: string }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png']
    },
    maxSize: 4 * 1024 * 1024, // 4MB
    onDrop: (accepted: File[], rejected: any[]) => {
      if (rejected && rejected.length > 0) {
        const error = rejected[0]?.errors?.[0];
        if (error?.code === 'file-too-large') {
          alert('Upload Failed: Image file exceeds the 4 MB limit.');
        } else if (error?.code === 'file-invalid-type') {
          alert('Upload Failed: Please select only JPG or PNG image files.');
        } else {
          alert('Upload Failed: Please ensure your file is a JPG or PNG under 4 MB.');
        }
        return;
      }
      if (accepted[0]) onFile(accepted[0]);
    },
    maxFiles: 1,
    multiple: false
  } as any);

  return (
    <div 
      {...getRootProps()} 
      className={`brutal-card group aspect-[4/3] border-dashed border-2 cursor-pointer flex flex-col items-center justify-center p-12 text-center transition-all bg-white/30 border-ink/5 hover:border-brand-primary/20
        ${isDragActive ? 'bg-brand-primary/5 border-brand-primary/40' : ''}`}
    >
      <input {...getInputProps()} />
      <div className="w-16 h-16 bg-brand-primary/5 border border-brand-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand-primary group-hover:text-white transition-all duration-500">
        <Plus size={24} className="text-brand-primary group-hover:text-white transition-colors" />
      </div>
      <p className="font-display font-medium text-2xl text-ink/80 group-hover:text-ink transition-colors">{label}</p>
      <p className="text-[10px] font-mono text-ink/50 uppercase tracking-[0.2em] mt-3">Drop Image or Click to Browse</p>
      <p className="text-[9px] font-mono text-brand-primary/60 uppercase tracking-widest mt-1.5 bg-brand-primary/5 border border-brand-primary/10 px-2.5 py-0.5 rounded-full font-bold">Max 4 MB • JPG or PNG • RGB Only</p>
    </div>
  );
}
