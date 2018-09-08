const Homey = require('homey');
const model = "86sw2"

class MagnetSensor extends Homey.Driver {

  onInit() {
    this.triggers = {
      left_click: new Homey.FlowCardTriggerDevice('left_click_db86_switch').register(),
      right_click: new Homey.FlowCardTriggerDevice('right_click_db86_switch').register(),
      both_click: new Homey.FlowCardTriggerDevice('both_click_db86_switch').register()
    }
    this.conditions = {

    }
    this.actions = {

    }
  }

  onPairListDevices(data, callback) {
    Homey.app.mihub.getDevicesForTypes(model)
      .then(devices => callback(null, this.deviceList(devices)))
      .catch(() => callback(Homey.__('pair.no_devices_found')))
  }   

  deviceList(devices) {
    let sortDevices = []
    for (var sid in devices) {
      
      let device = devices[sid]
      console.log(device)
      let deviceList = {
        "name": device.name,
        "data": { 
          "sid": device.sid,
          "gatewaysid": device.gatewaysid
        }
      }
      sortDevices.push(deviceList)
    }
    return sortDevices
  }
}

module.exports = MagnetSensor;