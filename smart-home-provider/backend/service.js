const connector = require('./connector');
const Light = require('./devices/light');
const configl = require('./conf/broadlink_koizumi_light.json');
const configt = require('./conf/broadlink_mitsubishi_thermostat.json');
const Thermostat = require('./devices/thermostat');
const datastore = require('../cloud/datastore');
let light = new Light();
let thermostat = new Thermostat();


waitConnection = function () {
    connector.canconnect()
        .then(() => {
            return connector.getUid()
        })
        .then(function (uid) {
            return datastore.resetDevices(uid);
        })
        .then(function (uid) {
            light.initialize(0, configl);
            thermostat.initialize(1, configt);
        }).catch(error => {
            console.log(error)
            setTimeout(() => {
                waitConnection();
            }, 10000);
        });
}

waitConnection();