export type UserRole = 'student' | 'educator';

export interface Feedback {
  id: string;
  teacherId: string;
  artworkId: string | null; // null if general class feedback
  text: string;
  createdAt: number;
}

export interface WrittenEvidence {
  inquiry: string;
  practice: string;
  experimentation: string;
  revision: string;
}

export interface StudentProfile {
  uid: string;
  name: string;
  email: string;
  artworks: Artwork[];
  writtenEvidence: WrittenEvidence;
}

export interface Artwork {
  id: string;
  order: number;
  imageUrl: string; 
  title?: string;
  materials: string;
  processText: string;
  dimensions: string;
  ideas: string;
  citation?: string; 
  digitalTools?: string;
  type: 'SI' | 'Selected';
  createdAt: number;
  submittedAt?: number;
  feedback?: Feedback[];
  submitted?: boolean;
  studentReflection?: string;
  reflectionSummary?: string;
  rubricScores?: { criteria1: number; criteria2: number; criteria3: number };
  teacherFeedback?: string;
  feedbackAt?: number;
}

export interface ProgressPhoto {
  id: string;
  imageUrl: string;
  uploadedAt: number;
  siArtworkId: string; // The ID of the Sustained Investigation artwork (or 'unassigned')
  caption?: string;
  isExample?: boolean;
}

export interface ClassRoom {
  id: string;
  code: string; 
  teacherId: string;
  name: string;
  teacherName: string;
  courseType: '2D' | '3D' | 'Drawing' | 'ArtHistory' | 'MusicTheory';
  academicYear: string;
  startDate: number;
  createdAt: number;
  studentIds: string[]; 
  deadlines?: number[];
  calendarEmbedUrl?: string;
  schoolBreaks?: { id: string; name: string; startDate: string; endDate: string }[];
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole | null;
  isExample?: boolean;
}

export interface PeerCritique {
  id: string;
  classId: string;
  authorId: string;
  authorName: string;
  targetStudentId: string;
  targetStudentName: string;
  artworkId?: string;
  artworkTitle?: string;
  artworkUrl?: string;
  text: string;
  createdAt: number;
  isVerified: boolean;
  aiRating?: 'excellent' | 'basic' | 'vague_or_insufficient';
  aiFeedback?: string;
  foundTerminology?: string[];
  aiVerificationDetails?: string;
}
