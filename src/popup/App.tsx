import React, { FC, useEffect, useState } from 'react';
import { Flipper } from 'react-flip-toolkit';
import db from '../firebase';
import { IAccount, IFirebaseAccount, IFirebaseUser, IUser } from '../../typings';
// import { shuffle } from 'lodash';
import Card from './Card';
import './styles.css';

const App: FC = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [accounts, setAccounts] = useState<IAccount[]>([]);
  // const shuffleList = () => setAccounts(shuffle(accounts));
  useEffect(() => {
    const unsubscribe = db.collection('users').onSnapshot((snapshot) => {
      const users: IUser[] = [];
      snapshot.forEach((doc) => {
        const firebaseUser = doc.data() as IFirebaseUser;
        users.push({ ...firebaseUser, lastSeenDate: firebaseUser.lastSeenDate ? firebaseUser.lastSeenDate.toDate().toUTCString() : '' });
      });
      setUsers(() => users);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = db.collection('accounts').orderBy('lastSeenDate', 'desc').limit(10).onSnapshot((snapshot) => {
      const accounts: IAccount[] = [];
      snapshot.forEach((doc) => {
        const firebaseAccount = doc.data() as IFirebaseAccount;
        if (firebaseAccount.accountNum !== '3499441') accounts.push({ ...firebaseAccount, lastSeenDate: firebaseAccount.lastSeenDate.toDate().toUTCString() });
      });
      setAccounts(() => accounts);
    });
    return unsubscribe;
  }, []);

  const sortedAccounts = accounts.sort(sortAccounts);
  const sortedUsers = users.sort(sortUsers);

  function sortAccounts(a: IAccount, b: IAccount): number {
    const aHasActiveUsers = users.filter((user) => user.status === 'active').map((user) => user.account?.id).includes(a.accountNum);
    const bHasActiveUsers = users.filter((user) => user.status === 'active').map((user) => user.account?.id).includes(b.accountNum);
    const activeUserComparison = aHasActiveUsers === bHasActiveUsers ? 0 : aHasActiveUsers ? -1 : 1;
    const lastSeenComparison = roundToMinutes(1, b.lastSeenDate) - roundToMinutes(1, a.lastSeenDate);
    const accountNameComparison = a.accountName.localeCompare(b.accountName);
    return activeUserComparison || lastSeenComparison || accountNameComparison;
  }

  function sortUsers(a: IUser, b: IUser): number {
    return a.status.localeCompare(b.status) || new Date(b.lastSeenDate).getTime() - new Date(a.lastSeenDate).getTime();
  }

  const Loader = () => {
    return (
      <div className='spinner transition-shown center'>
        <div className='bounce1'></div>
        <div className='bounce2'></div>
        <div className='bounce3'></div>
      </div>
    );
  };

  logger('User State', users);
  logger('Account State', accounts);
  return (
    <div className='container'>
      <Flipper flipKey={accounts.map((account) => account.accountNum).join('')}>
      {/* <button onClick={shuffleList}> shuffle</button> */}
      <div className='flex-container'>
        <div className='center'><h1>NetSuite Account Status</h1></div>
        {accounts.length === 0 && users.length === 0
          ? <Loader></Loader>
          : sortedAccounts.map((account) => {
            const relatedUsers = sortedUsers.filter((user) => user.account?.id === account.accountNum);
            return <Card key={account.accountNum} users={relatedUsers} {...account}></Card>;
          })}
      </div>
      </Flipper>
    </div>
  );
};

function roundToMinutes(minutes: number, dateStr: string): number {
  const d = new Date(dateStr);
  let ms = 1000 * 60 * minutes; // convert minutes to ms
  let roundedDate = new Date(Math.floor(d.getTime() / ms) * ms);
  return roundedDate.getTime();
}

function logger(arg1: unknown, arg2?: unknown): void {
  // eslint-disable-next-line no-console
  // console.log(arg1, arg2);
}

export default App;
