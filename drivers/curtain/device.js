const Homey = require("homey");

class Curtain extends Homey.Device {
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
    this.registerToggle("onoff");
    this.registerDim("dim");
    this.registerCovering("windowcoverings_state");
  }

  registerConditions() {
    const { conditions } = this.driver;
    this.registerCondition("onoff", conditions.power);
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerToggleAction("onoff", actions.power);
  }

  handleStateChange(device) {
    const { triggers } = this.driver;

    if (parseInt(device["data"]["curtain_level"]) > 0) {
      this.updateCapabilityValue("onoff", true, triggers.power);
    }

    if (parseInt(device["data"]["curtain_level"]) == 0) {
      this.updateCapabilityValue("onoff", false, triggers.power);
    }

    if (device["data"]["curtain_level"]) {
      this.updateCapabilityValue("dim", parseInt(device["data"]["curtain_level"]) / 100);
    }

    clearTimeout(this.curtainTernaryTimeout);

    this.curtainTernaryTimeout = setTimeout(() => {
      this.setCapabilityValue("windowcoverings_state", "idle");
    }, 3000);

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

  registerToggle(name) {
    let sid = this.data.sid;
    this.registerCapabilityListener(name, async (value) => {
      const settings = this.getSettings();
      if (value) {
        const data = { curtain_status: settings.reverted ? "open" : "close" };
        await Homey.app.mihub.sendWrite(sid, data);
      } else {
        const data = { curtain_status: settings.reverted ? "close" : "open" };
        await Homey.app.mihub.sendWrite(sid, data);
      }
    });
  }

  registerDim(name) {
    let sid = this.data.sid;
    this.registerCapabilityListener(name, async (value) => {
      const level = Math.round(value * 100);
      const data = { curtain_level: level.toString() };
      await Homey.app.mihub.sendWrite(sid, data);
    });
  }

  registerCovering(name) {
    let sid = this.data.sid;
    this.registerCapabilityListener(name, async (value) => {
      const settings = this.getSettings();
      const states = { up: "open", idle: "stop", down: "close" };

      if (value == "up") {
        const data = { curtain_status: states[settings.reverted ? "down" : "up"] };
        await Homey.app.mihub.sendWrite(sid, data);
      } else if (value == "down") {
        const data = { curtain_status: states[settings.reverted ? "up" : "down"] };
        await Homey.app.mihub.sendWrite(sid, data);
      } else {
        const data = { curtain_status: states[value] };
        await Homey.app.mihub.sendWrite(sid, data);
      }
    });
  }

  registerCondition(name, condition) {
    condition.registerRunListener((args, state) => Promise.resolve(this.getCapabilityValue(name)));
  }

  registerToggleAction(name, action) {
    let sid = this.data.sid;
    const settings = this.getSettings();
    action.on.registerRunListener(async (args, state) => {
      const data = { status: settings.reverted ? "open" : "close" };
      await Homey.app.mihub.sendWrite(sid, data);
      return true;
    });
    action.off.registerRunListener(async (args, state) => {
      const data = { status: settings.reverted ? "close" : "open" };
      await Homey.app.mihub.sendWrite(sid, data);
      return true;
    });
  }

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return;
    }

    this.log("trigger:", name, value);

    switch (name) {
      case "onoff":
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

module.exports = Curtain;
