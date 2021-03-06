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

/**
 * Structure of Data
 * {
 *   <uid>: {
 *     <device id>: {
 *       properties: {
 *         <property name>: <property value>,
 *         <property name>: <property value>
 *       },
 *       states: {
 *         <state name>: <state value>,
 *         <state name>: <state value>
 *       }
 *     },
 *     <device id>: {...}
 *   },
 *   <uid>: {
 *     <device id>: {...},
 *     <device id>: {...},
 *     <device id>: {...}
 *   },
 *   ...
 * }
 */
const config = require('./config-provider');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(config.firebaseAdmin)
});

const db = admin.firestore();

const Data = {};
Data[config.smartHomeUserId] = {};

Data.version = 0;

/**
 * get firestore custom token
 *
 * @param uid
 * @returns token
 */
Data.getFirestoreToken = function (uid) {
  return new Promise((resolve, reject) => {
    admin.auth().createCustomToken(uid)
      .then(customToken => {
        resolve(customToken);
      })
      .catch(error => {
        console.log("Error creating custom token:", error);
        reject();
      });
  });
}


/**
 * get a full status for everything stored for a user
 *
 * @param uid
 * @returns
 * {
 *   uid: <uid>,
 *   devices: {
 *     <device id>: {
 *       properties: {
 *         <property name>: <property value>,
 *         <property name>: <property value>
 *       },
 *       states: {
 *         <state name>: <state value>,
 *         <state name>: <state value>
 *       }
 *     },
 *     <device id>: {...},
 *     ...
 *   }
 * }
 */
Data.getUid = function (uid) {
  // console.log('getUid', uid);
  return new Promise((resolve, reject) => {
    let devices = {};
    const col = db.collection(uid.toString(10));
    col.get().then(querysnap => {
      if (querysnap.empty) {
        console.error("cannot get devices without first registering the user!");
        resolve(devices);
      } else {
        querysnap.forEach(docsnap => {
          devices[docsnap.id] = docsnap.data();
        });
        resolve(devices);
      }
    }).catch(error => console.log(error));
  });
};

/**
 * exist devices stored for a user
 *
 * @param uid
 * @returns {boolean}
 */
Data.exist = function (uid) {
  // console.log('exist', uid);
  return new Promise((resolve, reject) => {
    const col = db.collection(uid.toString(10));
    col.get().then(querysnap => {
      if (querysnap.empty) {
        resolve(false);
      } else {
        resolve(true);
      }
    }).catch(error => console.log(error));
  });
};


/**
 * get current states for all devices stored for a user
 *
 * @param uid
 * @param deviceIds
 * @returns
 * {
 *   <device id>: {
 *     <state name>: <state value>,
 *     <state name>: <state value>
 *   },
 *   <device id>: {...},
 * }
 */
Data.getStates = function (uid, deviceIds = undefined) {
  // console.log('getStates', uid);
  return new Promise((resolve, reject) => {
    let states = {};
    const col = db.collection(uid.toString(10));
    if (!deviceIds) {
      col.get().then(querysnap => {
        querysnap.forEach(docsnap => {
          states[docsnap.id] = docsnap.get('states');
        });
        resolve(states);
      }).catch(error => console.log(error));
    } else {
      for (let i = 0; i < deviceIds.length; i++) {
        col.doc(deviceIds[i].toString(10)).get().then(docsnap => {
          if (docsnap.exists) {
            states[docsnap.id] = docsnap.get('states');
          }
          if (i == deviceIds.length - 1) {
            resolve(states);
          }
        }).catch(error => console.log(error));
      }
    }
  });
};

/**
 * get current states for all devices stored for a user
 *
 * @param uid
 * @param deviceIds
 * @returns
 * {
 *   <device id>: {
 *     <property name>: <property value>,
 *     <property name>: <property value>
 *   },
 *   <device id>: {...},
 * }
 */
