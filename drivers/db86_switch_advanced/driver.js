const Homey = require("homey");
const model = ["remote.b286acn01"];

class DoubleButton86SwitchAdvanced extends Homey.Driver {
  onInit() {
    this.triggers = {
      left_click: new Homey.FlowCardTriggerDevice("left_click_button_switch").register(),
      left_double_click: new Homey.FlowCardTriggerDevice("left_double_click_click_button_switch").register(),
      left_long_click_press: new Homey.FlowCardTriggerDevice("left_long_click_press_click_button_switch").register(),
      right_click: new Homey.FlowCardTriggerDevice("right_click_button_switch").register(),
      right_double_click: new Homey.FlowCardTriggerDevice("right_double_click_click_button_switch").register(),
      right_long_click_press: new Homey.FlowCardTriggerDevice("right_long_click_press_click_button_switch").register(),
      both_click: new Homey.FlowCardTriggerDevice("both_click_click_press_click_button_switch").register()
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

module.exports = DoubleButton86SwitchAdvanced;
