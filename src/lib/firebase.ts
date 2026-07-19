import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

// Load configuration from environment variables or fall back to default configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: process.env.FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: process.env.FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || defaultFirebaseConfig.measurementId || ""
};

// Handle potential Realtime Database URL values in FIREBASE_DATABASE_URL and default to "(default)" for Firestore
let firestoreDatabaseId = "(default)";
if (process.env.FIREBASE_DATABASE_URL) {
  const dbUrl = process.env.FIREBASE_DATABASE_URL;
  if (!dbUrl.includes("http") && !dbUrl.includes("firebaseio.com")) {
    firestoreDatabaseId = dbUrl;
  }
} else if (defaultFirebaseConfig.firestoreDatabaseId) {
  firestoreDatabaseId = defaultFirebaseConfig.firestoreDatabaseId;
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);

// Enforce session persistence so the user is logged out when they close the browser
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.error("Failed to set auth persistence to session:", err);
});

// Validation check as per guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or connectivity.");
    }
  }
}
testConnection();
