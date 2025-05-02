// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBMUdDttyYDh_CChdyF1GpZRK2Z7iLX0Yk",
  authDomain: "vehicle-charging-locator.firebaseapp.com",
  projectId: "vehicle-charging-locator",
  storageBucket: "vehicle-charging-locator.firebasestorage.app",
  messagingSenderId: "671444526668",
  appId: "1:671444526668:web:f96c6afb9890a7016bb6e9",
  measurementId: "G-HJH3NRC3J7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };