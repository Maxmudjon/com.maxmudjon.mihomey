const Homey = require("homey");
const miio = require("miio");

class MiClearGlassAirDetector extends Homey.Device {
  async onInit() {
    this.driver = this.getDriver();
    this.data = this.getData();
    this.getAirMonitorStatus();
    this.log("MiJia device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  getAirMonitorStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }

        this.device = device;

        this.device
          .call("get_prop", ["battery", "battery_state", "co2", "humidity", "pm25", "temperature", "tvoc"])
          .then((result) => {
            this.updateCapabilityValue("measure_pm25", parseInt(result.pm25));
            this.updateCapabilityValue("measure_co2", parseInt(result.co2));
            this.updateCapabilityValue("measure_humidity", parseFloat(result.humidity));
            this.updateCapabilityValue("measure_temperature", parseFloat(result.temperature));
            this.updateCapabilityValue("measure_voc", parseInt(result.tvoc));
            this.updateCapabilityValue("measure_battery", parseInt(result.battery));
            this.updateCapabilityValue("alarm_battery", parseInt(result.battery) > 20 ? false : true);
          })
          .catch((error) => this.log("Sending commmand 'get_prop' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        clearInterval(this.updateInterval);
        this.setUnavailable(error.message);
        setTimeout(() => {
          this.getAirMonitorStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_prop", ["battery", "battery_state", "co2", "humidity", "pm25", "temperature", "tvoc"])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          this.updateCapabilityValue("measure_pm25", parseInt(result.pm25));
          this.updateCapabilityValue("measure_co2", parseInt(result.co2));
          this.updateCapabilityValue("measure_humidity", parseFloat(result.humidity));
          this.updateCapabilityValue("measure_temperature", parseFloat(result.temperature));
          this.updateCapabilityValue("measure_voc", parseInt(result.tvoc));
          this.updateCapabilityValue("measure_battery", parseInt(result.battery));
          this.updateCapabilityValue("alarm_battery", parseInt(result.battery) > 20 ? false : true);
        })
        .catch((error) => {
          this.log("Sending commmand 'get_prop' error: ", error);
          clearInterval(this.updateInterval);
          this.setUnavailable(error.message);
          setTimeout(() => {
            this.getAirMonitorStatus();
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
      this.getAirMonitorStatus();
      callback(null, true);
    }
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

module.exports = MiClearGlassAirDetector;
