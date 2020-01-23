const Homey = require("homey");

class SingleSwitch extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.handleStateChange = this.handleStateChange.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.initialize();
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    if (Homey.app.mihub.hubs) {
      this.registerStateChangeListener();
      this.registerCapabilities();
      this.registerConditions();
      this.registerActions();
    } else {
      this.unregisterStateChangeListener();
    }
  }

  registerCapabilities() {
    const { triggers } = this.driver;
    this.registerToggle("onoff", "on", "off", triggers.power);
  }

  registerConditions() {
    const { conditions } = this.driver;
    this.registerCondition("onoff", conditions.power);
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerToggleAction("onoff", "on", "off", actions.power);
  }

  handleStateChange(device) {
    const { triggers } = this.driver;

    if (device["data"]["channel_0"] == "on") {
      this.updateCapabilityValue("onoff", true, triggers.power);
    }

    if (device["data"]["channel_0"] == "off") {
      this.updateCapabilityValue("onoff", false, triggers.power);
    }

    let gateways = Homey.app.mihub.gateways;
    for (let sid in gateways) {
      gateways[sid]["childDevices"].forEach(deviceSid => {
        if (this.data.sid == deviceSid) {
          this.setSettings({
            deviceFromGatewaySid: sid
          });
        }
      });
    }

    this.setSettings({
      deviceSid: device.sid,
      deviceModelName: "lumi." + device.model,
      deviceModelCodeName: device.modelCode
    });
  }

  registerAuthChangeListener() {
    Homey.app.mihub.on("gatewaysList", this.initialize);
  }

  registerStateChangeListener() {
    Homey.app.mihub.on(`${this.data.sid}`, this.handleStateChange);
  }

  unregisterAuthChangeListener() {
    Homey.app.mihub.removeListener("gatewaysList", this.initialize);
  }

  unregisterStateChangeListener() {
    Homey.app.mihub.removeListener(`${this.data.sid}`, this.handleStateChange);
  }

  updateCapabilityValue(name, value, trigger) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log("[" + this.data.sid + "] [" + name + "] [" + value + "] Capability successfully updated");
        })
        .catch(error => {
          this.log("[" + this.data.sid + "] [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
      this.triggerFlow(trigger, name, value);
    }
  }

  registerToggle(name, valueOn = true, valueOff = false, trigger) {
    let sid = this.data.sid;
    this.registerCapabilityListener(name, async value => {
      const newValue = value ? valueOn : valueOff;
      const data = { channel_0: newValue };
      await Homey.app.mihub.sendWrite(sid, data);
      this.triggerFlow(trigger, name, value);
    });
  }

  registerCondition(name, condition) {
    condition.registerRunListener((args, state) => Promise.resolve(this.getCapabilityValue(name)));
  }

  registerToggleAction(name, valueOn = true, valueOff = false, action) {
    action.on.registerRunListener(async (args, state) => {
      const data = { channel_0: valueOn };
      await Homey.app.mihub.sendWrite(args.device.data.sid, data);
      return true;
    });
    action.off.registerRunListener(async (args, state) => {
      const data = { channel_0: valueOff };
      await Homey.app.mihub.sendWrite(args.device.data.sid, data);
      return true;
    });
  }

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return;
    }

    this.log("trigger:", name, value);

    switch (name) {
      case "measure_power":
      case "meter_power":
      case "onoff":
    }
  }

  onAdded() {
    this.log("Device added");
  }

  onDeleted() {
    this.unregisterAuthChangeListener();
    this.unregisterStateChangeListener();
    this.log("Device deleted deleted");
  }
}

module.exports = SingleSwitch;
