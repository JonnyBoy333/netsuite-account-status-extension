export type statuses = 'active' | 'idle' | 'inactive';

interface IBaseUser {
  account?: { id: string; name: string; }
  deviceId: string;
  name: string;
  email: string;
  environment: 'PRODUCTION' | 'SANDBOX';
  status: statuses;
  url: string;
  userId: string;
  usingSharedLogin: boolean;
}

export interface IFirebaseUser extends IBaseUser {
  lastSeenDate: firebase.default.firestore.Timestamp;
}

export interface IUser extends IBaseUser {
  lastSeenDate: string;
}

interface IBaseAccount {
  accountName: string;
  accountNum: string;
  logoUrl: string;
}
export interface IFirebaseAccount extends IBaseAccount {
  lastSeenDate: firebase.default.firestore.Timestamp;
}

export interface IAccount extends IBaseAccount {
  lastSeenDate: string;
  id: string;
}

export interface IUpdate {
  accountNum: string;
  lastSeenDate: string;
  logoUrl: string;
  accountName: string;
  isBergankdv: boolean;
  user: IUser;
}

interface IContextObj {
  accountNum: string;
  name: string;
  email: string;
  environment: 'PRODUCTION' | 'SANDBOX';
  userId: string;
}

export interface IUserStatusCache {
  [email: string]: IUser
}

declare global {
  interface Window { netsuite_status: NodeJS.Timeout | undefined }
}