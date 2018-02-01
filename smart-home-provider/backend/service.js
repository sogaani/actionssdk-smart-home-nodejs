const connector = require('./connector');
const Thermostat = require('./devices/thermostat');
const Light = require('./devices/light');
const Switch = require('./devices/switch');
const datastore = require('../cloud/datastore');
const fs = require('fs');

let devices = {};
let id = 0;
waitConnection = function () {
    connector.canconnect()
        .then(() => {
            return connector.getUid()
        })
        .then(function (uid) {
            return datastore.resetDevices(uid);
        })
        .then(function (uid) {
            fs.readdir(__dirname + '/conf', function (err, files) {

                files.forEach(function (file) {
                    const config = require('./conf/' + file);
                    let device;
                    const _id = config.id || id;
                    switch (config.type) {
                        case 'Light':
                            device = new Light();
                            device.initialize(_id, config);
                            break;
                        case 'Thermostat':
                            device = new Thermostat();
                            device.initialize(_id, config);
                            break;
                        case 'Switch':
                            device = new Switch();
                            device.initialize(_id, config);
                            break;
                        default:
                            console.log('not support type:', config.type);
                            break;
                    }
                    if (device) {
                        devices[_id] = device;
                        id++;
                    }
                });
            });
        }).catch(error => {
            console.log(error)
            setTimeout(() => {
                waitConnection();
            }, 10000);
        });
}

waitConnection();