Data.getProperties = function (uid, deviceIds = undefined) {
  // console.log('getProperties', uid);
  return new Promise((resolve, reject) => {
    let properties = {};
    const col = db.collection(uid.toString(10));
    if (!deviceIds) {
      col.get().then(querysnap => {
        querysnap.forEach(docsnap => {
          properties[docsnap.id] = docsnap.get('properties');
        });
        resolve(properties);
      }).catch(error => console.log(error));
    } else {
      for (let i = 0; i < deviceIds.length; i++) {
        col.doc(deviceIds[i].toString(10)).get().then(docsnap => {
          if (docsnap.exists) {
            properties[docsnap.id] = docsnap.get('properties');
          }
          if (i == deviceIds.length - 1) {
            resolve(properties);
          }
        }).catch(error => console.log(error));
      }
    }
  });
};

/**
 * get a status for the passed in device ids, otherwise get a full status
 *
 * @param uid
 * @param deviceIds (optional)
 * @returns
 * {
 *   uid: <uid>,
 *   devices: {
 *     <device id>: {
 *       properties: {
 *         <property name>: <property value>,
 *         <property name>: <property value>
 *       },
 *       states: {
 *         <state name>: <state value>,
 *         <state name>: <state value>
 *       }
 *     },
 *     <device id>: {...},
 *     ...
 *   }
 * }
 */
Data.getStatus = function (uid, deviceIds = undefined) {
  console.log('getStatus');
  return new Promise((resolve, reject) => {
    if (!deviceIds || deviceIds == {} ||
      (Object.keys(deviceIds).length === 0 && deviceIds.constructor === Object)) {
      Data.getUid(uid).
        then(devices => {
          resolve(devices);
        });
    } else {
      let devices = {};
      const col = db.collection(uid.toString(10));
      for (let i = 0; i < deviceIds.length; i++) {
        col.doc(deviceIds[i].toString(10)).get().then(docsnap => {
          if (docsnap.exists) {
            devices[docsnap.id] = docsnap.data();
          }
          if (i == deviceIds.length - 1) {
            resolve(devices);
          }
        }).catch(error => console.log(error));
      }
    }
  });
};

/**
 * update a device
 *
 * @param uid
 * @param device
 * {
 *   states: {
 *     on: true,
 *     online: true
 *      ...
 *   },
 *   properties: {
 *     name: "smart home light 1",
 *     firmware: "1fzxa84232n4nb6478n8",
 *     traits: ["onoff"],
 *     nickname: "kitchen light",
 *     type: "light",
 *      ...
 *   }
 * }
 */
Data.execDevice = function (uid, device) {
  // console.log('execDevice');
  return new Promise((resolve, reject) => {

    Data.exist(uid).
      then(exist => {
        if (!exist && uid != config.smartHomeUserId) {
          console.error("cannot exec a device without first registering the user!");
          return resolve();
        }
        const col = db.collection(uid.toString(10));

        let data = {};
        for (let property in device.properties) {
          data[`properties.${property}`] = device.properties[property];
        }
        for (let state in device.states) {
          data[`states.${state}`] = device.states[state];
        }
        if (Object.keys(data).length) {
          col.doc(device.id.toString(10)).update(data).then(res => {
            resolve(res);
          }).catch(error => console.log(error));
        } else {
          resolve();
        }
      }).catch(error => console.log(error));
  });
};

/**
 * update a device
 *
 * @param uid
 * @param device
 * @param command {{}}
 * {
 *   command:"action.devices.commands.BrightnessAbsolute",
 *   params:{
 *     brightness:30
 *   }
 * }
 */
Data.commandDevice = function (uid, command, device) {
  // console.log('execDevice');
  return new Promise((resolve, reject) => {
    Data.exist(uid, command, device).
      then(exist => {
        if (!exist && uid != config.smartHomeUserId) {
          console.error("cannot exec a device without first registering the user!");
          return Promise.reject('cannot exec a device without first registering the user!');
        }
        db.collection(uid.toString(10)).doc(device.id.toString(10)).collection('commands').add(command)
          .then(ref => {
            resolve();
          }).catch(error => reject(error));
      }).catch(error => reject(error));
  });
};

