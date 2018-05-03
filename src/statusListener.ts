chrome.runtime.onMessage.addListener((request, sender) => {

    if (request.action == 'getStatus') {
        
        const userData = request.source;
        // @ts-ignore
        chrome.instanceID.getID((deviceId) => {
            userData.deviceId = deviceId;
            console.log('User', userData);
            fetch('https://netsuite-user-status.herokuapp.com/api/create-update-account', {
            // fetch('http://localhost:3000/api/create-update-account', {
                method: 'post',
                body: JSON.stringify(userData),
                headers: { 'Content-Type': 'application/json' }
            })
            .then((res) => res.json())
            .then((data) => console.log(data))
            .catch((err) => console.log('Err', err));
        });
    }
});