const config = require('../cloud/config-provider');
const fetch = require('node-fetch');
const express = require('express');
const session = require('express-session');
const authProvider = require('../cloud/auth-provider');
const homeGraph = require('../cloud/home-graph');
const fs = require('fs')

const app = express();
app.set('trust proxy', 1); // trust first proxy
app.use(session({
    genid: function (req) {
        return Math.floor(Math.random() * 10000000000000000000000000000000000000000).toString(36);
    },
    name: '__session',
    secret: 'xyzsecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));


const Connector = {};
let authToken;
let refreshToken;
let refreshInterval;
let syncInterval;

Connector.refreshToken = function () {
    if (!refreshInterval)
        refreshInterval = setInterval(Connector.refreshToken, 1000 * 60 * 30);

    return new Promise((resolve, reject) => {
        Connector.getAccessToken().
            then(_res => _res.json()).
            then(json => {
                authToken = json.access_token;
                resolve()
            }).catch(error => reject(error));
    });
}


Connector.sync = function () {
    if (!syncInterval)
        syncInterval = setInterval(Connector.sync, 1000 * 60 * 5);

    Connector.getUid()
        .then(uid => {
            homeGraph.requestSync(null, uid);
        })
        .catch(error => {
            console.error('fail requestSync:', error);
        });
}

Connector.getUid = function () {
    return authProvider.getUid(authToken);
}

Connector.callSmartHomeProviderCloud = function (path, method, opt_body) {
    console.log('callSmartHomeProviderCloud');
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken
        }
    };
    if (opt_body) options.body = JSON.stringify(opt_body);
    return fetch(config.firebaseAuthDomain + '/smart-home-api' + path, options);
}

Connector.canconnect = function () {
    return new Promise((resolve, reject) => {
        fs.readFile(__dirname + '/.token', 'utf8', (err, data) => {
            if (err) reject(err);
            refreshToken = data;
            Connector.refreshToken()
                .then(() => {
                    resolve();
                })
                .catch(error => reject(error));
        });
    });
}

const appPort = process.env.PORT || 5000;

Connector.getAccessToken = function (code) {
    let body = `client_secret=${config.smartHomeProvideGoogleClientSecret}` +
        `&client_id=${config.smartHomeProviderGoogleClientId}`;

    if (!code && refreshToken) {
        body = body + `&refresh_token=${refreshToken}` +
            `&grant_type=refresh_token`;
    } else {
        body = body + `&redirect_uri=${decodeURIComponent('http://localhost:' + appPort + '/login')}` +
            `&code=${code}` +
            `&grant_type=authorization_code`;
    }

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body
    };
    console.info("POST GET TOKEN", 'https://accounts.google.com/o/oauth2/token');
    console.info(`POST payload: ${JSON.stringify(options)} `);
    let token;
    return fetch('https://accounts.google.com/o/oauth2/token', options)
}

app.get('/', function (req, resp) {
    if (!req.session || !req.session.user) {
        resp.redirect('https://accounts.google.com/o/oauth2/v2/auth' +
            `?client_id=${config.smartHomeProviderGoogleClientId}` +
            `&redirect_uri=http://localhost:${appPort}/login` +
            '&response_type=code' +
            '&scope=profile' +
            '&access_type=offline' +
            '&prompt=consent');
        /*
        resp.status(200).send('' +
            '(function(){' +
            'window.location.replace("https://accounts.google.com/o/oauth2/v2/auth' +
            `?client_id=${config.smartHomeProviderGoogleClientId}` +
            `&redirect_uri=http://localhost:${appPort}/login` +
            '&response_type=code' +
            '&access_type=offline' +
            '&scope=openid+profile")' +
            '})();' +
            '');// redirect to google login
            */
    }
});

app.get('/login', function (req, res) {
    console.log('/login ', req.body);
    const code = req.query.code;

    Connector.getAccessToken(code).
        then(_res => _res.json()).
        then(json => {
            console.log(json);
            authToken = json.access_token;
            refreshToken = json.refresh_token;
            fs.writeFileSync(__dirname + '/.token', json.refresh_token);

            return res.status(200).send('login success');
        }).
        catch(error => {
            console.info(error);
            return res.status(500).send('auth error');
        })
});

const server = app.listen(appPort, function () {
    console.log(`lisning http://localhost:${appPort}`);
});

Connector.sync();

exports.callSmartHomeProviderCloud = Connector.callSmartHomeProviderCloud;
exports.canconnect = Connector.canconnect;
exports.subscribe = Connector.subscribe;
exports.getUid = Connector.getUid;
//webserver and 