"use strict";

require("dotenv").config();

module.exports = {
  async index(req, res) {
    console.log(process.env.TESTE);

    return res.send("Teste: " + process.env.TESTE);
  },
};
