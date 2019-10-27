const Homey = require("homey");
const miio = require("miio");

class MiRobot1S extends Homey.Device {
  onInit() {
    this.driver = this.getDriver();
    this.data = this.getData();
    this.vacuumStates = {
      1: "Starting",
      2: "Charger disconnected",
      3: "Idle",
      4: "Remote control active",
      5: "Cleaning",
      6: "Returning home",
      7: "Manual mode",
      8: "Charging",
      9: "Charging problem",
      10: "Paused",
      11: "Spot cleaning",
      12: "Error",
      13: "Shutting down",
      14: "Updating",
      15: "Docking",
      16: "Going to target",
      17: "Zoned cleaning"
    };
    this.vacuumErrorCodes = {
      0: "No error",
      1: "Laser distance sensor error",
      2: "Collision sensor error",
      3: "Wheels on top of void, move robot",
      4: "Clean hovering sensors, move robot",
      5: "Clean main brush",
      6: "Clean side brush",
      7: "Main wheel stuck?",
      8: "Device stuck, clean area",
      9: "Dust collector missing",
      10: "Clean filter",
      11: "Stuck in magnetic barrier",
      12: "Low battery",
      13: "Charging fault",
      14: "Battery fault",
      15: "Wall sensors dirty, wipe them",
      16: "Place me on flat surface",
      17: "Side brushes problem, reboot me",
      18: "Suction fan problem",
      19: "Unpowered charging station"
    };

    this.log("Mi Homey device init | " + "name: " + this.getName() + " - " + "class: " + this.getClass() + " - " + "id: " + this.data.id);
    this.initialize();
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.getDeviceStatus();
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerVacuumZoneCleanerAction("vacuumZoneCleaner", actions.vacuumZoneCleaner);
    this.registerVacuumGoToTargetAction("vacuumGoToTarget", actions.vacuumGoToTarget);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerFindMeButton("onoff.findme");
    this.registerCleaningSpeed("dim");
    this.registerVacuumCleanerMode("vacuumcleaner_state");
  }

