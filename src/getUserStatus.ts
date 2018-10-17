function getStatus(document) {
    console.log('NetSuite User Status running...');
    if (!document.getElementsByClassName('ns-role-company')[0]) return;
    function gatherData() {
        const account = document.getElementsByClassName('ns-role-company')[0].innerHTML;
        const username = document.getElementsByClassName('ns-role')[0].firstElementChild.innerHTML;
        const berganKDV = account.indexOf('BerganKDV, LTD') >= 0;
        const domain = 'https://' + document.location.hostname;
        const logoElements = document.getElementsByClassName('ns-logo');
        const logoUrl = domain + logoElements[logoElements.length - 1].firstElementChild.getAttribute('src');
        const date = new Date().toUTCString();
        
        return { account, username, berganKDV, logoUrl, date }
    }
    
    const statusObj = gatherData();
    // console.log('Status', statusObj);

    // Send it to the extension
    chrome.runtime.sendMessage({
        action: 'getStatus',
        source: statusObj
    });
    
    function createInterval () {
        return setInterval(() => {
            const statusObj = gatherData();
            // console.log('Status', statusObj);

            // Send it to the extension
            chrome.runtime.sendMessage({
                action: 'getStatus',
                source: statusObj
            });
        }, 15000);
    }

    // console.log('Existing Interval', (<any>window).netsuite_status)
    if (!(<any>window).netsuite_status) {
        let interval;
        const anotherInterval = setInterval(() => {
            if (!document.hidden && !interval) {
                interval = createInterval();
            } else if (document.hidden) {
                clearInterval(interval);
                interval = 0;
            }
        }, 5000);
        (<any>window).netsuite_status = anotherInterval;
    }
}

getStatus(document);