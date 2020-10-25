const Homey = require("homey");
const model = ["86sw1", "lumi.remote.b186acn02", "remote.b186acn02"];

class DoubleButton86Switch extends Homey.Driver {
  onInit() {
    this.triggers = {
      click: new Homey.FlowCardTriggerDevice("click_sb86_switch").register(),
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

module.exports = DoubleButton86Switch;
