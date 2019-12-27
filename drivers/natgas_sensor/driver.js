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

module.exports = NatGasSensor;
