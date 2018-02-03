const config = require('./config-provider');
const https = require('https');
const fetch = require('node-fetch');

let requestSyncAgent = new https.Agent({ keepAlive: true });
const requestSyncEndpoint = 'https://homegraph.googleapis.com/v1/devices:requestSync?key=';

requestSync = function (authToken, uid) {
  // REQUEST_SYNC
  return new Promise((resolve, reject) => {
    const apiKey = config.smartHomeProviderApiKey;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      agent: requestSyncAgent
    };
    optBody = {
      'agentUserId': uid
    };
    options.body = JSON.stringify(optBody);
    console.info("POST REQUEST_SYNC", requestSyncEndpoint + apiKey);
    //console.info(`POST payload: ${JSON.stringify(options)}`);

    get = function () {
      fetch(requestSyncEndpoint + apiKey, options).
        then(function (res) {
          console.log("request-sync response", res.status, res.statusText);
          resolve();
        }).catch((error) => {
          if (error && error.code == 'ECONNRESET') {
            console.log(error);
            requestSyncAgent.destroy();
            requestSyncAgent = new https.Agent({ keepAlive: true });
            // retry
            get();
            return;
          }
          reject(error)
        });
    }
    get();
  });
};

exports.requestSync = requestSync;