// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const bodyParser = require('body-parser');
const express = require('express');
const fetch = require('node-fetch');
const morgan = require('morgan');
const ngrok = require('ngrok');
const session = require('express-session');

// internal app deps
const google_ha = require('../smart-home-app');
const datastore = require('./datastore');
const authProvider = require('./auth-provider');
const config = require('./config-provider');

// Check that the API key was changed from the default
if (config.smartHomeProviderApiKey === '<API_KEY>') {
  console.warn('You need to set the API key in config-provider.\n' +
    'Visit the Google Cloud Console to generate an API key for your project.\n' +
    'https://console.cloud.google.com\n' +
    'Exiting...');
  process.exit();
}

const app = express();
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('trust proxy', 1); // trust first proxy
app.use(session({
  genid: function (req) {
    return authProvider.genRandomString();
  },
  name: '__session',
  secret: 'xyzsecret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
const requestSyncEndpoint = 'https://homegraph.googleapis.com/v1/devices:requestSync?key=';

/**
 * Can be used to register a device.
 * Removing a device would be supplying the device id without any traits.
 *
 * requires auth headers
 *
 * body should look like:
 * {
 *   id: <device id>,
 *   properties: {
 *      type: <>,
 *      name: {},
 *      ...
 *   },
 *   state: {
 *      on: true,
 *      ...
 *   }
 * }
 */
app.post('/smart-home-api/register-device', function (request, response) {

  let authToken = authProvider.getAccessToken(request);
  let uid;
  let device = request.body;

  authProvider.getUid(authToken).then(_uid => {
    uid = _uid;
    return datastore.isValidAuth(uid, authToken)
  }).then(() => {
    return datastore.registerDevice(uid, device);
  }).then(() => {
    // Get registered device
    return datastore.getStatus(uid, [device.id]);
  }).then(_device => {
    if (!_device || !_device[device.id]) {
      response.status(401).set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }).json({ error: "failed to register device" });
      return;
    }

    // Resync for the user
    app.requestSync(authToken, uid);

    // otherwise, all good!
    response.status(200)
      .set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      })
      .send(_device);
  }).catch((error) => {
    console.log(error);
    response.status(403).set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }).json({ error: "invalid auth" });
    return;
  });
});

/**
 * Can be used to reset all devices for a user account.
 */
app.post('/smart-home-api/reset-devices', function (request, response) {

  let authToken = authProvider.getAccessToken(request);
  let uid;

  authProvider.getUid(authToken).then(_uid => {
    uid = _uid;
    return datastore.isValidAuth(uid, authToken)
  }).then(() => {
    return datastore.resetDevices(uid);
  }).then(() => {
    // Resync for the user
    app.requestSync(authToken, uid);
    return datastore.getUid(uid);
  }).then(devices => {
    // otherwise, all good!
    response.status(200)
      .set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      })
      .send(devices);
  }).catch((error) => {
    console.log(error);
    response.status(403).set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }).json({ error: "invalid auth" });
    return;
  });
});

/**
 * Can be used to unregister a device.
 * Removing a device would be supplying the device id without any traits.
 */
app.post('/smart-home-api/remove-device', function (request, response) {

  let authToken = authProvider.getAccessToken(request);
  let uid;
  let device = request.body;

  authProvider.getUid(authToken).then(_uid => {
    uid = _uid;
    return datastore.isValidAuth(uid, authToken)
  }).then(() => {
    return datastore.removeDevice(uid, device);
  }).then(() => {
    // Get registered device
    return datastore.getStatus(uid, [device.id]);
  }).then(_device => {
    if (_device[device.id]) {
      response.status(500).set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }).json({ error: "failed to remove device" });
      return;
    }

    // Resync for the user
    app.requestSync(authToken, uid);

    // otherwise, all good!
    return datastore.getUid(uid);
  }).then(devices => {
    response.status(200)
      .set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      })
      .send(devices);
  }).catch((error) => {
    console.log(error);
    response.status(403).set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }).json({ error: "invalid auth" });
    return;
  });
});

