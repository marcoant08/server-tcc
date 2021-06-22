"use strict";

require("dotenv").config();
const msRest = require("@azure/ms-rest-js");
const Face = require("@azure/cognitiveservices-face");
const uuid = require("uuid/v4");

const key = "32cdce1eb70a4e09b79e6666bfb3edff";
const key2 = "92eb0ce73ecc45fab28ef8c3017dfbec";
const endpoint = "https://sulbr.cognitiveservices.azure.com/";

const credentials = new msRest.ApiKeyCredentials({
  inHeader: { "Ocp-Apim-Subscription-Key": key },
});
const client = new Face.FaceClient(credentials, endpoint);

const image_base_url =
  "https://csdx.blob.core.windows.net/resources/Face/Images/";
const person_group_id = uuid();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function DetectFaceRecognize(url) {
  // Detect faces from image URL. Since only recognizing, use the recognition model 4.
  // We use detection model 3 because we are not retrieving attributes.
  let detected_faces = await client.face.detectWithUrl(url, {
    detectionModel: "detection_03",
    recognitionModel: "recognition_04",
  });
  return detected_faces;
}

async function FindSimilar() {
  console.log("========FIND SIMILAR========");
  console.log();

  const source_image_file_name = "findsimilar.jpg";
  const target_image_file_names = [
    "Family1-Dad1.jpg",
    "Family1-Daughter1.jpg",
    "Family1-Mom1.jpg",
    "Family1-Son1.jpg",
    "Family2-Lady1.jpg",
    "Family2-Man1.jpg",
    "Family3-Lady1.jpg",
    "Family3-Man1.jpg",
  ];

  let target_face_ids = (
    await Promise.all(
      target_image_file_names.map(async function (target_image_file_name) {
        // Detect faces from target image url.
        var faces = await DetectFaceRecognize(
          image_base_url + target_image_file_name
        );
        console.log(
          faces.length +
            " face(s) detected from image: " +
            target_image_file_name +
            "."
        );
        return faces.map(function (face) {
          return face.faceId;
        });
      })
    )
  ).flat();

  // Detect faces from source image url.
  let detected_faces = await DetectFaceRecognize(
    image_base_url + source_image_file_name
  );

  // Find a similar face(s) in the list of IDs. Comapring only the first in list for testing purposes.
  let results = await client.face.findSimilar(detected_faces[0].faceId, {
    faceIds: target_face_ids,
  });
  results.forEach(function (result) {
    console.log(
      `Faces from: ${source_image_file_name} and ID: ${result.faceId} are similar with confidence: ${result.confidence}.`
    );
  });
  console.log();
}

module.exports = {
  async index(req, res) {
    console.log("executando...");

    await FindSimilar();

    return res.send("Teste: " + process.env.TESTE);
  },
};
