const Homey = require("homey");
const model = ["sensor_switch.aq3"];

class AqaraButtonSwitch extends Homey.Driver {
  onInit() {
    this.triggers = {
      click: new Homey.FlowCardTriggerDevice("click_button_switch").register(),
      double_click: new Homey.FlowCardTriggerDevice("double_click_click_button_switch").register(),
      long_click_press: new Homey.FlowCardTriggerDevice("long_click_press_click_button_switch").register(),
      long_click_release: new Homey.FlowCardTriggerDevice("long_click_release_click_button_switch").register(),
      shake: new Homey.FlowCardTriggerDevice("shake_click_button_switch").register()
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

module.exports = AqaraButtonSwitch;
