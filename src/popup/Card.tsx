import React, { FC, Fragment } from 'react';
import { Flipped } from 'react-flip-toolkit';
import { convertMS, generateLastSeenTxt } from '../content';
import { IAccount, IUser } from '../../typings';
import './styles.css';

interface IProps extends IAccount {
  users: IUser[]
}

const Card: FC<IProps> = ({ accountNum, accountName, logoUrl, lastSeenDate, users }) => {

  const hasActiveUsers = users.filter((user) => user.status === 'active').length > 0;
  const { textDifference, recentlySeenClass } = getLastSeenTextAndClass(lastSeenDate, !hasActiveUsers);
  const headerClasses = ['grid-item'];
  if (users.length > 0) headerClasses.push('grid-header-active-users');
  const sharedLoginPill = <div className='pill-shared-login inactive' style={{ color: 'ffffff' }}>SHARED</div>;
  return (
    <Flipped key={accountNum} flipId={accountNum}>
      <div className='grid-container'>
        <div className={[...headerClasses].join(' ')} style={{ justifyContent: 'center' }}>{logoUrl && <img className='image' src={logoUrl}></img>}</div>
        <div className={[...headerClasses, 'title-item'].join(' ')}>
          <span className='header'>{accountName}</span>
          <div className={`pill-header ${users.length === 0 ? 'inactive' : recentlySeenClass}`}>Active {textDifference} ago</div>
        </div>
        {users.map((user) => {
          const isUserInactive = user.status !== 'active';
          const { textDifference, recentlySeenClass } = getLastSeenTextAndClass(user.lastSeenDate, isUserInactive);
          const environment = user.environment === 'PRODUCTION' ? <div className='pill-outline primary-pill'>PROD</div> : <div className='pill-outline warning-pill'>SB</div>;
          return (
            <Fragment key={user.userId}>
              <div className='grid-item user-item' key={user.userId}>{user.name}</div>
              <div className='grid-item user-item' key={user.userId}>{environment}{user.email}{user.usingSharedLogin && sharedLoginPill}</div>
              <div className={`grid-item user-item last-seen`} key={user.userId}><div className={`pill-item ${recentlySeenClass}`}>Active {textDifference} ago</div></div>
            </Fragment>
          );
        })}
      </div>
    </Flipped>
  );
};

function getLastSeenTextAndClass(lastSeenDate: string, inactive: boolean): { textDifference: string, recentlySeenClass: string } {
  const currentDate = new Date().getTime();
  const lastSeen = new Date(lastSeenDate).getTime();
  const seenDifferenceObj = convertMS(currentDate - lastSeen);
  const textDifference = generateLastSeenTxt(seenDifferenceObj);
  const recentlySeenClass = getClassName(currentDate, lastSeen, inactive);
  return { textDifference, recentlySeenClass };
}

function getClassName(currentDate: number, lastSeen: number, inactive = false) {
  if (inactive) return 'inactive';
  const oneDay = 1000 * 60 * 60 * 24;
  const oneHour = 1000 * 60 * 60;
  const fifteenMinutes = 1000 * 60 * 15;
  let seenClass = '';
  if ((currentDate - lastSeen) > oneDay) seenClass = 'danger';
  else if ((currentDate - lastSeen) > oneHour) seenClass = 'warning';
  else if ((currentDate - lastSeen) > fifteenMinutes) seenClass = 'primary';
  else if ((currentDate - lastSeen) < fifteenMinutes) seenClass = 'success';
  return seenClass;
}

export default Card;