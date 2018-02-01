const SmartDevice = require('./device');

class SmartThermostat extends SmartDevice {

    constructor() {
        super();
    }

    initialize(id, config) {
        const customData = {};
        const month = new Date().getMonth();

        switch (month) {
            case 9:
            case 10:
            case 11:
            case 0:
            case 1:
            case 2:
            case 3:
                // if thermostat on in Oct ~ Apr, set heat mode
                customData.prevMode = 'heat';
                customData.prevTemp = customData.heatTemp = 20.0
                break;
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
                // if thermostat on in May ~ Sept, set cool mode
                ustomData.prevMode = 'cool';
                customData.prevTemp = customData.coolTemp = 26.0
                break;
        }

        this.customData = Object.assign(customData, config.customData);

        const traits = [];
        const attributes = {};
        const states = {
            thermostatMode: 'off'
        };
        const availableThermostatModes = [];
        const customAttributes = {};

        traits.push('action.devices.traits.TemperatureSetting');

        if (!config.actions.off || (!config.actions.cool && !config.actions.heat)) {
            console.error('Thermostat: need off and cool or heat actions');
            return false;
        }

        availableThermostatModes.push('off');

        if (config.actions.cool) {
            availableThermostatModes.push('cool');
        }

        if (config.actions.heat) {
            availableThermostatModes.push('heat');
        }

        attributes.thermostatTemperatureUnit = config.attributes.thermostatTemperatureUnit || 'C';
        attributes.availableThermostatModes = availableThermostatModes.join(",");

        const nameDefault = {
            name: 'Thermostat' + id
        };
        this.device = {
            id: id.toString(10),
            properties: {
                type: "action.devices.types.THERMOSTAT",
                name: config.name || nameDefault,
                traits: traits,
                attributes: attributes,
                willReportState: false
            },
            states: states
        };

        const Driver = require('../driver/' + config.driver);
        this.driver = new Driver(this.device, config);

        super.initialize();
    }

    _handleCommand(command) {

        /**
         * off Heating/Cooling activity disabled.
         * heat If the device supports heating.
         * cool If the device supports cooling.
         * on If off, on restores the previous mode of the device.
         * heatcool If the device supports maintaining heating/cooling to target a range.
         */
        const changes = command.states;
        let states = {};
        console.log(changes);
        let temp;
        if ('thermostatTemperatureSetpoint' in changes) {
            temp = changes.thermostatTemperatureSetpoint;
        }

        if (temp && this.customData.TempMin && temp < this.customData.TempMin) {
            temp = this.customData.TempMin;
        }

        if (temp && this.customData.TempMax && temp > this.customData.TempMax) {
            temp = this.customData.TempMax;
        }

        if ('thermostatMode' in changes || temp) {
            const mode = changes.thermostatMode || this.device.states.thermostatMode
            switch (mode) {
                case 'on':
                    temp = temp || this.customData.prevTemp;
                    const _command = {
                        params: {
                            thermostatTemperatureSetpoint: temp,
                            thermostatMode: this.customData.prevMode
                        }
                    };
                    console.log('updated thermostat on');
                    _handleCommand(_command);
                    return;
                    break;
                case 'heat':
                    temp = temp || this.customData.heatTemp;
                    this.driver.heat(temp);
                    states = {
                        thermostatMode: 'heat',
                        thermostatTemperatureSetpoint: temp
                    };
                    console.log('updated thermostat heat');
                    this.customData.prevMode = 'heat';
                    this.customData.heatTemp = this.customData.prevTemp = temp;
                    break;
                case 'cool':
                    temp = temp || this.customData.coolTemp;
                    this.driver.cool(temp);
                    states = {
                        thermostatMode: 'cool',
                        thermostatTemperatureSetpoint: temp
                    };
                    console.log('updated thermostat cool');
                    this.customData.prevMode = 'cool';
                    this.customData.coolTemp = this.customData.prevTemp = temp;
                    break;
                case 'off':
                    this.driver.off();
                    states = {
                        thermostatMode: 'off'
                    };
                    console.log('updated thermostat off');
                    break;
                default:
                    console.log('failed to update thermostat');
                    break;
            }
        }
        this.device.states = Object.assign(this.device.states, states);
        this._notifyStateChange(true);
    }
}

module.exports = SmartThermostat;