const Homey = require("homey");
const model = ["86sw1"];

class DoubleButton86Switch extends Homey.Driver {
  onInit() {
    this.triggers = {
      click: new Homey.FlowCardTriggerDevice("click_sb86_switch").register()
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

module.exports = DoubleButton86Switch;
