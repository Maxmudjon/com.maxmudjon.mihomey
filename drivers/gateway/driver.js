const Homey = require("homey");
const model = ["gateway", "gateway.v3"];

const initToggleFlowTriggers = (on, off, toggle) => ({
  on: new Homey.FlowCardTriggerDevice(on).register(),
  off: new Homey.FlowCardTriggerDevice(off).register(),
  toggle: new Homey.FlowCardTriggerDevice(toggle).register()
});

const initFlowCondition = name => new Homey.FlowCardCondition(name).register();

const initFlowAction = play => ({
  play: new Homey.FlowCardAction(play).register()
});

const initToggleFlowAction = (on, off) => ({
  on: new Homey.FlowCardAction(on).register(),
  off: new Homey.FlowCardAction(off).register()
});

class Gateway extends Homey.Driver {
  onInit() {
    this.triggers = {
      power: initToggleFlowTriggers("power_on", "power_off", "power_toggle")
    };
    this.conditions = {
      power: initFlowCondition("power_active")
    };
    this.actions = {
      power: initToggleFlowAction("power_on", "power_off"),
      playTone: initFlowAction("play_tone")
    };
  }

  onPairListDevices(data, callback) {
    if (Homey.app.mihub.hubs) {
      Homey.app.mihub
        .getGatewayByModel(model)
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

module.exports = Gateway;