/**
 * Can be used to modify state of a device, or to add or remove a device.
 * Removing a device would be supplying the device id without any traits.
 *
 * requires auth headers
 *
 * body should look like:
 * {
 *   id: <device id>,
 *   type: <device type>,
 *   <trait name>: <trait value>,
 *   ...
 * }
 */
app.post('/smart-home-api/exec', function (request, response) {

  let authToken = authProvider.getAccessToken(request);
  let uid;
  let device = request.body;

  authProvider.getUid(authToken).then(_uid => {
    uid = _uid;
    return datastore.isValidAuth(uid, authToken)
  }).then(() => {
    return app.smartHomeExec(uid, device);
  }).then(_device => {
    if (!_device || !_device[device.id]) {
      response.status(500).set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }).json({ error: "failed to exec device" });
      return;
    }

    if (request.body.nameChanged) {
      console.log("calling request sync from exec to update name");
      app.requestSync(authToken, uid);
    }

    response.status(200)
      .set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      })
      .send(_device);
  }).catch((error) => {
    console.log(error);
    response.status(403).set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }).json({ error: "invalid auth" });
    return;
  });
});

app.post('/smart-home-api/execute-scene', function (request, response) {

  let authToken = authProvider.getAccessToken(request);
  authProvider.getUid(authToken).then(uid => {

    reqdata = request.body;
    data = {
      requestId: reqdata.requestId,
      uid: uid,
      auth: authToken,
      commands: reqdata.inputs[0].payload.commands
    };

    return google_ha.registerAgent.exec(data, response);

  }).catch((error) => {
    console.log(error);
    response.status(403).set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }).json({ error: "invalid auth" });
    return;
  });
});

/**
 * This is how to query.
 *
 * req body:
 * [<device id>,...] // (optional)
 *
 * response:
 * {
 *   <device id>: {
 *     <trait name>: <trait value>,
 *     <trait name>: <trait value>,
 *     <trait name>: <trait value>,
 *     ...
 *   },
 *   <device id>: {
 *     <trait name>: <trait value>,
 *     <trait name>: <trait value>,
 *     <trait name>: <trait value>,
 *     ...
 *   },
 * }
 */
app.post('/smart-home-api/status', function (request, response) {
  // console.log('post /smart-home-api/status');

  let authToken = authProvider.getAccessToken(request);
  let uid;
  let device = request.body;

  authProvider.getUid(authToken).then(_uid => {
    uid = _uid;
    return datastore.isValidAuth(uid, authToken)
  }).then(() => {
    return app.smartHomeQuery(uid, device);
  }).then(devices => {
    if (!devices) {
      response.status(500).set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }).json({ error: "failed to get device" });
      return;
    }

    // otherwise, all good!
    response.status(200)
      .set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      })
      .send(devices);
  }).catch((error) => {
    console.log(error);
    response.status(403).set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }).json({ error: "invalid auth" });
    return;
  });
});

// frontend UI
app.set('jsonp callback name', 'cid');
app.get('/getauthcode', function (req, resp) {
  if (!req.session || !req.session.user) {
    resp.status(200).send('' +
      '(function(){' +
      'window.location.replace("https://accounts.google.com/o/oauth2/v2/auth' +
      `?client_id=${config.smartHomeProviderGoogleClientId}` +
      `&redirect_uri=${config.smartHomeProviderCloudEndpoint}/login` +
      '&response_type=code' +
      '&scope=openid+profile")' +
      '})();' +
      '');// redirect to google login
  } else {
    authProvider.getUid(req.session.user.tokens[0]).then(_uid => {
      return datastore.getFirestoreToken(_uid);
    }).then(customToken => {
      resp.status(200).send('' +
        'var AUTH_TOKEN = "' + req.session.user.tokens[0] + '";' +
        'var USERNAME = "' + req.session.user.name + '";' +
        'var FIREBASE_API_KEY = "' + config.firebaseApiKey + '";' +
        'var FIREBASE_AUTH_DOMAIN = "' + config.firebaseAuthDomain + '";' +
        'var CLOUD_FIRESTORE_PROJECT_ID = "' + config.cloudFirestoreProjectId + '";' +
        'var FIRESTORE_CUSTOMTOKEN = "' + customToken + '";' +
        '');
    }).catch(error => {
      console.error('getFirestoreToken:', error);
      resp.status(500).send('auth error');
    });
  }
});
app.use('/frontend', express.static(__dirname + '/../frontend'));
app.use('/frontend/', express.static(__dirname + '/../frontend'));
app.use('/', express.static(__dirname + '/../frontend'));

