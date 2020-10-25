const Homey = require("homey");
const model = ["ctrl_ln2.aq1", "switch_b2nacn02"];

const initToggleFlowTriggers = (on, off, toggle) => ({
  on: new Homey.FlowCardTriggerDevice(on).register(),
  off: new Homey.FlowCardTriggerDevice(off).register(),
  toggle: new Homey.FlowCardTriggerDevice(toggle).register(),
});

const initFlowCondition = (name) => new Homey.FlowCardCondition(name).register();

const initToggleFlowAction = (on, off) => ({
  on: new Homey.FlowCardAction(on).register(),
  off: new Homey.FlowCardAction(off).register(),
});

class DoubleSwitchLN extends Homey.Driver {
  onInit() {
    this.triggers = {
      left_switch: initToggleFlowTriggers("left_switch_on", "left_switch_off", "left_switch_toggle"),
      right_switch: initToggleFlowTriggers("right_switch_on", "right_switch_off", "right_switch_toggle"),
    };
    this.conditions = {
      left_switch: initFlowCondition("left_switch_active"),
      right_switch: initFlowCondition("right_switch_active"),
    };
    this.actions = {
      left_switch: initToggleFlowAction("left_switch_on", "left_switch_off"),
      right_switch: initToggleFlowAction("right_switch_on", "right_switch_off"),
    };
  }

  onPairListDevices(data, callback) {
    if (Homey.app.mihub.hubs) {
      Homey.app.mihub
        .getDevicesByModel(model)
        .then((devices) =>
          callback(
            null,
            devices.map((device) => {
              return {
                name: device.name + " | " + device.sid,
                data: {
                  sid: device.sid,
                },
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

module.exports = DoubleSwitchLN;
