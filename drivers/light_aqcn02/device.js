const Homey = require("homey");
const miio = require("miio");

class AqaraLightBulb extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.initialize();
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerCapabilities();
    this.getReleyStatus();
  }

  registerCapabilities() {
    this.registerToggle("onoff");
    this.registerDim("dim");
    this.registerLightTemperature("light_temperature");
  }

  getReleyStatus() {
    const sid = this.data.sid;

    miio
      .device({ address: this.getSetting("deviceIp"), token: this.getSetting("deviceToken") })
      .then(device => {
        this.device = device;

        this.device
          .call("get_bright", [], { sid })
          .then(result => {
            if (result[0] == 0) {
              this.updateCapabilityValue("onoff", false);
            } else if (result[0] > 1) {
              this.updateCapabilityValue("onoff", true);
            }
            this.updateCapabilityValue("dim", parseFloat(result[0] / 100));
          })
          .catch(error => this.log("Sending commmand 'get_bright' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch(error => {
        this.log(error);
        if (error == "Error: Could not connect to device, handshake timeout") {
          this.setUnavailable(Homey.__("Could not connect to device, handshake timeout"));
          this.log("Error: Could not connect to device, handshake timeout");
        } else if (error == "Error: Could not connect to device, token might be wrong") {
          this.setUnavailable(Homey.__("Could not connect to device, token might be wrong"));
          this.log("Error: Could not connect to device, token might be wrong");
        }
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
        .call("get_bright", [], { sid })
        .then(result => {
          if (result[0] == 0) {
            this.updateCapabilityValue("onoff", false);
          } else if (result[0] > 1) {
            this.updateCapabilityValue("onoff", true);
          }
          this.updateCapabilityValue("dim", parseFloat(result[0] / 100));
        })
        .catch(error => this.log("Sending commmand 'get_bright' error: ", error));
    }, 1000 * interval);
  }

  updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log("[" + this.data.sid + "] [" + name + "] [" + value + "] Capability successfully updated");
        })
        .catch(error => {
          this.log("[" + this.data.sid + "] [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  registerToggle(name) {
    const sid = this.data.sid;
    this.registerCapabilityListener(name, async value => {
      this.device
        .call("set_power", [value ? "on" : "off"], { sid })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'set_power' error: ", error));
    });
  }

  registerDim(name) {
    const sid = this.data.sid;
    this.registerCapabilityListener(name, async value => {
      this.device
        .call("set_bright", [value * 100], { sid })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'set_bright' error: ", error));
    });
  }

  registerLightTemperature(name) {
    const sid = this.data.sid;
    this.registerCapabilityListener(name, async value => {
      let color_temp = this.denormalize(value, 153, 500);

      this.device
        .call("set_ct", [color_temp], { sid })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'set_ct' error: ", error));
    });
  }

  denormalize(normalized, min, max) {
    let denormalized = (1 - normalized) * (max - min) + min;
    denormalized = 653 - denormalized;
    return Number(denormalized.toFixed(0));
  }

  registerCondition(name, condition) {
    condition.registerRunListener((args, state) => Promise.resolve(this.getCapabilityValue(name)));
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

module.exports = AqaraLightBulb;
