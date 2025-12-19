import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, getDoc, doc, serverTimestamp } from "firebase/firestore";

// Access global variables that might be injected by the environment
const getGlobal = (key) => {
    if (typeof window !== 'undefined' && window[key]) return window[key];
    if (typeof globalThis !== 'undefined' && globalThis[key]) return globalThis[key];
    return undefined;
};

const rawConfig = getGlobal('__firebase_config');
const firebaseConfig = rawConfig
    ? (typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig)
    : {
        apiKey: "MISSING",
        authDomain: "MISSING",
        projectId: "MISSING",
        storageBucket: "MISSING",
        messagingSenderId: "MISSING",
        appId: "MISSING"
    };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = getGlobal('__app_id') || 'default-app-id';

export { signInAnonymously, onAuthStateChanged, collection, addDoc, getDoc, doc, serverTimestamp };
