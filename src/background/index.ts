import { IFirebaseUser, IUpdate, IUserStatusCache } from '../../typings';
import firebase from 'firebase/app';
import db from '../firebase';

// Unsubscribe must be global so it can be called from a later message
let unsubscribe: () => void | undefined;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // chrome.storage.local.remove(['nsUserStatusUsage']);

  if (request.action === 'updateStatus') {
    const data: IUpdate | void = request.source;
    if (!data) return;
    getDeviceId()
      .then(async (deviceId: string) => {
        data.user.deviceId = deviceId;
        logger('User', data);

        const accountDocId = addUpdateAccountDoc(db, data);
        if (accountDocId) {
          await addUpdateUserDoc(db, data, accountDocId, data.accountName);
          sendResponse('success');
        }
      })
      .catch((err) => handleError('There was a problem getting the device Id', err));
  }

  if (request.action === 'addUserStatusListener') {
    const date = new Date();
    date.setHours(date.getHours() - 1); // We don't need to listen for users active over 1 hour ago
    logger('Date 1 Hour Ago', date);
    unsubscribe = db.collection('users').where('lastSeenDate', '>', date).onSnapshot((snapshot) => {
      const userStatuses: IUserStatusCache = {};
      snapshot.forEach((doc) => {
        firebaseUsageCount('status_listener', 'read'); // Note: delete me
        const firebaseUser = <IFirebaseUser>doc.data();
        if (!userStatuses[firebaseUser.email] || isDateGreater(firebaseUser.lastSeenDate.toDate(), userStatuses[firebaseUser.email].lastSeenDate)) {
          userStatuses[firebaseUser.email] = { ...firebaseUser, lastSeenDate: firebaseUser?.lastSeenDate.toDate().toUTCString() };
        }
      });
      updateStorage(userStatuses);
      logger('Users', userStatuses);

      snapshot.docChanges().forEach((change) => {
        firebaseUsageCount('status_listener', 'read'); // Note: delete me
        const changedDoc = <IFirebaseUser>change.doc.data();
        if (change.type === 'added' || change.type === 'modified') {
          logger('Updated user:', change.doc.data());
          if (!userStatuses[changedDoc.email] || isDateGreater(changedDoc.lastSeenDate.toDate(), userStatuses[changedDoc.email].lastSeenDate)) {
            userStatuses[changedDoc.email] = { ...changedDoc, lastSeenDate: changedDoc.lastSeenDate.toDate().toUTCString() };
          }
        }
        if (change.type === 'removed') {
          logger('Removed user:', change.doc.data());
          if (userStatuses[changedDoc.email]) delete userStatuses[changedDoc.email];
        }
        updateStorage(userStatuses);
      });
      getDeviceId()
        .then((deviceId) => {
          sendResponse({ response: 'Added Listener', deviceId });
        })
        .catch((err) => handleError('There was a problem getting the device Id', err));
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
        try {
          await inactivateUser(db, deviceId);
          sendResponse('Logged Out');
        } catch (err) {
          handleError('There was a problem inactivating user', err);
        }
      })
      .catch((err) => handleError('There was a problem getting the device Id', err));
  }

  if (request.action === 'isTabActive') {
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
      const activeTabId = tabs[0]?.id;
      const requestingTabId = sender.tab?.id;
      sendResponse(activeTabId === requestingTabId);
    });
  }
  return true;
});

