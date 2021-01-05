
// import firebase from 'firebase'; // TODO: remove when done
// declare var firebase: typeof import('firebase');

// import type firebase from 'firebase';
// let firebase: typeof import('firebase').default;
// Initialize Firebase
const firebaseConfig = {
    apiKey: 'AIzaSyCEFG4AOKtQqFyAUBdoJr417L-PdFjjzWE',
    authDomain: 'netsuite-user-status.firebaseapp.com',
    projectId: 'netsuite-user-status',
    storageBucket: 'netsuite-user-status.appspot.com',
    messagingSenderId: '958154408626',
    appId: '1:958154408626:web:a0728db6341c0a4f99bfab'
};

firebase.initializeApp(firebaseConfig);

// console.log('Account', account);

/**
 * initApp handles setting up the Firebase context and registering
 * callbacks for the auth status.
 *
 * The core initialization is in firebase.App - this is the glue class
 * which stores configuration. We provide an app name here to allow
 * distinguishing multiple app instances.
 *
 * This method also registers a listener with firebase.auth().onAuthStateChanged.
 * This listener is called when the user is signed in or out, and that
 * is where we update the UI.
 *
 * When signed in, we also authenticate to the Firebase Realtime Database.
 */
// function initApp() {
//   // Listen for auth state changes.
//     firebase.auth().onAuthStateChanged((user) => {
//         console.log('User state change detected from the Background script of the Chrome Extension:', user);
//     });
// }

window.onload = () => {
  // initApp();
};