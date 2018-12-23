const Homey = require('homey')
const miio = require('miio')

class MiVacuumCleanerV2 extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this)
    this.driver = this.getDriver()
    this.data = this.getData()
    this.favoriteLevel = [0, 38, 60, 77, 78];
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
      19: "Unpowered charging station",
    };
    this.initialize()
    this.log('Mi Homey device init | ' + 'name: ' + this.getName() + ' - ' + 'class: ' + this.getClass() + ' - ' + 'data: ' + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerCapabilities()
    this.getVacuumStatus()
  }

  registerCapabilities() {
    this.registerOnOffButton('onoff')
    this.registerFindMeButton('onoff.findme')
    this.registerCleaningSpeed('dim')
    this.registerVacuumCleanerMode('vacuumcleaner_state')
  }

  getVacuumStatus() {
    var that = this;
    const { triggers } = this.driver;
    miio.device({ address: this.getSetting('deviceIP'), token: this.getSetting('deviceToken') })
      .then(device => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }

        this.device = device;

        this.device.call("get_status", [])
          .then(result => {
            that.setCapabilityValue('onoff', result[0]['state'] === 5 ? true : false);
            that.setCapabilityValue('dim', parseInt(result[0]['fan_power']));
            that.setCapabilityValue('measure_battery', parseInt(result[0]['battery']));
            that.setCapabilityValue('alarm_battery', parseInt(result[0]['battery']) <= 20 ? true : false);

            if (result[0]['state'] == 5) {
              that.setCapabilityValue('vacuumcleaner_state', 'cleaning');
            } else if (result[0]['state'] == 11) {
              that.setCapabilityValue('vacuumcleaner_state', 'spot_cleaning');
            } else if (result[0]['state'] == 15) {
              that.setCapabilityValue('vacuumcleaner_state', 'docked');
            } else if (result[0]['state'] == 8) {
              that.setCapabilityValue('vacuumcleaner_state', 'charging');
            } else if (result[0]['state'] == 10) {
              that.setCapabilityValue('vacuumcleaner_state', 'stopped');
            }
          })
          .catch(error => that.log("Sending commmand 'get_status' error: ", error));

        this.device.call("get_consumable", [])
          .then(result => {
            let mainBrushLifeTime = 1080000;
            let mainBrushCurrentLife = parseInt(result[0]['main_brush_work_time']);
            let mainBrushLifeTimePercent = mainBrushCurrentLife / mainBrushLifeTime * 100;
            let sideBrushLifeTime = 720000;
            let sideBrushCurrentLife = parseInt(result[0]['side_brush_work_time']);
            let sideBrushLifeTimePercent = sideBrushCurrentLife / sideBrushLifeTime * 100;
            let filterLifeTime = 540000;
            let filterCurrentLife = parseInt(result[0]['filter_work_time']);
            let filterLifeTimePercent = filterCurrentLife / filterLifeTime * 100;
            let sensorLifeTime = 108000;
            let sensorCurrentLife = parseInt(result[0]['main_brush_work_time']);
            let sensorLifeTimePercent = sensorCurrentLife / sensorLifeTime * 100;

            that.setSettings({ main_brush_work_time: parseInt(mainBrushLifeTimePercent) + '%' });
            that.setCapabilityValue('alarm_main_brush_work_time', (100 - parseInt(mainBrushLifeTimePercent)) <= this.getSetting('alarm_threshold') ? true : false);
            that.triggerFlow(triggers.main_brush, 'main_brush_work_time', (100 - parseInt(mainBrushLifeTimePercent)) <= this.getSetting('alarm_threshold') ? true : false);

            that.setSettings({ side_brush_work_time: parseInt(sideBrushLifeTimePercent) + '%' });
            that.setCapabilityValue('alarm_side_brush_work_time', (100 - parseInt(sideBrushLifeTimePercent)) <= this.getSetting('alarm_threshold') ? true : false);
            that.triggerFlow(triggers.side_brush, 'side_brush_work_time', (100 - parseInt(sideBrushLifeTimePercent)) <= this.getSetting('alarm_threshold') ? true : false);

            that.setSettings({ filter_work_time: parseInt(filterLifeTimePercent) + '%' });
            that.setCapabilityValue('alarm_filter_work_time', (100 - parseInt(filterLifeTimePercent)) <= this.getSetting('alarm_threshold') ? true : false);
            that.triggerFlow(triggers.filter, 'filter_work_time', (100 - parseInt(filterLifeTimePercent)) <= this.getSetting('alarm_threshold') ? true : false);

            that.setSettings({ sensor_dirty_time: parseInt(sensorLifeTimePercent) + '%' });
            that.setCapabilityValue('alarm_sensor_dirty_time', (100 - parseInt(sensorLifeTimePercent)) <= this.getSetting('alarm_threshold') ? true : false);
            that.triggerFlow(triggers.main_brush, 'sensor_dirty_time', (100 - parseInt(sensorLifeTimePercent)) <= this.getSetting('alarm_threshold') ? true : false);
          })
          .catch(error => that.log("Sending commmand 'get_consumable' error: ", error));

        this.device.call("get_clean_summary", [])
          .then(result => {
            that.setSettings({ total_work_time: that.convertMS(parseInt(result[0])) });
            that.setSettings({ total_cleared_area: parseInt(result[1] / 1000000) });
            that.setSettings({ total_clean_count: parseInt(result[2]) });
          })
          .catch(error => that.log("Sending commmand 'get_clean_summary' error: ", error));

        var update = this.getSetting('updateTimer') || 60;
        this.updateTimer(update);
      })
      .catch(error => {
        this.log(error);
        this.setUnavailable(Homey.__('reconnecting'));
        setTimeout(() => {
          this.getVacuumStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    var that = this;
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device.call("get_status", [])
        .then(result => {
          that.setCapabilityValue('onoff', result[0]['state'] === 5 ? true : false);
          that.setCapabilityValue('dim', parseInt(result[0]['fan_power']));
          that.setCapabilityValue('measure_battery', parseInt(result[0]['battery']));
          that.setCapabilityValue('alarm_battery', parseInt(result[0]['battery']) === 20 ? true : false);

          if (result[0]['state'] == 5) {
            that.setCapabilityValue('vacuumcleaner_state', 'cleaning');
          } else if (result[0]['state'] == 11) {
            that.setCapabilityValue('vacuumcleaner_state', 'spot_cleaning');
          } else if (result[0]['state'] == 15) {
            that.setCapabilityValue('vacuumcleaner_state', 'docked');
          } else if (result[0]['state'] == 8) {
            that.setCapabilityValue('vacuumcleaner_state', 'charging');
          } else if (result[0]['state'] == 10) {
            that.setCapabilityValue('vacuumcleaner_state', 'stopped');
          }
        })
        .catch(error => {
          this.log("Sending commmand 'get_status' error: ", error);
          clearInterval(this.updateInterval);
          this.setUnavailable(Homey.__('unreachable'));
          setTimeout(() => {
            this.getVacuumStatus();
          }, 1000 * interval);
        });

      this.device.call("get_consumable", [])
        .then(result => {
          let mainBrushLifeTime = 1080000;
          let mainBrushCurrentLife = parseInt(result[0]['main_brush_work_time']);
          let mainBrushLifeTimePercent = mainBrushCurrentLife / mainBrushLifeTime * 100;
          let sideBrushLifeTime = 720000;
          let sideBrushCurrentLife = parseInt(result[0]['side_brush_work_time']);
          let sideBrushLifeTimePercent = sideBrushCurrentLife / sideBrushLifeTime * 100;
          let filterLifeTime = 540000;
          let filterCurrentLife = parseInt(result[0]['filter_work_time']);
          let filterLifeTimePercent = filterCurrentLife / filterLifeTime * 100;
          let sensorLifeTime = 108000;
          let sensorCurrentLife = parseInt(result[0]['main_brush_work_time']);
          let sensorLifeTimePercent = sensorCurrentLife / sensorLifeTime * 100;

          that.setSettings({ main_brush_work_time: parseInt(mainBrushLifeTimePercent) + '%' });
          that.setCapabilityValue('alarm_main_brush_work_time', (100 - parseInt(mainBrushLifeTimePercent)) <= this.getSetting('alarm_threshold') ? true : false);

          that.setSettings({ side_brush_work_time: parseInt(sideBrushLifeTimePercent) + '%' });
          that.setCapabilityValue('alarm_side_brush_work_time', (100 - parseInt(sideBrushLifeTimePercent)) <= this.getSetting('alarm_threshold') ? true : false);

          that.setSettings({ filter_work_time: parseInt(filterLifeTimePercent) + '%' });
          that.setCapabilityValue('alarm_filter_work_time', (100 - parseInt(filterLifeTimePercent)) <= this.getSetting('alarm_threshold') ? true : false);

          that.setSettings({ sensor_dirty_time: parseInt(sensorLifeTimePercent) + '%' });
          that.setCapabilityValue('alarm_sensor_dirty_time', (100 - parseInt(sensorLifeTimePercent)) <= this.getSetting('alarm_threshold') ? true : false);
        })
        .catch(error => {
          this.log("Sending commmand 'get_consumable' error: ", error);
          clearInterval(this.updateInterval);
          this.setUnavailable(Homey.__('unreachable'));
          setTimeout(() => {
            this.getVacuumStatus();
          }, 1000 * interval);
        });

      this.device.call("get_clean_summary", [])
        .then(result => {
          that.setSettings({ total_work_time: that.convertMS(parseInt(result[0])) });
          that.setSettings({ total_cleared_area: parseInt(result[1] / 1000000) });
          that.setSettings({ total_clean_count: parseInt(result[2]) });
        })
        .catch(error => {
          this.log("Sending commmand 'get_clean_summary' error: ", error);
          clearInterval(this.updateInterval);
          this.setUnavailable(Homey.__('unreachable'));
          setTimeout(() => {
            this.getVacuumStatus();
          }, 1000 * interval);
        });

    }, 1000 * interval);
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
    return day + 'Day, ' + hour + 'h, ' + minute + 'm, ' + seconds + 's'
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes('updateTimer') || changedKeys.includes('gatewayIP') || changedKeys.includes('gatewayToken')) {
      this.getVacuumStatus();
      callback(null, true)
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device.call(value ? "app_start" : "app_pause", [])
        .then(() => this.log('Sending ' + name + ' commmand: ' + value))
        .catch(error => this.log("Sending commmand 'app_start' or 'app_pause' error: ", error));
    })
  }

  registerFindMeButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      if (value == true) {
        this.device.call("find_me", [])
          .then(() => {
            this.log('Sending ' + name + ' commmand: ' + value)
            setTimeout(() => {
              this.setCapabilityValue('onoff.findme', false)
            }, 500)
          })
          .catch(error => {
            this.log("Sending commmand 'find_me' error: ", error)
            setTimeout(() => {
              this.setCapabilityValue('onoff.findme', false)
            }, 500)
          });
      }
    })
  }

  registerCleaningSpeed(name) {
    this.registerCapabilityListener(name, async (value) => {
      let speed = value * 100;
      if (speed > 0) {
        if (speed > 1 && speed <= 38) {
          this.device.call('set_custom_mode', [38])
            .then(() => this.log('Sending ' + name + ' commmand: ' + speed))
            .catch(error => this.log("Sending commmand 'set_level_favorite' error: ", error));
        } else if (speed > 38 && speed <= 60) {
          this.device.call('set_custom_mode', [60])
            .then(() => this.log('Sending ' + name + ' commmand: ' + speed))
            .catch(error => this.log("Sending commmand 'set_level_favorite' error: ", error));
        } else if (speed > 60 && speed <= 77) {
          this.device.call('set_custom_mode', [77])
            .then(() => this.log('Sending ' + name + ' commmand: ' + speed))
            .catch(error => this.log("Sending commmand 'set_level_favorite' error: ", error));
        } else if (speed > 78 && speed <= 100) {
          this.device.call('set_custom_mode', [90])
            .then(() => this.log('Sending ' + name + ' commmand: ' + speed))
            .catch(error => this.log("Sending commmand 'set_level_favorite' error: ", error));
        }
      }
    })
  }

  registerVacuumCleanerMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      if (value == 'cleaning') {
        this.device.call('app_start', [])
          .then(() => this.log('Sending ' + name + ' commmand: ' + value))
          .catch(error => this.log("Sending commmand 'app_start' error: ", error));
      } else if (value == 'spot_cleaning') {
        this.device.call('app_spot', [])
          .then(() => this.log('Sending ' + name + ' commmand: ' + value))
          .catch(error => this.log("Sending commmand 'app_spot' error: ", error));
      } else if (value == 'docked') {
        this.device.call('app_charge', [])
          .then(() => this.log('Sending ' + name + ' commmand: ' + value))
          .catch(error => this.log("Sending commmand 'app_charge' error: ", error));
      } else if (value == 'charging') {
        this.device.call('app_charge', [])
          .then(() => this.log('Sending ' + name + ' commmand: ' + value))
          .catch(error => this.log("Sending commmand 'app_charge' error: ", error));
      } else if (value == 'stopped') {
        this.device.call('app_pause', [])
          .then(() => this.log('Sending ' + name + ' commmand: ' + value))
          .catch(error => this.log("Sending commmand 'app_pause' error: ", error));
      }
    })
  }

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return
    }

    if (value) {
      trigger.trigger(this, {}, value)
    }

    this.log('trigger:', name, value)

    switch (name) {
      case 'main_brush_work_time':
      case 'side_brush_work_time':
      case 'filter_work_time':
      case 'sensor_dirty_time':
    }
  }

  onAdded() {
    this.log('Device added')
  }

  onDeleted() {
    this.log('Device deleted deleted')
    clearInterval(this.updateInterval);
    if (typeof this.device !== "undefined") {
      this.device.destroy();
    }
  }
}

module.exports = MiVacuumCleanerV2