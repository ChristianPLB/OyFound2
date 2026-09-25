import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyArRqdXtXuY4DJaAmL2IIaIs_7OwksaWq0",
    authDomain: "oyfound.firebaseapp.com",
    projectId: "oyfound",
    storageBucket: "oyfound.firebasestorage.app",
    messagingSenderId: "339824668768",
    appId: "1:339824668768:web:3aa02179d1380ef26b5305",
    measurementId: "G-DWLXC15846"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
