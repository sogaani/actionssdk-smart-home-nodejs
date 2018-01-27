const connector = require('../connector');
const datastore = require('../../cloud/datastore');

class SmartDevice {
    constructor() {
        this._initialized = false;
    }

    initialize() {
        if (!this._initialized) {
            this.device.states.online = true;
            connector.getUid()
                .then(function (uid) {
                    this._uid = uid;
                    this._handleRegister();
                    this._initialized = true;
                }.bind(this)).catch(function (error) {
                    console.log('>>> failed to initialize device:', this.device);
                });
        }
    }

    _handleRegister() {
        // Register source if undefined
        console.log('_handleRegister');

        console.log('_handleRegister', this.device);

        datastore.registerDevice(this._uid, this.device)
            .then(function () {
                this._changeFirestoreConnection();
                this._notifyStateChange();
            }.bind(this))
            .catch(function (error) {
                console.log('>>> failed to register device with Smart Home Provider cloud:', error);
            });
    }

    _handleDelete() {
        datastore.removeDevice(this._uid, this.device)
            .catch(function (error) {
                console.log('>>> failed to remove device with Smart Home Provider cloud:', error);
            });
        if (this.unsubscribe) this.unsubscribe();
    }

    _changeFirestoreConnection() {
        this.unsubscribe = datastore.subscribe(this._uid, this.device.id, this._handleCommand.bind(this));
    }

    _handleCommand(command) {
        for (var name in command.param) {
            const value = command.param[name];
            this.device.states[name] = value;
        }
        this._notifyStateChange(true);
    }

    _notifyStateChange(exec) {
        this._deviceChanged();
        if (exec) this._exec();
    }

    _deviceChanged() {
        console.log("Device changed!", this.device.states);
        if (!this._initialized) {
            this.initialize();
            return;
        }
    }

    _exec() {
        datastore.execDevice(this._uid, this.device).then(function () {
            console.log('>>> exec to Smart Home Provider Cloud');
        });
    }
}

module.exports = SmartDevice;