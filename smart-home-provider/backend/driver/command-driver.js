const util = require('util');
const child_process = require('child_process');

class CommandDriver {
    constructor(device, config) {
        this.actions = config.actions;
        this.device = device;
    }

    onOff(on) {
        let sequence = [];

        const action = on ? this.actions.on : this.actions.off;
        child_process.exec(action, (error, stdout, stderr) => {
            if (error instanceof Error) {
                console.error('command:', action, ' fail:', error);
            } else {
                console.log('command sucess:', stdout);
            }
        });

        this._exec(sequence);
        return true;
    }
}

module.exports = CommandDriver;