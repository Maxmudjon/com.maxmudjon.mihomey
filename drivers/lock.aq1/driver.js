const Homey = require('homey');
const model = [ 'lock.aq1' ];

class AqaraLock1 extends Homey.Driver {

  onInit() {
    this.triggers = {
      lockUsed: new Homey.FlowCardTriggerDevice('lockUsed').register()
    }
  }

  deviceList(devices) {
    let sortDevices = []
    for (var sid in devices) {
      let device = devices[sid]
      let deviceList = {
        "name": device.name + ' | ' + device.sid,
        "data": { 
          "sid": device.sid
        }
      }
      sortDevices.push(deviceList)
    }
    return sortDevices
  }

  onPair( socket ) {
    let pairingDevice = {};
    pairingDevice.name = 'Aqara Lock';
    pairingDevice.settings = {};
    pairingDevice.data = {};
    socket.on('getCurrentLockDevice', function( data, callback ) {
        callback( null, pairingDevice );
    });
    socket.on('lockUsersID', function( data, callback ) {
      console.log("lockUsersID: ", data)
        pairingDevice.data = data;
        callback( null, pairingDevice );
    });
    socket.on('getDevices', function( data, callback ) {
      var result = {};
      result.pairingDevice = pairingDevice;
      Homey.app.mihub.getDevicesByModel(model)
      .then(devices => {
        console.log("getDevice: ", devices)
        result.devices = devices;
        callback(null, devices);
      })
      .catch(() => callback(Homey.__('pair.no_devices_found')))
    });
    socket.on('devicesChanged', function( data, callback ) {
      console.log(data);
      
        pairingDevice.name = data.devices.name + ' | ' + data.devices.sid;
        pairingDevice.data.sid = data.devices.sid;
        callback( null, pairingDevice );
    });
    socket.on('allmostDone', function( data, callback ) {
        callback( null, pairingDevice );
    });

  }
}

module.exports = AqaraLock1;