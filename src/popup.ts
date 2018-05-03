
declare const message: HTMLElement;

function convertMS(ms) {
    let d, h, m, s;
    s = Math.floor(ms / 1000);
    m = Math.floor(s / 60);
    s = s % 60;
    h = Math.floor(m / 60);
    m = m % 60;
    d = Math.floor(h / 24);
    h = h % 24;
    return { d, h, m, s };
};

function transitionEndEventName() {
    var i,
        undefined,
        el = document.createElement('div'),
        transitions = {
            'transition': 'transitionend',
            'OTransition': 'otransitionend',  // oTransitionEnd in very old Opera
            'MozTransition': 'transitionend',
            'WebkitTransition': 'webkitTransitionEnd'
        };

    for (i in transitions) {
        if (transitions.hasOwnProperty(i) && el.style[i] !== undefined) {
            return transitions[i];
        }
    }
}

function addUserRows(data) {

    function addRowsCallback(event) {
        if (event.propertyName !== 'visibility') return;
        (<HTMLElement>document.getElementsByClassName('spinner')[0]).style.display = 'none';

        // Sort by last seen
        allUsers.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

        console.log('All Users', allUsers);
        const theadElement = document.getElementById('tablebody');
        allUsers.forEach((user) => {
            const lastSeen = new Date(user.lastSeen).getTime();
            console.log('Last Seen', lastSeen);
            const currentDate = new Date().getTime();
            console.log('Current Date', currentDate);
            console.log('Difference', currentDate - lastSeen);
            const seenDifferenceObj = convertMS(currentDate - lastSeen);
            console.log('Seen Difference Obj', seenDifferenceObj);
            const oneDay = 1000 * 60 * 60 * 24;
            const oneHour = 1000 * 60 * 60;
            const fifteenMinutes = 1000 * 60 * 15;
            let seenClass = '';
            if ((currentDate - lastSeen) > oneDay) seenClass = 'badge badge-danger badge-pill';
            else if ((currentDate - lastSeen) > oneHour) seenClass = 'badge badge-warning badge-pill';
            else if ((currentDate - lastSeen) > fifteenMinutes) seenClass = 'badge badge-primary badge-pill';
            else if ((currentDate - lastSeen) < fifteenMinutes) seenClass = 'badge badge-success badge-pill';

            // console.log('Class', seenClass);
            let seenDifference = `<span class="${seenClass}">`;
            if (seenDifferenceObj.d > 0) seenDifference += `${seenDifferenceObj.d} day${seenDifferenceObj.d === 1 ? '' : 's'} ago</span>`;
            else if (seenDifferenceObj.h > 0) seenDifference += `${seenDifferenceObj.h} hour${seenDifferenceObj.h === 1 ? '' : 's'} ago</span>`;
            else if (seenDifferenceObj.m > 0) seenDifference += `${seenDifferenceObj.m} minute${seenDifferenceObj.m === 1 ? '' : 's'} ago</span>`;
            else if (seenDifferenceObj.m <= 0) seenDifference += `< 1 minute ago</span>`;
            console.log('Seen Difference', seenDifference);

            const rowHTML = `
                <tr key="newrow" class="transition-hidden">
                    <th scope="row" style="text-align: center;"><img style="max-width: 60px; max-height: 25px;" src="${user.logoUrl}"></img></th>
                    <td>${user.account}<br><span style="color: #989898">${user.username}<span></td>
                    <td style="text-align: center;">${user.name}</td>
                    <td style="text-align: center;">${seenDifference}</td>
                    ${show ? '<td style="text-align: center;">' + user.hits + '</td>' : ''}
                </tr>`;
            theadElement.insertAdjacentHTML('beforeend', rowHTML);
        });
        setTimeout(() => {
            const elements = document.querySelectorAll("tr[key]");
            for (var i = 0; i < elements.length; i++) {
                elements[i].className = 'transition-shown';
            }
        }, 0);
    }
    const allUsers = data;

    // Show dev tools
    const show = allUsers.filter(user => user.active)[0].name === 'Jon M Lamb';
    // const show = false;
    console.log('Show', show);
    if (show) {
        const tableHeader = <HTMLElement>document.querySelector('#tableheader');
        tableHeader.insertAdjacentHTML('beforeend', '<th scope="col" style="text-align: center;">Hits</th>');
    }

    // Hide the spinner
    if (allUsers.length > 0) {
        const spinnerElement = <HTMLElement>document.getElementsByClassName('spinner')[0];
        console.log('Spinner Element', spinnerElement);
        const transitionEnd = transitionEndEventName();
        console.log('Transition name', transitionEnd);
        spinnerElement.addEventListener(transitionEnd, addRowsCallback, false);
        spinnerElement.className = 'spinner transition-hidden'
    }
}

function onWindowLoad() {
    // @ts-ignore
    chrome.instanceID.getID((deviceId) => {
        fetch('https://netsuite-user-status.herokuapp.com/api/get-users?deviceId=' + deviceId)
        .then((res) => res.json())
        .then((data) => addUserRows(data));
    });
}

window.onload = onWindowLoad;