const Homey = require("homey");
const miio = require("miio");

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
    this.getPhilipsStatus();
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerDimLevel("dim");
    this.registerHueLevel("light_hue");
    this.registerLightTemperatureLevel("light_temperature");
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerPhilipsScenesAction("philips_scenes", actions.philipsScenes);
  }

  getPhilipsStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }

        this.device = device;

        this.device
          .call("get_prop", ["power", "snm", "bright", "cct", "cid", "sta"])
          .then((result) => {
            this.updateCapabilityValue("onoff", result[0] == "on");
            this.updateCapabilityValue("dim", result[2] / 100);
            this.updateCapabilityValue("light_temperature", this.normalize(result[3], 1880, 7000));
            this.updateCapabilityValue("light_hue", result[4] / 359);
          })
          .catch((error) => this.log("Sending commmand 'get_properties' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getPhilipsStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_prop", ["power", "snm", "bright", "cct", "cid", "sta"])
        .then((result) => {
          this.updateCapabilityValue("onoff", result[0] == "on");
          this.updateCapabilityValue("dim", result[2] / 100);
          this.updateCapabilityValue("light_temperature", this.normalize(result[3], 1880, 7000));
          this.updateCapabilityValue("light_hue", result[4] / 359);
        })
        .catch((error) => {
          this.log("Sending commmand 'get_properties' error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getPhilipsStatus();
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

  normalize(value, min, max) {
    var normalized = (value - min) / (max - min);
    return Number(normalized.toFixed(2));
  }

  rgb2hsb(rgb) {
    var hsb = [];
    var rearranged = rgb.slice(0);
    var maxIndex = 0,
      minIndex = 0;
    var tmp;
    for (var i = 0; i < 2; i++) {
      for (var j = 0; j < 2 - i; j++)
        if (rearranged[j] > rearranged[j + 1]) {
          tmp = rearranged[j + 1];
          rearranged[j + 1] = rearranged[j];
          rearranged[j] = tmp;
        }
    }
    for (var i = 0; i < 3; i++) {
      if (rearranged[0] == rgb[i]) minIndex = i;
      if (rearranged[2] == rgb[i]) maxIndex = i;
    }
    hsb[2] = rearranged[2] / 255.0;
    hsb[1] = 1 - rearranged[0] / rearranged[2];
    hsb[0] = maxIndex * 120 + 60 * (rearranged[1] / hsb[1] / rearranged[2] + (1 - 1 / hsb[1])) * ((maxIndex - minIndex + 3) % 3 == 1 ? 1 : -1);
    hsb[0] = (hsb[0] + 360) % 360;
    return hsb;
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.getPhilipsStatus();
      callback(null, true);
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      const values = { true: "on", false: "off" };
      this.device
        .call("set_power", [values[value]])
        .then(() => this.log("Sending " + name + " commmand: " + values[value]))
        .catch((error) => this.log("Sending commmand 'set_power' error: ", error));
    });
  }

  registerDimLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_bright", [value * 100])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_bright' error: ", error));
    });
  }

  registerHueLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_cid", [value * 359])
        .then(() => this.log("Sending " + name + " commmand: " + value * 359))
        .catch((error) => this.log("Sending commmand 'set_cid' error: ", error));
    });
  }

  registerLightTemperatureLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      let color_temp = this.denormalize(value, 1880, 7000);

      this.device
        .call("set_cct", [color_temp])
        .then(() => this.log("Sending " + name + " commmand: " + color_temp))
        .catch((error) => this.log("Sending commmand 'set_cct' error: ", error));
    });
  }

  denormalize(normalized, min, max) {
    var denormalized = (1 - normalized) * (max - min) + min;
    return Number(denormalized.toFixed(0));
  }

  registerPhilipsScenesAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("apply_fixed_scene", [args.scene])
              .then(() => {
                this.log("Set scene: ", args.scene);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set scene error: ", error);
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

module.exports = MiHomeyDevice;
