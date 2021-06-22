const express = require("express");
const Controller = require("./controllers/Controller");

const routes = express.Router();

routes.get("/", Controller.index);
routes.get("/add-faces", Controller.addFaces);

module.exports = routes;
