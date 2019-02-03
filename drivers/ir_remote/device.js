const Homey = require('homey')
const miio = require('miio')

class MiIrTv extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this)
    this.driver = this.getDriver()
    this.data = this.getData()
    this.initialize()
    this.lux = 0;
    this.log('Mi IR device init | ' + 'name: ' + this.getName() + ' - ' + 'class: ' + this.getClass() + ' - ' + 'data: ' + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerCapabilities()
    this.registerConditions()
    this.registerActions()
  }

  registerCapabilities() {
    const { triggers } = this.driver
  }

  registerConditions() {
    const { conditions } = this.driver
  }

  registerActions() {
    const { actions } = this.driver
    this.sendIrCodeAction('send_ir_code', actions.sendIRCodeAction)
    this.registerStandbyAction('onoff')
    this.registerChannelUpAction('channel_up')
    this.registerChannelDownAction('channel_down')
    this.registerVolumeUpAction('volume_up')
    this.registerVolumeDownAction('volume_down')
    this.registerMuteAction('volume_mute')
  }

  registerCondition(name, condition) {
    condition.registerRunListener((args, state) => (
      Promise.resolve(this.getCapabilityValue(name))
    ))
  }

  registerStandbyAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.sendIrCode(this.data.standby, name)
    })
  }

  registerChannelUpAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.sendIrCode(this.data.channelUp, name)
    })
  }

  registerChannelDownAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.sendIrCode(this.data.channelDown, name)
    })
  }
  
  registerVolumeUpAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.sendIrCode(this.data.volumeUp, name)
    })
  }
  
  registerVolumeDownAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.sendIrCode(this.data.volumeDown, name)
    })
  }
  
  registerMuteAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.sendIrCode(this.data.mute, name)
    })
  }

  sendIrCodeAction(name, action) {
    action.code.registerRunListener(async (args, state) => {
      this.sendIrCode(args.code)
    })
  }

  sendIrCode(code, cababilityName) {
    const settings = this.getSettings();
    var that = this;
    miio.device({
      address: settings.deviceIp,
      token: settings.deviceToken
    }).then(device => {
        device.call("miIO.ir_play", {"freq":38400,"code":code}).then(result => {
          if(!cababilityName) {cababilityName = 'custom'}
          that.log('Sending ' + cababilityName + ' ir code: ' + code);
        }).catch(function(error) {
          that.log("Sending ir code error: ", error);
        });
    }).catch(function (error) {
        if(error == "Error: Could not connect to device, handshake timeout") {
          that.log("Device timeout error: ", error);
        } else {
          that.log("Device error: ", error);
        }
    });
  }

  onAdded() {
    this.log('Device added')
  }

  onDeleted() {
    this.log('Device deleted deleted')
  }
}

module.exports = MiIrTv