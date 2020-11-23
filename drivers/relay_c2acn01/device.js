const Homey = require("homey");
const miio = require("miio");

class AqaraRelay extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.initialize();
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerCapabilities();
    this.registerConditions();
    this.registerActions();
    this.getReleyStatus();
  }

  registerCapabilities() {
    this.register1ChannelToggle("onoff.1");
    this.register2ChannelToggle("onoff.2");
  }

  registerConditions() {
    const { conditions } = this.driver;
    this.registerCondition("onoff.1", conditions.left_switch);
    this.registerCondition("onoff.2", conditions.right_switch);
  }

  registerActions() {
    const { actions } = this.driver;

    this.registerLeftSwitchOnAction(actions.left_switch_on);
    this.registerLeftSwitchOffAction(actions.left_switch_off);
    this.registerLeftSwitchToggleAction(actions.left_switch_toggle);
    this.registerRightSwitchOnAction(actions.right_switch_on);
    this.registerRightSwitchOffAction(actions.right_switch_off);
    this.registerRightSwitchToggleAction(actions.right_switch_toggle);
  }

  getReleyStatus() {
    const sid = this.data.sid;

    miio
      .device({ address: this.getSetting("deviceIp"), token: this.getSetting("deviceToken") })
      .then((device) => {
        this.device = device;

        this.device
          .call("get_device_prop_exp", [
            [sid, "channel_0"],
            [sid, "channel_1"],
            [sid, "load_power"],
          ])
          .then((result) => {
            if (result[0][0] == "unknown") {
              this.setUnavailable("Device is offline");
            } else {
              this.setAvailable();
              this.updateCapabilityValue("onoff.1", result[0][0] == "on" ? true : false);
              this.updateCapabilityValue("onoff.2", result[1][0] == "on" ? true : false);
              this.updateCapabilityValue("measure_power", parseFloat(result[2][0]));
            }
          })
          .catch((error) => that.log("Sending commmand 'get_device_prop_exp' error: ", error.message));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getReleyStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    const sid = this.data.sid;
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_device_prop_exp", [
          [sid, "channel_0"],
          [sid, "channel_1"],
          [sid, "load_power"],
        ])
        .then((result) => {
          if (result[0][0] == "unknown") {
            this.setUnavailable("Device is offline");
          } else {
            this.setAvailable();
            this.updateCapabilityValue("onoff.1", result[0][0] == "on" ? true : false);
            this.updateCapabilityValue("onoff.2", result[1][0] == "on" ? true : false);
            this.updateCapabilityValue("measure_power", parseFloat(result[2][0]));
          }
        })
        .catch((error) => {
          this.log("Sending commmand 'get_device_prop_exp' error: ", error.message);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getReleyStatus();
          }, 1000 * interval);
        });
    }, 1000 * interval);
  }

  updateCapabilityValue(name, value) {
    const { triggers } = this.driver;
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log("[" + this.data.sid + "] [" + name + "] [" + value + "] Capability successfully updated");
        })
        .catch((error) => {
          this.log("[" + this.data.sid + "] [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });

      if (name == "onoff.1") {
        if (value) {
          triggers.left_switch_on.trigger(this, {}, true);
        } else {
          triggers.left_switch_off.trigger(this, {}, true);
        }
        triggers.left_switch_toggle.trigger(this, {}, true);
      } else if (name == "onoff.2") {
        if (value) {
          triggers.right_switch_on.trigger(this, {}, true);
        } else {
          triggers.right_switch_off.trigger(this, {}, true);
        }
        triggers.right_switch_toggle.trigger(this, {}, true);
      }
    }
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIp") || changedKeys.includes("deviceToken")) {
      this.getReleyStatus();
      callback(null, true);
    }
  }

  register1ChannelToggle(name) {
    const sid = this.data.sid;
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("toggle_ctrl_neutral", ["channel_0", value ? "on" : "off"], { sid })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'toggle_ctrl_neutral' error: ", error.message));
    });
  }

  register2ChannelToggle(name) {
    const sid = this.data.sid;
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("toggle_ctrl_neutral", ["channel_1", value ? "on" : "off"], { sid })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'toggle_ctrl_neutral' error: ", error.message));
    });
  }

  registerCondition(name, condition) {
    condition.registerRunListener((args, state) => Promise.resolve(this.getCapabilityValue(name)));
  }

  registerLeftSwitchOnAction(action) {
    action.registerRunListener(async (args, state) => {
      const sid = args.device.data.sid;
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIp"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("toggle_ctrl_neutral", ["channel_0", "on"], { sid })
              .then(() => {
                this.log("Sending " + name + " commmand: " + value);
                device.destroy();
              })
              .catch((error) => {
                this.log("Sending commmand 'toggle_ctrl_neutral' error: ", error.message);
                device.destroy();
              });
          })
          .catch((error) => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    });
  }

  registerLeftSwitchOffAction(action) {
    action.registerRunListener(async (args, state) => {
      const sid = args.device.data.sid;
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIp"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("toggle_ctrl_neutral", ["channel_0", "off"], { sid })
              .then(() => {
                this.log("Sending " + name + " commmand: " + value);
                device.destroy();
              })
              .catch((error) => {
                this.log("Sending commmand 'toggle_ctrl_neutral' error: ", error.message);
                device.destroy();
              });
          })
          .catch((error) => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    });
  }

  registerLeftSwitchToggleAction(action) {
    action.registerRunListener(async (args, state) => {
      const sid = args.device.data.sid;
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIp"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("toggle_ctrl_neutral", ["channel_0", "toggle"], { sid })
              .then(() => {
                this.log("Sending " + name + " commmand: " + value);
                device.destroy();
              })
              .catch((error) => {
                this.log("Sending commmand 'toggle_ctrl_neutral' error: ", error.message);
                device.destroy();
              });
          })
          .catch((error) => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    });
  }

  registerRightSwitchOnAction(action) {
    action.registerRunListener(async (args, state) => {
      const sid = args.device.data.sid;
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIp"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("toggle_ctrl_neutral", ["channel_1", "on"], { sid })
              .then(() => {
                this.log("Sending " + name + " commmand: " + value);
                device.destroy();
              })
              .catch((error) => {
                this.log("Sending commmand 'toggle_ctrl_neutral' error: ", error.message);
                device.destroy();
              });
          })
          .catch((error) => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    });
  }

  registerRightSwitchOffAction(action) {
    action.registerRunListener(async (args, state) => {
      const sid = args.device.data.sid;
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIp"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("toggle_ctrl_neutral", ["channel_1", "off"], { sid })
              .then(() => {
                this.log("Sending " + name + " commmand: " + value);
                device.destroy();
              })
              .catch((error) => {
                this.log("Sending commmand 'toggle_ctrl_neutral' error: ", error.message);
                device.destroy();
              });
          })
          .catch((error) => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    });
  }

  registerRightSwitchToggleAction(action) {
    action.registerRunListener(async (args, state) => {
      const sid = args.device.data.sid;
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIp"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("toggle_ctrl_neutral", ["channel_1", "toggle"], { sid })
              .then(() => {
                this.log("Sending " + name + " commmand: " + value);
                device.destroy();
              })
              .catch((error) => {
                this.log("Sending commmand 'toggle_ctrl_neutral' error: ", error.message);
                device.destroy();
              });
          })
          .catch((error) => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    });
  }

  onAdded() {
    this.log("Device added");
  }

  onDeleted() {
    this.log("Device deleted");
    clearInterval(this.updateInterval);
    if (typeof this.device !== "undefined") {
      this.device.destroy();
    }
  }
}

module.exports = AqaraRelay;
