const url = document.location.href;
console.log('URL', url);
if (url.includes('/login/') || url.includes('/customerlogin')) {
  addUserStatusListener((response) => {
    console.log('Response', response);
    addInputListener(document, response.deviceId);
  });
  
  window.addEventListener('beforeunload', () => {
    console.log('Running beforeunload');
    chrome.runtime.sendMessage({ action: 'removeUserStatusListener' });
  });
} else {
  getStatus(document);
}

// chrome.runtime.sendMessage({ action: 'test' }, (response) => {
//   console.log('Response', response);
// });

// window.addEventListener('beforeunload', () => {
//   console.log('Running beforeunload');
//   chrome.runtime.sendMessage({ action: 'testunload' }, (response) => {
//     console.log('Unload Response', response);
//   });
// });

function addUserStatusListener(callback: (response: any) => void) {
  chrome.runtime.sendMessage({ action: 'addUserStatusListener' }, callback);
}

function addInputListener(document: Document, userDeviceId: string): void {
  addStatusElement(document);
  let userStatuses: IUserStatusCache;

  chrome.storage.local.get(['nsUserStatus'], (result) => {
    console.log('Value currently is ' + result.nsUserStatus);
    userStatuses = JSON.parse(result.nsUserStatus);
    const email = (<HTMLInputElement>document.getElementById('userName'))?.value;
    console.log('Initial Email', email);
    displayUserMsg(email, userDeviceId, userStatuses);
  });
  chrome.storage.onChanged.addListener((changes) => {
    console.log('User status storage changes', changes);
    if (changes.nsUserStatus) {
      userStatuses = JSON.parse(changes.nsUserStatus.newValue);
      console.log('User Statuses', userStatuses);
    }
  });

  // console.log('User Statuses', userStatuses);
  document.getElementById('userName')?.addEventListener('keyup', (event) => {
    console.log('Typing', (<HTMLInputElement>event.target).value);
    displayUserMsg((<HTMLInputElement>event.target).value, userDeviceId, userStatuses);
  });

  document.getElementById('userName')?.addEventListener('change', (event) => {
    console.log('Entered', (<HTMLInputElement>event.target).value);
    displayUserMsg((<HTMLInputElement>event.target).value, userDeviceId, userStatuses);
  });
}

function displayUserMsg(email: string, userDeviceId: string, userStatuses: IUserStatusCache): void {
  // console.log('Typing', (<HTMLInputElement>event.target).value);
  // if (userStatuses && userStatuses[email] && userStatuses[email].status !== 'inactive') {
  if (userStatuses) {
    console.log('Selected User Status', userStatuses[email]);
    const activeUser = userStatuses[email];
    console.log('Device Ids', { userDeviceId, emailDeviceId: activeUser?.deviceId });
    // if (activeUser && userDeviceId !== activeUser.deviceId) { // Note: add this back when done testing
    if (activeUser) {
      displayActiveUserMsg(activeUser);
    } else {
      displayNoActiveUserMsg();
    }
  }
}

function displayActiveUserMsg(activeUser: IUser): void {
  const lastSeen = new Date(activeUser.lastSeenDate).getTime();
  const currentDate = new Date().getTime();
  const seenDifferenceObj = convertMS(currentDate - lastSeen);
  console.log('Seen Difference', seenDifferenceObj);
  const color = getColor(activeUser.status, seenDifferenceObj);
  const lastSeenTxt = generateLastSeenTxt(seenDifferenceObj);
  const hasActiveUser = activeUser.status === 'active' && seenDifferenceObj.m < 60 && seenDifferenceObj.h === 0 && seenDifferenceObj.d === 0;
  console.log('Has Active User', hasActiveUser);
  const msgTxt = generateMsgText(hasActiveUser, activeUser.name, activeUser.account?.name, lastSeenTxt);
  console.log('Last Seen Text', lastSeenTxt);

  const script = `
    var userStatusDiv = document.getElementById('user-status');
    if (userStatusDiv) {
      userStatusDiv.innerHTML = \`${msgTxt}\`;
      userStatusDiv.style.backgroundColor = '${color}';
      userStatusDiv.classList.add('user-status-active');
    }
  `;
  injectScript(document, script);
}

