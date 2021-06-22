"use strict";

require("dotenv").config();
const msRest = require("@azure/ms-rest-js");
const Face = require("@azure/cognitiveservices-face");
const uuid = require("uuid/v4");

const util = require("util");

const key = process.env.AZURE_KEY_1;
const key2 = process.env.AZURE_KEY_2;
const endpoint = process.env.AZURE_ENDPOINT;

const credentials = new msRest.ApiKeyCredentials({
  inHeader: { "Ocp-Apim-Subscription-Key": key },
});
const client = new Face.FaceClient(credentials, endpoint);

const image_base_url =
  "https://csdx.blob.core.windows.net/resources/Face/Images/";
// const person_group_id = uuid();
const person_group_id = "27c8084d-c33a-4d32-9929-585eb94bf0e4";

console.log("person_group_id: " + person_group_id);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DetectFaceRecognize = async (url) => {
  let detected_faces = await client.face.detectWithUrl(url, {
    detectionModel: "detection_03",
    recognitionModel: "recognition_04",
  });

  console.log(`${detected_faces.length} FACES DETECTADAS:\n`, detected_faces);

  return detected_faces;
};

const AddFacesToPersonGroup = async (person_dictionary, person_group_id) => {
  console.log("Adding faces to person group...");
  // The similar faces will be grouped into a single person group person.

  await Promise.all(
    Object.keys(person_dictionary).map(async (key) => {
      const value = person_dictionary[key];

      // Wait briefly so we do not exceed rate limits.
      await sleep(1000);

      let person = await client.personGroupPerson.create(person_group_id, {
        name: key,
      });
      console.log(`Create a person group person: ${key}.`);

      // Add faces to the person group person.
      await Promise.all(
        value.map(async function (similar_image) {
          console.log(
            `Add face to the person group person: (${key}) from image: ${similar_image}.`
          );

          await client.personGroupPerson.addFaceFromUrl(
            person_group_id,
            person.personId,
            // image_base_url + similar_image
            similar_image
          );
        })
      );
    })
  );

  /* Start to train the person group. */
  console.log();
  console.log("Training person group: " + person_group_id + ".");
  await client.personGroup.train(person_group_id);

  await WaitForPersonGroupTraining(person_group_id);
  console.log();

  console.log("Done adding faces to person group.");
};

const contador = () => {
  let count = 9;
  setInterval(() => {
    if (count >= 0) console.log(count);
    count--;
  }, 1000);
};

const WaitForPersonGroupTraining = async (person_group_id) => {
  // Wait so we do not exceed rate limits.
  console.log("Waiting 10 seconds...");
  contador();

  await sleep(10000);

  let result = await client.personGroup.getTrainingStatus(person_group_id);
  console.log("Training status: " + result.status + ".");
  if (result.status !== "succeeded") {
    await WaitForPersonGroupTraining(person_group_id);
  }
};

const IdentifyInPersonGroup = async (url) => {
  console.log("========IDENTIFY FACES========\n");
  // A group photo that includes some of the persons you seek to identify from your dictionary.
  //   let source_image_file_name = "identification1.jpg";
  let source_image_file_name = url;

  // Detect faces from source image url.
  const detected_faces = await DetectFaceRecognize(source_image_file_name);
  const face_ids = detected_faces.map((face) => face.faceId);

  // Identify the faces in a person group.
  const results = await client.face.identify(face_ids, {
    personGroupId: person_group_id,
  });

  console.log("RESULTADOS: " + results.length);
  console.log(util.inspect(results, false, null, true));
  //   results.map((item) => console.log(item.candidates));

  if (results.length <= 0) {
    console.log("No results");
  } else {
    await Promise.all(
      results.map(async (result) => {
        if (result.candidates[0]) {
          let person = await client.personGroupPerson.get(
            person_group_id,
            result.candidates[0].personId
          );

          console.log(
            `Person: ${person.name} is identified for face in: ${source_image_file_name} with ID: ${result.faceId}. Confidence: ${result.candidates[0].confidence}.`
          );
        } else {
          console.log("No face identified");
        }
      })
    );
  }
  console.log();
};

module.exports = {
  index: async (req, res) => {
    try {
      console.log("executando...");

      const foto_1 =
        "https://csdx.blob.core.windows.net/resources/Face/Images/findsimilar.jpg"; // Pai

      const foto_2 =
        "https://pbs.twimg.com/profile_images/562980018712616960/gF1X2twf_400x400.jpeg"; // Cleiton Rasta

      const foto_3 =
        "https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Son2.jpg"; // Filho

      //   await FindSimilar(foto_2);
      await IdentifyInPersonGroup(
        "https://2.bp.blogspot.com/-eOTCOJRYzjw/WIOtl2cV7FI/AAAAAAAAei4/iJwdTJBYgt8BA2ckFhQC0fTMyQ7isGQbgCLcB/s1600/Shalon%2BIsrael%2Be%2BDJ%2Bcheiton%2Brasta%2Bjuntos%2Bpela%2Bprimeira%2Bvez.jpg"
      );

      return res.status(200).json({ note: "Teste: " + process.env.TESTE });
    } catch (e) {
      console.log(e);

      return res.status(500).json({
        message: e.message,
        response: e.response ? e.body : null,
      });
    }
  },

  addFaces: async (req, res) => {
    try {
      console.log("executando...");

      // Create a dictionary for all your images, grouping similar ones under the same key.
      const person_dictionary = {
        "Family1-Dad": [
          "https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Dad1.jpg",
          "https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Dad2.jpg",
        ],
        // "Family1-Mom": ["https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Mom1.jpg", "https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Mom2.jpg"],
        // "Family1-Son": ["https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Son1.jpg", "https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Son2.jpg"],
        // "Family1-Daughter": ["https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Daughter1.jpg", "https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Daughter2.jpg"],
        // "Family2-Lady": ["https://csdx.blob.core.windows.net/resources/Face/Images/Family2-Lady1.jpg", "https://csdx.blob.core.windows.net/resources/Face/Images/Family2-Lady2.jpg"],
        // "Family2-Man": ["https://csdx.blob.core.windows.net/resources/Face/Images/Family2-Man1.jpg", "https://csdx.blob.core.windows.net/resources/Face/Images/Family2-Man2.jpg"],
        // "cleiton-rasta": [
        //   "https://pbs.twimg.com/profile_images/562980018712616960/gF1X2twf_400x400.jpeg",
        //   "https://imagens.ne10.uol.com.br/veiculos/_midias/jpg/2020/07/10/806x444/1_dj_cleiton_rasta_perfil_body_image_1474918939-16274795.jpg",
        // ],
      };

      await AddFacesToPersonGroup(person_dictionary, person_group_id);

      return res.status(200).json({ success: true });
    } catch (e) {
      console.log(e);

      return res.status(500).json({
        message: e.message,
        response: e.response ? e.body : null,
      });
    }
  },
};
