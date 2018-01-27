const SmartDevice = require('./device');

class SmartSwitch extends SmartDevice {

    constructor() {
        super();
    }

    initialize(id, config) {
        const Driver = require('../driver/' + config.driver);
        this.driver = new Driver();

        this.driver.initialize(config);

        const nameDefault = {
            name: 'Switch' + id
        };
        this.device = {
            id: id.toString(10),
            properties: {
                type: "action.devices.types.SWITCH",
                name: config.name || nameDefault,
                traits: this.driver.traits,
                attributes: this.driver.attributes,
                willReportState: false
            },
            states: this.driver.states
        };
        super.initialize();
    }

    _handleCommand(command) {

        //this.driver.change(command.params);
        const changes = command.params;
        if ('on' in changes) {
            this.driver.onOff(changes.on);
            console.log('updated switch on:', changes.on);
        }

        this.device.states = Object.assign(this.device.states, this.driver.states);
        this._notifyStateChange(true);
    }
}


module.exports = SmartSwitch;