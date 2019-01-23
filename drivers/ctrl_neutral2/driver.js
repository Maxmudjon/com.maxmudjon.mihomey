const Homey = require("homey");
const model = ["ctrl_neutral2"];

const initToggleFlowTriggers = (on, off, toggle) => ({
  on: new Homey.FlowCardTriggerDevice(on).register(),
  off: new Homey.FlowCardTriggerDevice(off).register(),
  toggle: new Homey.FlowCardTriggerDevice(toggle).register()
});

const initFlowCondition = name => new Homey.FlowCardCondition(name).register();

const initToggleFlowAction = (on, off, toggle) => ({
  on: new Homey.FlowCardAction(on).register(),
  off: new Homey.FlowCardAction(off).register(),
  toggle: new Homey.FlowCardAction(toggle).register()
});

class DoubleSwitch extends Homey.Driver {
  onInit() {
    this.triggers = {
      left_switch: initToggleFlowTriggers("left_switch_on", "left_switch_off", "left_switch_toggle"),
      right_switch: initToggleFlowTriggers("right_switch_on", "right_switch_off", "right_switch_toggle")
    };
    this.conditions = {
      left_switch: initFlowCondition("left_switch_active"),
      right_switch: initFlowCondition("right_switch_active")
    };
    this.actions = {
      left_switch: initToggleFlowAction("left_switch_on", "left_switch_off", "left_switch_toggle"),
      right_switch: initToggleFlowAction("right_switch_on", "right_switch_off", "right_switch_toggle")
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

module.exports = DoubleSwitch;
