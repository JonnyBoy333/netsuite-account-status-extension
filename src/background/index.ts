import { IFirebaseUser, IUpdate, IUserStatusCache } from '../../typings';
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
        logger('User', data);

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
    // @ts-ignore instanceID does exist here
    chrome.instanceID.getID((deviceId: string) => {
      resolve(deviceId);
    });
  });
}

function updateStorage(userStatuses: IUserStatusCache): void {
  chrome.storage.local.set({ nsUserStatus: JSON.stringify(userStatuses) });
}

async function addUpdateAccountDoc(db: firebase.firestore.Firestore, data: IUpdate): Promise<string | undefined> {
  let accountDocId: string | undefined;
  if (!data.accountName) return accountDocId;
  const accountCollection = db.collection('accounts');
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
  return data.accountNum;
}

async function addUpdateUserDoc(db: firebase.firestore.Firestore, data: IUpdate, accountDocId: string, accountName: string) {
  const userCollection = db.collection('users');

  if (!data.user.userId) return;
  if (data.isBergankdv) {
    logger('Creating account', data);
    // Create or update the user, updates only effect email, name and status
    const userDoc = await userCollection.doc(data.user.userId).get();
    if (userDoc.exists) {
      userCollection.doc(data.user.userId).update({
        email: data.user.email,
        name: data.user.name,
        status: data.user.status,
      });
    } else {
      userCollection.doc(data.user.userId).set({
        deviceId: data.user.deviceId,
        email: data.user.email,
        userId: data.user.userId,
        name: data.user.name,
        status: data.user.status,
      });
    }
  } else {
    // Update the account the user is logged into based on their device id
    logger('Updating account', data);
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
    }
  }
}

function logger(arg1: unknown, arg2?: unknown): void {
  // eslint-disable-next-line no-console
  console.log(arg1, arg2);
}