app.smartHomeSync = function (uid) {
  // console.log('smartHomeSync');
  let devices = datastore.getStatus(uid, null);
  // console.log('smartHomeSync devices: ', devices);
  return devices;
};

app.smartHomePropertiesSync = function (uid) {
  // console.log('smartHomePropertiesSync');
  let devices = datastore.getProperties(uid, null);
  // console.log('smartHomePropertiesSync devices: ', devices);
  return devices;
};

app.smartHomeQuery = function (uid, deviceList) {
  // console.log('smartHomeQuery deviceList: ', deviceList);
  if (!deviceList || deviceList == {}) {
    // console.log('using empty device list');
    deviceList = null;
  }
  let devices = datastore.getStatus(uid, deviceList);
  // console.log('smartHomeQuery devices: ', devices);
  return devices;
};

app.smartHomeQueryStates = function (uid, deviceList) {
  // console.log('smartHomeQueryStates deviceList: ', deviceList);
  if (!deviceList || deviceList == {}) {
    // console.log('using empty device list');
    deviceList = null;
  }
  let devices = datastore.getStates(uid, deviceList);
  // console.log('smartHomeQueryStates devices: ', devices);
  return devices;
};

app.smartHomeExec = function (uid, device) {
  // console.log('smartHomeExec', device);
  return new Promise((resolve, reject) => {
    datastore.execDevice(uid, device)
      .then(() => {
        return datastore.getStatus(uid, [device.id]);
      }).then(executedDevice => {
        console.log('smartHomeExec executedDevice', JSON.stringify(executedDevice));
        resolve(executedDevice);
      });
  });
};

app.requestSync = function (authToken, uid) {
  // REQUEST_SYNC
  const apiKey = config.smartHomeProviderApiKey;
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  optBody = {
    'agentUserId': uid
  };
  options.body = JSON.stringify(optBody);
  console.info("POST REQUEST_SYNC", requestSyncEndpoint + apiKey);
  console.info(`POST payload: ${JSON.stringify(options)}`);
  fetch(requestSyncEndpoint + apiKey, options).
    then(function (res) {
      console.log("request-sync response", res.status, res.statusText);
    });
};

const appPort = process.env.PORT || config.devPortSmartHome;

// firebase
if (process.env.GCLOUD_PROJECT) {
  exports.app = app;
} else {
  const server = app.listen(appPort, function () {
    const host = server.address().address;
    const port = server.address().port;

    console.log('Smart Home Cloud and App listening at %s:%s', host, port);

    if (config.isLocal) {
      ngrok.connect(config.devPortSmartHome, function (err, url) {
        if (err) {
          console.log('ngrok err', err);
          process.exit();
        }

        console.log("|###################################################|");
        console.log("|                                                   |");
        console.log("|        COPY & PASTE NGROK URL BELOW:              |");
        console.log("|                                                   |");
        console.log("|          " + url + "                |");
        console.log("|                                                   |");
        console.log("|###################################################|");

        console.log("=====");
        console.log("Visit the Actions on Google console at http://console.actions.google.com")
        console.log("Replace the webhook URL in the Actions section with:");
        console.log("    " + url + "/smarthome");

        console.log("In the console, set the Authorization URL to:");
        console.log("    " + url + "/oauth");

        console.log("");
        console.log("Then set the Token URL to:");
        console.log("    " + url + "/token");
        console.log("");

        console.log("Finally press the 'TEST DRAFT' button");
      });
    }

  });
}

function registerGoogleHa(app) {
  google_ha.registerAgent(app);
}
function registerAuth(app) {
  authProvider.registerAuth(app);
}

registerGoogleHa(app);
registerAuth(app);

console.log("\n\nRegistered routes:");
app._router.stack.forEach(function (r) {
  if (r.route && r.route.path) {
    console.log(r.route.path);
  }
})

