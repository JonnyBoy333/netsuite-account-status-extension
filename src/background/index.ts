import { IFirebaseUser, IUpdate, IUserStatusCache } from 'src/content';
import firebase from 'firebase/app';
import db from '../firebase';

// Unsubscribe must be global so it can be called from a later message
let unsubscribe: () => void | undefined;

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {

  if (request.action === 'updateStatus') {
    const data: IUpdate | void = request.source;
    if (!data) { return; }
    getDeviceId()
      .then(async (deviceId: string) => {
        data.user.deviceId = deviceId;
        // logger('User', data);

        const accountDocId = await addUpdateAccountDoc(db, data);
        if (accountDocId) {
          await addUpdateUserDoc(db, data, accountDocId, data.accountName);
          sendResponse('success');
        }
      });
  }

  if (request.action === 'addUserStatusListener') {
    unsubscribe = db.collection('users').onSnapshot((snapshot) => {
      const userStatuses: IUserStatusCache = {};
      snapshot.forEach((doc) => {
        const firebaseUser = <IFirebaseUser>doc.data();
        userStatuses[firebaseUser.email] = { ...firebaseUser, lastSeenDate: firebaseUser.lastSeenDate.toDate().toUTCString() };
      });
      updateStorage(userStatuses);
      logger('Users', userStatuses);

      snapshot.docChanges().forEach((change) => {
        // logger('Storage', chrome.storage);
        const changedDoc = <IFirebaseUser>change.doc.data();
        if (change.type === 'added' || change.type === 'modified') {
          logger('Updated user:', change.doc.data());
          userStatuses[changedDoc.email] = { ...changedDoc, lastSeenDate: changedDoc.lastSeenDate.toDate().toUTCString() };
        }
        if (change.type === 'removed') {
          logger('Removed user:', change.doc.data());
          delete userStatuses[changedDoc.email];
        }
        updateStorage(userStatuses);
      });
      getDeviceId().then((deviceId) => {
        sendResponse({ response: 'Added Listener', deviceId });
      });
    });
  }

  if (request.action === 'removeUserStatusListener') {
    logger('Unsubscribing', unsubscribe);
    if (unsubscribe) unsubscribe();
    sendResponse('Removed listener');
  }

  if (request.action === 'logout') {
    logger('Logging out');
    getDeviceId()
      .then(async (deviceId: string) => {
        await inactivateUser(db, deviceId);
        sendResponse('Logged Out');
      });
  }

  // if (request.action === 'test') {
  //   logger('Testing');
  //   test().then(sendResponse);
  // }

  // if (request.action === 'testunload') {
  //   logger('Unloading');
  //   return 'Unloaded';
  // }
  return true;
});

async function inactivateUser(db: firebase.firestore.Firestore, deviceId: string): Promise<void> {
  const userCollection = db.collection('users');
  const userSnap = await userCollection.where('deviceId', '==', deviceId).get();
  userSnap.forEach((doc) => {
    userCollection.doc(doc.id).update({ status: 'inactive' });
  });
}

function getDeviceId(): Promise<string> {
  return new Promise((resolve) => {
    // @ts-ignore
    chrome.instanceID.getID((deviceId: string) => {
      resolve(deviceId);
    });
  });
}

// export function convertToUser<T extends IUser>(firebaseUser: IFirebaseUser): T {
//   return { ...firebaseUser, lastSeenDate: firebaseUser.lastSeenDate.toDate().toUTCString() };
//   // return firebaseUser;
// }

// async function test() {
//   const accountSnap = await db.collection('accounts')
//     .where('accountNum', '==', '3499441')
//     .limit(1)
//     .get();

//   return new Promise((resolve) => {
//     let account;
//     accountSnap.forEach(doc => {
//       account = doc.data();
//       logger(account);
//     });
//     resolve(account);
//   });
// }

function updateStorage(userStatuses: IUserStatusCache): void {
  chrome.storage.local.set({ nsUserStatus: JSON.stringify(userStatuses) });
}

