const Homey = require("homey");
const miio = require("miio");

class MiRockRoboVacuumT6 extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
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
      17: "Zoned cleaning",
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
      19: "Unpowered charging station",
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
    this.registerVacuumZoneCleanerAction("vacuumZoneCleaner", actions.vacuumZoneCleaner);
    this.registerVacuumGoToTargetAction("vacuumGoToTarget", actions.vacuumGoToTarget);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerFindMeButton("onoff.findme");
    this.registerCleaningSpeed("dim");
    this.registerVacuumCleanerMode("vacuumcleaner_state");
  }

  getVacuumStatus() {
    const { triggers } = this.driver;
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }
        this.device = device;

        this.device
          .call("get_status", [])
          .then((result) => {
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

            this.updateCapabilityValue("alarm_motion", result[0].water_box_status == 1 ? true : false);
          })
          .catch((error) => this.log("Sending commmand 'get_status' error: ", error));

        this.device
          .call("get_consumable", [])
          .then((result) => {
            let mainBrushLifeTime = 1080000;
            let mainBrushCurrentLife = parseInt(result[0]["main_brush_work_time"]);
            let mainBrushLifeTimePercent = (mainBrushCurrentLife / mainBrushLifeTime) * 100;
            let sideBrushLifeTime = 720000;
            let sideBrushCurrentLife = parseInt(result[0]["side_brush_work_time"]);
            let sideBrushLifeTimePercent = (sideBrushCurrentLife / sideBrushLifeTime) * 100;
            let filterLifeTime = 540000;
            let filterCurrentLife = parseInt(result[0]["filter_work_time"]);
            let filterLifeTimePercent = (filterCurrentLife / filterLifeTime) * 100;
            let sensorLifeTime = 108000;
            let sensorCurrentLife = parseInt(result[0]["main_brush_work_time"]);
            let sensorLifeTimePercent = (sensorCurrentLife / sensorLifeTime) * 100;

            this.setSettings({ main_brush_work_time: parseInt(mainBrushLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
            this.updateCapabilityValue("alarm_main_brush_work_time", 100 - parseInt(mainBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
            this.triggerFlow(triggers.main_brush, "main_brush_work_time", 100 - parseInt(mainBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

            this.setSettings({ side_brush_work_time: parseInt(sideBrushLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
            this.updateCapabilityValue("alarm_side_brush_work_time", 100 - parseInt(sideBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
            this.triggerFlow(triggers.side_brush, "side_brush_work_time", 100 - parseInt(sideBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

            this.setSettings({ filter_work_time: parseInt(filterLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
            this.updateCapabilityValue("alarm_filter_work_time", 100 - parseInt(filterLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
            this.triggerFlow(triggers.filter, "filter_work_time", 100 - parseInt(filterLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

            this.setSettings({ sensor_dirty_time: parseInt(sensorLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
            this.updateCapabilityValue("alarm_sensor_dirty_time", 100 - parseInt(sensorLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
            this.triggerFlow(triggers.main_brush, "sensor_dirty_time", 100 - parseInt(sensorLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
          })
          .catch((error) => this.log("Sending commmand 'get_consumable' error: ", error));

        this.device
          .call("get_clean_summary", [])
          .then((result) => {
            this.setSettings({ total_work_time: this.convertMS(parseInt(result[0])) }).catch((error) => this.log("Set Settings Error", error));
            this.setSettings({ total_cleared_area: parseInt(result[1] / 1000000).toString() }).catch((error) => this.log("Set Settings Error", error));
            this.setSettings({ total_clean_count: parseInt(result[2]).toString() }).catch((error) => this.log("Set Settings Error", error));
          })
          .catch((error) => this.log("Sending commmand 'get_clean_summary' error: ", error));

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
      this.device
        .call("get_status", [])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
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
          this.updateCapabilityValue("alarm_battery", parseInt(result[0]["battery"]) === 20 ? true : false);

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

          this.updateCapabilityValue("alarm_motion", result[0].water_box_status == 1 ? true : false);
        })
        .catch((error) => {
          this.log("Sending commmand 'get_status' error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getVacuumStatus();
          }, 1000 * interval);
        });

      this.device
        .call("get_consumable", [])
        .then((result) => {
          let mainBrushLifeTime = 1080000;
          let mainBrushCurrentLife = parseInt(result[0]["main_brush_work_time"]);
          let mainBrushLifeTimePercent = (mainBrushCurrentLife / mainBrushLifeTime) * 100;
          let sideBrushLifeTime = 720000;
          let sideBrushCurrentLife = parseInt(result[0]["side_brush_work_time"]);
          let sideBrushLifeTimePercent = (sideBrushCurrentLife / sideBrushLifeTime) * 100;
          let filterLifeTime = 540000;
          let filterCurrentLife = parseInt(result[0]["filter_work_time"]);
          let filterLifeTimePercent = (filterCurrentLife / filterLifeTime) * 100;
          let sensorLifeTime = 108000;
          let sensorCurrentLife = parseInt(result[0]["main_brush_work_time"]);
          let sensorLifeTimePercent = (sensorCurrentLife / sensorLifeTime) * 100;

          this.setSettings({ main_brush_work_time: parseInt(mainBrushLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
          this.updateCapabilityValue("alarm_main_brush_work_time", 100 - parseInt(mainBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

          this.setSettings({ side_brush_work_time: parseInt(sideBrushLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
          this.updateCapabilityValue("alarm_side_brush_work_time", 100 - parseInt(sideBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

          this.setSettings({ filter_work_time: parseInt(filterLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
          this.updateCapabilityValue("alarm_filter_work_time", 100 - parseInt(filterLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);

          this.setSettings({ sensor_dirty_time: parseInt(sensorLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
          this.updateCapabilityValue("alarm_sensor_dirty_time", 100 - parseInt(sensorLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
        })
        .catch((error) => {
          this.log("Sending commmand 'get_consumable' error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getVacuumStatus();
          }, 1000 * interval);
        });

      this.device
        .call("get_clean_summary", [])
        .then((result) => {
          this.setSettings({ total_work_time: this.convertMS(parseInt(result[0])) }).catch((error) => this.log("Set Settings Error", error));
          this.setSettings({ total_cleared_area: parseInt(result[1] / 1000000).toString() }).catch((error) => this.log("Set Settings Error", error));
          this.setSettings({ total_clean_count: parseInt(result[2]).toString() }).catch((error) => this.log("Set Settings Error", error));
        })
        .catch((error) => {
          this.log("Sending commmand 'get_clean_summary' error: ", error);
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
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.getVacuumStatus();
      callback(null, true);
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call(value ? "app_start" : "app_charge", [])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'app_start' or 'app_charge' error: ", error));
    });
  }

  registerFindMeButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      if (value == true) {
        this.device
          .call("find_me", [])
          .then(() => {
            this.log("Sending " + name + " commmand: " + value);
            setTimeout(() => {
              this.setCapabilityValue("onoff.findme", false);
            }, 500);
          })
          .catch((error) => {
            this.log("Sending commmand 'find_me' error: ", error);
            setTimeout(() => {
              this.setCapabilityValue("onoff.findme", false);
            }, 500);
          });
      }
    });
  }

  registerCleaningSpeed(name) {
    this.registerCapabilityListener(name, async (value) => {
      let speed = value * 100;
      if (speed > 0) {
        if (speed > 1 && speed <= 38) {
          this.device
            .call("set_custom_mode", [38])
            .then(() => this.log("Sending " + name + " commmand: " + speed))
            .catch((error) => this.log("Sending commmand 'set_level_favorite' error: ", error));
        } else if (speed > 38 && speed <= 60) {
          this.device
            .call("set_custom_mode", [60])
            .then(() => this.log("Sending " + name + " commmand: " + speed))
            .catch((error) => this.log("Sending commmand 'set_level_favorite' error: ", error));
        } else if (speed > 60 && speed <= 77) {
          this.device
            .call("set_custom_mode", [77])
            .then(() => this.log("Sending " + name + " commmand: " + speed))
            .catch((error) => this.log("Sending commmand 'set_level_favorite' error: ", error));
        } else if (speed > 78 && speed <= 100) {
          this.device
            .call("set_custom_mode", [90])
            .then(() => this.log("Sending " + name + " commmand: " + speed))
            .catch((error) => this.log("Sending commmand 'set_level_favorite' error: ", error));
        }
      }
    });
  }

  registerVacuumCleanerMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      if (value == "cleaning") {
        this.device
          .call("app_start", [])
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'app_start' error: ", error));
      } else if (value == "spot_cleaning") {
        this.device
          .call("app_spot", [])
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'app_spot' error: ", error));
      } else if (value == "docked") {
        this.device
          .call("app_charge", [])
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'app_charge' error: ", error));
      } else if (value == "charging") {
        this.device
          .call("app_charge", [])
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'app_charge' error: ", error));
      } else if (value == "stopped") {
        this.device
          .call("app_pause", [])
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'app_pause' error: ", error));
      }
    });
  }

  registerVacuumZoneCleanerAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            const zones = JSON.parse("[" + args.zones + "]");
            device
              .call("app_zoned_clean", [zones])
              .then(() => {
                this.log("Set Start zone cleaning: ", zones);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set Start zone cleaning error: ", error);
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

  registerVacuumGoToTargetAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("app_goto_target", [args.X, args.Y])
              .then(() => {
                this.log("Set Start zone cleaning: ", args.X + ", " + args.Y);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set Start zone cleaning error: ", error);
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

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return;
    }

    if (value) {
      trigger.trigger(this, {}, value);
    }

    this.log("trigger:", name, value);

    switch (name) {
      case "main_brush_work_time":
      case "side_brush_work_time":
      case "filter_work_time":
      case "sensor_dirty_time":
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

module.exports = MiRockRoboVacuumT6;
