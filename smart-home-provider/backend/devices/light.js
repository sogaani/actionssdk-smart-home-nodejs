const SmartDevice = require('./device');

class SmartLight extends SmartDevice {

    constructor() {
        super();
    }

    initialize(id, config) {
        const traits = [];
        const attributes = {};
        const customData = {};
        const states = {};

        if (!config.actions.on || !config.actions.off) {
            console.error('Light: not found on and off actions');
            return false;
        }

        traits.push('action.devices.traits.OnOff');
        states.on = false;

        if (config.actions.brightness) {
            traits.push("action.devices.traits.Brightness");

            if (!config.customData.onBrightness) {
                console.error('Light: up and down actions need attributes brightnessStepP and onBrightness');
                return false;
            }
            customData.onBrightness = config.customData.onBrightness;

            states.brightness = 0;
        }

        if (config.actions.temperature) {
            traits.push("action.devices.traits.ColorTemperature");

            if (!config.attributes.temperatureMinK || !config.attributes.temperatureMaxK) {
                console.error('Light: warm and cool actions need attributes temperatureMinK and temperatureMaxK');
                return false;
            }
            attributes.temperatureMinK = config.attributes.temperatureMinK || '0';
            attributes.temperatureMaxK = config.attributes.temperatureMaxK || '100';

            if (!config.customData.onTemperature) {
                console.error('Light: warm and cool actions need attributes temperatureStepK and onTemperature');
                return false;
            }
            customData.onTemperature = config.customData.onTemperature;

            states.color = { temperature: attributes.temperatureMinK };
        }

        // not inmplement
        if (config.actions.spectrum) {
            traits.push("action.devices.traits.ColorSpectrum");
            attributes.colorModel = config.attributes.colorModel || 'rgb';

            states.color = { spectrumRGB: 0 };
        }

        this.customData = customData;

        const nameDefault = {
            name: 'Light' + id
        };
        this.device = {
            id: id.toString(10),
            properties: {
                type: "action.devices.types.LIGHT",
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

        //this.driver.change(command.params);
        const changes = command.states;

        if ('on' in changes) {
            this.driver.onOff(changes.on);
            if (changes.on) {
                if (this.customData.onTemperature) this.device.states.color.temperature = this.customData.onTemperature;
                if (this.customData.onBrightness) this.device.states.brightness = this.customData.onBrightness;
            }else{
                if (this.device.states.brightness) this.device.states.brightness = 0;
            }
            this.device.states.on = changes.on;
            console.log('updated light on');
        }
        if ('color' in changes) {
            if ('spectrumRGB' in changes.color) {
                this.driver.spectrum(changes.color.spectrumRGB);
                console.log('updated light spectrumRGB');
            }
            if ('temperature' in changes.color) {
                this.driver.temperature(changes.color.temperature);
                console.log('updated light temperature');
            }
            this.device.states.color = changes.color;
        }
        if ('brightness' in changes) {
            this.driver.brightness(changes.brightness);
            console.log('updated light brightness');
            this.device.states.brightness = changes.brightness;
        }

        this._notifyStateChange(true);
    }
}


module.exports = SmartLight;