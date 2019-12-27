const Homey = require("homey");
const model = ["switch"];

class ButtonSwitch extends Homey.Driver {
  onInit() {
    this.triggers = {
      click: new Homey.FlowCardTriggerDevice("click_button_switch").register(),
      double_click: new Homey.FlowCardTriggerDevice("double_click_click_button_switch").register(),
      long_click_press: new Homey.FlowCardTriggerDevice("long_click_press_click_button_switch").register()
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

module.exports = ButtonSwitch;
