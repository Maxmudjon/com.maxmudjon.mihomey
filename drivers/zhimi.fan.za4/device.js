const Homey = require("homey");
const miio = require("miio");

class MiSmartStandingFan2S extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.initialize();
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.getFanStatus();
  }

  registerActions() {
    const { actions } = this.driver;

    this.registeHorizontalAngleAction("zhimi_fan_za5_horizontal_angle", actions.horizontalAngle);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerOnOffSwingButton("onoff.swing");
    this.registerFanLevel("dim");
    this.registerAngleLevel("dim.angle");
  }

  getFanStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }
        this.device = device;

        this.device
          .call("get_prop", ["power", "angle", "angle_enable", "speed_level", "natural_level", "child_lock", "poweroff_time", "buzzer", "led_b"])
          .then((result) => {
            this.log('getFanStatus ', result)
            this.updateCapabilityValue("onoff", result[0] == "on");
            this.updateCapabilityValue("dim.angle", +result[1]);
            this.updateCapabilityValue("onoff.swing", result[2] == "on");
            this.updateCapabilityValue("dim", +result[3]);

            this.setSettings({ childLock: result[5] == "on" });
            this.setSettings({ buzzer: !!result[7] });
            this.setSettings({ led: !!result[8] });
          })
          .catch((error) => this.log("Sending commmand 'get_properties' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getFanStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_prop", ["power", "angle", "angle_enable", "speed_level", "natural_level", "child_lock", "poweroff_time", "buzzer", "led_b"])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }

          this.log('updateTimer ', result)
          this.updateCapabilityValue("onoff", result[0] == "on");
          this.updateCapabilityValue("dim.angle", +result[1]);
          this.updateCapabilityValue("onoff.swing", result[2] == "on");
          this.updateCapabilityValue("dim", +result[3]);

          this.setSettings({ childLock: result[5] == "on" });
          this.setSettings({ buzzer: !!result[7] });
          this.setSettings({ led: !!result[8] });
        })
        .catch((error) => {
          this.log("Sending commmand error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getFanStatus();
          }, 1000 * interval);
        });
    }, 1000 * interval);
  }

  updateCapabilityValue(capabilityName, value) {
    if (this.getCapabilityValue(capabilityName) != value) {
      this.setCapabilityValue(capabilityName, value)
        .then(() => {
          this.log("[" + this.data.id + "] [" + capabilityName + "] [" + value + "] Capability successfully updated");
        })
        .catch((error) => {
          this.log("[" + this.data.id + "] [" + capabilityName + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.getFanStatus();
      callback(null, true);
    }

    if (changedKeys.includes("led")) {
      this.device
        .call("set_led_b", [newSettings.led ? 1 : 0])
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.led);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_led_b' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("buzzer")) {
      this.device
        .call("set_buzzer", [newSettings.buzzer ? 1 : 0])
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.buzzer);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_buzzer' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("childLock")) {
      this.device
        .call("set_child_lock", [newSettings.childLock ? "on" : "off"])
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.childLock);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_child_lock' error: ", error);
          callback(error, false);
        });
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_power", [value ? "on" : "off"])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_power' error: ", error));
    });
  }

  registerOnOffSwingButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_angle_enable", [value ? "on" : "off"])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_angle_enable' error: ", error));
    });
  }

  registerFanLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      
      this.device
        .call("set_speed_level", [+(value.toFixed())])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_speed_level' error: ", error));
    });
  }

  registerAngleLevel(name) {
    this.registerCapabilityListener(name, async (value) => {

      this.log('ANGLE.DIM value ',value)
      this.device
        .call("set_angle", [+(value.toFixed())])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_speed_level' error: ", error));
    });
  }

  registeHorizontalAngleAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("set_angle", [args.angle])
              .then(() => {
                this.log("Set 'set_angle': ", args.angle);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_angle' error: ", error.message);
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

  onDeleted() {
    this.log("Device deleted");
    clearInterval(this.updateInterval);
    if (typeof this.device !== "undefined") {
      this.device.destroy();
    }
  }
}

module.exports = MiSmartStandingFan2S;
