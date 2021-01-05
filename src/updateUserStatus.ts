/// <reference path="../node_modules/@hitc/netsuite-types/SuiteScriptV1.d.ts" />

getStatus(document);

function getStatus(document: Document) {
    console.log('NetSuite User Status running...');
    // if (!document.getElementsByClassName('ns-role-company')[0]) return;

    const statusObj = gatherData(document);
    console.log('Status', statusObj);

    // Send it to the extension
    chrome.runtime.sendMessage({
        action: 'updateStatus',
        source: statusObj
    });
    // chrome.runtime.sendMessage({
    //     action: 'test',
    //     source: {}
    // });

    // console.log('Existing Interval', (<any>window).netsuite_status)
    if (!(<any>window).netsuite_status) {
        let interval;
        const anotherInterval = setInterval(() => {
            if (!document.hidden && !interval) {
                interval = createInterval(document);
            } else if (document.hidden) {
                clearInterval(interval);
                interval = 0;
            }
        },                                  5000);
        (<any>window).netsuite_status = anotherInterval;
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
        }
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
      if (nlapiGetContext) {
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

    const script = document.createElement('script');
    script.id = 'tmpScript';
    script.appendChild(document.createTextNode(scriptContent));
    (document.body || document.head || document.documentElement).appendChild(script);

    const ctxStr = document.querySelector('body')?.getAttribute('tmp_context');
    if (ctxStr) {
        const ctxObj = JSON.parse(ctxStr);
        document.querySelector('body')?.removeAttribute('tmp_context');
        document.getElementById('tmpScript')?.remove();
        return ctxObj;
    }

    document.querySelector('body')?.removeAttribute('tmp_context');
    document.getElementById('tmpScript')?.remove();
    return;
}

function getUserStatus() {
    let status = 'active';
    if (document.getElementById('timeoutblocker')) status = 'inactive';
    return status;
}

function createInterval(document: Document) {
    return setInterval(() => {
        const statusObj = gatherData(document);
        // console.log('Status', statusObj);

        // Send it to the extension
        chrome.runtime.sendMessage({
            action: 'updateStatus',
            source: statusObj
        });
        // chrome.runtime.sendMessage({
        //     action: 'test',
        //     source: {}
        // });
    },                 15000);
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