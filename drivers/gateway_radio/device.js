const Homey = require('homey')
const miio = require('miio')

class GatewayRadio extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this)
    this.driver = this.getDriver()
    this.data = this.getData()
    this.volume = 0;
    this.played = false;
    this.initialize()
    this.log('Mi Homey device init | ' + 'name: ' + this.getName() + ' - ' + 'class: ' + this.getClass() + ' - ' + 'data: ' + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions()
    this.registerCapabilities()
    this.getRadioStatus()
  }

  registerCapabilities() {
    const { triggers } = this.driver
    this.registerSpeakerPlayingButton('speaker_playing')
    this.registerNextButton('speaker_next')
    this.registerPrevButton('speaker_prev')
    this.registerVolumeLevel('volume_set')
  }

  registerActions() {
    const { actions } = this.driver
    this.registerPlayRadioAction('play_radio', actions.playRadio)
    this.customRadioListSend('customRadioListSend', actions.customRadioListSend)
    this.registerPlayToggleRadioAction('play_toggle', actions.toggle)
  }

  getRadioStatus() {
    var that = this;
    let settings  = this.getSettings();
    this.log('---------------------------------------------------')
    this.log('ip from setting: ' + settings.gatewayIP + ' token from settings: ' + settings.gatewayToken)
    this.log('---------------------------------------------------')
    miio.device({
      address: that.getSetting('gatewayIP'),
      token: that.getSetting('gatewayToken')
    }).then(device => {
      if (!that.getAvailable()) {
        that.setAvailable();
      }

      that.device = device;

      device.call('get_prop_fm', []).then(result => {
        that.setCapabilityValue('volume_set', result.current_volume / 100)
        if (result.current_status == 'run') {
          that.setCapabilityValue('speaker_playing', true)
        } else if (result.current_status == 'pause') {
          that.setCapabilityValue('speaker_playing', false)
        }
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });

      device.call('get_channels', {'start':0}).then(result => {
        result.chs.forEach(function(item, i, radios) {
          that.setSettings({
            [`favorite${i}ID`]: item.id + ', ' + item.url
          })
          if (i == radios.length - 1) {
            i = radios.length;
            for(let j = i ; j < 20; j++) {
              that.setSettings({
                [`favorite${j}ID`]: ""
              })
            }
          }
        })
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });

      var update = that.getSetting('updateTimer') || 60;
      that.updateTimer(update);
    }).catch((error) => {
      that.log(error);
      that.setUnavailable(Homey.__('reconnecting'));
      setTimeout(() => {
        that.getRadioStatus();
      }, 10000);
    });
  }

  updateTimer(interval) {
    var that = this;
    clearInterval(that.updateInterval);
    that.updateInterval = setInterval(() => {
      that.device.call('get_prop_fm', []).then(result => {
        that.setCapabilityValue('volume_set', result.current_volume / 100)
        if (result.current_status == 'run') {
          that.setCapabilityValue('speaker_playing', true)
        } else if (result.current_status == 'pause') {
          that.setCapabilityValue('speaker_playing', false)
        }
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
        clearInterval(that.updateInterval);
        that.setUnavailable(Homey.__('unreachable'));
        setTimeout(() => {
          that.getRadioStatus();
        }, 1000 * interval);
      });

      that.device.call('get_channels', {'start':0}).then(result => {
        result.chs.forEach(function(item, i, radios) {
          that.setSettings({
            [`favorite${i}ID`]: item.id + ', ' + item.url
          })
          if (i == radios.length - 1) {
            i = radios.length;
            for(let j = i ; j < 20; j++) {
              that.setSettings({
                [`favorite${j}ID`]: ""
              })
            }
          }
        })
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
        clearInterval(that.updateInterval);
        that.setUnavailable(Homey.__('reconnecting'));
        setTimeout(() => {
          that.getRadioStatus();
        }, 1000 * interval);
      });
    }, 1000 * interval);
  }

  onSettings (oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes('updateTimer') || changedKeys.includes('gatewayIP') || changedKeys.includes('gatewayToken')) {
      this.getRadioStatus();
      callback(null, true)
    }

    for (let i = 0; i < 20; i++) {
      if (changedKeys.includes(`favorite${i}ID`)) {
        var that = this;
        let newFavoriteListsID = newSettings[`favorite${i}ID`]
        let oldFavoriteListID = oldSettings[`favorite${i}ID`]
        let newFavoriteListsIDArray = newFavoriteListsID.split(',');
        let oldFavoriteListsIDArray = oldFavoriteListID.split(',');

        if (oldFavoriteListsIDArray[0] !== undefined && oldFavoriteListsIDArray[0] !== null && oldFavoriteListsIDArray[1] !== undefined && oldFavoriteListsIDArray[1] !== null) {
          let ids = oldFavoriteListsIDArray[0];
          ids = ids.replace(/\s/g, "");
          let id = parseInt(ids);
          let urls = oldFavoriteListsIDArray[1];
          urls = urls.replace(/\s/g, "");
          let url = urls.toString();

          that.device.call('remove_channels', {"chs":[{"id":id,"type":0,"url":url}]}).then(result => {
            that.log('Removing ' + ' ID: ' + id + ' URL: ' + url);
          }).catch(function(error) {
            that.log("Sending commmand error: ", error);
            callback(error, false)
          });

          callback(null, true)
        }

        if (newFavoriteListsIDArray[0] !== undefined && newFavoriteListsIDArray[0] !== null && newFavoriteListsIDArray[1] !== undefined && newFavoriteListsIDArray[1] !== null) {
          let ids = newFavoriteListsIDArray[0];
          ids = ids.replace(/\s/g, "");
          let id = parseInt(ids);
          let urls = newFavoriteListsIDArray[1];
          urls = urls.replace(/\s/g, "");
          let url = urls.toString();
          that.device.call('add_channels', {"chs":[{"id":id,"type":0,"url":url}]}).then(result => {
            that.log('Adding ' + id + ' URL: ' + url);
          }).catch(function(error) {
            callback(error, false)
          });

          callback(null, true)
        }
      }
    }
  }

  registerSpeakerPlayingButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      const settings = this.getSettings();
      var that = this;

      that.device.call('play_fm', [ value ? 'on' : 'off' ]).then(result => {
        that.log('Sending ' + name + ' commmand: ' + value);
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });
    })
  }

  registerNextButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      const settings = this.getSettings();
      var that = this;

      that.device.call('play_fm', [ 'next' ]).then(result => {
        that.log('Sending ' + name + ' commmand: ' + value);
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });
    })
  }

  registerPrevButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      const settings = this.getSettings();
      var that = this;

      that.device.call('play_fm', [ 'prev' ]).then(result => {
        that.log('Sending ' + name + ' commmand: ' + value);
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });
    })
  }

  registerVolumeLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      let volume = parseInt(value * 100);
      const settings = this.getSettings();
      var that = this;

      that.device.call('volume_ctrl_fm', [ volume.toString() ]).then(result => {
        that.log('Sending ' + name + ' commmand: ' + value * 100);
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });
    })
  }

  registerPlayRadioAction(name, action) {
    action.radio.registerRunListener(async (args, state) => {
      const settings = this.getSettings();
      let volume = parseInt(args.volume * 100);
      var that = this;

      let favoriteListsID = settings[`favorite${args.favoriteID}ID`]
      let favoriteListsIDArray = favoriteListsID.split(',');

      if (favoriteListsIDArray[0] !== undefined && favoriteListsIDArray[0] !== null && favoriteListsIDArray[1] !== undefined && favoriteListsIDArray[1] !== null) {
        let ids = favoriteListsIDArray[0];
        ids = ids.replace(/\s/g, "");
        let id = parseInt(ids);
        let urls = favoriteListsIDArray[1];
        urls = urls.replace(/\s/g, "");
        let url = urls.toString();

        that.device.call('play_specify_fm', { id: id, type: 0,  url: url }).then(result => {
          that.log('Play radio: ',args.favoriteID);
        }).catch(function(error) {
          that.log("Play radio error: ", error);
        });

        that.device.call('volume_ctrl_fm', [ volume.toString() ]).then(result => {
          that.log('Set volume: ', volume);
        }).catch(function(error) {
          that.log("Set volume error: ", error);
        });
      }
    })
  }

  customRadioListSend(name, action) {
    action.customRadioListSend.registerRunListener(async (args, state) => {
      const settings = this.getSettings();
      let volume = parseInt(args.volume * 100);
      var that = this;

      that.device.call('play_specify_fm', { id: parseInt(args.id), type: 0,  url: args.url }).then(result => {
        that.log('Play radio: ', args.id);
        that.log('from url: ', args.url);
      }).catch(function(error) {
        that.log("Play radio error: ", error);
      });

      that.device.call('volume_ctrl_fm', [ volume.toString() ]).then(result => {
        that.log('Set volume: ', volume);
      }).catch(function(error) {
        that.log("Set volume error: ", error);
      });
    })
  }

  registerPlayToggleRadioAction(name, action) {
    action.toggle.registerRunListener(async (args, state) => {
      const settings = this.getSettings();
      var that = this;
      that.device.call('play_fm', [ 'toggle' ]).then(result => {
        that.log('Sending ' + name + ' commmand: ' + state);
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });
    })
  }

  onAdded() {
    this.log('Device added')
  }

  onDeleted() {
    this.log('Device deleted deleted')
    clearInterval(this.updateInterval);
    this.device.destroy();
  }
}

module.exports = GatewayRadio