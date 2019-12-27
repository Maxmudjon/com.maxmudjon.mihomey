const Homey = require("homey");
const model = ["plug"];

const initToggleFlowTriggers = (on, off, toggle) => ({
  on: new Homey.FlowCardTriggerDevice(on).register(),
  off: new Homey.FlowCardTriggerDevice(off).register(),
  toggle: new Homey.FlowCardTriggerDevice(toggle).register()
});

const initFlowCondition = name => new Homey.FlowCardCondition(name).register();

const initToggleFlowAction = (on, off) => ({
  on: new Homey.FlowCardAction(on).register(),
  off: new Homey.FlowCardAction(off).register()
});

class Plug extends Homey.Driver {
  onInit() {
    this.triggers = {
      power: initToggleFlowTriggers("power_on", "power_off", "power_toggle")
    };
    this.conditions = {
      power: initFlowCondition("power_active")
    };
    this.actions = {
      power: initToggleFlowAction("power_on", "power_off")
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

module.exports = Plug;
