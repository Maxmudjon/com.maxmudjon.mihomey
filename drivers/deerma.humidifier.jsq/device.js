const Homey = require("homey");
const miio = require("miio");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve(), ms * 1000));

class MiHomeyDevice extends Homey.Device {
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
    this.registerHumidifierModeAction("deerma_humidifier_jsq4_mode", actions.humidifierMode);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerTargetRelativeHumidity("dim");
    this.registerHumidifierMode("deerma_humidifier_jsq4_mode");
  }

  getHumidifierStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }
        this.device = device;

        const props = [
          { propName: "OnOff_State", capabilityName: "onoff", format: (v) => !!v },
          { propName: "TemperatureValue", capabilityName: "measure_temperature", format: (v) => v },
          { propName: "Humidity_Value", capabilityName: "measure_humidity", format: (v) => v },
          { propName: "HumiSet_Value", capabilityName: "dim", format: (v) => v },
          { propName: "Humidifier_Gear", capabilityName: "deerma_humidifier_jsq4_mode", format: (v) => "" + v },
          { propName: "waterstatus", capabilityName: "alarm_water", format: (v) => !!!v },
          { propName: "Led_State", settings: "led" },
          { propName: "TipSound_State", settings: "buzzer" },
        ];

        for (let index = 0; index < props.length; index++) {
          const prop = props[index];
          this.device
            .call("get_prop", [prop.propName])
            .then(([result]) => {
              if (prop && prop.capabilityName) {
                this.updateCapabilityValue(prop.capabilityName, prop.format(result));
              } else if (prop && prop.settings) {
                this.setSettings({ [prop.settings]: !!result });
              }
            })
            .catch((error) => this.log("Sending commmand 'get_prop' error: ", error));

          delay(1);
        }

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
      const props = [
        { propName: "OnOff_State", capabilityName: "onoff", format: (v) => !!v },
        { propName: "TemperatureValue", capabilityName: "measure_temperature", format: (v) => v },
        { propName: "Humidity_Value", capabilityName: "measure_humidity", format: (v) => v },
        { propName: "HumiSet_Value", capabilityName: "dim", format: (v) => v },
        { propName: "Humidifier_Gear", capabilityName: "deerma_humidifier_jsq4_mode", format: (v) => "" + v },
        { propName: "waterstatus", capabilityName: "alarm_water", format: (v) => !!!v },
        { propName: "Led_State", settings: "led" },
        { propName: "TipSound_State", settings: "buzzer" },
      ];

      for (let index = 0; index < props.length; index++) {
        const prop = props[index];
        this.device
          .call("get_prop", [prop.propName])
          .then(([result]) => {
            if (prop && prop.capabilityName) {
              this.updateCapabilityValue(prop.capabilityName, prop.format(result));
            } else if (prop && prop.settings) {
              this.setSettings({ [prop.settings]: !!result });
            }
          })
          .catch((error) => {
            break;
            this.log("Sending commmand error: ", error);
            this.setUnavailable(error.message);
            clearInterval(this.updateInterval);
            setTimeout(() => {
              this.getHumidifierStatus();
            }, 1000 * interval);
          });

        delay(1);
      }
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
      this.getHumidifierStatus();
      callback(null, true);
    }

    if (changedKeys.includes("led")) {
      this.device
        .call("SetLedState", [+newSettings.led], { retries: 1 })
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.led);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'SetLedState' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("buzzer")) {
      this.device
        .call("SetTipSound_Status", [+newSettings.buzzer], { retries: 1 })
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.buzzer);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'SetTipSound_Status' error: ", error);
          callback(error, false);
        });
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("Set_OnOff", [+value])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'Set_OnOff' error: ", error));
    });
  }

  registerTargetRelativeHumidity(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("Set_HumiValue", [value])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'Set_HumiValue' error: ", error));
    });
  }

  registerHumidifierMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("Set_HumidifierGears", [+value])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'Set_HumidifierGears' error: ", error));
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
            device
              .call("Set_HumidifierGears", [+args.modes])
              .then(() => {
                this.log("Set 'Set_HumidifierGears': ", args.modes);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'Set_HumidifierGears' error: ", error.message);
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

module.exports = MiHomeyDevice;