async function addUpdateAccountDoc(db: firebase.firestore.Firestore, data: IUpdate): Promise<string | undefined> {
  let accountDocId: string | undefined;
  if (!data.accountName) return accountDocId;
  const accountCollection = db.collection('accounts');
  // createUpdateAccount(accountCollection, data);
  const updateObj: { accountName: string, accountNum: string, logoUrl: string, lastSeenDate?: firebase.firestore.Timestamp } = {
    accountName: data.accountName,
    accountNum: data.accountNum,
    logoUrl: data.logoUrl,
  };
  if (data.user.status !== 'inactive') {
    updateObj.lastSeenDate = firebase.firestore.Timestamp.fromDate(new Date(data.lastSeenDate));
  }
  // This can be asyncronous
  accountCollection.doc(data.accountNum).set(updateObj, { merge: true });
  // const accountSnap = await accountCollection.where('accountNum', '==', data.accountNum).get();
  // if (accountSnap.empty) {
  //   logger(`${new Date().toTimeString()} Creating account ${data.accountNum}`, data);
  //   logger(`Account snap is empty ${accountSnap.empty}`, accountSnap.docs);
  //   accountDocId = await createAccount(accountCollection, data);
  // } else {
  //   accountDocId = updateAccount(accountCollection, accountSnap, data);
  // }
  return data.accountNum;
}

async function addUpdateUserDoc(db: firebase.firestore.Firestore, data: IUpdate, accountDocId: string, accountName: string) {
  const userCollection = db.collection('users');

  if (!data.user.userId) return;
  if (data.isBergankdv) {
    userCollection.doc(data.user.userId).set({
      deviceId: data.user.deviceId,
      email: data.user.email,
      userId: data.user.userId,
      name: data.user.name,
      status: data.user.status,
    }, { merge: true, mergeFields: ['email', 'name', 'status'] });
    // const userSnap = await userCollection.where('userId', '==', data.user.userId).get();
    // if (userSnap.empty) {
    //   createUser(userCollection, data.user);
    // } else {
    //   updateDeviceId(userCollection, userSnap, data.user);
    // }
  } else {
    // userCollection.doc(data.user.userId).update({
    //   account: { id: accountDocId, name: accountName },
    //   email: data.user.email,
    //   environment: data.user.environment,
    //   lastSeenDate: firebase.firestore.Timestamp.fromDate(new Date(data.lastSeenDate)),
    //   status: data.user.status,
    //   url: data.user.url,
    //   usingSharedLogin: data.user.usingSharedLogin,
    // });
    const userSnap = await userCollection.where('deviceId', '==', data.user.deviceId).get();
    if (!userSnap.empty) {
      userSnap.forEach((doc) => {
        userCollection.doc(doc.id).update({
          account: { id: accountDocId, name: accountName },
          email: data.user.email,
          environment: data.user.environment,
          lastSeenDate: firebase.firestore.Timestamp.fromDate(new Date(data.lastSeenDate)),
          status: data.user.status,
          url: data.user.url,
          usingSharedLogin: data.user.usingSharedLogin,
        });
      });
      // updateUser(userCollection, userSnap, data.user, accountDocId, accountName);
    }
  }
}

// async function createUpdateAccount(accountCollection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>, data: IUpdate): Promise<string> {
//   const updateObj: { accountName: string, accountNum: string, logoUrl: string, lastSeenDate?: firebase.firestore.Timestamp } = {
//     accountName: data.accountName,
//     accountNum: data.accountNum,
//     logoUrl: data.logoUrl,
//   };
//   if (data.user.status !== 'inactive') {
//     updateObj.lastSeenDate = firebase.firestore.Timestamp.fromDate(new Date(data.lastSeenDate));
//   }
//   // This can be asyncronous
//   accountCollection.doc(data.accountNum).set(updateObj, { merge: true });
//   return data.accountNum;
// }

