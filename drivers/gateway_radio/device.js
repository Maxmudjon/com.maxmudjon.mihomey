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
    const settings = this.getSettings();
    clearInterval(this.interval)
    this.interval = setInterval(() => {
      var that = this;
      miio.device({
        address: settings.gatewayIP,
        token: settings.gatewayToken
      }).then(device => {
          device.call('get_prop_fm', []).then(result => {
            this.setCapabilityValue('volume_set', result.current_volume / 100)
            if (result.current_status == 'run') {
              this.setCapabilityValue('speaker_playing', true)
            } else if (result.current_status == 'pause') {
              this.setCapabilityValue('speaker_playing', false)
            }
            
          }).catch(function(error) {
            that.log("Sending commmand error: ", error);
          });
      }).catch(function (error) {
          if(error == "Error: Could not connect to device, handshake timeout") {
            that.log("Device timeout error: ", error);
          } else {
            that.log("Device error: ", error);
          }
      });
    }, settings.updateTimer * 1000)
    
  }

  onSettings (oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes('updateTimer') || changedKeys.includes('gatewayIP') || changedKeys.includes('gatewayToken')) {
      const settings = this.getSettings();
      let newUpdatedGatewayInterval = newSettings['updateTimer']
      let newUpdatedGatewayIP = newSettings['gatewayIP']
      let newUpdatedGatewayToken = newSettings['gatewayToken']
      clearInterval(this.interval)
      this.interval = setInterval(() => {
        var that = this;
        miio.device({
          address: newUpdatedGatewayIP,
          token: newUpdatedGatewayToken
        }).then(device => {
          device.call('get_prop_fm', []).then(result => {
            this.setCapabilityValue('volume_set', result.current_volume / 100)
            if (result.current_status == 'run') {
              this.setCapabilityValue('speaker_playing', true)
            } else if (result.current_status == 'pause') {
              this.setCapabilityValue('speaker_playing', false)
            }
          }).catch(function(error) {
            that.log("Sending commmand error: ", error);
          });
        }).catch(function (error) {
            if(error == "Error: Could not connect to device, handshake timeout") {
              that.log("Device timeout error: ", error);
            } else {
              that.log("Device error: ", error);
            }
        });
      }, newUpdatedGatewayInterval * 1000)
      callback(null, true)
    }
  }

  registerSpeakerPlayingButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      const settings = this.getSettings();
      var that = this;
      miio.device({
        address: settings.gatewayIP,
        token: settings.gatewayToken
      }).then(device => {
          device.call('play_fm', [ value ? 'on' : 'off' ]).then(result => {
            that.log('Sending ' + name + ' commmand: ' + value);
          }).catch(function(error) {
            that.log("Sending commmand error: ", error);
          });
      }).catch(function (error) {
          if(error == "Error: Could not connect to device, handshake timeout") {
            that.log("Device timeout error: ", error);
          } else {
            that.log("Device error: ", error);
          }
      });
    })
  }

  registerNextButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      const settings = this.getSettings();
      var that = this;
      miio.device({
        address: settings.gatewayIP,
        token: settings.gatewayToken
      }).then(device => {
          device.call('play_fm', [ 'next' ]).then(result => {
            that.log('Sending ' + name + ' commmand: ' + value);
          }).catch(function(error) {
            that.log("Sending commmand error: ", error);
          });
      }).catch(function (error) {
          if(error == "Error: Could not connect to device, handshake timeout") {
            that.log("Device timeout error: ", error);
          } else {
            that.log("Device error: ", error);
          }
      });
    })
  }

  registerPrevButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      const settings = this.getSettings();
      var that = this;
      miio.device({
        address: settings.gatewayIP,
        token: settings.gatewayToken
      }).then(device => {
          device.call('play_fm', [ 'prev' ]).then(result => {
            that.log('Sending ' + name + ' commmand: ' + value);
          }).catch(function(error) {
            that.log("Sending commmand error: ", error);
          });
      }).catch(function (error) {
          if(error == "Error: Could not connect to device, handshake timeout") {
            that.log("Device timeout error: ", error);
          } else {
            that.log("Device error: ", error);
          }
      });
    })
  }

  registerVolumeLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      let volume = parseInt(value * 100);
      const settings = this.getSettings();
      var that = this;
      miio.device({
        address: settings.gatewayIP,
        token: settings.gatewayToken
      }).then(device => {
          device.call('volume_ctrl_fm', [ volume.toString() ]).then(result => {
            that.log('Sending ' + name + ' commmand: ' + value * 100);
          }).catch(function(error) {
            that.log("Sending commmand error: ", error);
          });
      }).catch(function (error) {
          if(error == "Error: Could not connect to device, handshake timeout") {
            that.log("Device timeout error: ", error);
          } else {
            that.log("Device error: ", error);
          }
      });
    })
  }

  registerPlayRadioAction(name, action) {
    action.radio.registerRunListener(async (args, state) => {
      const settings = this.getSettings();
      let volume = parseInt(args.volume * 100);
      var that = this;
      miio.device({
        address: settings.gatewayIP,
        token: settings.gatewayToken
      }).then(device => {
          device.call('play_specify_fm', { id: parseInt(args.radioID), type: 0,  url: `http://ximiraga.ru/${args.radioID}.m3u8` }).then(result => {
            that.log('Play radio: ',args.radioID);
          }).catch(function(error) {
            that.log("Play radio error: ", error);
          });

          device.call('volume_ctrl_fm', [ volume.toString() ]).then(result => {
            that.log('Set volume: ', volume);
          }).catch(function(error) {
            that.log("Set volume error: ", error);
          });
      }).catch(function (error) {
          if(error == "Error: Could not connect to device, handshake timeout") {
            that.log("Device timeout error: ", error);
          } else {
            that.log("Device error: ", error);
          }
      });
    })
  }

  customRadioListSend(name, action) {
    action.customRadioListSend.registerRunListener(async (args, state) => {
      const settings = this.getSettings();
      let volume = parseInt(args.volume * 100);
      var that = this;
      miio.device({
        address: settings.gatewayIP,
        token: settings.gatewayToken
      }).then(device => {
          device.call('play_specify_fm', { id: parseInt(args.id), type: 0,  url: args.url }).then(result => {
            that.log('Play radio: ', args.id);
            that.log('from url: ', args.url);
          }).catch(function(error) {
            that.log("Play radio error: ", error);
          });

          device.call('volume_ctrl_fm', [ volume.toString() ]).then(result => {
            that.log('Set volume: ', volume);
          }).catch(function(error) {
            that.log("Set volume error: ", error);
          });
      }).catch(function (error) {
          if(error == "Error: Could not connect to device, handshake timeout") {
            that.log("Device timeout error: ", error);
          } else {
            that.log("Device error: ", error);
          }
      });
    })
  }

  registerPlayToggleRadioAction(name, action) {
    action.toggle.registerRunListener(async (args, state) => {
      const settings = this.getSettings();
      var that = this;
      miio.device({
        address: settings.gatewayIP,
        token: settings.gatewayToken
      }).then(device => {
          device.call('play_fm', [ 'toggle' ]).then(result => {
            that.log('Sending ' + name + ' commmand: ' + state);
          }).catch(function(error) {
            that.log("Sending commmand error: ", error);
          });
      }).catch(function (error) {
          if(error == "Error: Could not connect to device, handshake timeout") {
            that.log("Device timeout error: ", error);
          } else {
            that.log("Device error: ", error);
          }
      });
    })
  }

  onAdded() {
    this.log('Device added')
  }

  onDeleted() {
    this.log('Device deleted deleted')
  }
}

module.exports = GatewayRadio