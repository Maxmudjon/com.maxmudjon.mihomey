const Homey = require("homey");
const miio = require("miio");

class XiaomiMijiaLDS extends Homey.Device {
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
      7: "Cleaning (mop only)",
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
    this.registerVacuumStartRoomCleaningAction("vacuumStartRoomCleaning", actions.vacuumStartRoomCleaning);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerCleaningSpeed("dim");
    this.registerCleaningWaterSpeed("dim.water");
    this.registerVacuumCleanerMopMode("vacuum_cleaner_mop_mode");
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
          .call("get_prop", ["run_state", "suction_grade", "battary_life", "is_mop", "water_grade", "mop_route", "main_brush_life", "side_brush_life", "hypa_life"])
          .then((result) => {
            if (result[0] == 3) {
              this.updateCapabilityValue("onoff", true);
            } else if (result[0] == 6 || result[0] == 7) {
              this.updateCapabilityValue("onoff", true);
            } else if (result[0] == 5) {
              this.updateCapabilityValue("onoff", false);
            } else if (result[0] == 3) {
              this.updateCapabilityValue("onoff", false);
            } else if (result[0] == 2) {
              this.updateCapabilityValue("onoff", true);
            }

            switch (parseInt(result[1])) {
              case 0:
                this.updateCapabilityValue("dim", 0.25);
                break;
              case 1:
                this.updateCapabilityValue("dim", 0.5);
                break;
              case 2:
                this.updateCapabilityValue("dim", 0.75);
                break;
              case 3:
                this.updateCapabilityValue("dim", 1);
                break;
            }

            this.updateCapabilityValue("measure_battery", parseInt(result[2]));
            this.updateCapabilityValue("alarm_battery", parseInt(result[2]) <= 20 ? true : false);
            this.updateCapabilityValue("vacuum_cleaner_mop_mode", parseInt(result[3]));

            switch (parseInt(result[4])) {
              case 0:
                this.updateCapabilityValue("dim.water", 0.33);
                break;
              case 1:
                this.updateCapabilityValue("dim.water", 0.66);
                break;
              case 2:
                this.updateCapabilityValue("dim.water", 1);
                break;
            }

            this.setSettings({ mopRoute: parseInt(result[5]) });

            const mainBrushLifeTime = 1080000;
            const mainBrushCurrentLife = parseInt(result[6]);
            const mainBrushLifeTimePercent = (mainBrushCurrentLife / mainBrushLifeTime) * 100;
            const sideBrushLifeTime = 720000;
            const sideBrushCurrentLife = parseInt(result[7]);
            const sideBrushLifeTimePercent = (sideBrushCurrentLife / sideBrushLifeTime) * 100;
            const filterLifeTime = 540000;
            const filterCurrentLife = parseInt(result[8]);
            const filterLifeTimePercent = (filterCurrentLife / filterLifeTime) * 100;

            this.setSettings({ main_brush_work_time: parseInt(mainBrushLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
            this.triggerFlow(triggers.main_brush, "main_brush_work_time", 100 - parseInt(mainBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
            this.setSettings({ side_brush_work_time: parseInt(sideBrushLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
            this.triggerFlow(triggers.side_brush, "side_brush_work_time", 100 - parseInt(sideBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
            this.setSettings({ filter_work_time: parseInt(filterLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
            this.triggerFlow(triggers.filter, "filter_work_time", 100 - parseInt(filterLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
          })
          .catch((error) => this.log("Sending commmand 'get_prop' error: ", error));

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
        .call("get_prop", ["run_state", "suction_grade", "battary_life", "is_mop", "water_grade", "mop_route", "main_brush_life", "side_brush_life", "hypa_life"])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          if (result[0] == 3) {
            this.updateCapabilityValue("onoff", true);
          } else if (result[0] == 6 || result[0] == 7) {
            this.updateCapabilityValue("onoff", true);
          } else if (result[0] == 5) {
            this.updateCapabilityValue("onoff", false);
          } else if (result[0] == 3) {
            this.updateCapabilityValue("onoff", false);
          } else if (result[0] == 2) {
            this.updateCapabilityValue("onoff", true);
          }

          switch (parseInt(result[1])) {
            case 0:
              this.updateCapabilityValue("dim", 0.25);
              break;
            case 1:
              this.updateCapabilityValue("dim", 0.5);
              break;
            case 2:
              this.updateCapabilityValue("dim", 0.75);
              break;
            case 3:
              this.updateCapabilityValue("dim", 1);
              break;
          }

          this.updateCapabilityValue("measure_battery", parseInt(result[2]));
          this.updateCapabilityValue("alarm_battery", parseInt(result[2]) <= 20 ? true : false);
          this.updateCapabilityValue("vacuum_cleaner_mop_mode", parseInt(result[3]));

          switch (parseInt(result[4])) {
            case 0:
              this.updateCapabilityValue("dim.water", 0.33);
              break;
            case 1:
              this.updateCapabilityValue("dim.water", 0.66);
              break;
            case 2:
              this.updateCapabilityValue("dim.water", 1);
              break;
          }

          this.setSettings({ mopRoute: parseInt(result[5]) });

          const mainBrushLifeTime = 1080000;
          const mainBrushCurrentLife = parseInt(result[6]);
          const mainBrushLifeTimePercent = (mainBrushCurrentLife / mainBrushLifeTime) * 100;
          const sideBrushLifeTime = 720000;
          const sideBrushCurrentLife = parseInt(result[7]);
          const sideBrushLifeTimePercent = (sideBrushCurrentLife / sideBrushLifeTime) * 100;
          const filterLifeTime = 540000;
          const filterCurrentLife = parseInt(result[8]);
          const filterLifeTimePercent = (filterCurrentLife / filterLifeTime) * 100;

          this.setSettings({ main_brush_work_time: parseInt(mainBrushLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
          this.triggerFlow(triggers.main_brush, "main_brush_work_time", 100 - parseInt(mainBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
          this.setSettings({ side_brush_work_time: parseInt(sideBrushLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
          this.triggerFlow(triggers.side_brush, "side_brush_work_time", 100 - parseInt(sideBrushLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
          this.setSettings({ filter_work_time: parseInt(filterLifeTimePercent) + "%" }).catch((error) => this.log("Set Settings Error", error));
          this.triggerFlow(triggers.filter, "filter_work_time", 100 - parseInt(filterLifeTimePercent) <= this.getSetting("alarm_threshold") ? true : false);
        })
        .catch((error) => {
          this.log("Sending commmand 'get_prop' error: ", error);
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

    if (changedKeys.includes("mopRoute")) {
      this.device
        .call("set_moproute", [newSettings.mopRoute])
        .then(() => this.log("Sending " + this.getName() + " commmand: " + newSettings.mopRoute))
        .catch((error) => this.log("Sending commmand 'set_moproute'  error: ", error));
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      if (value) {
        this.device
          .call("set_mode_withroom", [0, 1, 0], {
            refresh: ["state"],
            refreshDelay: 1000,
          })
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'set_mode_withroom'  error: ", error));
      } else {
        this.device
          .call("set_charge", [1], {
            refresh: ["state"],
            refreshDelay: 1000,
          })
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'set_charge' error: ", error));
      }
    });
  }

  registerCleaningSpeed(name) {
    this.registerCapabilityListener(name, async (value) => {
      if (value == 0) {
        this.device
          .call("set_mode", [0], {
            refresh: ["state"],
            refreshDelay: 1000,
          })
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'set_suction' error: ", error));
      } else {
        this.device
          .call("set_suction", [value], {
            refresh: ["fanSpeed"],
          })
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'set_suction' error: ", error));
      }
    });
  }

  registerCleaningWaterSpeed(name) {
    this.registerCapabilityListener(name, async (value) => {
      const speeds = { 0: 11, 1: 12, 2: 13 };
      this.device
        .call("set_suction", [speeds[value]], {
          refresh: ["waterBoxMode"],
        })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_suction' error: ", error));
    });
  }

  registerVacuumCleanerMopMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_mop", [value])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_mop' error: ", error));
    });
  }

  registerVacuumStartRoomCleaningAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            const rooms = JSON.parse("[" + args.rooms.split(",") + "]");
            device
              .call("set_mode_withroom", [0, 1, rooms.length].concat([rooms]), {
                refresh: ["state"],
                refreshDelay: 1000,
              })
              .then(() => {
                this.log("Set Start rooms cleaning: ", args.rooms);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set Start rooms cleaning error: ", error);
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

module.exports = XiaomiMijiaLDS;
