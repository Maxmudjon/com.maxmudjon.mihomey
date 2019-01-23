const Homey = require("homey");
const miio = require("miio");

class MiAirPurifierS2 extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.favoriteLevel = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 95, 100];
    this.update = this.getSetting("updateTimer") || 60;
    this.updateInterval;
    this.initialize();
    this.log("Mi Homey device init | " + "name: " + this.getName() + " - " + "class: " + this.getClass() + " - " + "data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.registerConditions();
    this.getPurifierStatus(this.update);
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerPurifierOnAction("purifier_on", actions.purifierOn);
    this.registerPurifierOffAction("purifier_off", actions.purifierOff);
    this.registerPurifierModeAction("purifier_mode", actions.purifierMode);
    this.registerPurifierSpeedAction("purifier_speed", actions.purifierSpeed);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerFavoriteLevel("dim");
    this.registerAirPurifierMode("air_purifier_mode");
  }

  registerConditions() {
    const { conditions } = this.driver;
    this.registerCondition("onoff", conditions.purifier_power);
  }

  async getPurifierStatus(update) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(async () => {
      var that = this;
      try {
        await miio
          .device({
            address: this.getSetting("deviceIP"),
            token: this.getSetting("deviceToken")
          })
          .then(device => {
            if (!this.getAvailable()) {
              this.setAvailable();
            }

            this.setAvailable();

            device
              .call("get_prop", ["power", "aqi", "average_aqi", "humidity", "temp_dec", "bright", "mode", "favorite_level", "filter1_life", "use_time", "purify_volume", "led", "buzzer", "child_lock"])
              .then(result => {
                that.setCapabilityValue("onoff", result[0] === "on" ? true : false);
                that.setCapabilityValue("measure_pm25", parseInt(result[1]));
                that.setCapabilityValue("measure_humidity", parseInt(result[3]));
                that.setCapabilityValue("measure_temperature", parseInt(result[4] / 10));
                that.setCapabilityValue("measure_luminance", parseInt(result[5]));
                that.setCapabilityValue("air_purifier_mode", result[6]);
                that.setCapabilityValue("dim", parseInt(that.favoriteLevel[result[7]] / 100));
                that.setSettings({ filter1_life: result[8] + "%" });
                that.setSettings({ purify_volume: result[10] + " m3" });
                that.setSettings({ led: result[11] == "on" ? true : false });
                that.setSettings({ buzzer: result[12] == "on" ? true : false });
                that.setSettings({
                  childLock: result[13] == "on" ? true : false
                });
                device.destroy();
              })
              .catch(error => {
                that.log("Sending commmand 'get_arming' error: ", error);
                device.destroy();
              });
          })
          .catch(error => {
            if (error == "Error: Could not connect to device, handshake timeout") {
              this.setUnavailable(Homey.__("Could not connect to device, handshake timeout"));
              this.log("Error: Could not connect to device, handshake timeout");
            } else if (error == "Error: Could not connect to device, token might be wrong") {
              this.setUnavailable(Homey.__("Could not connect to device, token might be wrong"));
              this.log("Error: Could not connect to device, token might be wrong");
            }
            if (typeof that.device !== "undefined") {
              device.destroy();
            }
          });
      } catch (error) {
        this.log("Error ", error);
      }
    }, 1000 * update);
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.getPurifierStatus(newSettings["updateTimer"]);
      callback(null, true);
    }

    if (changedKeys.includes("led")) {
      try {
        miio
          .device({
            address: this.getSetting("deviceIP"),
            token: this.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_led", [newSettings.led ? "on" : "off"])
              .then(() => {
                this.log("Sending " + " commmand: " + newSettings.led ? "on" : "off");
                device.destroy();
                callback(null, true);
              })
              .catch(error => {
                this.log("Sending commmand 'set_led' " + newSettings.led ? "on" : "off" + " error: " + error);
                device.destroy();
                callback(error, false);
              });
          })
          .catch(error => {
            this.log("miio connect error: " + error);
            callback(error, false);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    }

    if (changedKeys.includes("buzzer")) {
      try {
        miio
          .device({
            address: this.getSetting("deviceIP"),
            token: this.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_buzzer", [newSettings.buzzer ? "on" : "off"])
              .then(() => {
                this.log("Sending " + " commmand: " + newSettings.buzzer ? "on" : "off");
                device.destroy();
                callback(null, true);
              })
              .catch(error => {
                this.log("Sending commmand 'set_buzzer' " + newSettings.buzzer ? "on" : "off" + " error: " + error);
                device.destroy();
                callback(error, false);
              });
          })
          .catch(error => {
            this.log("miio connect error: " + error);
            callback(error, false);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    }

    if (changedKeys.includes("childLock")) {
      try {
        miio
          .device({
            address: this.getSetting("deviceIP"),
            token: this.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_child_lock", [newSettings.childLock ? "on" : "off"])
              .then(() => {
                this.log("Sending " + " commmand: " + newSettings.childLock ? "on" : "off");
                device.destroy();
                callback(null, true);
              })
              .catch(error => {
                this.log("Sending commmand 'set_child_lock' " + newSettings.childLock ? "on" : "off" + " error: " + error);
                device.destroy();
                callback(error, false);
              });
          })
          .catch(error => {
            this.log("miio connect error: " + error);
            callback(error, false);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      try {
        miio
          .device({
            address: this.getSetting("deviceIP"),
            token: this.getSetting("deviceIP")
          })
          .then(device => {
            device
              .call("set_power", [value ? "on" : "off"])
              .then(() => {
                this.log("Sending " + name + " commmand: " + value);
                device.destroy();
              })
              .catch(error => {
                this.log("Sending commmand 'set_power' " + value + " error: " + error);
                device.destroy();
              });
          })
          .catch(error => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    });
  }

  registerFavoriteLevel(name) {
    this.registerCapabilityListener(name, async value => {
      let speed = value * 100;
      if (speed > 0) {
        try {
          miio
            .device({
              address: this.getSetting("deviceIP"),
              token: this.getSetting("deviceIP")
            })
            .then(device => {
              device
                .call("set_level_favorite", [this.getFavoriteLevel(speed)])
                .then(() => {
                  this.log("Sending " + name + " commmand: " + value);
                  device.destroy();
                })
                .catch(error => {
                  this.log("Sending commmand 'set_level_favorite' " + value + " error: " + error);
                  device.destroy();
                });
            })
            .catch(error => {
              this.log("miio connect error: " + error);
            });
        } catch (error) {
          this.log("catch error: " + error);
        }
      }
    });
  }

  registerAirPurifierMode(name) {
    this.registerCapabilityListener(name, async value => {
      try {
        miio
          .device({
            address: this.getSetting("deviceIP"),
            token: this.getSetting("deviceIP")
          })
          .then(device => {
            device
              .call("set_mode", [value])
              .then(() => {
                this.log("Sending " + name + " commmand: " + value);
                device.destroy();
              })
              .catch(error => {
                this.log("Sending commmand 'set_mode' " + value + " error: " + error);
                device.destroy();
              });
          })
          .catch(error => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    });
  }

  registerPurifierOnAction(name, action) {
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

  registerPurifierOffAction(name, action) {
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

  registerPurifierModeAction(name, action) {
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

  registerPurifierSpeedAction(name, action) {
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
              .call("set_level_favorite", [that.getFavoriteLevel(args.range)])
              .then(() => {
                that.log("Set 'set_level_favorite': ", that.getFavoriteLevel(args.range));
                device.destroy();
              })
              .catch(error => {
                that.log("Set 'set_level_favorite' error: ", error);
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

  registerCondition(name, condition) {
    condition.registerRunListener((args, state, callback) => {
      callback(null, this.getCapabilityValue(name));
    });
  }

  getFavoriteLevel(speed) {
    for (var i = 1; i < this.favoriteLevel.length; i++) {
      if (speed > this.favoriteLevel[i - 1] && speed <= this.favoriteLevel[i]) {
        return i;
      }
    }

    return 1;
  }

  onAdded() {
    this.log("Device added");
  }

  onDeleted() {
    this.log("Device deleted deleted");
    clearInterval(this.updateInterval);
  }
}

module.exports = MiAirPurifierS2;
