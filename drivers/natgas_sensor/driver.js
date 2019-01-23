const Homey = require("homey");
const model = ["natgas", "sensor_natgas"];

const initToggleFlowTriggers = (on, off) => ({
  on: new Homey.FlowCardTriggerDevice(on).register(),
  off: new Homey.FlowCardTriggerDevice(off).register()
});

const initFlowCondition = name => new Homey.FlowCardCondition(name).register();

class NatGasSensor extends Homey.Driver {
  onInit() {
    this.triggers = {
      alarm_natgas: initToggleFlowTriggers("alarm_ch4_yes", "alarm_ch4_no")
    };
    this.conditions = {
      alarm_natgas: initFlowCondition("alarm_ch4")
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

module.exports = NatGasSensor;
