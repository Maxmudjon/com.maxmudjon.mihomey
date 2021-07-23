const Homey = require("homey");
const miio = require("miio");

const params = [
  { siid: 2, piid: 1 },
  { siid: 2, piid: 2 },
  { siid: 3, piid: 1 },
];

class DreameBotL10Pro extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.initialize();
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerCapabilities();
    this.getVacuumStatus();
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerButton("button");
    this.registerMode("roborock_vacuum_a08_mode");
  }

  getVacuumStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
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
            const deviceStatusResult = result.filter((r) => r.siid == 2 && r.piid == 1)[0];
            const deviceModeResult = result.filter((r) => r.siid == 2 && r.piid == 2)[0];
            const batteryResult = result.filter((r) => r.siid == 3 && r.piid == 1)[0];

            if ([5, 7, 15, 16, 17, 18].includes(deviceStatusResult.value)) {
              this.updateCapabilityValue("onoff", true);
            } else if (deviceStatusResult.value == 2) {
              this.updateCapabilityValue("onoff", false);
            }

            this.updateCapabilityValue("roborock_vacuum_a08_mode", "" + deviceModeResult.value);
            this.updateCapabilityValue("measure_battery", +batteryResult.value);
            this.updateCapabilityValue("alarm_battery", +batteryResult.value <= 20 ? true : false);
          })
          .catch((error) => this.log("Sending commmand 'get_properties' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getVacuumStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      const { triggers } = this.driver;
      this.device
        .call("get_properties", params, {
          retries: 1,
        })
        .then((result) => {
          const deviceStatusResult = result.filter((r) => r.siid == 2 && r.piid == 1)[0];
          const deviceModeResult = result.filter((r) => r.siid == 2 && r.piid == 2)[0];
          const batteryResult = result.filter((r) => r.siid == 3 && r.piid == 1)[0];

          if ([5, 7, 15, 16, 17, 18].includes(deviceStatusResult.value)) {
            this.updateCapabilityValue("onoff", true);
          } else if (deviceStatusResult.value == 2) {
            this.updateCapabilityValue("onoff", false);
          }

          this.updateCapabilityValue("roborock_vacuum_a08_mode", "" + deviceModeResult.value);
          this.updateCapabilityValue("measure_battery", +batteryResult.value);
          this.updateCapabilityValue("alarm_battery", +batteryResult.value <= 20 ? true : false);
        })
        .catch((error) => {
          this.log("Sending commmand 'get_properties' error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getVacuumStatus();
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
      this.getVacuumStatus();
      callback(null, true);
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      if (value) {
        const params = { siid: 2, aiid: 1, did: "call-2-1", in: [] };

        this.device
          .call("action", params, {
            retries: 1,
          })
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'action'  error: ", error));
      } else {
        const params = { siid: 2, aiid: 2, did: "call-2-2", in: [] };

        this.device
          .call("action", params, {
            retries: 1,
          })
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'action'  error: ", error));
      }
    });
  }

  registerButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      const params = { siid: 3, aiid: 1, did: "call-3-1", in: [] };

      this.device
        .call("action", params, {
          retries: 1,
        })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'action'  error: ", error));
    });
  }

  registerMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      const params = [{ siid: 2, piid: 2, value: +value }];
      this.device
        .call("set_properties", params, {
          retries: 1,
        })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return;
    }

    if (value) {
      trigger.trigger(this, {}, value);
    }

    this.log("trigger:", name, value);
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

module.exports = DreameBotL10Pro;
