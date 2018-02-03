const SmartDevice = require('./device');

class SmartScene extends SmartDevice {

    constructor() {
        super();
    }

    initialize(id, config, devices) {
        const traits = [];
        const attributes = {};
        const states = {};

        if (!config.actions.activeCommands) {
            console.error('Scene: need actions activeCommands');
            return false;
        }

        traits.push('action.devices.traits.Scene');

        attributes.sceneReversible = (config.attributes && config.attributes.sceneReversible) ? true : false;

        if (attributes.sceneReversible && !config.actions.deactiveCommands) {
            console.error('Scene: if sceneReversible is true, need actions deactiveCommands');
            return false;
        }

        const nameDefault = {
            name: 'Scene' + id
        };
        this.device = {
            id: id.toString(10),
            properties: {
                type: "action.devices.types.SCENE",
                name: config.name || nameDefault,
                traits: traits,
                attributes: attributes,
                willReportState: false
            },
            states: states
        };

        this.devices = devices;
        this.actions = config.actions;

        super.initialize();
    }

    _execCommands(commands) {
        commands.forEach(command => {
            const device = this.devices[command.id];
            if (device) device._handleCommand(command);
        });
    }

    _handleCommand(command) {

        const changes = command.states;
        let commands;
        if (changes && changes.deactivate) {
            commands = this.actions.deactiveCommands;
        } else {
            commands = this.actions.activeCommands
        }
        this._execCommands(commands);

        // stateless
        // this._notifyStateChange(true);
    }
}


module.exports = SmartScene;