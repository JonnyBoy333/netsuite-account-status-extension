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
      const sortedUsers = users.sort((a, b) => {
        return a.status.localeCompare(b.status) || new Date(b.lastSeenDate).getTime() - new Date(a.lastSeenDate).getTime();
      });
      setUsers(() => sortedUsers);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = db.collection('accounts').orderBy('lastSeenDate', 'desc').limit(10).onSnapshot((snapshot) => {
      const accounts: IAccount[] = [];
      snapshot.forEach((doc) => {
        const firebaseAccount = doc.data() as IFirebaseAccount;
        if (firebaseAccount.accountNum !== '3499441') accounts.push({ ...firebaseAccount, lastSeenDate: firebaseAccount.lastSeenDate.toDate().toUTCString(), id: doc.id });
      });
      // TODO: sort to minute and then by name
      setAccounts(() => accounts);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // TODO: sorty by hasactiveuser and then by last seen date and then by name
    // const sortedAccounts;
  }, [users]);

  const Loader = () => {
    return(
      <div className='spinner transition-shown center'>
        <div className='bounce1'></div>
        <div className='bounce2'></div>
        <div className='bounce3'></div>
      </div>
    );
  };

  console.log('User State', users);
  console.log('Account State', accounts);
  return (
    <div className='container'>
      <Flipper flipKey={accounts.map((account) => account.accountNum).join('')}>
        {/* <button onClick={shuffleList}> shuffle</button> */}
        <div className='flex-container'>
          <div className='center'><h1>NetSuite Account Status</h1></div>
          {accounts.length === 0 && users.length === 0
            ? <Loader></Loader>
            : accounts.map(account => {
              const relatedUsers = users.filter((user) => user.account?.id === account.id);
              return <Card key={account.accountNum} users={relatedUsers} {...account}></Card>;
            })}
        </div>
      </Flipper>
    </div>
  );
};

export default App;
