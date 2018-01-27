const broadlink = require('./broadlink/broadlink');
const util = require('util');


class BroadlinkDriver {
    constructor(device, config) {
        this.actions = config.actions;
        this.mac = config.mac;
        this.device = device;
        this.args = {};
    }

    _exec(sequence) {
        const command = {
            sequence: sequence,
            mac: this.mac
        };
        broadlink.execCommand(command);
    }

    _numToBit(num) {
        const numInt = Math.round(num).toString(2);
        const numStr = ('0000' + numInt).slice(-4);
        return numStr.split("").reverse().join("");
    }

    _bit2senddata(data, bit0, bit1) {
        const bit = data.split('');
        let senddata = '';
        for (let i = 0; i < bit.length; i++) {
            if (bit[i] == '0') {
                senddata += bit0;
            } else if (bit[i] == '1') {
                senddata += bit1;
            } else {
                console.error('_bit2senddata: input includes not bit data: ', bit[i]);
            }
        }
        return senddata;
    }

    _checksum(data) {
        const checkSum = [];
        const BYTE = 8;
        let sum = 0;
        const stride = BYTE;

        for (let i = 0; i < data.length; i += stride) {
            sum += parseInt(data.substr(i, stride).split('').reverse().join(''), 2);
        }

        const sumStr = sum.toString(2);
        return sumStr.substr(-stride, stride).split('').reverse().join('');
    }

    /**
     * get a full status for everything stored for a user
     *
     * @param 
     * @returns {boolean}
     */
    off() {
        let sequence = [];

        const code = this.actions.off.includes('function') ? eval(this.actions.off) : this.actions.off;
        sequence = sequence.concat(code);

        this._exec(sequence);
        return true;
    };

    /**
     *
     * @param temp
     * @returns {boolean}
     */
    heat(temp) {
        let sequence = [];

        this.args.temp = temp;
        const code = this.actions.heat.includes('function') ? eval(this.actions.heat) : this.actions.heat;
        sequence = sequence.concat(code);

        this._exec(sequence);
        return true;
    };

    /**
     *
     * @param temp
     * @returns {boolean}
     */
    cool(temp) {
        let sequence = [];

        this.args.temp = temp;
        const code = this.actions.cool.includes('function') ? eval(this.actions.cool) : this.actions.cool;
        sequence = sequence.concat(code);

        this._exec(sequence);
        return true;
    };

    /**
     * Change Light color
     * @param spec
     * @returns {boolean}
     */
    spectrum(spec) {
        // not inmplement
        return false
    };

    /**
     * Change Light color 
     * @param temp
     * @returns {boolean}
     */
    temperature(temp) {
        let sequence = [];

        this.args.temp = temp;
        const code = this.actions.temperature.includes('function') ? eval(this.actions.temperature) : this.actions.temperature;
        sequence = sequence.concat(code);

        this._exec(sequence);
        return true;
    };

    /**
     * Change Light brightness 
     * @param bright 
     * parcent of brightness
     * @returns {boolean}
     */
    brightness(bright) {
        let sequence = [];

        this.args.bright = bright;
        const code = this.actions.brightness.includes('function') ? eval(this.actions.brightness) : this.actions.brightness;
        sequence = sequence.concat(code);

        this._exec(sequence);
        return true;
    };

    onOff(on) {
        let sequence = [];

        this.args.on = on;
        const action = on ? this.actions.on : this.actions.off;
        const code = action.includes('function') ? eval(action) : action;
        sequence = sequence.concat(code);

        this._exec(sequence);
        return true;
    }
}

module.exports = BroadlinkDriver;