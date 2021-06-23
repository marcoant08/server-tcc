"use strict";

require("dotenv").config();
const msRest = require("@azure/ms-rest-js");
const Face = require("@azure/cognitiveservices-face");
const uuid = require("uuid/v4");
const axios = require("axios");

const util = require("util");

const key = process.env.AZURE_KEY_1;
const key2 = process.env.AZURE_KEY_2;
const endpoint = process.env.AZURE_ENDPOINT;
const credentials = new msRest.ApiKeyCredentials({
  inHeader: { "Ocp-Apim-Subscription-Key": key },
});
const client = new Face.FaceClient(credentials, endpoint);

// const image_base_url = "https://csdx.blob.core.windows.net/resources/Face/Images/";
// const person_group_id = uuid();
// const person_group_id = "27c8084d-c33a-4d32-9929-585eb94bf0e4";

// console.log("person_group_id: " + person_group_id);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DetectFaceRecognize = async (url) => {
  let detected_faces = await client.face.detectWithUrl(url, {
    detectionModel: "detection_03",
    recognitionModel: "recognition_04",
  });

  console.log(`${detected_faces.length} FACES DETECTADAS:\n`, detected_faces);

  return detected_faces;
};

const AddFacesToPersonGroup = async (
  person_dictionary,
  person_group_id,
  person_id
) => {
  console.log("Adding faces to person group...");
  // The similar faces will be grouped into a single person group person.

  let response;
  await Promise.all(
    Object.keys(person_dictionary).map(async (key) => {
      const value = person_dictionary[key];

      // Wait briefly so we do not exceed rate limits.
      await sleep(1000);

      let person = !person_id
        ? await client.personGroupPerson.create(person_group_id, { name: key })
        : await client.personGroupPerson.get(person_group_id, person_id);

      console.log("PERSON:\n", person);

      let newPersistedFaceIds = [];
      // Add faces to the person group person.
      await Promise.all(
        value.map(async function (similar_image) {
          console.log(
            `Add face to the person group person: (${key}) from image: ${similar_image}.`
          );

          const resul = await client.personGroupPerson.addFaceFromUrl(
            person_group_id,
            person.personId,
            similar_image
          );

          console.log("RESUL:\n", resul);
          newPersistedFaceIds.push(resul.persistedFaceId);
        })
      );

      response = {
        personGroupId: person_group_id,
        person: {
          name: person.name ? person.name : user.username,
          personId: person.personId,
          persistedFaceId: person.persistedFaceIds
            ? [...person.persistedFaceIds, ...newPersistedFaceIds]
            : [...newPersistedFaceIds],
        },
      };
    })
  );

  /* Start to train the person group. */
  console.log();
  console.log("Training person group: " + person_group_id + ".");
  await client.personGroup.train(person_group_id);

  await WaitForPersonGroupTraining(person_group_id);
  console.log();

  console.log("Done adding faces to person group.");

  console.log("response:\n", response);
  return response;
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

const IdentifyInPersonGroup = async (person_group_id, url) => {
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

const VerifyInPersonGroup = async (url, personGroupId, personId) => {
  console.log("========IDENTIFY FACES========\n");
  console.log("USER", user);
  // A group photo that includes some of the persons you seek to identify from your dictionary.
  //   let source_image_file_name = "identification1.jpg";
  // let source_image_file_name = url;

  // Detect faces from source image url.
  const detected_faces = await DetectFaceRecognize(url);
  const face_ids = detected_faces.map((face) => face.faceId);

  if (face_ids.length !== 1) {
    return {
      status: 400,
      data: {
        message:
          face_ids.length < 1
            ? "no face detected"
            : `${face_ids.length} faces detected, only one is allowed`,
      },
    };
  }

  const results = await axios({
    method: "post",
    url: "https://sulbr.cognitiveservices.azure.com/face/v1.0/verify",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_KEY_1,
    },
    data: {
      faceId: face_ids[0],
      personId,
      personGroupId,
    },
  });

  return results;
};

// user
// let user = {
//   name: "M Antonio",
//   username: "marcoant",
//   personGroupId: "27c8084d-c33a-4d32-9929-585eb94bf0e4",
//   personId: "f6f6ec7e-988f-4d56-8361-1d1fcdbd924a",
// };

let user = {
  name: "Neymar Jr",
  username: "neymarjr",
  personGroupId: "27c8084d-c33a-4d32-9929-585eb94bf0e4",
  personId: "d2731b75-309e-43ac-9510-c05ebc457b7e",
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

      const foto_4 =
        "https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Daughter1.jpg"; // Daughter

      const foto_5 =
        "https://csdx.blob.core.windows.net/resources/Face/Images/Family2-Man2.jpg"; // Japonês

      const foto_6 =
        "https://ofuxico.com.br/img/upload/noticias/2021/05/20/neymar-jr-em-foto-no-psg_403782_36.jpg"; // Neymar

      const foto_7 = "https://pbs.twimg.com/media/E4RGxQYXMAIY4ax.jpg"; // Ney e Pombo

      //   await FindSimilar(foto_2);
      // await IdentifyInPersonGroup(user.personGroupId, foto_7);
      // url, personGroupId, personId
      const response = await VerifyInPersonGroup(
        foto_5,
        user.personGroupId,
        user.personId
      );

      console.log("=== END ===");

      return res.status(response.status).json(response.data);
    } catch (e) {
      console.log(e);

      console.log("=== END ===");

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
      let person_dictionary = {
        // "Family1-Dad": [
        //   "https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Dad1.jpg",
        //   "https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Dad2.jpg",
        // ],
        // "Family1-Mom": ["https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Mom1.jpg", "https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Mom2.jpg"],
        // "Family1-Son": ["https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Son1.jpg", "https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Son2.jpg"],
        // "Family1-Daughter": ["https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Daughter1.jpg", "https://csdx.blob.core.windows.net/resources/Face/Images/Family1-Daughter2.jpg"],
        // "Family2-Lady": ["https://csdx.blob.core.windows.net/resources/Face/Images/Family2-Lady1.jpg", "https://csdx.blob.core.windows.net/resources/Face/Images/Family2-Lady2.jpg"],
        // "Family2-Man": [
        //   "https://csdx.blob.core.windows.net/resources/Face/Images/Family2-Man1.jpg",
        //   "https://csdx.blob.core.windows.net/resources/Face/Images/Family2-Man2.jpg",
        // ],
        // "cleiton-rasta": [
        //   "https://pbs.twimg.com/profile_images/562980018712616960/gF1X2twf_400x400.jpeg",
        //   "https://imagens.ne10.uol.com.br/veiculos/_midias/jpg/2020/07/10/806x444/1_dj_cleiton_rasta_perfil_body_image_1474918939-16274795.jpg",
        // ],
      };

      person_dictionary[user.username] = [
        // "https://portalpopline.com.br/wp-content/uploads/2020/03/neymar-jr.jpg",
        // "https://sportbuzz.uol.com.br/media/_versions/nike_rompe_com_neymar_por_acusacao_de_assedio_sexual_widelg.jpg",
        "https://images.ctfassets.net/3mv54pzvptwz/EKwS7Z43Z2Wb8sQETzu9b/1add9cd7130501597895606ea6911160/neymar_jr_psg_x_lille_260120__15_.jpg",
      ];

      // let person_id = "f6f6ec7e-988f-4d56-8361-1d1fcdbd924a"; // Japa
      // let person_id = "9454024d-2499-4953-85ae-cb870d7708a6"; // Japa

      const response = await AddFacesToPersonGroup(
        person_dictionary,
        user.personGroupId,
        user.personId
      );

      console.log("=== END ===");

      return res.status(200).json(response);
    } catch (e) {
      console.log(e);

      console.log("=== END ===");

      return res.status(500).json({
        message: e.message,
        response: e.response ? e.body : null,
      });
    }
  },
};
