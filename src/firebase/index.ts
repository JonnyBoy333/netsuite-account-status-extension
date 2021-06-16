import firebase from 'firebase/app';
import 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCEFG4AOKtQqFyAUBdoJr417L-PdFjjzWE',
  authDomain: 'netsuite-user-status.firebaseapp.com',
  projectId: 'netsuite-user-status',
  storageBucket: 'netsuite-user-status.appspot.com',
  messagingSenderId: '958154408626',
  appId: '1:958154408626:web:a0728db6341c0a4f99bfab',
};

firebase.initializeApp(firebaseConfig);
// firebase.firestore().enablePersistence()
//   .catch((err) => {
//     console.log('Tailed to enable persistence', err);
//     if (err.code == 'failed-precondition') {
//       // Multiple tabs open, persistence can only be enabled
//       // in one tab at a a time.
//       // ...
//     } else if (err.code == 'unimplemented') {
//       // The current browser does not support all of the
//       // features required to enable persistence
//       // ...
//     }
//   });
const db = firebase.firestore();

export default db;