const Homey = require("homey");
const miio = require("miio");

class MiAirQualityMonitor2Gen extends Homey.Device {
  async onInit() {
    this.driver = this.getDriver();
    this.data = this.getData();
    this.getAirFreshStatus();
    this.log("MiJia device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  getAirFreshStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }

        this.device = device;

        this.device
          .call("get_air_data", [])
          .then((result) => {
            this.updateCapabilityValue("measure_pm25", parseInt(result.result.pm25));
            this.updateCapabilityValue("measure_co2", parseInt(result.result.co2e));
            this.updateCapabilityValue("measure_humidity", parseInt(result.result.humidity));
            this.updateCapabilityValue("measure_temperature", parseInt(result.result.temperature));
            this.updateCapabilityValue("measure_voc", parseInt(result.result.tvoc));
          })
          .catch((error) => this.log("Sending commmand 'get_air_data' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getAirFreshStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_air_data", [])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          this.updateCapabilityValue("measure_pm25", parseInt(result.result.pm25));
          this.updateCapabilityValue("measure_co2", parseInt(result.result.co2e));
          this.updateCapabilityValue("measure_humidity", parseInt(result.result.humidity));
          this.updateCapabilityValue("measure_temperature", parseInt(result.result.temperature));
          this.updateCapabilityValue("measure_voc", parseInt(result.result.tvoc));
        })
        .catch((error) => {
          this.log("Sending commmand 'get_air_data' error: ", error);
          clearInterval(this.updateInterval);
          this.setUnavailable(error.message);
          setTimeout(() => {
            this.getAirFreshStatus();
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
      this.getAirFreshStatus();
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

module.exports = MiAirQualityMonitor2Gen;
