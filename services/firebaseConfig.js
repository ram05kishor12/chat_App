// // firebaseConfig.js (or any filename you prefer)
// import { initializeApp, getApps } from '@react-native-firebase/app';
// import auth from '@react-native-firebase/auth';
// import firestore from '@react-native-firebase/firestore';

// // Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyBJ_m35kQ_zp21nz5sFgR-AP_4f1EJyBlY",
//   authDomain: "test-app-5c40f.firebaseapp.com",
//   projectId: "test-app-5c40f",
//   storageBucket: "test-app-5c40f.appspot.com", // Fixed the incorrect storageBucket
//   messagingSenderId: "640351118069",
//   appId: "1:640351118069:web:47787320016e9cbfd05bbc"
// };

// // Initialize Firebase only if not already initialized
// let app;
// if (!getApps().length) {
//   app = initializeApp(firebaseConfig);
// } else {
//   app = getApps()[0]; // Get the already initialized app
// }

// // Firestore instance
// const db = firestore();

// export { auth, db, app };


import firebase from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import '@react-native-firebase/firestore';

const RNfirebaseConfig = {
  apiKey: "AIzaSyBJ_m35kQ_zp21nz5sFgR-AP_4f1EJyBlY",
  authDomain: "test-app-5c40f.firebaseapp.com",
  projectId: "test-app-5c40f",
  storageBucket: "test-app-5c40f.appspot.com",
  messagingSenderId: "640351118069",
  appId: "1:640351118069:web:47787320016e9cbfd05bbc"
};

let app;
if (firebase.apps.length === 0) {
    app = firebase.initializeApp(RNfirebaseConfig )
} else {
    app = firebase.app()
}

const db = firebase.firestore();
const auth = firebase.auth();

export { db, auth, app };