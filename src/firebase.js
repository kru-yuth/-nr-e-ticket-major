import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBxRr_gL9G8PSVW_LHgZnMvU3fk8pGw3DA",
  authDomain: "nr-e-ticket-major.firebaseapp.com",
  projectId: "nr-e-ticket-major",
  storageBucket: "nr-e-ticket-major.firebasestorage.app",
  messagingSenderId: "787290504849",
  appId: "1:787290504849:web:91a38d711704bd9aad0930",
  measurementId: "G-FZZE7HJ97D"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export function isFirebaseConfigured() {
  return (
    !String(firebaseConfig.apiKey).includes('DEMO') &&
    !String(firebaseConfig.appId).includes('0000')
  );
}
