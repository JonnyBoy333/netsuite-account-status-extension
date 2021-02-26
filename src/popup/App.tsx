import React, { FC, Fragment, useEffect, useState } from 'react';
import { Flipper } from 'react-flip-toolkit';
import db from '../firebase';
import { IAccount, IFirebaseAccount, IFirebaseUser, IUser } from '../../typings';
import Card from './Card';
import './styles.css';

const App: FC = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [accounts, setAccounts] = useState<IAccount[]>([]);
  const [errors, setErrors] = useState<{ title: string, message: string }[]>([]);
  useEffect(() => {
    const unsubscribe = db.collection('users').onSnapshot((snapshot) => {
      const users: IUser[] = [];
      snapshot.forEach((doc) => {
        const firebaseUser = doc.data() as IFirebaseUser;
        users.push({ ...firebaseUser, lastSeenDate: firebaseUser.lastSeenDate ? firebaseUser.lastSeenDate.toDate().toUTCString() : '' });
      });
      setUsers(() => users);
    }, (err) => {
      setErrors((prevState) => {
        const newState = [...prevState, { title: err.name, message: err.message }];
        return newState;
      });
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
    }, (err) => {
      setErrors((prevState) => {
        const newState = [...prevState, { title: err.name, message: err.message }];
        return newState;
      });
    });
    return unsubscribe;
  }, []);

  const sortedAccounts = accounts.sort(sortAccounts);
  const sortedUsers = users.sort(sortUsers);

  function sortAccounts(a: IAccount, b: IAccount): number {
    const aHasActiveUsers = users.filter((user) => user.status === 'active').map((user) => user.account?.id).includes(a.accountNum);
    const bHasActiveUsers = users.filter((user) => user.status === 'active').map((user) => user.account?.id).includes(b.accountNum);
    const activeUserComparison = aHasActiveUsers === bHasActiveUsers ? 0 : aHasActiveUsers ? -1 : 1;
    // console.log('Account Rounded Last Seen', { [a.accountName]: `${a.lastSeenDate}:${roundToMinutes(1, a.lastSeenDate)}`, [b.accountName]: `${b.lastSeenDate}:${roundToMinutes(1, b.lastSeenDate)}` });
    const lastSeenComparison = roundToMinutes(1, b.lastSeenDate) - roundToMinutes(1, a.lastSeenDate);
    const accountNameComparison = a.accountName.localeCompare(b.accountName);
    return activeUserComparison || lastSeenComparison || accountNameComparison;
  }

  function sortUsers(a: IUser, b: IUser): number {
    return a.status.localeCompare(b.status) || roundToMinutes(1, b.lastSeenDate) - roundToMinutes(1, a.lastSeenDate);
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

  const Errors = () => {
    return (
      <div className='center error'>
        {errors.map((error, i) => {
          return <span key={i}>{error.title}: {error.message}</span>;
        })}
      </div>
    );
  };

  const Accounts = () => {
    return accounts.length === 0 && users.length === 0
      ? <Loader />
      : <Fragment>
        {sortedAccounts.map((account) => {
          const relatedUsers = sortedUsers.filter((user) => user.account?.id === account.accountNum);
          return <Card key={account.accountNum} users={relatedUsers} {...account}></Card>;
        })}
      </Fragment>;
  };

  logger('User State', users);
  logger('Account State', accounts);
  return (
    <div className='container'>
      <Flipper flipKey={accounts.map((account) => account.accountNum).join('')}>
        {/* <button onClick={shuffleList}> shuffle</button> */}
        <div className='flex-container'>
          <div className='center'><h1>NetSuite Account Status</h1></div>
          {errors.length > 0 ? <Errors /> : <Accounts />}
        </div>
      </Flipper>
    </div>
  );
};

function roundToMinutes(minutes: number, dateStr: string): number {
  const d = new Date(dateStr);
  const ms = 1000 * 60 * minutes; // convert minutes to ms
  const roundedDate = new Date(Math.round(d.getTime() / ms) * ms);
  return roundedDate.getTime();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function logger(arg1: unknown, arg2?: unknown): void {
  // eslint-disable-next-line no-console
  // console.log(arg1, arg2);
}

export default App;
