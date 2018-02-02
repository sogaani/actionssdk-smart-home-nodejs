var xhr = new XMLHttpRequest();

xhr.open('POST', 'https://accounts.google.com/o/oauth2/token');
xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

xhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
        if (this.response) {
            var access_token = JSON.parse(this.responseText).access_token;
            var xhr2 = new XMLHttpRequest();
            xhr2.open('POST', 'https://smarthome-940db.firebaseapp.com/smart-home-api/exec');
            // POST 送信の場合は Content-Type は固定.
            xhr2.setRequestHeader('Content-Type', 'application/json');
            xhr2.setRequestHeader('Authorization', 'Bearer ' + access_token);

            xhr2.onreadystatechange = function () {
                if (this.readyState == 4) {
                    exit();
                }
            }

            var exec = {
                command: {
                    execution: [],
                    states: JSON.parse(par[1])
                },
                device: {
                    id: par[0]
                }
            }
            xhr2.send(JSON.stringify(exec));
        }
    }
}

var body =
    `client_secret=${global('%ClientSecret')}` +
    `&client_id=${global('%ClientId')}` +
    `&refresh_token=${global('%RefreshToken')}` +
    `&grant_type=refresh_token`;

xhr.send(body);
