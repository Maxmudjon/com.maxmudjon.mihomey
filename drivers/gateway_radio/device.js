const Homey = require("homey");
const miio = require("miio");

class GatewayRadio extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.volume = 0;
    this.played = false;
    this.initialize();
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    if (process.env.HOMEY_VERSION.replace(/\W/g, "") >= "200") {
      this.image = new Homey.Image("jpg");
      this.image.setUrl(null);
      this.image
        .register()
        .then(() => {
          return this.setAlbumArtImage(this.image);
        })
        .catch(this.error);
    }
    this.registerActions();
    this.registerCapabilities();
    this.getRadioStatus();
  }

  registerCapabilities() {
    this.registerSpeakerPlayingButton("speaker_playing");
    this.registerNextButton("speaker_next");
    this.registerPrevButton("speaker_prev");
    this.registerVolumeLevel("volume_set");
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerPlayRadioAction("play_radio", actions.playRadio);
    this.customRadioListSend("customRadioListSend", actions.customRadioListSend);
    this.registerPlayToggleRadioAction("play_toggle", actions.toggle);
  }

  getRadioStatus() {
    var that = this;
    miio
      .device({ address: this.getSetting("gatewayIP"), token: this.getSetting("gatewayToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }
        this.device = device;

        this.device
          .call("get_prop_fm", [])
          .then((result) => {
            that.setCapabilityValue("volume_set", result.current_volume / 100);
            if (process.env.HOMEY_VERSION.replace(/\W/g, "") >= "200") {
              if (result.current_program == "527782008") {
                that.setCapabilityValue("speaker_track", "Авторадио  id: " + result.current_program);
                this.image.setUrl("https://www.avtoradio.ru/design/images/site-design/avtoradio-logo.png");
                this.image.update();
              } else {
                that.setCapabilityValue("speaker_track", "Radio  id: " + result.current_program);
                this.image.setUrl(null);
                this.image.update();
              }
            }

            if (result.current_status == "run") {
              that.setCapabilityValue("speaker_playing", true);
            } else if (result.current_status == "pause") {
              that.setCapabilityValue("speaker_playing", false);
            }
          })
          .catch((error) => that.log("Sending commmand 'get_prop_fm' error: ", error));

        this.device
          .call("get_channels", { start: 0 })
          .then((result) => {
            result.chs.forEach(function (item, i, radios) {
              that.setSettings({
                [`favorite${i}ID`]: item.id + ", " + item.url,
              });
              if (i == radios.length - 1) {
                i = radios.length;
                for (let j = i; j < 20; j++) {
                  that.setSettings({
                    [`favorite${j}ID`]: "",
                  });
                }
              }
            });
          })
          .catch((error) => this.log("Sending commmand 'get_channels' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getRadioStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    var that = this;
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_prop_fm", [])
        .then((result) => {
          that.setCapabilityValue("volume_set", result.current_volume / 100);
          if (process.env.HOMEY_VERSION.replace(/\W/g, "") >= "200") {
            if (result.current_program == "527782008") {
              that.setCapabilityValue("speaker_track", "Авторадио  id: " + result.current_program);
              this.image.setUrl("https://www.avtoradio.ru/design/images/site-design/avtoradio-logo.png");
              this.image.update();
            } else {
              that.setCapabilityValue("speaker_track", "Radio  id: " + result.current_program);
              this.image.setUrl(null);
              this.image.update();
            }
          }

          if (result.current_status == "run") {
            that.setCapabilityValue("speaker_playing", true);
          } else if (result.current_status == "pause") {
            that.setCapabilityValue("speaker_playing", false);
          }
        })
        .catch((error) => {
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            that.getRadioStatus();
          }, 1000 * interval);
        });

      this.device
        .call("get_channels", { start: 0 })
        .then((result) => {
          result.chs.forEach(function (item, i, radios) {
            that.setSettings({
              [`favorite${i}ID`]: item.id + ", " + item.url,
            });
            if (i == radios.length - 1) {
              i = radios.length;
              for (let j = i; j < 20; j++) {
                that.setSettings({
                  [`favorite${j}ID`]: "",
                });
              }
            }
          });
        })
        .catch((error) => {
          this.log("Sending commmand 'get_prop' error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getRadioStatus();
          }, 1000 * interval);
        });
    }, 1000 * interval);
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("gatewayIP") || changedKeys.includes("gatewayToken")) {
      this.getRadioStatus();
      callback(null, true);
    }

    for (let i = 0; i < 20; i++) {
      if (changedKeys.includes(`favorite${i}ID`)) {
        var that = this;
        let newFavoriteListsID = newSettings[`favorite${i}ID`];
        let oldFavoriteListID = oldSettings[`favorite${i}ID`];
        let newFavoriteListsIDArray = newFavoriteListsID.split(",");
        let oldFavoriteListsIDArray = oldFavoriteListID.split(",");

        if (oldFavoriteListsIDArray[0] !== undefined && oldFavoriteListsIDArray[0] !== null && oldFavoriteListsIDArray[1] !== undefined && oldFavoriteListsIDArray[1] !== null) {
          let ids = oldFavoriteListsIDArray[0];
          ids = ids.replace(/\s/g, "");
          let id = parseInt(ids);
          let urls = oldFavoriteListsIDArray[1];
          urls = urls.replace(/\s/g, "");
          let url = urls.toString();

          this.device
            .call("remove_channels", { chs: [{ id: id, type: 0, url: url }] })
            .then(() => that.log("Removing  ID: " + id + " URL: " + url))
            .catch((error) => {
              that.log("Sending commmand 'remove_channels' error: ", error);
              callback(error, false);
            });

          callback(null, true);
        }

        if (newFavoriteListsIDArray[0] !== undefined && newFavoriteListsIDArray[0] !== null && newFavoriteListsIDArray[1] !== undefined && newFavoriteListsIDArray[1] !== null) {
          let ids = newFavoriteListsIDArray[0];
          ids = ids.replace(/\s/g, "");
          let id = parseInt(ids);
          let urls = newFavoriteListsIDArray[1];
          urls = urls.replace(/\s/g, "");
          let url = urls.toString();
          this.device
            .call("add_channels", { chs: [{ id: id, type: 0, url: url }] })
            .then(() => that.log("Adding " + id + " URL: " + url))
            .catch((error) => {
              that.log("Sending commmand 'add_channels' error: ", error);
              callback(error, false);
            });

          callback(null, true);
        }
      }
    }
  }

  registerSpeakerPlayingButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("play_fm", [value ? "on" : "off"])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'play_fm' error: ", error));
    });
  }

  registerNextButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("play_fm", ["next"])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'play_fm' error: ", error));
    });
  }

  registerPrevButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("play_fm", ["prev"])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'play_fm' error: ", error));
    });
  }

  registerVolumeLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      let volume = parseInt(value * 100);
      this.device
        .call("volume_ctrl_fm", [volume.toString()])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'volume_ctrl_fm' error: ", error));
    });
  }

  registerPlayRadioAction(name, action) {
    action.radio.registerRunListener(async (args, state) => {
      const settings = this.getSettings();
      let volume = parseInt(args.volume * 100);
      var that = this;

      let favoriteListsID = settings[`favorite${args.favoriteID}ID`];
      let favoriteListsIDArray = favoriteListsID.split(",");

      if (favoriteListsIDArray[0] !== undefined && favoriteListsIDArray[0] !== null && favoriteListsIDArray[1] !== undefined && favoriteListsIDArray[1] !== null) {
        let ids = favoriteListsIDArray[0];
        ids = ids.replace(/\s/g, "");
        let id = parseInt(ids);
        let urls = favoriteListsIDArray[1];
        urls = urls.replace(/\s/g, "");
        let url = urls.toString();

        that.device
          .call("play_specify_fm", { id: id, type: 0, url: url })
          .then(() => {
            that.log("Play radio: ", args.favoriteID);
          })
          .catch((error) => {
            that.log("Play radio 'play_specify_fm' error: ", error);
          });

        that.device
          .call("volume_ctrl_fm", [volume.toString()])
          .then(() => {
            that.log("Set volume: ", volume);
          })
          .catch((error) => {
            that.log("Set volume 'volume_ctrl_fm' error: ", error);
          });
      }
    });
  }

  customRadioListSend(name, action) {
    action.customRadioListSend.registerRunListener(async (args, state) => {
      let volume = parseInt(args.volume * 100);
      var that = this;

      that.device
        .call("play_specify_fm", { id: parseInt(args.id), type: 0, url: args.url })
        .then(() => {
          that.log("Play radio: ", args.id);
          that.log("from url: ", args.url);
        })
        .catch((error) => {
          that.log("Play radio 'play_specify_fm' error: ", error);
        });

      that.device
        .call("volume_ctrl_fm", [volume.toString()])
        .then(() => {
          that.log("Set volume: ", volume);
        })
        .catch((error) => {
          that.log("Set volume 'volume_ctrl_fm' error: ", error);
        });
    });
  }

  registerPlayToggleRadioAction(name, action) {
    action.toggle.registerRunListener(async (args, state) => {
      this.device
        .call("play_fm", ["toggle"])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'play_fm' error: ", error));
    });
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

module.exports = GatewayRadio;