function displayNoActiveUserMsg() {
  const color = 'rgb(65, 182, 34)';
  const msgTxt = generateMsgText(false);

  const script = `
    var userStatusDiv = document.getElementById('user-status');
    if (userStatusDiv) {
      userStatusDiv.innerText = \`${msgTxt}\`;
      userStatusDiv.style.backgroundColor = '${color}';
      userStatusDiv.classList.add('user-status-active');
    }
  `;
  injectScript(document, script);
}

function addStatusElement(document: Document): void {
  const html = `
    <style>
      .user-status {
        border-radius: 3px;
        overflow: hidden;
        display: block;
        text-align: center;
        color: #ffffff;
        margin-top: 10px;
        transition: opacity 0.5s ease-out, height 0.5s ease-out;
        opacity: 0;
        height: 0;
      }
      .user-status-active {
        opacity: 1;
        height: auto;
      }
    </style>
    <div class="user-status" id="user-status"></div>
  `;
  const script = `
        var loginBtn = document.getElementById('login-submit');
        if (loginBtn) loginBtn.insertAdjacentHTML('afterend', \`${html}\`);
      `;
  injectScript(document, script);
}

function generateLastSeenTxt(seenDifferenceObj: { d: number, h: number, m: number, s: number }): string {
  let seenDifference = '';
  if (seenDifferenceObj.d > 0) seenDifference += `${seenDifferenceObj.d} day${seenDifferenceObj.d === 1 ? '' : 's'}`;
  else if (seenDifferenceObj.h > 0) seenDifference += `${seenDifferenceObj.h} hour${seenDifferenceObj.h === 1 ? '' : 's'}`;
  else if (seenDifferenceObj.m > 0) seenDifference += `${seenDifferenceObj.m} minute${seenDifferenceObj.m === 1 ? '' : 's'}`;
  else if (seenDifferenceObj.m <= 0) seenDifference += '< 1 minute';
  return seenDifference;
}

function generateMsgText(hasActiveUser: boolean, userName?: string, accountName?: string | undefined, lastSeenTxt?: string): string {
  return !hasActiveUser
    ? 'No active users in this account.'
    : `${userName}<br>
      ${accountName || ''}<br>
      Last seen ${lastSeenTxt} ago.`;
}

function getColor(status: statuses, { d, h, m }: { d: number, h: number, m: number, s: number }): string {
  let color = 'rgb(65, 182, 34)';
  if (status === 'active' && (m < 15 && h === 0 && d === 0)) color = 'rgb(235, 79, 70)';
  if (status === 'idle' || (m >= 15 && h === 0 && d === 0)) color = 'rgb(255, 125, 34)';
  return color;
}

function getStatus(document: Document) {
  console.log('NetSuite User Status running...');
  // if (!document.getElementsByClassName('ns-role-company')[0]) return;

  const statusObj = gatherData(document);
  console.log('Status', statusObj);

  // Send it to the extension
  chrome.runtime.sendMessage({
    action: 'updateStatus',
    source: statusObj,
  });
  // chrome.runtime.sendMessage({
  //     action: 'test',
  //     source: {}
  // });

  // console.log('Existing Interval', (<any>window).netsuite_status)
  if (!window.netsuite_status) {
    let interval: NodeJS.Timeout;
    const anotherInterval = setInterval(() => {
      if (!document.hidden && !interval) {
        interval = createInterval(document);
      } else if (document.hidden) {
        clearInterval(interval);
        // interval = 0;
      }
    }, 5000);
    window.netsuite_status = anotherInterval;
  }
}

