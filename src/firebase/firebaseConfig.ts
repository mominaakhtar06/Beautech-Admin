// src/firebase/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase web config (same as tumhare React Native app)
const firebaseConfig = {
  apiKey: "AIzaSyCbXmtEU4VlfzYCVUhgLsTKOsc2KALMfj8",
  authDomain: "beautech-e4c31.firebaseapp.com",
  projectId: "beautech-e4c31",
  storageBucket: "beautech-e4c31.appspot.com", // <- note: .app nahi, .appSOTRAGE.com
  messagingSenderId: "760263935618",
  appId: "1:760263935618:web:350fd3f43144b1d0abd69b",
  measurementId: "G-C6E1TJ9FD8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);