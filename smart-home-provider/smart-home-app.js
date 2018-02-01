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

const fetch = require('node-fetch');
const config = require('./cloud/config-provider');
const authProvider = require('./cloud/auth-provider');

function registerAgent(app) {
  console.log('smart-home-app registerAgent');

  /**
   *
   * action: {
   *   initialTrigger: {
   *     intent: [
   *       "action.devices.SYNC",
   *       "action.devices.QUERY",
   *       "action.devices.EXECUTE"
   *     ]
   *   },
   *   httpExecution: "https://example.org/device/agent",
   *   accountLinking: {
   *     authenticationUrl: "https://example.org/device/auth"
   *   }
   * }
   */
  app.post('/smarthome', function (request, response) {
    console.log('post /smarthome', request.headers);
    let reqdata = request.body;
    console.log('post /smarthome', reqdata);

    let authToken = authProvider.getAccessToken(request);
    authProvider.getUid(authToken).then(uid => {
      if (!reqdata.inputs) {
        response.status(401).set({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }).json({ error: "missing inputs" });
        return;
      }
      for (let i = 0; i < reqdata.inputs.length; i++) {
        let input = reqdata.inputs[i];
        let intent = input.intent;
        if (!intent) {
          response.status(401).set({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }).json({ error: "missing inputs" });
          continue;
        }
        switch (intent) {
          case "action.devices.SYNC":
            console.log('post /smarthome SYNC');
            /**
             * request:
             * {
             *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
             *  "inputs": [{
             *      "intent": "action.devices.SYNC",
             *  }]
             * }
             */
            sync({
              uid: uid,
              auth: authToken,
              requestId: reqdata.requestId
            }, response);
            break;
          case "action.devices.QUERY":
            console.log('post /smarthome QUERY');
            /**
             * request:
             * {
             *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
             *   "inputs": [{
             *       "intent": "action.devices.QUERY",
             *       "payload": {
             *          "devices": [{
             *            "id": "123",
             *            "customData": {
             *              "fooValue": 12,
             *              "barValue": true,
             *              "bazValue": "alpaca sauce"
             *            }
             *          }, {
             *            "id": "234",
             *            "customData": {
             *              "fooValue": 74,
             *              "barValue": false,
             *              "bazValue": "sheep dip"
             *            }
             *          }]
             *       }
             *   }]
             * }
             */
            query({
              uid: uid,
              auth: authToken,
              requestId: reqdata.requestId,
              devices: reqdata.inputs[0].payload.devices
            }, response);

            break;
          case "action.devices.EXECUTE":
            console.log('post /smarthome EXECUTE');
            /**
             * request:
             * {
             *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
             *   "inputs": [{
             *     "intent": "action.devices.EXECUTE",
             *     "payload": {
             *       "commands": [{
             *         "devices": [{
             *           "id": "123",
             *           "customData": {
             *             "fooValue": 12,
             *             "barValue": true,
             *             "bazValue": "alpaca sauce"
             *           }
             *         }, {
             *           "id": "234",
             *           "customData": {
             *              "fooValue": 74,
             *              "barValue": false,
             *              "bazValue": "sheep dip"
             *           }
             *         }],
             *         "execution": [{
             *           "command": "action.devices.commands.OnOff",
             *           "params": {
             *             "on": true
             *           }
             *         }]
             *       }]
             *     }
             *   }]
             * }
             */
            exec({
              uid: uid,
              auth: authToken,
              requestId: reqdata.requestId,
              commands: reqdata.inputs[0].payload.commands
            }, response);

            break;
          default:
            response.status(401).set({
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }).json({ error: "missing intent" });
            break;
        }
      }
    }).catch((error) => {
      console.log(error);
      response.status(403).set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }).json({
        requestId: reqdata.requestId,
        payload: {
          errorCode: "authExpired"
        }
      });
      return;
    });
  });
  /**
   * Enables prelight (OPTIONS) requests made cross-domain.
   */
  app.options('/smarthome', function (request, response) {
    response.status(200).set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }).send('null');
  });

  /**
   *
   * @param data
   * {
   *   "uid": "213456",
   *   "auth": "bearer xxx",
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf"
   * }
   * @param response
   * @return {{}}
   * {
   *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "devices": [{
   *         "id": "123",
   *         "type": "action.devices.types.Outlet",
   *         "traits": [
   *            "action.devices.traits.OnOff"
   *         ],
   *         "name": {
   *             "defaultNames": ["TP-Link Outlet C110"],
   *             "name": "Homer Simpson Light",
   *             "nicknames": ["wall plug"]
   *         },
   *         "willReportState: false,
   *         "attributes": {
   *         // None defined for these traits yet.
   *         },
   *         "roomHint": "living room",
   *         "config": {
   *           "manufacturer": "tplink",
   *           "model": "c110",
   *           "hwVersion": "3.2",
   *           "swVersion": "11.4"
   *         },
   *         "customData": {
   *           "fooValue": 74,
   *           "barValue": true,
   *           "bazValue": "sheepdip"
   *         }
   *       }, {
   *         "id": "456",
   *         "type": "action.devices.types.Light",
   *         "traits": [
   *           "action.devices.traits.OnOff",
   *           "action.devices.traits.Brightness",
   *           "action.devices.traits.ColorTemperature",
   *           "action.devices.traits.ColorSpectrum"
   *         ],
   *         "name": {
   *           "defaultNames": ["OSRAM bulb A19 color hyperglow"],
   *           "name": "lamp1",
   *           "nicknames": ["reading lamp"]
   *         },
   *         "willReportState: false,
   *         "attributes": {
   *           "TemperatureMinK": 2000,
   *           "TemperatureMaxK": 6500
   *         },
   *         "roomHint": "living room",
   *         "config": {
   *           "manufacturer": "osram",
   *           "model": "hg11",
   *           "hwVersion": "1.2",
   *           "swVersion": "5.4"
   *         },
   *         "customData": {
   *           "fooValue": 12,
   *           "barValue": false,
   *           "bazValue": "dancing alpaca"
   *         }
   *       }, {
   *         "id": "234"
   *         // ...
   *     }]
   *   }
   * }
   */
  function sync(data, response) {
    console.log('sync', JSON.stringify(data));
    return new Promise((resolve, reject) => {
      app.smartHomePropertiesSync(data.uid).then(devices => {
        if (!devices) {
          response.status(500).set({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }).json({ error: "failed" });
          resolve();
          return;
        }
        let deviceList = [];
        Object.keys(devices).forEach(function (key) {
          if (devices.hasOwnProperty(key) && devices[key]) {
            console.log("Getting device information for id '" + key + "'");
            let device = devices[key];
            device.id = key;
            deviceList.push(device);
          }
        });
        let deviceProps = {
          requestId: data.requestId,
          payload: {
            agentUserId: data.uid,
            devices: deviceList
          }
        };
        console.log('sync response', JSON.stringify(deviceProps));
        response.status(200).json(deviceProps);
        resolve(deviceProps);
      });
    });
  }

  /**
   *
   * @param data
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "uid": "213456",
   *   "auth": "bearer xxx",
   *   "devices": [{
   *     "id": "123",
   *       "customData": {
   *         "fooValue": 12,
   *         "barValue": true,
   *         "bazValue": "alpaca sauce"
   *       }
   *   }, {
   *     "id": "234"
   *   }]
   * }
   * @param response
   * @return {{}}
   * {
   *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "devices": {
   *       "123": {
   *         "on": true ,
   *         "online": true
   *       },
   *       "456": {
   *         "on": true,
   *         "online": true,
   *         "brightness": 80,
   *         "color": {
   *           "name": "cerulian",
   *           "spectrumRGB": 31655
   *         }
   *       },
   *       ...
   *     }
   *   }
   * }
   */
  function query(data, response) {
    console.log('query', JSON.stringify(data));
    let deviceIds = getDeviceIds(data.devices);

    return new Promise((resolve, reject) => {
      app.smartHomeQueryStates(data.uid, deviceIds).then(devices => {
        if (!devices) {
          response.status(500).set({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }).json({ error: "failed" });
          resolve();
          return;
        }
        let deviceStates = {
          requestId: data.requestId,
          payload: {
            devices: devices
          }
        };
        console.log('query response', JSON.stringify(deviceStates));
        response.status(200).json(deviceStates);
        resolve(deviceStates);
      });
    });
  }

  /**
   *
   * @param devices
   * [{
   *   "id": "123"
   * }, {
   *   "id": "234"
   * }]
   * @return {Array} ["123", "234"]
   */
  function getDeviceIds(devices) {
    let deviceIds = [];
    for (let i = 0; i < devices.length; i++) {
      if (devices[i] && devices[i].id)
        deviceIds.push(devices[i].id);
    }
    return deviceIds;
  }

  /**
   * @param data:
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "uid": "213456",
   *   "auth": "bearer xxx",
   *   "commands": [{
   *     "devices": [{
   *       "id": "123",
   *       "customData": {
   *          "fooValue": 74,
   *          "barValue": false
   *       }
   *     }, {
   *       "id": "456",
   *       "customData": {
   *          "fooValue": 12,
   *          "barValue": true
   *       }
   *     }, {
   *       "id": "987",
   *       "customData": {
   *          "fooValue": 35,
   *          "barValue": false,
   *          "bazValue": "sheep dip"
   *       }
   *     }],
   *     "execution": [{
   *       "command": "action.devices.commands.OnOff",
   *       "params": {
   *           "on": true
   *       }
   *     }]
   *  }
   *
   * @param response
   * @return {{}}
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "commands": [{
   *       "ids": ["123"],
   *       "status": "SUCCESS"
   *       "states": {
   *         "on": true,
   *         "online": true
   *       }
   *     }, {
   *       "ids": ["456"],
   *       "status": "SUCCESS"
   *       "states": {
   *         "on": true,
   *         "online": true
   *       }
   *     }, {
   *       "ids": ["987"],
   *       "status": "OFFLINE",
   *       "states": {
   *         "online": false
   *       }
   *     }]
   *   }
   * }
   */
  function exec(data, response) {
    console.log('exec', JSON.stringify(data));

    new Promise((resolve, reject) => {
      let respCommands = [];
      let promises = [];
      for (let i = 0; i < data.commands.length; i++) {
        let curCommand = data.commands[i];
        let devices = curCommand.devices;
        for (let k = 0; k < devices.length; k++) {
          let devExec = [];
          let devStates = {};
          for (let j = 0; j < curCommand.execution.length; j++) {
            const curExec = curCommand.execution[j]
            devExec.push(curExec);
            devStates = Object.assign(devStates, curExec.params);
          }
          const command = {
            execution: devExec,
            states: devStates
          };
          promises.push(new Promise((resolve, reject) => {
            execDevice(data.uid, command, devices[k]).then(() => {
              respCommands.push({
                ids: [devices[k].id],
                status: "SUCCESS",
                states: devStates,
                errorCode: undefined
              });
              resolve();
            }).catch(error => {
              respCommands.push({
                ids: [devices[k].id],
                status: "ERROR",
                errorCode: error
              });
              resolve();
            });
          }));
        }
      }
      Promise.all(promises).then(results => {
        let resBody = {
          requestId: data.requestId,
          payload: {
            commands: respCommands
          }
        };
        console.log('exec response', JSON.stringify(resBody));
        response.status(200).json(resBody);
        resolve(resBody);
      });
    });
  }

  registerAgent.exec = exec;

  /**
   *
   * @param uid
   * @param command
   * {
   *   "command": "action.devices.commands.OnOff",
   *   "params": {
   *       "on": true
   *   }
   * }
   * @param device
   * {
   *   "id": "123",
   *   "customData": {
   *      "fooValue": 74,
   *      "barValue": false
   *   }
   * }
   * @return {{}}
   * {
   *   "ids": ["123"],
   *   "status": "SUCCESS"
   *   "states": {
   *     "on": true,
   *     "online": true
   *   }
   * }
   */
  function execDevice(uid, command, device) {
    return new Promise((resolve, reject) => {
      app.smartHomeExecCommand(uid, command, device).then(() => {
        // TODO - check reject("notSupported");
        // TODO - check reject("deviceOffline");

        resolve("SUCCESS");
      }).catch(error => reject(error));
    });
  }
}

exports.registerAgent = registerAgent;
