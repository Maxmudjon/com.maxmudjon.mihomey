const Homey = require("homey");
const model = ["vibration"];

class VibrationSensor extends Homey.Driver {
  onInit() {
    this.triggers = {
      vibrate: new Homey.FlowCardTriggerDevice("vibrate_sensor_vibrate").register(),
      tilt: new Homey.FlowCardTriggerDevice("vibrate_sensor_tilt").register(),
      free_fall: new Homey.FlowCardTriggerDevice("vibrate_sensor_free_fall").register()
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

module.exports = VibrationSensor;
