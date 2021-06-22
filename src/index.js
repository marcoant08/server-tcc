const msRest = require("@azure/ms-rest-js");
const Face = require("@azure/cognitiveservices-face");
const uuid = require("uuid/v4");

const key = "32cdce1eb70a4e09b79e6666bfb3edff";
const key2 = "92eb0ce73ecc45fab28ef8c3017dfbec";
const endpoint = "https://sulbr.cognitiveservices.azure.com/";

const credentials = new msRest.ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } });
const client = new Face.FaceClient(credentials, endpoint);
