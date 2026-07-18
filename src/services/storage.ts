import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ClassRoom, Artwork, User, WrittenEvidence, Feedback, PeerCritique, ProgressPhoto } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const storageService = {
  // User Management
  async getUser(uid: string): Promise<User | null> {
    const path = `users/${uid}/private/profile`;
    try {
      const docRef = doc(db, path);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as User : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async getPublicUser(uid: string): Promise<User | null> {
    const path = `global_profiles/${uid}`;
    try {
      const docRef = doc(db, path);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as User : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async saveUser(user: User): Promise<void> {
    const path = `users/${user.uid}/private/profile`;
    const globalPath = `global_profiles/${user.uid}`;
    try {
      await setDoc(doc(db, path), {
        ...user,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Save to global profile index for markopechnik@gmail.com visibility
      await setDoc(doc(db, globalPath), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isExample: user.isExample || false,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  async getGlobalProfiles(): Promise<User[]> {
    const path = 'global_profiles';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => doc.data() as User);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Classes
  async getClassesByTeacher(teacherId: string): Promise<ClassRoom[]> {
    const path = 'classes';
    try {
      const q = query(collection(db, path), where('teacherId', '==', teacherId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as ClassRoom);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getAllClasses(): Promise<ClassRoom[]> {
    const path = 'classes';
    try {
      const q = query(collection(db, path));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as ClassRoom);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getClassesByStudent(studentId: string): Promise<ClassRoom[]> {
    const path = 'classes';
    try {
      const q = query(collection(db, path), where('studentIds', 'array-contains', studentId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as ClassRoom);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getClassByCode(code: string): Promise<ClassRoom | null> {
    const path = 'classes';
    try {
      const q = query(collection(db, path), where('code', '==', code.toUpperCase()), limit(1));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty ? null : querySnapshot.docs[0].data() as ClassRoom;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async saveClass(classRoom: ClassRoom): Promise<void> {
    const path = `classes/${classRoom.id}`;
    try {
      await setDoc(doc(db, path), {
        ...classRoom,
        code: classRoom.code.toUpperCase(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async ensureSampleCourse(teacherId: string, teacherName: string): Promise<void> {
    const existing = await this.getClassByCode('111111');
    if (!existing) {
      const sampleClass: ClassRoom = {
        id: 'sample_course_111111',
        code: '111111',
        teacherId: teacherId,
        teacherName: teacherName,
        name: 'AP Art Sample Course',
        courseType: '2D',
        academicYear: '2023-2024',
        studentIds: [],
        startDate: Date.now(),
        createdAt: Date.now()
      };
      await this.saveClass(sampleClass);
    }
  },

  async joinClass(code: string, studentId: string): Promise<ClassRoom | null> {
    let classRoom = await this.getClassByCode(code);
    
    // Auto-create sample if missing (for demo purposes)
    if (!classRoom && code === '111111') {
      const sampleClass: ClassRoom = {
        id: 'sample_course_111111',
        code: '111111',
        teacherId: 'educator_demo',
        teacherName: 'Mr. Doe',
        name: 'AP Art Sample Course',
        courseType: '2D',
        academicYear: '2023-2024',
        studentIds: [],
        startDate: Date.now(),
        createdAt: Date.now()
      };
      await this.saveClass(sampleClass);
      classRoom = await this.getClassByCode(code);
    }

    if (!classRoom) return null;

    const path = `classes/${classRoom.id}`;
    const memberPath = `classes/${classRoom.id}/members/${studentId}`;
    
    try {
      // Get student profile first
      const studentProfile = await this.getUser(studentId);
      if (!studentProfile) throw new Error("Student profile does not exist");

      await runTransaction(db, async (transaction) => {
        const classDoc = await transaction.get(doc(db, path));
        if (!classDoc.exists()) throw new Error("Class does not exist");
        
        const data = classDoc.data() as ClassRoom;
        if (!data.studentIds.includes(studentId)) {
          const newIds = [...data.studentIds, studentId];
          transaction.update(doc(db, path), { studentIds: newIds });
        }
        
        transaction.set(doc(db, memberPath), {
          ...studentProfile,
          joinedAt: serverTimestamp()
        }, { merge: true });
      });
      return await this.getClassByCode(code);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return null;
    }
  },

  async deleteClass(id: string, teacherId: string): Promise<void> {
    const path = `classes/${id}`;
    try {
      // Security check in rule will catch if teacherId is wrong
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Artworks
  async getArtworks(classId: string, userId: string): Promise<Artwork[]> {
    const portfolioId = `${classId}_${userId}`;
    const path = `portfolios/${portfolioId}/artworks`;
    try {
      const q = query(collection(db, path), orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Artwork);
    } catch (error) {
      return [];
    }
  },

  async saveArtworks(classId: string, userId: string, artworks: Artwork[]): Promise<void> {
    const portfolioId = `${classId}_${userId}`;
    const portfolioPath = `portfolios/${portfolioId}`;
    
    try {
      // Ensure portfolio exists
      await setDoc(doc(db, portfolioPath), { studentId: userId, classId }, { merge: true });
      
      // Batch write for artworks
      const batch = writeBatch(db);
      for (const art of artworks) {
        const artRef = doc(db, `portfolios/${portfolioId}/artworks/${art.id}`);
        batch.set(artRef, {
          ...art,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, portfolioPath);
    }
  },

  async deleteArtwork(classId: string, userId: string, artId: string): Promise<void> {
    const portfolioId = `${classId}_${userId}`;
    const path = `portfolios/${portfolioId}/artworks/${artId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getProgressPhotos(classId: string, userId: string): Promise<ProgressPhoto[]> {
    const portfolioId = `${classId}_${userId}`;
    const path = `portfolios/${portfolioId}/progress_photos`;
    try {
      const q = query(collection(db, path), orderBy('uploadedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as ProgressPhoto);
    } catch (error) {
      return [];
    }
  },

  async saveProgressPhotos(classId: string, userId: string, photos: ProgressPhoto[]): Promise<void> {
    const portfolioId = `${classId}_${userId}`;
    const portfolioPath = `portfolios/${portfolioId}`;
    try {
      await setDoc(doc(db, portfolioPath), { studentId: userId, classId }, { merge: true });
      const batch = writeBatch(db);
      for (const photo of photos) {
        const ref = doc(db, `portfolios/${portfolioId}/progress_photos/${photo.id}`);
        // Clean out undefined field values to prevent Firestore WriteBatch.set errors
        const cleanedPhoto = Object.entries(photo).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value;
          }
          return acc;
        }, {} as any);
        batch.set(ref, {
          ...cleanedPhoto,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, portfolioPath);
    }
  },

  async deleteProgressPhoto(classId: string, userId: string, photoId: string): Promise<void> {
    const portfolioId = `${classId}_${userId}`;
    const path = `portfolios/${portfolioId}/progress_photos/${photoId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getWrittenEvidence(classId: string, userId: string): Promise<WrittenEvidence> {
    const portfolioId = `${classId}_${userId}`;
    const path = `portfolios/${portfolioId}`;
    try {
      const docSnap = await getDoc(doc(db, path));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          inquiry: data.inquiry || '',
          practice: data.practice || '',
          experimentation: data.experimentation || '',
          revision: data.revision || ''
        };
      }
      return { inquiry: '', practice: '', experimentation: '', revision: '' };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return { inquiry: '', practice: '', experimentation: '', revision: '' };
    }
  },

  async saveWrittenEvidence(classId: string, userId: string, evidence: WrittenEvidence): Promise<void> {
    const portfolioId = `${classId}_${userId}`;
    const path = `portfolios/${portfolioId}`;
    try {
      await setDoc(doc(db, path), {
        ...evidence,
        studentId: userId,
        classId: classId,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getFeedback(classId: string, studentId: string): Promise<Feedback[]> {
    const portfolioId = `${classId}_${studentId}`;
    const path = `portfolios/${portfolioId}/feedback`;
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Feedback);
    } catch (error) {
      return [];
    }
  },

  async addFeedback(classId: string, studentId: string, feedback: Feedback): Promise<void> {
    const portfolioId = `${classId}_${studentId}`;
    const path = `portfolios/${portfolioId}/feedback/${feedback.id}`;
    try {
      await setDoc(doc(db, path), {
        ...feedback,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async savePortfolioSelfReflection(classId: string, userId: string, selfReflection: any, reflectionSummary: string, status: 'on-time' | 'late'): Promise<void> {
    const portfolioId = `${classId}_${userId}`;
    const path = `portfolios/${portfolioId}`;
    try {
      await setDoc(doc(db, path), {
        studentId: userId,
        classId,
        selfReflection,
        reflectionSummary,
        portfolioSubmitted: true,
        portfolioSubmittedAt: Date.now(),
        portfolioSubmissionStatus: status,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveTeacherGrade(classId: string, userId: string, gradeData: any): Promise<void> {
    const portfolioId = `${classId}_${userId}`;
    const path = `portfolios/${portfolioId}`;
    try {
      await setDoc(doc(db, path), {
        studentId: userId,
        classId,
        teacherGrade: gradeData,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveAiJudgeData(classId: string, userId: string, aiJudgeResult: any): Promise<void> {
    const portfolioId = `${classId}_${userId}`;
    const path = `portfolios/${portfolioId}`;
    try {
      await setDoc(doc(db, path), {
        studentId: userId,
        classId,
        aiJudgeResult,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getPortfolio(classId: string, userId: string): Promise<any | null> {
    const portfolioId = `${classId}_${userId}`;
    const path = `portfolios/${portfolioId}`;
    try {
      const docSnap = await getDoc(doc(db, path));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async savePortfolioName(
    classId: string, 
    userId: string, 
    name: string, 
    history?: any[],
    mindMapData?: { who: string; what: string; how: string }
  ): Promise<void> {
    const portfolioId = `${classId}_${userId}`;
    const path = `portfolios/${portfolioId}`;
    try {
      const updateData: any = {
        studentId: userId,
        classId,
        portfolioName: name,
        updatedAt: serverTimestamp()
      };
      if (history) {
        updateData.essentialQuestionHistory = history;
      }
      if (mindMapData) {
        updateData.mindMapWho = mindMapData.who;
        updateData.mindMapWhat = mindMapData.what;
        updateData.mindMapHow = mindMapData.how;
      }
      await setDoc(doc(db, path), updateData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveInquiryDevelopment(
    classId: string,
    userId: string,
    data: {
      who?: string;
      what?: string;
      how?: string;
      generatedVocabulary?: Array<{ term: string; category: 'subject' | 'medium' }>;
      selectedVocabulary?: string[];
      step2Completed?: boolean;
    }
  ): Promise<void> {
    const portfolioId = `${classId}_${userId}`;
    const path = `portfolios/${portfolioId}`;
    try {
      const updateData: any = {
        updatedAt: serverTimestamp()
      };
      if (data.who !== undefined) updateData.mindMapWho = data.who;
      if (data.what !== undefined) updateData.mindMapWhat = data.what;
      if (data.how !== undefined) updateData.mindMapHow = data.how;
      if (data.generatedVocabulary !== undefined) updateData.mindMapGeneratedVocabulary = data.generatedVocabulary;
      if (data.selectedVocabulary !== undefined) updateData.mindMapSelectedVocabulary = data.selectedVocabulary;
      if (data.step2Completed !== undefined) updateData.mindMapStep2Completed = data.step2Completed;

      await setDoc(doc(db, path), updateData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async addClassMember(classId: string, user: User): Promise<void> {
    const path = `classes/${classId}/members/${user.uid}`;
    try {
      await setDoc(doc(db, path), {
        ...user,
        joinedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Student Profiles for Teacher View
  async getStudentProfiles(classId: string): Promise<User[]> {
    const path = `classes/${classId}/members`;
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => doc.data() as User);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getAllExampleStudents(): Promise<{ [year: string]: User[] }> {
    try {
      const classesSnap = await getDocs(collection(db, 'classes'));
      const academicYears = Array.from(new Set(classesSnap.docs.map(d => d.data().academicYear)));
      const grouped: { [year: string]: User[] } = {};
      for (const year of academicYears) {
        grouped[year] = [];
      }
      return grouped;
    } catch (error) {
      return {};
    }
  },

  async savePeerCritique(classId: string, critique: PeerCritique): Promise<void> {
    const path = `classes/${classId}/peer_critiques/${critique.id}`;
    try {
      await setDoc(doc(db, path), critique, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getPeerCritiquesByAuthor(classId: string, authorId: string): Promise<PeerCritique[]> {
    const path = `classes/${classId}/peer_critiques`;
    try {
      const q = query(collection(db, path), where('authorId', '==', authorId));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => doc.data() as PeerCritique);
      return items.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getPeerCritiquesForStudent(classId: string, targetStudentId: string): Promise<PeerCritique[]> {
    const path = `classes/${classId}/peer_critiques`;
    try {
      const q = query(collection(db, path), where('targetStudentId', '==', targetStudentId));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => doc.data() as PeerCritique);
      return items.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getAllPeerCritiques(classId: string): Promise<PeerCritique[]> {
    const path = `classes/${classId}/peer_critiques`;
    try {
      const q = query(collection(db, path));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => doc.data() as PeerCritique);
      return items.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }
};