async function inactivateUser(db: firebase.firestore.Firestore, deviceId: string): Promise<void> {
  const userCollection = db.collection('users');
  const userSnap = await userCollection.where('deviceId', '==', deviceId).get();
  firebaseUsageCount('inactivate_user', 'read'); // Note: delete me
  userSnap.forEach((doc) => {
    userCollection.doc(doc.id).update({ status: 'inactive' })
      .then(() => firebaseUsageCount('inactivate_user', 'write')); // Note: delete me
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

function addUpdateAccountDoc(db: firebase.firestore.Firestore, data: IUpdate): string | undefined {
  let accountDocId: string | undefined;
  if (!data.accountName) return accountDocId;
  const accountCollection = db.collection('accounts');
  const updateObj: { accountName: string, accountNum?: string, logoUrl?: string, lastSeenDate?: firebase.firestore.Timestamp } = {
    accountName: data.accountName,
  };
  if (data.accountName) updateObj.accountName = data.accountName;
  if (data.logoUrl) updateObj.logoUrl = data.logoUrl;
  if (data.user.status !== 'inactive') {
    updateObj.lastSeenDate = firebase.firestore.Timestamp.fromDate(new Date(data.lastSeenDate));
  }
  // This can be asyncronous
  accountCollection.doc(data.accountNum).set(updateObj, { merge: true })
    .then(() => firebaseUsageCount('update_account', 'write')) // Note: delete me
    .catch((err) => handleError('There was a problem updating the account', err));
  return data.accountNum;
}

async function addUpdateUserDoc(db: firebase.firestore.Firestore, data: IUpdate, accountDocId: string, accountName: string) {
  const userCollection = db.collection('users');

  try {
    if (!data.user.userId) return;
    if (data.isBergankdv) {
      // Create or update the user, updates only effect email, name and status
      const userDoc = await userCollection.doc(data.user.userId).get();
      firebaseUsageCount('lookup_user', 'read'); // Note: delete me
      if (userDoc.exists) {
        userCollection.doc(data.user.userId).update({
          deviceId: data.user.deviceId,
          name: data.user.name,
        })
          .then(() => firebaseUsageCount('update_user_bkdv', 'write')) // Note: delete me
          .catch((err) => handleError('There was a problem updating the user', err));
      } else {
        userCollection.doc(data.user.userId).set({
          deviceId: data.user.deviceId,
          email: data.user.email.toLowerCase(),
          userId: data.user.userId,
          name: data.user.name,
          status: data.user.status,
        })
          .then(() => firebaseUsageCount('create_user', 'write')) // Note: delete me
          .catch((err) => handleError('There was a problem updating the user', err));
      }
    } else {
      // Update the account the user is logged into based on their device id
      logger('Updating account', data);
      // Try getting from cache first
      const userSnap = await userCollection.where('deviceId', '==', data.user.deviceId).get({ source: 'cache' });
      if (!userSnap.empty) {
        userSnap.forEach((doc) => {
          userCollection.doc(doc.id).update({
            account: { id: accountDocId, name: accountName },
            email: data.user.email.toLowerCase(),
            environment: data.user.environment,
            lastSeenDate: firebase.firestore.Timestamp.fromDate(new Date(data.lastSeenDate)),
            status: data.user.status,
            url: data.user.url,
            usingSharedLogin: data.user.usingSharedLogin,
          })
            .then(() => firebaseUsageCount('update_user', 'write')) // Note: delete me
            .catch((err) => handleError('There was a problem updating the user', err));
        });
      }
    }
  } catch (err) {
    handleError('There was a problem updating the user', err);
  }
}

function isDateGreater(date1: Date, date2: string): boolean {
  if (!date1) return false;
  if (!date2) return true;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getTime() > d2.getTime();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function logger(arg1: unknown, arg2?: unknown): void {
  // eslint-disable-next-line no-console
  console.log(arg1, arg2);
}

function handleError(title: string, err: unknown): void {
  // eslint-disable-next-line no-console
  console.error(title, err);
}

/** 
 * { 
 *    2020-01-01: {
 *     read: {
 *       update_user: 1,
 *       total: 10,
 *     }
 *   }
 * }
*/

function firebaseUsageCount(functionName: string, operation: 'read' | 'write') {
  chrome.storage.local.get(['nsUserStatusUsage'], (existingStorage) => {
    console.log('Existing Storage', existingStorage);
    const existingUsage = existingStorage.nsUserStatusUsage ? JSON.parse(existingStorage.nsUserStatusUsage) : { };
    console.log('Existing Usage', existingUsage);
    const currentDate = new Date().toISOString().split('T')[0];
    console.log('Current Date', currentDate);
    const todaysUsage = existingUsage[currentDate] ?? { [operation]: { total: 0 } };
    console.log('Today\'s Usage', todaysUsage);

    // todaysUsage[`${functionName}-${operation}`] += 1;
    const todaysOperationUsage = todaysUsage[operation] || { total: 0 };
    todaysOperationUsage.total += 1;
    todaysOperationUsage[functionName] = todaysOperationUsage[functionName] ? todaysOperationUsage[functionName] + 1 : 1;
    todaysUsage[operation] = todaysOperationUsage;
    console.log('New Usages', todaysUsage);
    existingUsage[currentDate] = todaysUsage;
    console.log('Writing Usage', existingUsage);
    chrome.storage.local.set({ nsUserStatusUsage: JSON.stringify(existingUsage) });
  });
}