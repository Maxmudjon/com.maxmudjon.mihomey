const Homey = require("homey");
const model = ["ctrl_86plug.aq1"];

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

class Ctrl86PlugAq1 extends Homey.Driver {
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

module.exports = Ctrl86PlugAq1;
