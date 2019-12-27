const Homey = require("homey");
const model = ["86sw2"];

class DoubleButton86Switch extends Homey.Driver {
  onInit() {
    this.triggers = {
      left_click: new Homey.FlowCardTriggerDevice("left_click_db86_switch").register(),
      right_click: new Homey.FlowCardTriggerDevice("right_click_db86_switch").register(),
      both_click: new Homey.FlowCardTriggerDevice("both_click_db86_switch").register()
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

module.exports = DoubleButton86Switch;
