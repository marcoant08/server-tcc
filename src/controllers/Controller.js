"use strict";

require("dotenv").config();

module.exports = {
  async index(req, res) {
    console.log(process.env.TESTE);
 
    return res.send(process.env.TESTE);
  },
};
