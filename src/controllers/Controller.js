// require("dotenv").config();
// // const faceapi = require("../lib/face-api/face-api.min.js");
// // global.fetch = require('node-fetch');

// // Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri("../lib/face-api/models")]);

// module.exports = {
//   async index(req, res) {
//     console.log(process.env.TESTE);

//     return res.send();
//   },
// };
'use strict';

const request = require('request');

require('dotenv').config();

const subscriptionKey = process.env.SUBSCRIPTION_FACE_API_KEY;
const uriBase = process.env.URI_BASE;
const imageUrl = 'https://cdn-ofuxico.akamaized.net/img/upload/noticias/2019/05/13/silvio_santos_reproducao_instagram_349201_36.jpg';
