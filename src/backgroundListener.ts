// import firebase from 'firebase'; // TODO: remove when done

chrome.runtime.onMessage.addListener(async (request, sender) => {

    if (request.action === 'updateStatus') {
        const data: IUpdate | void = request.source;
        if (!data) return;
        // @ts-ignore
        chrome.instanceID.getID(async (deviceId: string) => {
            data.user.deviceId = deviceId;
            console.log('User', data);
            const db = firebase.firestore();

            // let accountDocId: string;
            const accountDocId = await addUpdateAccountDoc(db, data);
            if (accountDocId) {
                addUpdateUserDoc(db, data, accountDocId);
            }
        });
    }

    // if (request.action === 'test') {
    //     console.log('Testing');
    //     // console.log('Firebase', firebase);
    //     const db = firebase.firestore();
    //     // Create a reference to the cities collection
    //     const accountSnap = await db.collection('account')
    //       .where('account_num', '==', '1729274')
    //       .get();

    //     accountSnap.forEach(doc => console.log(doc.data()));
    // }
});

async function addUpdateAccountDoc(db: firebase.firestore.Firestore, data: IUpdate): Promise<string | undefined> {
    let accountDocId: string | undefined;
    const accountCollection = db.collection('accounts');
    const accountSnap = await accountCollection.where('account_num', '==', data.accountNum).get();
    console.log('Accounts', accountSnap);
    console.log('Count', accountSnap.empty);
    if (accountSnap.empty) {
        accountDocId = await createAccount(accountCollection, data);
    } else {
        accountDocId = updateAccount(accountCollection, accountSnap, data);
    }
    return accountDocId;
}

async function addUpdateUserDoc(db: firebase.firestore.Firestore, data: IUpdate, accountDocId: string) {
    const userCollection = db.collection('users');

    if (data.isBergankdv) {
        const userSnap = await userCollection.where('user_id', '==', data.user.userId).get();
        if (userSnap.empty) {
            createUser(userCollection, data.user, accountDocId);
        } else {
            updateDeviceId(userCollection, userSnap, data.user, accountDocId);
        }
    } else {
        const userSnap = await userCollection.where('device_id', '==', data.user.deviceId).get();
        if (!userSnap.empty) {
            updateUser(userCollection, userSnap, data.user, accountDocId);
        }
    }
}

async function createAccount(accountCollection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>, data: IUpdate): Promise<string> {
    const accountDoc = await accountCollection.add({
        account_name: data.accountName,
        account_num: data.accountNum,
        last_seen_date: data.lastSeenDate,
        logo_url: data.logoUrl,
    });
    return accountDoc.id;
}

function updateAccount(accountCollection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>, accountSnap: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>, data: IUpdate): string | undefined {
    let accountDocId: string | undefined;
    accountSnap.forEach((doc) => {
        accountCollection.doc(doc.id).update({
            account_name: data.accountName,
            last_seen_date: data.lastSeenDate,
            logo_url: data.logoUrl,
        });
        accountDocId = doc.id;
    });
    return accountDocId;
}

async function createUser(userCollection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>, data: IUpdate['user'], accountDocId: string): Promise<string> {
    const userDoc = await userCollection.add({
        device_id: data.deviceId,
        email: data.email,
        user_id: data.userId,
        last_seen_date: data.lastSeenDate,
        name: data.name,
    });
    return userDoc.id;
}

async function updateDeviceId(userCollection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>, userSnap: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>, data: IUpdate['user'], accountDocId: string): Promise<void> {
    userSnap.forEach((doc) => {
        doc.id;
        userCollection.doc(doc.id).update({
            email: data.email,
            name: data.name,
            device_id: data.deviceId,
        });
    });
}

async function updateUser(userCollection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>, userSnap: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>, data: IUpdate['user'], accountDocId: string): Promise<void> {
    userSnap.forEach((doc) => {
        doc.id;
        userCollection.doc(doc.id).update({
            account: accountDocId,
            email: data.email,
            environment: data.environment,
            last_seen_date: data.lastSeenDate,
            name: data.name,
            status: data.status,
            url: data.url,
            using_shared_login: data.usingSharedLogin
        });
    });
}

function test(): string {
    let thing: string;
    // thing = 'red';
    const colorRed = ['red'];
    colorRed.forEach((color: string) => {
        thing = color;
    });
    return thing;
}

function test2() {
    let max: number;
    if (max === undefined) {
      // max used before assinged
        max = 0;
    }
    return max;
}

interface IUpdate {
    accountNum: string;
    lastSeenDate: string;
    logoUrl: string;
    accountName: string;
    isBergankdv: boolean;
    user: {
        deviceId: string;
        name: string;
        email: string;
        environment: string;
        lastSeenDate: string;
        status: string;
        url: string;
        userId: string;
        usingSharedLogin: boolean;
    };
}

interface IContextObj {
    accountNum: string;
    name: string;
    email: string;
    environment: string;
    userId: string;
}