"use strict";
const Homey = require("homey");

module.exports = [
  {
    method: "POST",
    path: "/generate",
    fn: function(args, callback) {
      Homey.app
        .generate(args)
        .then(res => {
          callback(null, res);
        })
        .catch(error => {
          callback(error, null);
        });
    }
  }
];
