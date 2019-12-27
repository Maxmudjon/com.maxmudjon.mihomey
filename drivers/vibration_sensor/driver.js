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
    if (Homey.app.mihub.hubs) {
      Homey.app.mihub
        .getDevicesByModel(model)
        .then(devices =>
          callback(
            null,
            devices.map(device => {
              return {
                name: device.name + " | " + device.sid,
                data: {
                  sid: device.sid
                }
              };
            })
          )
        )
        .catch(() => callback(new Error(Homey.__("pair.no_devices_found"))));
    } else {
      callback(new Error(Homey.__("pair.no_gateways")));
    }
  }
}

module.exports = VibrationSensor;
