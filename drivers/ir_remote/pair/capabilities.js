var devices = {
  tv: {
    name: "TV",
    capabilities: ["onoff", "volume_up", "volume_down", "channel_up", "channel_down", "volume_mute"],
    capabilitiesOptions: {
      onoff: {
        title: {
          en: "Standby"
        }
      }
    },
    defaultCapabilities: ["onoff"]
  },
  projector: {
    name: "Projector",
    capabilities: ["onoff"],
    capabilitiesOptions: {
      onoff: {
        title: {
          en: "Standby"
        }
      }
    },
    defaultCapabilities: ["onoff"]
  },
  airConditioner: {
    name: "Air Conditioner",
    capabilities: ["onoff", "thermostat"],
    capabilitiesOptions: {
      onoff: {
        title: {
          en: "Standby"
        }
      }
    },
    defaultCapabilities: ["onoff"]
  },
  amplifier: {
    name: "Amplifier",
    capabilities: ["onoff", "volume_mute", "volume_up", "volume_down"],
    capabilitiesOptions: {
      onoff: {
        title: {
          en: "Standby"
        }
      }
    },
    defaultCapabilities: ["onoff"]
  },
  fan: {
    name: "FAN",
    capabilities: ["onoff", "dim"],
    capabilitiesOptions: {
      onoff: {
        title: {
          en: "Standby"
        }
      },
      dim: {
        title: {
          en: "Fan speed"
        },
        min: 0,
        max: 3,
        step: 1
      }
    },
    defaultCapabilities: ["onoff"]
  }
};
