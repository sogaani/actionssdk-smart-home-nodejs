// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var Config = {};

Config.devPortSmartHome = "3000";
Config.smartHomeProviderGoogleClientId = "23fkawer"; // client id that Google will use
Config.smartHomeProvideGoogleClientSecret = "'tibq39tmdafa'"; // client secret that Google will use
Config.smartHomeProviderApiKey = "<API_KEY>"; // client API Key generated on the console
Config.smartHomeUserId = "<UserId>"; // google user id. Go to https://plus.google.com/me. The me part of the URL will be replaced by your Google user ID
Config.isLocal = false;

// firestore setting
Config.firebaseApiKey = "<API_KEY>"; // client id that Google will use
Config.firebaseAuthDomain = "<AUTH_DOMAIN>"; // client secret that Google will use
Config.cloudFirestoreProjectId = "<PROJECT_ID>"; // client API Key generated on the console
Config.firebaseAdmin = {}

const option = require("../config.json");

Config = Object.assign(Config, option);

function init() {
  process.argv.forEach(function (value, i, arr) {
    if (value.includes("smart-home="))
      Config.smartHomeProviderCloudEndpoint = value.split("=")[1];
    else if (value.includes("isLocal"))
      Config.isLocal = true;
  });
  if (!Config.smartHomeProviderCloudEndpoint)
    Config.smartHomeProviderCloudEndpoint = "http://localhost:3000";
  console.log("config: ", Config);
}
init();

exports.devPortSmartHome = Config.devPortSmartHome;
exports.smartHomeProviderCloudEndpoint = Config.smartHomeProviderCloudEndpoint;
exports.smartHomeProviderApiKey = Config.smartHomeProviderApiKey;
exports.smartHomeProviderGoogleClientId = Config.smartHomeProviderGoogleClientId;
exports.smartHomeProvideGoogleClientSecret = Config.smartHomeProvideGoogleClientSecret;
exports.smartHomeUserId = Config.smartHomeUserId;
exports.isLocal = Config.isLocal;

exports.firebaseApiKey = Config.firebaseApiKey;
exports.firebaseAuthDomain = Config.firebaseAuthDomain;
exports.cloudFirestoreProjectId = Config.cloudFirestoreProjectId;
exports.firebaseAdmin = Config.firebaseAdmin;