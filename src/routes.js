const express = require("express");
const Controller = require("./controllers/Controller");

const routes = express.Router();

routes.get("/", Controller.index);

module.exports = routes;
