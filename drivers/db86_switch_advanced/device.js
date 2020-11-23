const Homey = require("homey");

class DoubleButton86SwitchAdvanced extends Homey.Device {
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
    } else {
      this.unregisterStateChangeListener();
    }
  }

  handleStateChange(device) {
    const { triggers } = this.driver;

    if (device["data"]["voltage"]) {
      var battery = (device["data"]["voltage"] - 2800) / 5;
      this.updateCapabilityValue("measure_battery", battery > 100 ? 100 : battery);
      this.updateCapabilityValue("alarm_battery", battery <= 20 ? true : false);
    }

    if (device["data"]["channel_0"] == "click") {
      this.triggerFlow(triggers.left_click, "left_click", true);
    }

    if (device["data"]["channel_0"] == "double_click") {
      this.triggerFlow(triggers.left_double_click, "left_double_click", true);
    }

    if (device["data"]["channel_0"] == "long_click") {
      this.triggerFlow(triggers.left_long_click_press, "left_long_click_press", true);
    }

    if (device["data"]["channel_1"] == "click") {
      this.triggerFlow(triggers.right_click, "right_click", true);
    }

    if (device["data"]["channel_1"] == "double_click") {
      this.triggerFlow(triggers.right_double_click, "right_double_click", true);
    }

    if (device["data"]["channel_1"] == "long_click") {
      this.triggerFlow(triggers.right_long_click_press, "right_long_click_press", true);
    }

    if (device["data"]["dual_channel"] == "both_click") {
      this.triggerFlow(triggers.both_click, "both_click_press", true);
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

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return;
    }

    if (value) {
      trigger.trigger(this, {}, value);
    }

    this.log("trigger:", name, value);

    switch (name) {
      case "left_click":
      case "left_double_click":
      case "left_long_click_press":
      case "right_click":
      case "right_double_click":
      case "right_long_click_press":
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

module.exports = DoubleButton86SwitchAdvanced;
