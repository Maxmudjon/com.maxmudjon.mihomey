const Homey = require("homey");
const miio = require("miio");

class MiAirFreshVA2 extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.favoriteLevel = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 95, 100];
    this.initialize();
    this.log("MiJia device init | " + "name: " + this.getName() + " - " + "class: " + this.getClass() + " - " + "data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.getAirFreshStatus();
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerAirFreshOnAction("air_fresh_on", actions.airFreshOn);
    this.registerAirFreshOffAction("air_fresh_off", actions.airFreshOff);
    this.registerAirFreshModeAction("air_fresh_mode", actions.airFreshMode);
    this.registerAirFreshSpeedAction("air_fresh_speed", actions.airFreshSpeed);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerFavoriteLevel("dim");
    this.registerAirFreshMode("air_fresh_mode");
  }

  getAirFreshStatus() {
    var that = this;
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then(device => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }

        this.device = device;

        this.device
          .call("get_prop", ["power", "mode", "aqi", "co2", "humidity", "temp_dec", "motor1_speed", "led", "buzzer", "child_lock", "f1_hour_used"])
          .then(result => {
            that.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
            that.updateCapabilityValue("air_fresh_mode", result[1]);
            that.updateCapabilityValue("measure_pm25", parseInt(result[2]));
            that.updateCapabilityValue("measure_co2", parseInt(result[3]));
            that.updateCapabilityValue("measure_humidity", parseInt(result[4]));
            that.updateCapabilityValue("measure_temperature", parseInt(result[5] / 10));
            that.updateCapabilityValue("dim", parseInt(parseInt(result[6] / 10.3) / 100));
            that.setSettings({ led: result[7] == "on" ? true : false });
            that.setSettings({ buzzer: result[8] == "on" ? true : false });
            that.setSettings({ childLock: result[9] == "on" ? true : false });
            that.setSettings({ f1_hour_used: result[10] + "%" });
          })
          .catch(error => that.log("Sending commmand 'get_prop' error: ", error));

        var update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch(error => {
        this.log(error);
        this.setUnavailable(Homey.__("reconnecting"));
        setTimeout(() => {
          this.getAirFreshStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    var that = this;
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_prop", ["power", "mode", "aqi", "co2", "humidity", "temp_dec", "motor1_speed", "led", "buzzer", "child_lock", "f1_hour_used"])
        .then(result => {
          that.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
          that.updateCapabilityValue("air_fresh_mode", result[1]);
          that.updateCapabilityValue("measure_pm25", parseInt(result[2]));
          that.updateCapabilityValue("measure_co2", parseInt(result[3]));
          that.updateCapabilityValue("measure_humidity", parseInt(result[4]));
          that.updateCapabilityValue("measure_temperature", parseInt(result[5] / 10));
          that.updateCapabilityValue("dim", parseInt(parseInt(result[6] / 10.3) / 100));
          that.setSettings({ led: result[7] == "on" ? true : false });
          that.setSettings({ buzzer: result[8] == "on" ? true : false });
          that.setSettings({ childLock: result[9] == "on" ? true : false });
          that.setSettings({ f1_hour_used: result[10] + "%" });
        })
        .catch(error => {
          this.log("Sending commmand error: ", error);
          clearInterval(this.updateInterval);
          this.setUnavailable(Homey.__("unreachable"));
          setTimeout(() => {
            this.getAirFreshStatus();
          }, 1000 * interval);
        });
    }, 1000 * interval);
  }

  updateCapabilityValue(capabilityName, value) {
    if (this.getCapabilityValue(capabilityName) != value) {
      this.setCapabilityValue(capabilityName, value)
        .then(() => {
          this.log("[" + this.data.id + "]" + " [" + capabilityName + "] [" + value + "] Capability successfully updated");
        })
        .catch(error => {
          this.log("[" + this.data.id + "]" + " [" + capabilityName + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.getAirFreshStatus();
      callback(null, true);
    }

    if (changedKeys.includes("led")) {
      this.device
        .call("set_led", [newSettings.led ? "on" : "off"])
        .then(() => {
          this.log("Sending " + name + " commmand: " + value);
          callback(null, true);
        })
        .catch(error => {
          this.log("Sending commmand 'set_led' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("buzzer")) {
      this.device
        .call("set_buzzer", [newSettings.buzzer ? "on" : "off"])
        .then(() => {
          this.log("Sending " + name + " commmand: " + value);
          callback(null, true);
        })
        .catch(error => {
          this.log("Sending commmand 'set_buzzer' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("childLock")) {
      this.device
        .call("set_child_lock", [newSettings.childLock ? "on" : "off"])
        .then(() => {
          this.log("Sending " + name + " commmand: " + value);
          callback(null, true);
        })
        .catch(error => {
          this.log("Sending commmand 'set_child_lock' error: ", error);
          callback(error, false);
        });
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      this.device
        .call("set_power", [value ? "on" : "off"])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'set_power' error: ", error));
    });
  }

  registerFavoriteLevel(name) {
    this.registerCapabilityListener(name, async value => {
      let speed = value * 100;
      if (speed > 0) {
        this.device
          .call("set_motor1", [speed * 10.3])
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch(error => this.log("Sending commmand 'set_level_favorite' error: ", error));
      }
    });
  }

  registerAirFreshMode(name) {
    this.registerCapabilityListener(name, async value => {
      this.device
        .call("set_mode", [value])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'set_mode' error: ", error));
    });
  }

  registerAirFreshOnAction(name, action) {
    var that = this;
    action.action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_power", ["on"])
              .then(() => {
                that.log("Set 'set_power' ON");
                device.destroy();
              })
              .catch(error => {
                that.log("Set 'set_power' error: ", error);
                device.destroy();
              });
          })
          .catch(error => {
            that.log("miio connect error: " + error);
          });
      } catch (error) {
        that.log("catch error: " + error);
      }
    });
  }

  registerAirFreshOffAction(name, action) {
    var that = this;
    action.action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_power", ["off"])
              .then(() => {
                that.log("Set 'set_power' OFF");
                device.destroy();
              })
              .catch(error => {
                that.log("Set 'set_power' error: ", error);
                device.destroy();
              });
          })
          .catch(error => {
            that.log("miio connect error: " + error);
          });
      } catch (error) {
        that.log("catch error: " + error);
      }
    });
  }

  registerAirFreshModeAction(name, action) {
    var that = this;
    action.action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_mode", [args.modes])
              .then(() => {
                that.log("Set 'set_mode': ", args.modes);
                device.destroy();
              })
              .catch(error => {
                that.log("Set 'set_mode' error: ", error);
                device.destroy();
              });
          })
          .catch(error => {
            that.log("miio connect error: " + error);
          });
      } catch (error) {
        that.log("catch error: " + error);
      }
    });
  }

  registerAirFreshSpeedAction(name, action) {
    var that = this;
    action.action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_motor1", [args.range * 100 * 10.3])
              .then(() => {
                that.log("Set 'set_motor1': ", args.range * 100 * 10.3);
                device.destroy();
              })
              .catch(error => {
                that.log("Set 'set_motor1' error: ", error);
                device.destroy();
              });
          })
          .catch(error => {
            that.log("miio connect error: " + error);
          });
      } catch (error) {
        that.log("catch error: " + error);
      }
    });
  }

  onAdded() {
    this.log("Device added");
  }

  onDeleted() {
    this.log("Device deleted deleted");
    clearInterval(this.updateInterval);
    if (typeof this.device !== "undefined") {
      this.device.destroy();
    }
  }
}

module.exports = MiAirFreshVA2;