  async getDeviceStatus() {
    const { triggers } = this.driver;
    try {
      this.miioDevice = await miio.device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") });
      const result = await this.miioDevice.call("get_status", []);
      const consumable = await this.miioDevice.call("get_consumable", []);
      const summary = await this.miioDevice.call("get_clean_summary", []);

      this.setAvailable();

      this.updateCapabilityValue("onoff", result[0]["state"] === 5 ? true : false);

      switch (parseInt(result[0]["fan_power"])) {
        case 101:
          this.updateCapabilityValue("dim", 0.25);
          break;
        case 102:
          this.updateCapabilityValue("dim", 0.5);
          break;
        case 103:
          this.updateCapabilityValue("dim", 0.75);
          break;
        case 104:
          this.updateCapabilityValue("dim", 1);
          break;
      }

      this.updateCapabilityValue("measure_battery", parseInt(result[0]["battery"]));
      this.updateCapabilityValue("alarm_battery", parseInt(result[0]["battery"]) <= 20 ? true : false);

      if (result[0]["state"] == 5) {
        this.updateCapabilityValue("vacuumcleaner_state", "cleaning");
      } else if (result[0]["state"] == 11) {
        this.updateCapabilityValue("vacuumcleaner_state", "spot_cleaning");
      } else if (result[0]["state"] == 15) {
        this.updateCapabilityValue("vacuumcleaner_state", "docked");
      } else if (result[0]["state"] == 8) {
        this.updateCapabilityValue("vacuumcleaner_state", "charging");
      } else if (result[0]["state"] == 10) {
        this.updateCapabilityValue("vacuumcleaner_state", "stopped");
      }

      let mainBrushLifeTime = 1080000;
      let mainBrushCurrentLife = parseInt(consumable[0]["main_brush_work_time"]);
      let mainBrushLifeTimePercent = (mainBrushCurrentLife / mainBrushLifeTime) * 100;
      let sideBrushLifeTime = 720000;
      let sideBrushCurrentLife = parseInt(consumable[0]["side_brush_work_time"]);
      let sideBrushLifeTimePercent = (sideBrushCurrentLife / sideBrushLifeTime) * 100;
      let filterLifeTime = 540000;
      let filterCurrentLife = parseInt(consumable[0]["filter_work_time"]);
      let filterLifeTimePercent = (filterCurrentLife / filterLifeTime) * 100;
      let sensorLifeTime = 108000;
      let sensorCurrentLife = parseInt(consumable[0]["main_brush_work_time"]);
      let sensorLifeTimePercent = (sensorCurrentLife / sensorLifeTime) * 100;

      this.setSettings({ main_brush_work_time: parseInt(mainBrushLifeTimePercent) + "%" }).catch(error => this.error("Set Settings Error", error));
      this.updateCapabilityValue("alarm_main_brush_work_time", 100 - parseInt(mainBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
      this.triggerFlow(triggers.main_brush, "main_brush_work_time", 100 - parseInt(mainBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

      this.setSettings({ side_brush_work_time: parseInt(sideBrushLifeTimePercent) + "%" }).catch(error => this.error("Set Settings Error", error));
      this.updateCapabilityValue("alarm_side_brush_work_time", 100 - parseInt(sideBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
      this.triggerFlow(triggers.side_brush, "side_brush_work_time", 100 - parseInt(sideBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

      this.setSettings({ filter_work_time: parseInt(filterLifeTimePercent) + "%" }).catch(error => this.error("Set Settings Error", error));
      this.updateCapabilityValue("alarm_filter_work_time", 100 - parseInt(filterLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
      this.triggerFlow(triggers.filter, "filter_work_time", 100 - parseInt(filterLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

      this.setSettings({ sensor_dirty_time: parseInt(sensorLifeTimePercent) + "%" }).catch(error => this.error("Set Settings Error", error));
      this.updateCapabilityValue("alarm_sensor_dirty_time", 100 - parseInt(sensorLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
      this.triggerFlow(triggers.main_brush, "sensor_dirty_time", 100 - parseInt(sensorLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

      this.setSettings({ total_work_time: this.convertMS(parseInt(summary[0])) }).catch(error => this.log("Set Settings Error", error));
      this.setSettings({ total_cleared_area: parseInt(summary[1] / 1000000).toString() }).catch(error => this.log("Set Settings Error", error));
      this.setSettings({ total_clean_count: parseInt(summary[2]).toString() }).catch(error => this.log("Set Settings Error", error));

      let update = this.getSetting("updateTimer") || 60;
      this.updateTimer(update);
    } catch (error) {
      this.error(error.message);
      this.setUnavailable(Homey.__("reconnecting"));
      setTimeout(() => this.getDeviceStatus(), 10000);
    }
  }

  async updateTimer(interval) {
    const { triggers } = this.driver;
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(async () => {
      try {
        const result = await this.miioDevice.call("get_status", []);
        const consumable = await this.miioDevice.call("get_consumable", []);
        const summary = await this.miioDevice.call("get_clean_summary", []);

        this.setAvailable();

        this.updateCapabilityValue("onoff", result[0]["state"] === 5 ? true : false);

        switch (parseInt(result[0]["fan_power"])) {
          case 101:
            this.updateCapabilityValue("dim", 0.25);
            break;
          case 102:
            this.updateCapabilityValue("dim", 0.5);
            break;
          case 103:
            this.updateCapabilityValue("dim", 0.75);
            break;
          case 104:
            this.updateCapabilityValue("dim", 1);
            break;
        }

        this.updateCapabilityValue("measure_battery", parseInt(result[0]["battery"]));
        this.updateCapabilityValue("alarm_battery", parseInt(result[0]["battery"]) <= 20 ? true : false);

        if (result[0]["state"] == 5) {
          this.updateCapabilityValue("vacuumcleaner_state", "cleaning");
        } else if (result[0]["state"] == 11) {
          this.updateCapabilityValue("vacuumcleaner_state", "spot_cleaning");
        } else if (result[0]["state"] == 15) {
          this.updateCapabilityValue("vacuumcleaner_state", "docked");
        } else if (result[0]["state"] == 8) {
          this.updateCapabilityValue("vacuumcleaner_state", "charging");
        } else if (result[0]["state"] == 10) {
          this.updateCapabilityValue("vacuumcleaner_state", "stopped");
        }

        let mainBrushLifeTime = 1080000;
        let mainBrushCurrentLife = parseInt(consumable[0]["main_brush_work_time"]);
        let mainBrushLifeTimePercent = (mainBrushCurrentLife / mainBrushLifeTime) * 100;
        let sideBrushLifeTime = 720000;
        let sideBrushCurrentLife = parseInt(consumable[0]["side_brush_work_time"]);
        let sideBrushLifeTimePercent = (sideBrushCurrentLife / sideBrushLifeTime) * 100;
        let filterLifeTime = 540000;
        let filterCurrentLife = parseInt(consumable[0]["filter_work_time"]);
        let filterLifeTimePercent = (filterCurrentLife / filterLifeTime) * 100;
        let sensorLifeTime = 108000;
        let sensorCurrentLife = parseInt(consumable[0]["main_brush_work_time"]);
        let sensorLifeTimePercent = (sensorCurrentLife / sensorLifeTime) * 100;

        this.setSettings({ main_brush_work_time: parseInt(mainBrushLifeTimePercent) + "%" }).catch(error => this.error("Set Settings Error", error));
        this.updateCapabilityValue("alarm_main_brush_work_time", 100 - parseInt(mainBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
        this.triggerFlow(triggers.main_brush, "main_brush_work_time", 100 - parseInt(mainBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

        this.setSettings({ side_brush_work_time: parseInt(sideBrushLifeTimePercent) + "%" }).catch(error => this.error("Set Settings Error", error));
        this.updateCapabilityValue("alarm_side_brush_work_time", 100 - parseInt(sideBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
        this.triggerFlow(triggers.side_brush, "side_brush_work_time", 100 - parseInt(sideBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

        this.setSettings({ filter_work_time: parseInt(filterLifeTimePercent) + "%" }).catch(error => this.error("Set Settings Error", error));
        this.updateCapabilityValue("alarm_filter_work_time", 100 - parseInt(filterLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
        this.triggerFlow(triggers.filter, "filter_work_time", 100 - parseInt(filterLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

        this.setSettings({ sensor_dirty_time: parseInt(sensorLifeTimePercent) + "%" }).catch(error => this.error("Set Settings Error", error));
        this.updateCapabilityValue("alarm_sensor_dirty_time", 100 - parseInt(sensorLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
        this.triggerFlow(triggers.main_brush, "sensor_dirty_time", 100 - parseInt(sensorLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

        this.setSettings({ total_work_time: this.convertMS(parseInt(summary[0])) }).catch(error => this.log("Set Settings Error", error));
        this.setSettings({ total_cleared_area: parseInt(summary[1] / 1000000).toString() }).catch(error => this.log("Set Settings Error", error));
        this.setSettings({ total_clean_count: parseInt(summary[2]).toString() }).catch(error => this.log("Set Settings Error", error));

        let update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      } catch (error) {
        this.error(error.message);
        this.setUnavailable(Homey.__("reconnecting"));
        this.miioDevice.destroy();
        setTimeout(() => this.getDeviceStatus(), 10000);
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

  convertMS(milliseconds) {
    var day, hour, minute, seconds;
    seconds = Math.floor(milliseconds / 1000);
    minute = Math.floor(seconds / 60);
    seconds = seconds % 60;
    hour = Math.floor(minute / 60);
    minute = minute % 60;
    day = Math.floor(hour / 24);
    hour = hour % 24;
    return day + "Day, " + hour + "h, " + minute + "m, " + seconds + "s";
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("gatewayIP") || changedKeys.includes("gatewayToken")) {
      this.miioDevice.destroy();
      this.getDeviceStatus();
      callback(null, true);
    }
  }

  async registerOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      try {
        await this.miioDevice.call(value ? "app_start" : "app_pause", []);
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  registerFindMeButton(name) {
    this.registerCapabilityListener(name, async value => {
      if (value == true) {
        try {
          await this.miioDevice.call("find_me", []);
          setTimeout(() => {
            this.setCapabilityValue("onoff.findme", false);
          }, 500);
        } catch (error) {
          this.error(error.message);
          setTimeout(() => {
            this.setCapabilityValue("onoff.findme", false);
          }, 500);
        }
      }
    });
  }

  registerCleaningSpeed(name) {
    this.registerCapabilityListener(name, async value => {
      let speed = value * 100;
      if (speed > 0) {
        if (speed > 1 && speed <= 38) {
          try {
            await this.miioDevice.call("set_custom_mode", [38]);
          } catch (error) {
            this.error(error.message);
          }
        } else if (speed > 38 && speed <= 60) {
          try {
            await this.miioDevice.call("set_custom_mode", [60]);
          } catch (error) {
            this.error(error.message);
          }
        } else if (speed > 60 && speed <= 77) {
          try {
            await this.miioDevice.call("set_custom_mode", [77]);
          } catch (error) {
            this.error(error.message);
          }
        } else if (speed > 78 && speed <= 100) {
          try {
            await this.miioDevice.call("set_custom_mode", [100]);
          } catch (error) {
            this.error(error.message);
          }
        }
      }
    });
  }

  registerVacuumCleanerMode(name) {
    this.registerCapabilityListener(name, async value => {
      if (value == "cleaning") {
        try {
          await this.miioDevice.call("app_start", []);
        } catch (error) {
          this.error(error.message);
        }
      } else if (value == "spot_cleaning") {
        try {
          await this.miioDevice.call("app_spot", []);
        } catch (error) {
          this.error(error.message);
        }
      } else if (value == "docked") {
        try {
          await this.miioDevice.call("app_charge", []);
        } catch (error) {
          this.error(error.message);
        }
      } else if (value == "charging") {
        try {
          await this.miioDevice.call("app_charge", []);
        } catch (error) {
          this.error(error.message);
        }
      } else if (value == "stopped") {
        try {
          await this.miioDevice.call("app_pause", []);
        } catch (error) {
          this.error(error.message);
        }
      }
    });
  }

  registerVacuumZoneCleanerAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        let miioDevice = await miio.device({
          address: args.device.getSetting("deviceIP"),
          token: args.device.getSetting("deviceToken")
        });

        await miioDevice.call("app_zoned_clean", [args.zones]);

        miioDevice.destroy();
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  registerVacuumGoToTargetAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        let miioDevice = await miio.device({
          address: args.device.getSetting("deviceIP"),
          token: args.device.getSetting("deviceToken")
        });

        await miioDevice.call("app_goto_target", [args.X, args.Y]);

        miioDevice.destroy();
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return;
    }

    if (value) {
      trigger.trigger(this, {}, value);
    }
  }

  onAdded() {
    this.log("Device added");
  }

  onDeleted() {
    this.log("Device deleted deleted");
    clearInterval(this.updateInterval);
    if (typeof this.miioDevice !== "undefined") {
      this.miioDevice.destroy();
    }
  }
}

module.exports = MiRobot1S;
