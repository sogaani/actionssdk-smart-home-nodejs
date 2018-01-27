const BroadlinkJS = require('broadlinkjs-rm');
const broadlink = new BroadlinkJS();
const config = require('./broadlink.json');

const discoveredDevices = {};
const Broadlink = {};
const limit = 5;

let discovering = false;

Broadlink.discoverDevices = (count = 0) => {
    discovering = true;
    if (count >= 5) {
        discovering = false;

        return;
    }

    broadlink.discover(config.lport1, config.lport2, config.destaddr);
    count++;

    setTimeout(() => {
        Broadlink.discoverDevices(count);
    }, 5 * 1000)
}

Broadlink.discoverDevices();

broadlink.on('deviceReady', (device) => {
    const macAddressParts = device.mac.toString('hex').match(/[\s\S]{1,2}/g) || []
    const macAddress = macAddressParts.join(':')
    device.host.macAddress = macAddress

    if (discoveredDevices[device.host.address] || discoveredDevices[device.host.macAddress]) return;

    console.log(`Discovered Broadlink RM device at ${device.host.address} (${device.host.macAddress})`)

    discoveredDevices[device.host.address] = device;
    discoveredDevices[device.host.macAddress] = device;
})

Broadlink.getDevice = ({ host, learnOnly }) => {
    let device;

    console.log("get device");
    if (host) {
        device = discoveredDevices[host];
    } else { // use the first one of no host is provided
        const hosts = Object.keys(discoveredDevices);
        if (hosts.length === 0) {
            console.log(`Send data (no devices found)`);
            if (!discovering) {
                console.log(`Attempting to discover RM devices for 5s`);

                Broadlink.discoverDevices()
            }

            return
        }

        // Only return device that can Learn Code codes
        if (learnOnly) {
            for (let i = 0; i < hosts.length; i++) {
                let currentDevice = discoveredDevices[hosts[i]];

                if (currentDevice.enterLearning) {
                    device = currentDevice

                    break;
                }
            }

            if (!device) console.log(`Learn Code (no device found at ${host})`)
            if (!device && !discovering) {
                console.log(`Attempting to discover RM devices for 5s`);

                Broadlink.discoverDevices()
            }
        } else {
            device = discoveredDevices[hosts[0]];

            if (!device) console.log(`Send data (no device found at ${host})`);
            if (!device && !discovering) {
                console.log(`Attempting to discover RM devices for 5s`);

                Broadlink.discoverDevices()
            }
        }
    }

    return device;
}

Broadlink.sendData = (device = false, hexData = false) => {
    if (device === false || hexData === false) {
        console.log('Missing params, sendData failed', typeof device, typeof hexData);
        return;
    }

    const hexDataBuffer = new Buffer(hexData, 'hex');
    device.sendData(hexDataBuffer);
}

Broadlink.execCommand = (command) => {
    let host = command.mac || command.ip;
    let device = Broadlink.getDevice({ host });
    if (!device) return setTimeout(() => { console.log(command); Broadlink.execCommand(command); }, 1000);

    if (!device) {
        console.log(`sendData(no device found at ${host})`);
    } else if (!device.sendData) {
        console.log(`[ERROR] The device at ${device.host.address} (${device.host.macAddress}) doesn't support the sending of IR or RF codes.`);
    } else if (command.data && command.data.includes('5aa5aa555')) {
        console.log('[ERROR] This type of hex code (5aa5aa555...) is no longer valid. Use the included "Learn Code" accessory to find new (decrypted) codes.');
    } else {
        if ('sequence' in command) {
            console.log('Sending sequence..');
            for (var i in command.sequence) {
                data = command.sequence[i];
                setTimeout(() => {
                    Broadlink.sendData(device, data);
                }, 200 * i);
            }
        } else {
            Broadlink.sendData(device, command.data);
        }
    }
}


Broadlink.stopLearn = () => {
    // Reset existing learn requests
    if (!closeClient) return;

    Broadlink.closeClient();
    Broadlink.closeClient = null;

    console.log(`Learn Code (stopped)`);
}

Broadlink.startLearn = (host, callback, turnOffCallback, disableTimeout) => {
    stop()

    // Get the Broadlink device
    const device = Broadlink.getDevice({ host, log, learnOnly: true });
    if (!device) {
        setTimeout(() => { Broadlink.startLearn(host, callback, turnOffCallback, log, disableTimeout) }, 1000);
        return
    }
    if (!device.enterLearning) return console.log(`Learn Code (IR learning not supported for device at ${host})`);

    let onRawData;

    Broadlink.closeClient = (err) => {
        if (Broadlink.timeout) clearTimeout(Broadlink.timeout);
        Broadlink.timeout = null;

        if (getDataTimeout) clearTimeout(Broadlink.getDataTimeout);
        Broadlink.getDataTimeout = null;

        device.removeListener('rawData', onRawData);
    };

    onRawData = (message) => {
        if (!Broadlink.closeClient) return;

        const hex = message.toString('hex');
        console.log(`Learn Code (learned hex code: ${hex})`);
        console.log(`Learn Code (complete)`);

        Broadlink.closeClient();
        Broadlink.closeClient = null;

        turnOffCallback();
    };

    device.on('rawData', onRawData);

    device.enterLearning()
    console.log(`Learn Code (ready)`);

    if (callback) callback();

    Broadlink.getDataTimeout = setTimeout(() => {
        Broadlink.getData(device);
    }, 1000)

    if (disableTimeout) return;

    // Timeout the client after 10 seconds
    Broadlink.timeout = setTimeout(() => {
        console.log('Learn Code (stopped - 10s timeout)');
        if (device.cancelRFSweep) device.cancelRFSweep();

        if (Broadlink.closeClient) {
            Broadlink.closeClient();
            Broadlink.closeClient = null;
        }

        turnOffCallback();
    }, 10000); // 10s
}

Broadlink.getData = (device) => {
    if (Broadlink.getDataTimeout) clearTimeout(Broadlink.getDataTimeout);
    if (!closeClient) return;

    device.checkData()

    Broadlink.getDataTimeout = setTimeout(() => {
        Broadlink.getData(device);
    }, 1000);
}

Broadlink.learnCode = (host) => {
    const _turnOffCallback = () => {
        Broadlink.stopLearn();
    }
    Broadlink.startLearn(host, null, _turnOffCallback, true);
}

exports.learnCode = Broadlink.learnCode;
exports.execCommand = Broadlink.execCommand;