const Homey = require("homey");
const miio = require("miio");

const params = [
  { siid: 2, piid: 1 },
  { siid: 2, piid: 5 },
  { siid: 2, piid: 6 },
  { siid: 2, piid: 7 },
  { siid: 2, piid: 8 },
  { siid: 2, piid: 9 },
  { siid: 2, piid: 10 },
  { siid: 2, piid: 11 },
  { siid: 3, piid: 7 },
  { siid: 3, piid: 9 },
  { siid: 4, piid: 1 },
  { siid: 5, piid: 2 },
  { siid: 6, piid: 1 },
  { siid: 7, piid: 1 },
  { siid: 7, piid: 3 },
  { siid: 7, piid: 5 }
];

class MiHumidifierCA4 extends Homey.Device {
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
    this.getHumidifierStatus();
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerHumidifierOnAction("humidifier_on", actions.humidifierOn);
    this.registerHumidifierOffAction("humidifier_off", actions.humidifierOff);
    this.registerHumidifierModeAction("humidifier_ca4_mode", actions.humidifierMode);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerDryOnOffButton("onoff.dry");
    this.registerTargetRelativeHumidity("dim");
    this.registerHumidifierMode("humidifier_ca4_mode");
  }

  getHumidifierStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then(device => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }
        this.device = device;

        this.device
          .call("get_properties", params, { retries: 1 })
          .then(result => {
            const powerResult = result.filter(r => r.siid == 2 && r.piid == 1)[0];
            const deviceModeResult = result.filter(r => r.siid == 2 && r.piid == 5)[0];
            const deviceTargetHumidityResult = result.filter(r => r.siid == 2 && r.piid == 6)[0];
            const deviceWaterLevelResult = result.filter(r => r.siid == 2 && r.piid == 7)[0];
            const deviceDryResult = result.filter(r => r.siid == 2 && r.piid == 8)[0];
            const deviceSpeedLevelResult = result.filter(r => r.siid == 2 && r.piid == 11)[0];
            const deviceTemperatureResult = result.filter(r => r.siid == 3 && r.piid == 7)[0];
            const deviceHumidityResult = result.filter(r => r.siid == 3 && r.piid == 9)[0];
            const deviceBuzzerResult = result.filter(r => r.siid == 4 && r.piid == 1)[0];
            const deviceLedBrightnessResult = result.filter(r => r.siid == 5 && r.piid == 2)[0];
            const deviceChildLockResult = result.filter(r => r.siid == 6 && r.piid == 1)[0];

            this.updateCapabilityValue("onoff", powerResult.value);
            this.updateCapabilityValue("onoff.dry", deviceDryResult.value);
            this.updateCapabilityValue("measure_humidity", +deviceHumidityResult.value);
            this.updateCapabilityValue("measure_temperature", +deviceTemperatureResult.value);
            this.updateCapabilityValue("humidifier_ca4_mode", "" + deviceModeResult.value);
            this.updateCapabilityValue("dim", (+deviceSpeedLevelResult.value / 200) * 10);
            this.updateCapabilityValue("dim.target", +deviceTargetHumidityResult.value);
            this.updateCapabilityValue("measure_water", +deviceWaterLevelResult.value);

            this.setSettings({ led: !!deviceLedBrightnessResult.value });
            this.setSettings({ buzzer: deviceBuzzerResult.value });
            this.setSettings({ childLock: deviceChildLockResult.value });
          })
          .catch(error => this.log("Sending commmand 'get_properties' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch(error => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getHumidifierStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_properties", params, { retries: 1 })
        .then(result => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          const powerResult = result.filter(r => r.siid == 2 && r.piid == 1)[0];
          const deviceModeResult = result.filter(r => r.siid == 2 && r.piid == 5)[0];
          const deviceTargetHumidityResult = result.filter(r => r.siid == 2 && r.piid == 6)[0];
          const deviceWaterLevelResult = result.filter(r => r.siid == 2 && r.piid == 7)[0];
          const deviceDryResult = result.filter(r => r.siid == 2 && r.piid == 8)[0];
          const deviceSpeedLevelResult = result.filter(r => r.siid == 2 && r.piid == 11)[0];
          const deviceTemperatureResult = result.filter(r => r.siid == 3 && r.piid == 7)[0];
          const deviceHumidityResult = result.filter(r => r.siid == 3 && r.piid == 9)[0];
          const deviceBuzzerResult = result.filter(r => r.siid == 4 && r.piid == 1)[0];
          const deviceLedBrightnessResult = result.filter(r => r.siid == 5 && r.piid == 2)[0];
          const deviceChildLockResult = result.filter(r => r.siid == 6 && r.piid == 1)[0];

          this.updateCapabilityValue("onoff", powerResult.value);
          this.updateCapabilityValue("onoff.dry", deviceDryResult.value);
          this.updateCapabilityValue("measure_humidity", +deviceHumidityResult.value);
          this.updateCapabilityValue("measure_temperature", +deviceTemperatureResult.value);
          this.updateCapabilityValue("humidifier_ca4_mode", "" + deviceModeResult.value);
          this.updateCapabilityValue("dim", (+deviceSpeedLevelResult.value / 200) * 10);
          this.updateCapabilityValue("dim.target", +deviceTargetHumidityResult.value);
          this.updateCapabilityValue("measure_water", +deviceWaterLevelResult.value);

          this.setSettings({ led: !!deviceLedBrightnessResult.value });
          this.setSettings({ buzzer: deviceBuzzerResult.value });
          this.setSettings({ childLock: deviceChildLockResult.value });
        })
        .catch(error => {
          this.log("Sending commmand error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getHumidifierStatus();
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
        .catch(error => {
          this.log("[" + this.data.id + "] [" + capabilityName + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.getHumidifierStatus();
      callback(null, true);
    }

    if (changedKeys.includes("led")) {
      this.device
        .call("set_properties", [{ siid: 5, piid: 2, value: newSettings.led ? 2 : 0 }], { retries: 1 })
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.led);
          callback(null, true);
        })
        .catch(error => {
          this.log("Sending commmand 'set_properties' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("buzzer")) {
      this.device
        .call("set_properties", [{ siid: 4, piid: 1, value: newSettings.buzzer }], { retries: 1 })
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.buzzer);
          callback(null, true);
        })
        .catch(error => {
          this.log("Sending commmand 'set_properties' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("childLock")) {
      this.device
        .call("set_properties", [{ siid: 6, piid: 1, value: newSettings.childLock }], { retries: 1 })
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.childLock);
          callback(null, true);
        })
        .catch(error => {
          this.log("Sending commmand 'set_properties' error: ", error);
          callback(error, false);
        });
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      this.device
        .call("set_properties", [{ siid: 2, piid: 1, value }], { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerDryOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      this.device
        .call("set_properties", [{ siid: 2, piid: 8, value }], { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerTargetRelativeHumidity(name) {
    this.registerCapabilityListener(name, async value => {
      let humidity = value * 100;

      this.device
        .call("set_properties", [{ siid: 2, piid: 6, value: humidity }], { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerHumidifierMode(name) {
    this.registerCapabilityListener(name, async value => {
      this.device
        .call("set_properties", [{ siid: 2, piid: 5, value: +value }], { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerHumidifierOnAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_properties", [{ siid: 2, piid: 1, value: true }], { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties': ON");
                device.destroy();
              })
              .catch(error => {
                this.log("Set 'set_properties' error: ", error.message);
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

  registerHumidifierOffAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_properties", [{ siid: 2, piid: 1, value: false }], { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties': OFF");
                device.destroy();
              })
              .catch(error => {
                this.log("Set 'set_properties' error: ", error.message);
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

  registerHumidifierModeAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_properties", [{ siid: 2, piid: 5, value: +args.modes }], { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties': ", args.modes);
                device.destroy();
              })
              .catch(error => {
                this.log("Set 'set_properties' error: ", error.message);
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

  onDeleted() {
    this.log("Device deleted");
    clearInterval(this.updateInterval);
    if (typeof this.device !== "undefined") {
      this.device.destroy();
    }
  }
}

module.exports = MiHumidifierCA4;
