const SmartDevice = require('./device');

class SmartSwitch extends SmartDevice {

    constructor() {
        super();
    }

    initialize(id, config) {
        const traits = [];
        // const attributes = {};
        const states = {};

        if (!config.actions.on || !config.actions.off) {
            console.error('Switch: not found on and off actions');
            return false;
        }

        traits.push('action.devices.traits.OnOff');
        states.on = false;

        const nameDefault = {
            name: 'Switch' + id
        };
        this.device = {
            id: id.toString(10),
            properties: {
                type: "action.devices.types.SWITCH",
                name: config.name || nameDefault,
                traits: traits,
                // attributes: attributes,
                willReportState: false
            },
            states: states
        };

        const Driver = require('../driver/' + config.driver);
        this.driver = new Driver(this.device, config);

        super.initialize();
    }

    _handleCommand(command) {

        //this.driver.change(command.params);
        const changes = command.states;
        if ('on' in changes) {
            this.driver.onOff(changes.on);
            console.log('updated switch on:', changes.on);
            this.device.states.on = changes.on;
        }

        this._notifyStateChange(true);
    }
}


module.exports = SmartSwitch;