import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAs0v--lU7ifRn_jiGwRgsCfClo_1IenQU",
  authDomain: "pos-system-ae9b3.firebaseapp.com",
  projectId: "pos-system-ae9b3",
  storageBucket: "pos-system-ae9b3.firebasestorage.app",
  messagingSenderId: "214528137043",
  appId: "1:214528137043:web:69597acdc3b9a24f4373a6",
  measurementId: "G-KW7QXRF7PQ",
  databaseURL: "https://pos-system-ae9b3-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getDatabase(app);
