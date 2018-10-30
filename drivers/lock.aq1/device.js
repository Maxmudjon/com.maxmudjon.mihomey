const Homey = require('homey')

class AqaraLock1 extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this)
    this.handleStateChange = this.handleStateChange.bind(this)
    this.driver = this.getDriver()
    this.data = this.getData()
    this.initialize()
    this.log('Mi Homey device init | ' + 'name: ' + this.getName() + ' - ' + 'class: ' + this.getClass() + ' - ' + 'data: ' + JSON.stringify(this.data));
  }

  async initialize() {
    if (Homey.app.mihub.hubs) {
      this.registerStateChangeListener()
    } else {
      this.unregisterStateChangeListener()
    }
  }

  handleStateChange(device) {
    const { triggers } = this.driver;

    /* 
      {"cmd":"report","model":"lock.aq1","sid":"158d0001e17fa2","short_id":35110,"data":{"verified_wrong":"3"}}
      {"cmd":"report","model":"lock.aq1","sid":"158d0001e17fa2","short_id":35110,"data":{"fing_verified":"65536"}}
      {"cmd":"report","model":"lock.aq1","sid":"158d0001e17fa2","short_id":35110,"data":{"psw_verified":"131072"}}
      {"cmd":"report","model":"lock.aq1","sid":"158d0001e17fa2","short_id":35110,"data":{"card_verified":"196608"}}
    */

    if (device['data']['voltage']) {
      var battery = (device['data']['voltage']-2800)/5
      if (battery > 100) {
        battery = 100;
      }
      var lowBattery
      if(battery > 20) {
        lowBattery = false
      } else {
        lowBattery = true
      }
      this.updateCapabilityValue('measure_battery', battery);
      this.updateCapabilityValue('alarm_battery', lowBattery)
    }

    var settings = this.getSettings();
    
    if (device['data']['fing_verified']) {
      this.updateCapabilityValue('alarm_motion.finger', true)
      //this.log(this.data.users)
      /*
        { id: '0',
        name: 'akmal405',
        finger_id: '65536',
        code_id: '131072',
        card_id: '196608' } 
      */
      for (var id in this.data.users) {
        let user = this.data.users[id]
        // this.log("User name is: ", user.name)
        // this.log("User finger id is: ", user.finger_id)
        // this.log("User code id is: ", user.code_id)
        // this.log("User card id is: ", user.card_id)

        if (user.finger_id == device['data']['fing_verified']) {
          // this.log(user.name + ' uyga keldi')
          let tokens = {
            'finger_id': parseInt(device['data']['fing_verified']),
            'code_id': 0,
            'card_id': 0,
            'userName': user.name,
            'wrong_id': 0
          }
          this.triggerFlow(triggers.lockUsed, 'lockUsed', tokens)
        }
      }
      
      var width = 0;
      var id = setInterval(frame.bind(this), settings.alarm_duration_number);
      function frame() {
        if (width == 1000) {
          clearInterval(id);
          this.updateCapabilityValue('alarm_motion.finger', false);
        } else {
          width++; 
        }
      }
    }

    if (device['data']['psw_verified']) {
      this.updateCapabilityValue('alarm_motion.code', true)
      //this.log(this.data.users)
      /*
        { id: '0',
        name: 'akmal405',
        finger_id: '65536',
        code_id: '131072',
        card_id: '196608' } 
      */
      for (var id in this.data.users) {
        let user = this.data.users[id]
        // this.log("User name is: ", user.name)
        // this.log("User finger id is: ", user.finger_id)
        // this.log("User code id is: ", user.code_id)
        // this.log("User card id is: ", user.card_id)

        if (user.code_id == device['data']['psw_verified']) {
          // this.log(user.name + ' uyga keldi')
          let tokens = {
            'finger_id': 0,
            'code_id': parseInt(device['data']['psw_verified']),
            'card_id': 0,
            'userName': user.name,
            'wrong_id': 0
          }
          this.triggerFlow(triggers.lockUsed, 'lockUsed', tokens)
        }
      }
      
      var width = 0;
      var id = setInterval(frame.bind(this), settings.alarm_duration_number);
      function frame() {
        if (width == 1000) {
          clearInterval(id);
          this.updateCapabilityValue('alarm_motion.code', false);
        } else {
          width++; 
        }
      }
    }

    if (device['data']['card_verified']) {
      this.updateCapabilityValue('alarm_motion.card', true)
      //this.log(this.data.users)
      /*
        { id: '0',
        name: 'akmal405',
        finger_id: '65536',
        code_id: '131072',
        card_id: '196608' } 
      */
      for (var id in this.data.users) {
        let user = this.data.users[id]
        // this.log("User name is: ", user.name)
        // this.log("User finger id is: ", user.finger_id)
        // this.log("User code id is: ", user.code_id)
        // this.log("User card id is: ", user.card_id)

        if (user.card_id == device['data']['card_verified']) {
          // this.log(user.name + ' uyga keldi')
          let tokens = {
            'finger_id': 0,
            'code_id': 0,
            'card_id': parseInt(device['data']['card_verified']),
            'userName': user.name,
            'wrong_id': 0
          }
          this.triggerFlow(triggers.lockUsed, 'lockUsed', tokens)
        }
      }
      
      var width = 0;
      var id = setInterval(frame.bind(this), settings.alarm_duration_number);
      function frame() {
        if (width == 1000) {
          clearInterval(id);
          this.updateCapabilityValue('alarm_motion.card', false);
        } else {
          width++; 
        }
      }
    }

    if (device['data']['verified_wrong']) {
      this.updateCapabilityValue('alarm_motion.wrongID', true)
      //wrong_id
      let tokens = {
        'finger_id': 0,
        'code_id': 0,
        'card_id': 0,
        'userName': 'Not user',
        'wrong_id': parseInt(device['data']['verified_wrong'])
      }
      this.triggerFlow(triggers.lockUsed, 'lockUsed', tokens)
            
      var width = 0;
      var id = setInterval(frame.bind(this), settings.alarm_duration_number);
      function frame() {
        if (width == 1000) {
          clearInterval(id);
          this.updateCapabilityValue('alarm_motion.wrongID', false);
        } else {
          width++; 
        }
      }
    }

    let gateways = Homey.app.mihub.gateways
    for (let sid in gateways) {
      gateways[sid]['childDevices'].forEach(deviceSid => {
        if (this.data.sid == deviceSid) {
          this.setSettings({
            deviceFromGatewaySid: sid
          })
        }
      })
    }
    
    this.setSettings({
      deviceSid: device.sid,
      deviceModelName: 'lumi.sensor_' + device.model,
      deviceModelCodeName: device.modelCode,
    })
  }

  registerAuthChangeListener() {
    Homey.app.mihub.on('gatewaysList', this.initialize)
  }

  registerStateChangeListener() {
    Homey.app.mihub.on(`${this.data.sid}`, this.handleStateChange)
  }

  unregisterAuthChangeListener() {
    Homey.app.mihub.removeListener('gatewaysList', this.initialize)
  }

  unregisterStateChangeListener() {
    Homey.app.mihub.removeListener(`${this.data.sid}`, this.handleStateChange)
  }

  updateCapabilityValue(name, value, trigger) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
      this.triggerFlow(trigger, name, value)
    }
  }

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return
    }

    if(value) {
      trigger.trigger( this, value, true )
    }

    this.log('trigger:', name, value)

    switch(name) {
      case 'alarm_motion':
      case 'lockUsed':
    }
  }

  onAdded() {
    this.log('Device added')
  }

  onDeleted() {
    this.unregisterAuthChangeListener()
    this.unregisterStateChangeListener()
    this.log('Device deleted deleted')
  }
}

module.exports = AqaraLock1
