const Homey = require("homey");

class DoubleSwitchLN extends Homey.Device {
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
    this.registerToggle("onoff.1", "channel_0", "on", "off", triggers.left_switch);
    this.registerToggle("onoff.2", "channel_1", "on", "off", triggers.right_switch);
  }

  registerConditions() {
    const { conditions } = this.driver;
    this.registerCondition("onoff.1", conditions.left_switch);
    this.registerCondition("onoff.2", conditions.right_switch);
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerToggleAction("onoff.1", "channel_0", "on", "off", actions.left_switch);
    this.registerToggleAction("onoff.2", "channel_1", "on", "off", actions.right_switch);
  }

  handleStateChange(device) {
    const { triggers } = this.driver;

    if (device["data"]["channel_0"] == "on") {
      this.updateCapabilityValue("onoff.1", true, triggers.left_switch);
    }

    if (device["data"]["channel_0"] == "off") {
      this.updateCapabilityValue("onoff.1", false, triggers.left_switch);
    }

    if (device["data"]["channel_1"] == "on") {
      this.updateCapabilityValue("onoff.2", true, triggers.right_switch);
    }

    if (device["data"]["channel_1"] == "off") {
      this.updateCapabilityValue("onoff.2", false, triggers.right_switch);
    }

    let gateways = Homey.app.mihub.gateways;
    for (let sid in gateways) {
      gateways[sid]["childDevices"].forEach((deviceSid) => {
        if (this.data.sid == deviceSid) {
          this.setSettings({
            deviceFromGatewaySid: sid,
          });
        }
      });
    }

    this.setSettings({
      deviceSid: device.sid,
      deviceModelName: "lumi." + device.model,
      deviceModelCodeName: device.modelCode,
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
        .catch((error) => {
          this.log("[" + this.data.sid + "] [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
      this.triggerFlow(trigger, name, value);
    }
  }

  registerToggle(name, channel, valueOn = true, valueOff = false, trigger) {
    let sid = this.data.sid;
    this.registerCapabilityListener(name, async (value) => {
      const newValue = value ? valueOn : valueOff;
      const data = { [channel]: newValue };
      await Homey.app.mihub.sendWrite(sid, data);
      this.triggerFlow(trigger, name, value);
    });
  }

  registerCondition(name, condition) {
    condition.registerRunListener((args, state) => Promise.resolve(this.getCapabilityValue(name)));
  }

  registerToggleAction(name, channel, valueOn = true, valueOff = false, action) {
    action.on.registerRunListener(async (args, state) => {
      const data = { [channel]: valueOn };
      await Homey.app.mihub.sendWrite(args.device.data.sid, data);
      return true;
    });
    action.off.registerRunListener(async (args, state) => {
      const data = { [channel]: valueOff };
      await Homey.app.mihub.sendWrite(args.device.data.sid, data);
      return true;
    });
  }

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return;
    }

    switch (name) {
      case "measure_power":
      case "meter_power":
      case "onoff.1":
        trigger.toggle.trigger(this);
        value ? trigger.on.trigger(this) : trigger.off.trigger(this);
      case "onoff.2":
        trigger.toggle.trigger(this);
        value ? trigger.on.trigger(this) : trigger.off.trigger(this);
    }
  }

  onAdded() {
    this.log("Device added");
  }

  onDeleted() {
    this.unregisterAuthChangeListener();
    this.unregisterStateChangeListener();
    this.log("Device deleted");
  }
}

module.exports = DoubleSwitchLN;
