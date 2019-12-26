"use strict";
const Homey = require("homey");

module.exports = [
  {
    method: "POST",
    path: "/generate",
    fn: async (args, callback) => {
      await Homey.app
        .generate(args)
        .then(res => {
          callback(null, res);
        })
        .catch(error => {
          callback(error, null);
        });
    }
  },
  {
    method: "POST",
    path: "/testConnection",
    fn: async (args, callback) => {
      await Homey.app
        .testConnection(args)
        .then(res => {
          callback(null, res);
        })
        .catch(error => {
          callback(error, null);
        });
    }
  }
];
