const Homey = require("homey");
const miio = require("miio");
const { ManagerSettings } = Homey;
const model = 54;

class AqaraRelay extends Homey.Driver {
  onInit() {
    this.triggers = {
      left_switch_on: new Homey.FlowCardTriggerDevice("left_switch_on").register(),
      left_switch_off: new Homey.FlowCardTriggerDevice("left_switch_off").register(),
      left_switch_toggle: new Homey.FlowCardTriggerDevice("left_switch_toggle").register(),
      right_switch_on: new Homey.FlowCardTriggerDevice("right_switch_on").register(),
      right_switch_off: new Homey.FlowCardTriggerDevice("right_switch_off").register(),
      right_switch_toggle: new Homey.FlowCardTriggerDevice("right_switch_toggle").register()
    };
    this.conditions = {
      left_switch: new Homey.FlowCardCondition("left_switch_active").register(),
      right_switch: new Homey.FlowCardCondition("right_switch_active").register()
    };
    this.actions = {
      left_switch_on: new Homey.FlowCardAction("left_switch_on").register(),
      left_switch_off: new Homey.FlowCardAction("left_switch_off").register(),
      left_switch_toggle: new Homey.FlowCardAction("left_switch_toggle").register(),
      right_switch_on: new Homey.FlowCardAction("right_switch_on").register(),
      right_switch_off: new Homey.FlowCardAction("right_switch_off").register(),
      right_switch_toggle: new Homey.FlowCardAction("right_switch_toggle").register()
    };
  }

  onPair(socket) {
    let pairingDevice = {
      name: "Aqara Relay 2 Channel",
      settings: {},
      data: {}
    };

    function stripLumiFromId(id) {
      if (id.indexOf("lumi.") === 0) {
        return id.substring(5);
      }
      return id;
    }

    socket.on("getGatewaysList", async (data, callback) => {
      const gatewaysList = (await ManagerSettings.get("gatewaysList")) || [];
      callback(null, gatewaysList);
    });

    socket.on("getDevices", async (data, callback) => {
      try {
        let device = await miio.device({ address: pairingDevice.settings.deviceIp, token: pairingDevice.settings.deviceToken });
        let result = await device.call("get_device_prop", ["lumi.0", "device_list"]);
        const devices = [];

        for (let i = 0; i < result.length; i += 5) {
          const sid = stripLumiFromId(result[i]);
          const type = result[i + 1];
          const online = result[i + 2] === 1;

          if (sid === "0" || type != model) continue;

          devices.push({
            sid: "lumi." + sid,
            model: "LLZMK11LM",
            modelName: "lumi.relay.c2acn01",
            online
          });
        }
        callback(null, devices);
      } catch (error) {
        callback(error, null);
      }
    });

    socket.on("getDevice", async (data, callback) => {
      callback(null, pairingDevice);
    });

    socket.on("selectedGateway", ({ device }, callback) => {
      pairingDevice.settings.deviceIp = device.ip;
      pairingDevice.settings.deviceToken = device.token;
      pairingDevice.settings.deviceFromGatewaySid = device.mac;
      pairingDevice.settings.password = device.password;
      pairingDevice.settings.updateTimer = 60;

      callback(null, pairingDevice);
    });

    socket.on("selectedDevice", ({ device }, callback) => {
      pairingDevice.data.sid = device.sid;
      pairingDevice.settings.deviceSid = device.sid;
      pairingDevice.settings.deviceModelName = device.modelName;
      pairingDevice.settings.deviceModelCodeName = device.model;

      callback(null, pairingDevice);
    });

    socket.on("saveSettings", ({ device }, callback) => {
      pairingDevice.name = device.name;
      pairingDevice.settings.updateTimer = parseInt(device.settings.updateTimer);

      callback(null, pairingDevice);
    });

    socket.on("allmostDone", (data, callback) => {
      callback(null, pairingDevice);
    });
  }
}

module.exports = AqaraRelay;