function gatherData(document: Document): IUpdate | void {
  // console.log('Window', Object.keys(window));
  const ctxObj = retrieveContextObj(document);
  if (!ctxObj) return;
  console.log('Context', ctxObj);
  const date = new Date().toUTCString();
  const logoElements = document.getElementsByClassName('ns-logo');
  const domain = `https://${document.location.hostname}`;
  const logoUrl = domain + logoElements[logoElements.length - 1].firstElementChild?.getAttribute('src');
  const accountName = document.getElementsByClassName('ns-role-company')[0].innerHTML;
  const accountNum = ctxObj.accountNum.includes('_') ? ctxObj.accountNum.split('_')[0] : ctxObj.accountNum;

  const updateBody: IUpdate = {
    accountNum,
    logoUrl,
    accountName,
    lastSeenDate: date,
    isBergankdv: accountNum === '3499441',
    user: {
      deviceId: '',
      name: ctxObj.name,
      email: ctxObj.email,
      environment: ctxObj.environment,
      lastSeenDate: date,
      status: getUserStatus(),
      url: location.href,
      userId: ctxObj.userId,
      usingSharedLogin: usingSharedLogin(ctxObj.name, ctxObj.email),
    },
  };
  return updateBody;
}

function usingSharedLogin(name: string, email: string): boolean {
  const nameArr = name.split(' ');
  const firstName = nameArr[0]?.toLowerCase();
  const lastName = nameArr.length > 2 ? nameArr[2]?.toLowerCase() : nameArr[1]?.toLowerCase();
  return `${firstName}:${lastName}@bergankdv.com` === email;
}

function retrieveContextObj(document: Document): IContextObj | void {
  const scriptContent = `
    if (window.nlapiGetContext) {
      var context = nlapiGetContext();
      var ctxObj = {
        accountNum: context.getCompany(),
        name: context.getName(),
        email: context.getEmail(),
        environment: context.getEnvironment(),
        userId: context.getUser(),
      }
      jQuery('body').attr('tmp_context', JSON.stringify(ctxObj));
    }
  `;
  return injectScript(document, scriptContent);
}

function injectScript(document: Document, scriptContent: string): void {
  // console.log('Script Content', scriptContent);
  const script = document.createElement('script');
  script.id = 'tmpScript';
  script.appendChild(document.createTextNode(scriptContent));
  (document.body || document.head || document.documentElement).appendChild(script);

  const ctxStr = document.querySelector('body')?.getAttribute('tmp_context');
  document.querySelector('body')?.removeAttribute('tmp_context');
  document.getElementById('tmpScript')?.remove();
  if (ctxStr) {
    const ctxObj = JSON.parse(ctxStr);
    return ctxObj;
  }
}

function getUserStatus(): statuses {
  let status: statuses = 'active';
  if (document.getElementById('timeoutpopup') && document.getElementById('timeoutpopup')?.style?.visibility !== 'hidden') {
    console.log('Timeout popup is visible', document.getElementById('timeoutpopup')?.style);
    status = 'inactive';
  }
  return status;
}

function createInterval(document: Document) {
  return setInterval(() => {
    const statusObj = gatherData(document);
    // console.log('Status', statusObj);

    // Send it to the extension
    chrome.runtime.sendMessage({
      action: 'updateStatus',
      source: statusObj,
    });
    // chrome.runtime.sendMessage({
    //     action: 'test',
    //     source: {}
    // });
  }, 15000);
}

function convertMS(ms: number): { d: number, h: number, m: number, s: number } {
  let h: number;
  let m: number;
  let s: number;
  s = Math.floor(ms / 1000);
  m = Math.floor(s / 60);
  s = s % 60;
  h = Math.floor(m / 60);
  m = m % 60;
  const d = Math.floor(h / 24);
  h = h % 24;
  return { d, h, m, s };
}

type statuses = 'active' | 'idle' | 'inactive';

interface IBaseUser {
  account?: { id: string; name: string; }
  deviceId: string;
  name: string;
  email: string;
  environment: string;
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
  environment: string;
  userId: string;
}

export interface IUserStatusCache {
  [email: string]: IUser
}

declare global {
  interface Window { netsuite_status: NodeJS.Timeout | undefined }
}