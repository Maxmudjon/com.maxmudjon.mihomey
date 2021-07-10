const Homey = require("homey");
const miio = require("miio");

const params = [
  { siid: 2, piid: 1 },
  { siid: 2, piid: 2 },
  { siid: 2, piid: 3 },
  { siid: 3, piid: 1 },
  { siid: 9, piid: 1 },
  { siid: 9, piid: 2 },
  { siid: 10, piid: 1 },
  { siid: 10, piid: 2 },
  { siid: 11, piid: 1 },
  { siid: 11, piid: 2 },
  { siid: 4, piid: 4 },
  { siid: 4, piid: 5 }
];

class MiRobotVacuumMop1T extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.vacuumStates = {
      0: "Idle",
      1: "Idle",
      2: "Paused",
      3: "Cleaning",
      4: "Returning home",
      5: "Docked",
      6: "Cleaning (vacuum + mop)",
      7: "Cleaning (mop only)"
    };
    this.initialize();
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.getVacuumStatus();
  }

  registerActions() {
    const { actions } = this.driver;
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerButton("button");
    this.registerCleaningSpeed("dim");
    this.registerCleaningWaterSpeed("dim.water");
  }

  getVacuumStatus() {
    const { triggers } = this.driver;
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then(device => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }
        this.device = device;

        this.device
          .call("get_properties", params, {
            retries: 1
          })
          .then(result => {
            const batteryResult = result.filter(r => r.siid == 3 && r.piid == 1)[0];
            const deviceFaultResult = result.filter(r => r.siid == 2 && r.piid == 2)[0];
            const deviceStatusResult = result.filter(r => r.siid == 2 && r.piid == 1)[0];
            const deviceFanSpeedResult = result.filter(r => r.siid == 4 && r.piid == 4)[0];
            const deviceMopSpeedResult = result.filter(r => r.siid == 4 && r.piid == 5)[0];
            const deviceMainBrushProcentResult = result.filter(r => r.siid == 9 && r.piid == 2)[0];
            const deviceFilterProcentResult = result.filter(r => r.siid == 11 && r.piid == 1)[0];
            const deviceLeftBrushProcentResult = result.filter(r => r.siid == 10 && r.piid == 2)[0];

            this.updateCapabilityValue("measure_battery", +batteryResult.value);
            this.updateCapabilityValue("alarm_battery", +batteryResult.value <= 20 ? true : false);
            this.updateCapabilityValue("vacuum_cleaner_device_fault", "" + deviceFaultResult.value);
            this.updateCapabilityValue("vacuum_cleaner_1t_info", "" + deviceStatusResult.value);
            if (deviceStatusResult.value == 1) {
              this.updateCapabilityValue("onoff", true);
            } else if (deviceStatusResult.value == 6) {
              this.updateCapabilityValue("onoff", false);
            }

            this.updateCapabilityValue("dim", +deviceFanSpeedResult.value);
            this.updateCapabilityValue("dim.water", +deviceMopSpeedResult.value);

            this.setSettings({ main_brush_work_time: deviceMainBrushProcentResult.value + "%" }).catch(error => this.log("Set Settings Error", error));
            this.setSettings({ side_brush_work_time: deviceLeftBrushProcentResult.value + "%" }).catch(error => this.log("Set Settings Error", error));
            this.setSettings({ filter_work_time: deviceFilterProcentResult.value + "%" }).catch(error => this.log("Set Settings Error", error));
            if (deviceMainBrushProcentResult.value <= this.getSetting("alarm_threshold") ? true : false) {
              this.triggerFlow(triggers.main_brush, "main_brush_work_time", true);
            }
            if (deviceLeftBrushProcentResult.value <= this.getSetting("alarm_threshold") ? true : false) {
              this.triggerFlow(triggers.side_brush, "side_brush_work_time", deviceLeftBrushProcentResult.value <= this.getSetting("alarm_threshold") ? true : false);
            }
            if (deviceFilterProcentResult.value <= this.getSetting("alarm_threshold") ? true : false) {
              this.triggerFlow(triggers.filter, "filter_work_time", deviceFilterProcentResult.value <= this.getSetting("alarm_threshold") ? true : false);
            }
          })
          .catch(error => this.log("Sending commmand 'get_properties' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch(error => {
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
          retries: 1
        })
        .then(result => {
          const batteryResult = result.filter(r => r.siid == 3 && r.piid == 1)[0];
          const deviceFaultResult = result.filter(r => r.siid == 2 && r.piid == 2)[0];
          const deviceStatusResult = result.filter(r => r.siid == 2 && r.piid == 1)[0];
          const deviceFanSpeedResult = result.filter(r => r.siid == 4 && r.piid == 4)[0];
          const deviceMopSpeedResult = result.filter(r => r.siid == 4 && r.piid == 5)[0];
          const deviceMainBrushProcentResult = result.filter(r => r.siid == 9 && r.piid == 2)[0];
          const deviceFilterProcentResult = result.filter(r => r.siid == 11 && r.piid == 1)[0];
          const deviceLeftBrushProcentResult = result.filter(r => r.siid == 10 && r.piid == 2)[0];

          this.updateCapabilityValue("measure_battery", +batteryResult.value);
          this.updateCapabilityValue("alarm_battery", +batteryResult.value <= 20 ? true : false);
          this.updateCapabilityValue("vacuum_cleaner_device_fault", "" + deviceFaultResult.value);
          this.updateCapabilityValue("vacuum_cleaner_1t_info", "" + deviceStatusResult.value);
          if (deviceStatusResult.value == 1) {
            this.updateCapabilityValue("onoff", true);
          } else if (deviceStatusResult.value == 6) {
            this.updateCapabilityValue("onoff", false);
          }

          this.updateCapabilityValue("dim", +deviceFanSpeedResult.value);
          this.updateCapabilityValue("dim.water", +deviceMopSpeedResult.value);

          this.setSettings({ main_brush_work_time: deviceMainBrushProcentResult.value + "%" }).catch(error => this.log("Set Settings Error", error));
          this.setSettings({ side_brush_work_time: deviceLeftBrushProcentResult.value + "%" }).catch(error => this.log("Set Settings Error", error));
          this.setSettings({ filter_work_time: deviceFilterProcentResult.value + "%" }).catch(error => this.log("Set Settings Error", error));
          if (deviceMainBrushProcentResult.value <= this.getSetting("alarm_threshold") ? true : false) {
            this.triggerFlow(triggers.main_brush, "main_brush_work_time", true);
          }
          if (deviceLeftBrushProcentResult.value <= this.getSetting("alarm_threshold") ? true : false) {
            this.triggerFlow(triggers.side_brush, "side_brush_work_time", deviceLeftBrushProcentResult.value <= this.getSetting("alarm_threshold") ? true : false);
          }
          if (deviceFilterProcentResult.value <= this.getSetting("alarm_threshold") ? true : false) {
            this.triggerFlow(triggers.filter, "filter_work_time", deviceFilterProcentResult.value <= this.getSetting("alarm_threshold") ? true : false);
          }
        })
        .catch(error => {
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
        .catch(error => {
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
    this.registerCapabilityListener(name, async value => {
      if (value) {
        const params = { siid: 2, aiid: 1, did: "call-2-1", in: [] };

        this.device
          .call("action", params, {
            retries: 1
          })
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch(error => this.log("Sending commmand 'action'  error: ", error));
      } else {
        const params = { siid: 2, aiid: 2, did: "call-2-2", in: [] };

        this.device
          .call("action", params, {
            retries: 1
          })
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch(error => this.log("Sending commmand 'action'  error: ", error));
      }
    });
  }

  registerButton(name) {
    this.registerCapabilityListener(name, async value => {
      const params = { siid: 3, aiid: 1, did: "call-3-1", in: [] };

      this.device
        .call("action", params, {
          retries: 1
        })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'action'  error: ", error));
    });
  }

  registerCleaningSpeed(name) {
    this.registerCapabilityListener(name, async value => {
      const params = [{ siid: 4, piid: 4, value }];
      this.device
        .call("set_properties", params, {
          retries: 1
        })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerCleaningWaterSpeed(name) {
    this.registerCapabilityListener(name, async value => {
      const params = [{ siid: 4, piid: 5, value }];
      this.device
        .call("set_properties", params, {
          retries: 1
        })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'set_properties' error: ", error));
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

module.exports = MiRobotVacuumMop1T;
