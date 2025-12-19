import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, getDoc, doc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAS_tMxrT4NzzQA9B1H6V2sXLBmPV0gQQM",
    authDomain: "prompt-x-ai.firebaseapp.com",
    projectId: "prompt-x-ai",
    storageBucket: "prompt-x-ai.firebasestorage.app",
    messagingSenderId: "636770012944",
    appId: "1:636770012944:web:58848cc6032ef571201f95"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export { signInAnonymously, onAuthStateChanged, collection, addDoc, getDoc, doc, serverTimestamp };