// async function createAccount(accountCollection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>, data: IUpdate): Promise<string> {
//   // const accountDoc = await accountCollection.add({
//   //   accountName: data.accountName,
//   //   accountNum: data.accountNum,
//   //   lastSeenDate: firebase.firestore.Timestamp.fromDate(new Date(data.lastSeenDate)),
//   //   logoUrl: data.logoUrl,
//   //   dateCreated: firebase.firestore.Timestamp.fromDate(new Date()),
//   //   fullData: JSON.stringify(data),
//   // });
//   // This can be asyncronous
//   const updateObj: { accountName: string, accountNum: string, logoUrl: string, lastSeenDate?: firebase.firestore.Timestamp } = {
//     accountName: data.accountName,
//     accountNum: data.accountNum,
//     logoUrl: data.logoUrl,
//     // dateCreated: firebase.firestore.Timestamp.fromDate(new Date()),
//     // fullData: JSON.stringify(data),
//   };
//   if (data.user.status !== 'inactive') {
//     updateObj.lastSeenDate = firebase.firestore.Timestamp.fromDate(new Date(data.lastSeenDate));
//   }
//   accountCollection.doc(data.accountNum).set(updateObj, { merge: true });
//   return data.accountNum;
// }

// function updateAccount(accountCollection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>, accountSnap: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>, data: IUpdate): string | undefined {
//   let accountDocId: string | undefined;
//   // accountSnap.forEach((doc) => {
//   //   const updateObj: { accountName: string, logoUrl: string, lastSeenDate?: firebase.firestore.Timestamp } = {
//   //     accountName: data.accountName,
//   //     logoUrl: data.logoUrl,
//   //   };
//   //   if (data.user.status !== 'inactive') {
//   //     updateObj.lastSeenDate = firebase.firestore.Timestamp.fromDate(new Date(data.lastSeenDate));
//   //   }
//   //   accountCollection.doc(doc.id).update(updateObj);
//   //   accountDocId = doc.id;
//   // });
//   const updateObj: { accountName: string, logoUrl: string, lastSeenDate?: firebase.firestore.Timestamp } = {
//     accountName: data.accountName,
//     logoUrl: data.logoUrl,
//   };
//   if (data.user.status !== 'inactive') {
//     updateObj.lastSeenDate = firebase.firestore.Timestamp.fromDate(new Date(data.lastSeenDate));
//   }
//   accountCollection.doc(data.accountNum).update(updateObj);
//   return data.accountNum;
// }

// async function createUpdateUser(userCollection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>, data: IUpdate['user']): Promise<string> {
//   const userDoc = await userCollection.add({
//     deviceId: data.deviceId,
//     email: data.email,
//     userId: data.userId,
//     // lastSeenDate: firebase.firestore.Timestamp.fromDate(new Date(data.lastSeenDate)),
//     name: data.name,
//     status: data.status,
//   });
//   return userDoc.id;
// }

// async function createUser(userCollection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>, data: IUpdate['user']): Promise<string> {
//   const userDoc = await userCollection.add({
//     deviceId: data.deviceId,
//     email: data.email,
//     userId: data.userId,
//     // lastSeenDate: firebase.firestore.Timestamp.fromDate(new Date(data.lastSeenDate)),
//     name: data.name,
//     status: data.status,
//   });
//   return userDoc.id;
// }

// async function updateDeviceId(userCollection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>, userSnap: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>, data: IUpdate['user']): Promise<void> {
//   userSnap.forEach((doc) => {
//     userCollection.doc(doc.id).update({
//       deviceId: data.deviceId,
//       email: data.email,
//       userId: data.userId,
//       name: data.name,
//       status: data.status,
//     });
//   });
// }

// async function updateUser(userCollection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>, userSnap: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>, data: IUpdate['user'], accountDocId: string, accountName: string): Promise<void> {
//   userSnap.forEach((doc) => {
//     userCollection.doc(doc.id).update({
//       account: { id: accountDocId, name: accountName },
//       email: data.email,
//       environment: data.environment,
//       lastSeenDate: firebase.firestore.Timestamp.fromDate(new Date(data.lastSeenDate)),
//       status: data.status,
//       url: data.url,
//       usingSharedLogin: data.usingSharedLogin,
//     });
//   });
// }

function logger(arg1: unknown, arg2?: unknown): void {
  // eslint-disable-next-line no-console
  console.log(arg1, arg2);
}