/**
 * register or update a device
 *
 * @param uid
 * @param device
 */
Data.registerDevice = function (uid, device) {
  // wrapper for exec, since they do the same thing
  return new Promise((resolve, reject) => {

    Data.exist(uid).
      then(exist => {
        //if (!exist && uid != config.smartHomeUserId) {
        //  console.error("cannot register a device without first registering the user!");
        //  return resolve();
        //}
        const col = db.collection(uid.toString(10));
        const setdata = {
          properties: device.properties || {},
          states: device.states || {}
        };

        col.doc(device.id.toString(10)).set(setdata).then(res => {
          resolve(res);
        }).catch(error => console.log(error));
      }).catch(error => console.log(error));
  });
};

/**
 * resets user account, deleting all devices on page refresh
 */
Data.resetDevices = function (uid) {
  // console.log('resetDevices');
  // Deletes all devices for the user.
  return new Promise((resolve, reject) => {
    Data.exist(uid).
      then(exist => {
        if (!exist || uid != config.smartHomeUserId) {
          console.error("cannot remove a device without first registering the user!");
          return resolve();
        }
        const col = db.collection(uid.toString(10));
        col.get().then(querysnap => {
          const docs = querysnap.docs;
          for (let i = 0; i < docs.length; i++) {
            docs[i].ref.delete().then(() => {
              if (i == docs.length - 1) {
                resolve();
              }
            });
          }
        }).catch(error => console.log(error));
      }).catch(error => console.log(error));
  });
}

/**
 * removes a device from authstore
 *
 * @param uid
 * @param device
 */
Data.removeDevice = function (uid, device) {
  // console.log('removeDevice');
  return new Promise((resolve, reject) => {

    Data.exist(uid).
      then(exist => {
        if (!exist || uid != config.smartHomeUserId) {
          console.error("cannot remove a device without first registering the user!");
          return resolve();
        }

        const col = db.collection(uid.toString(10));
        col.doc(device.id.toString(10)).delete().then(() => {
          console.info("Deleted device " + device.id + " for " + uid);
        }).catch(error => console.log(error));
      });
  });
};

/**
 * checks if user and auth exist and match
 *
 * @param uid
 * @param authToken
 * @returns {boolean}
 */
Data.isValidAuth = function (uid, authToken) {
  return new Promise((resolve, reject) => {
    Data.exist(uid).
      then(exist => {
        if (exist || config.smartHomeUserId == uid) {
          resolve();
        } else {
          reject("Invalid auth " + authToken + " for user " + uid);
        }
      });
  });

  // FIXME - reenable below once a more stable auth has been put in place
  // if (!Data.getUid(uid) || !Auth[uid])
  //     return false;
  // return (authToken == Auth[uid]);
};

Data.subscribe = function (uid, deviceId, callback) {
  const onCommandAdd = function (querySnapshot) {
    for (let change of querySnapshot.docChanges) {
      if (change.type == 'added') {
        callback(change.doc.data());
        change.doc.ref.delete();
      }
    }
  };

  console.log('subscribe');
  return db.collection(uid).doc(deviceId).collection('commands').onSnapshot(onCommandAdd);
}

exports.subscribe = Data.subscribe;
exports.getUid = Data.getUid;
exports.getStatus = Data.getStatus;
exports.getStates = Data.getStates;
exports.getProperties = Data.getProperties;
exports.isValidAuth = Data.isValidAuth;
exports.execDevice = Data.execDevice;
exports.registerDevice = Data.registerDevice;
exports.resetDevices = Data.resetDevices;
exports.removeDevice = Data.removeDevice;
exports.commandDevice = Data.commandDevice;
exports.getFirestoreToken = Data.getFirestoreToken;
