import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBYYTuw5bY2RZM27mZynVuvmmWxQNvomKQ",
    authDomain: "haj-fadel-accounting.firebaseapp.com",
    projectId: "haj-fadel-accounting",
    storageBucket: "haj-fadel-accounting.firebasestorage.app",
    messagingSenderId: "449205985318",
    appId: "1:449205985318:web:2dece1e1412165b01f46e7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { 
    auth, 
    db, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where
};
