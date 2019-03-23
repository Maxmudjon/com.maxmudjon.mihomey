const Homey = require("homey");
const model = ["lock.aq1"];

class AqaraLock1 extends Homey.Driver {
  onInit() {
    this.triggers = {
      lockUsed: new Homey.FlowCardTriggerDevice("lockUsed").register()
    };
  }

  onPairListDevices(data, callback) {
    Homey.app.mihub
      .getDevicesByModel(model)
      .then(devices => callback(null, this.deviceList(devices)))
      .catch(() => callback(Homey.__("pair.no_devices_found")));
  }

  deviceList(devices) {
    let sortDevices = [];
    for (var sid in devices) {
      let device = devices[sid];
      let deviceList = {
        name: device.name + " | " + device.sid,
        data: {
          sid: device.sid
        }
      };
      sortDevices.push(deviceList);
    }
    return sortDevices;
  }
}

module.exports = AqaraLock1;
