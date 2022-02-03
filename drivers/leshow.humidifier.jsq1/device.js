const Homey = require("homey");
const miio = require("miio");

const params = [
  { siid: 2, piid: 1 }, //status - bool
  { siid: 2, piid: 2 }, //fault - uint8
  { siid: 2, piid: 3 }, //mode - uint8
  { siid: 2, piid: 6 }, //target humidity - uint8
  { siid: 3, piid: 1 }, //humidity - uint8
  { siid: 8, piid: 1 }, //water level - uint8
  { siid: 8, piid: 6 }, //screen brightness - uint8
];

class XiaoMiHumidifierPro extends Homey.Device {
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
    this.registerHumidifierModeAction("humidifier_pro_mode", actions.humidifierMode);
    this.registerHumidifierSpeedAction("humidifier_pro_speed", actions.humidifierSpeed);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerFavoriteLevel("dim");
    this.registerHumidifierMode("leshow_humidifier_jsq1_mode");
  }

  getHumidifierStatus() {
    miio
      .device({
        address: this.getSetting("deviceIP"),
        token: this.getSetting("deviceToken"),
      })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }

        this.device = device;

        this.device
          .call("get_properties", params, {
            retries: 1,
          })
          .then((result) => {
            this.log(result);
            const deviceFaultResult = result.filter((r) => r.siid == 2 && r.piid == 2)[0];
            const deviceStatusResult = result.filter((r) => r.siid == 2 && r.piid == 1)[0];
            const deviceModeResult = result.filter((r) => r.siid == 2 && r.piid == 3)[0];
            const deviceTargetHumidityResult = result.filter((r) => r.siid == 2 && r.piid == 6)[0];
            const deviceHumidityResult = result.filter((r) => r.siid == 3 && r.piid == 1)[0];
            const deviceWaterLevelResult = result.filter((r) => r.siid == 8 && r.piid == 1)[0];
            const deviceLedResult = result.filter((r) => r.siid == 8 && r.piid == 6)[0];

            this.updateCapabilityValue("onoff", deviceStatusResult.value);
            this.updateCapabilityValue("measure_humidity", +deviceHumidityResult.value);
            this.updateCapabilityValue("leshow_humidifier_jsq1_mode", "" + deviceModeResult.value);
            this.updateCapabilityValue("dim", deviceTargetHumidityResult.value);
            this.updateCapabilityValue("measure_water", deviceWaterLevelResult.value);
            this.setSettings({ led: !!deviceLedResult.value });
          })
          .catch((error) => this.log("Sending commmand 'get_prop' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
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
        .call("get_properties", params, {
          retries: 1,
        })
        .then((result) => {
          const deviceFaultResult = result.filter((r) => r.siid == 2 && r.piid == 2)[0];
          const deviceStatusResult = result.filter((r) => r.siid == 2 && r.piid == 1)[0];
          const deviceModeResult = result.filter((r) => r.siid == 2 && r.piid == 3)[0];
          const deviceTargetHumidityResult = result.filter((r) => r.siid == 2 && r.piid == 6)[0];
          const deviceHumidityResult = result.filter((r) => r.siid == 3 && r.piid == 1)[0];
          const deviceWaterLevelResult = result.filter((r) => r.siid == 8 && r.piid == 1)[0];
          const deviceLedResult = result.filter((r) => r.siid == 8 && r.piid == 6)[0];

          this.updateCapabilityValue("onoff", deviceStatusResult.value);
          this.updateCapabilityValue("measure_humidity", +deviceHumidityResult.value);
          this.updateCapabilityValue("leshow_humidifier_jsq1_mode", "" + deviceModeResult.value);
          this.updateCapabilityValue("dim", deviceTargetHumidityResult.value);
          this.updateCapabilityValue("measure_water", deviceWaterLevelResult.value);
          this.setSettings({ led: !!deviceLedResult.value });
        })
        .catch((error) => {
          this.log("Sending commmand error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getHumidifierStatus();
          }, 1000 * interval);
        });
    }, 1000 * interval);
  }

  updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log("[" + this.data.id + "] [" + name + "] [" + value + "] Capability successfully updated");
        })
        .catch((error) => {
          this.log("[" + this.data.id + "] [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.getHumidifierStatus();
      callback(null, true);
    }

    if (changedKeys.includes("led")) {
      const params = [{ siid: 8, piid: 6, value: newSettings.led ? 1 : 0 }];
      this.device
        .call("set_properties", params, { retries: 1 })
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.led);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_properties' error: ", error);
          callback(error, false);
        });
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      const params = [{ siid: 2, piid: 1, value }];
      this.device
        .call("set_properties", params, { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerFavoriteLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      const params = [{ siid: 2, piid: 6, value }];
      this.device
        .call("set_properties", params, { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerHumidifierMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      const params = [{ siid: 2, piid: 3, value: +value }];

      this.device
        .call("set_properties", params, { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerHumidifierOnAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            const params = [{ siid: 2, piid: 1, value: true }];
            device
              .call("set_properties", params, { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties' ON");
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_properties' error: ", error);
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

  registerHumidifierOffAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            const params = [{ siid: 2, piid: 1, value: false }];
            device
              .call("set_properties", params, { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties' OFF");
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_properties' error: ", error);
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

  registerHumidifierModeAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            const params = [{ siid: 2, piid: 3, value: args.modes }];
            device
              .call("set_properties", params, { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties': ", args.modes);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_properties' error: ", error);
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

  registerHumidifierSpeedAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            const params = [{ siid: 2, piid: 6, value: +args.range }];
            device
              .call("set_properties", params, { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties': ", args.range);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_properties' error: ", error);
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

module.exports = XiaoMiHumidifierPro;
