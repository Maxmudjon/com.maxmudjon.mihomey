const Homey = require("homey");
const miio = require("miio");

class PhilipsEyeCareDeskLamp2 extends Homey.Device {
  onInit() {
    this.driver = this.getDriver();
    this.data = this.getData();
    this.log("Mi Homey device init | " + "name: " + this.getName() + " - " + "class: " + this.getClass() + " - " + "id: " + this.data.id);
    this.initialize();
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.getDeviceStatus();
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerBrightnessLevel("dim");
    this.registerEyeCareButton("onoff.eyecare");
    this.registerAmbilightButton("onoff.ambilight");
    this.registerAmbilightLevel("dim.ambilight");
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerAmbilightLevelAction("ambilight_level", actions.ambilightLevel);
    this.registerEyecareSceneAction("eyecare_scene", actions.eyecareScene);
  }

  async getDeviceStatus() {
    try {
      this.miioDevice = await miio.device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") });
      const result = await this.miioDevice.call("get_prop", ["power", "bright", "ambstatus", "eyecare"]);

      this.setAvailable();

      this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
      this.updateCapabilityValue("dim", result[1] / 100);
      this.updateCapabilityValue("onoff.ambilight", result[2] === "on" ? true : false);
      this.updateCapabilityValue("onoff.eyecare", result[3] === "on" ? true : false);

      let update = this.getSetting("updateTimer") || 60;
      this.updateTimer(update);
    } catch (error) {
      this.error(error.message);
      this.setUnavailable(Homey.__("reconnecting"));
      setTimeout(() => this.getDeviceStatus(), 10000);
    }
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(async () => {
      try {
        const result = await this.miioDevice.call("get_prop", ["power", "bright", "ambstatus", "eyecare"]);

        this.setAvailable();

        this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
        this.updateCapabilityValue("dim", result[1] / 100);
        this.updateCapabilityValue("onoff.ambilight", result[2] === "on" ? true : false);
        this.updateCapabilityValue("onoff.eyecare", result[3] === "on" ? true : false);
      } catch (error) {
        this.error(error.message);
        this.setUnavailable(Homey.__("reconnecting"));
        setTimeout(() => {
          this.miioDevice.destroy();
          clearInterval(this.updateInterval);
          this.getDeviceStatus();
        }, 10000);
      }
    }, 1000 * interval);
  }

  updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log("[" + this.data.id + "]" + " [" + name + "] [" + value + "] Capability successfully updated");
        })
        .catch(error => {
          this.error("[" + this.data.id + "]" + " [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.miioDevice.destroy();
      this.getDeviceStatus();
      callback(null, true);
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      try {
        await this.miioDevice.call("set_power", [value ? "on" : "off"]);
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  registerBrightnessLevel(name) {
    this.registerCapabilityListener(name, async value => {
      if (value * 100 > 0) {
        try {
          await this.miioDevice.call("set_bright", [value * 100]);
        } catch (error) {
          this.error(error.message);
        }
      }
    });
  }

  registerEyeCareButton(name) {
    this.registerCapabilityListener(name, async value => {
      try {
        await this.miioDevice.call("set_eyecare", [value ? "on" : "off"]);
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  registerAmbilightButton(name) {
    this.registerCapabilityListener(name, async value => {
      try {
        await this.miioDevice.call("enable_amb", [value ? "on" : "off"]);
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  registerAmbilightLevel(name) {
    this.registerCapabilityListener(name, async value => {
      if (value * 100 > 0) {
        try {
          await this.miioDevice.call("set_amb_bright", [value * 100]);
        } catch (error) {
          this.error(error.message);
        }
      }
    });
  }

  registerAmbilightLevelAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        let miioDevice = await miio.device({
          address: args.device.getSetting("deviceIP"),
          token: args.device.getSetting("deviceToken")
        });

        await miioDevice.call("set_amb_bright", [args.level * 100]);

        miioDevice.destroy();
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  registerEyecareSceneAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        let miioDevice = await miio.device({
          address: args.device.getSetting("deviceIP"),
          token: args.device.getSetting("deviceToken")
        });

        await miioDevice.call("set_user_scene", [args.scene]);

        miioDevice.destroy();
      } catch (error) {
        this.error(error.message);
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

module.exports = PhilipsEyeCareDeskLamp2;
