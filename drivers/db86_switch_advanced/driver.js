const Homey = require("homey");
const model = ["remote.b286acn01", "lumi.remote.b286acn02", "remote.b286acn02"];

class DoubleButton86SwitchAdvanced extends Homey.Driver {
  onInit() {
    this.triggers = {
      left_click: new Homey.FlowCardTriggerDevice("left_click_button_switch").register(),
      left_double_click: new Homey.FlowCardTriggerDevice("left_double_click_click_button_switch").register(),
      left_long_click_press: new Homey.FlowCardTriggerDevice("left_long_click_press_click_button_switch").register(),
      right_click: new Homey.FlowCardTriggerDevice("right_click_button_switch").register(),
      right_double_click: new Homey.FlowCardTriggerDevice("right_double_click_click_button_switch").register(),
      right_long_click_press: new Homey.FlowCardTriggerDevice("right_long_click_press_click_button_switch").register(),
      both_click: new Homey.FlowCardTriggerDevice("both_click_click_press_click_button_switch").register(),
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

module.exports = DoubleButton86SwitchAdvanced;
