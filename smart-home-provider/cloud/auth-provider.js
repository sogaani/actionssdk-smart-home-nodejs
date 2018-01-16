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

/**
 * This auth is going to use the Authorization Code flow, described in the docs:
 * https://developers.google.com/actions/develop/identity/oauth2-code-flow
 */

const Auth = {};
const express = require('express');
const config = require('./config-provider.js');
const util = require('util');
const session = require('express-session');
const fetch = require('node-fetch');

Auth.getAccessToken = function (request) {
  return request.headers.authorization ? request.headers.authorization.split(' ')[1] : null;
};

Auth.getProfile = function (token) {
  console.info(token);
  const options = {
    method: 'GET'
  };
  return fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`, options).then(res => res.json())
}

Auth.getUid = function (token) {
  return new Promise(function (resolve, reject) {
    Auth.getProfile(token).
      then(info => { console.info(info); resolve(info.id); });
  });
}

Auth.getUsername = function (token) {
  return new Promise(function (resolve, reject) {
    Auth.getProfile(token).
      then(info => { console.info(info); resolve(info.name); });
  });
}

Auth.registerAuth = function (app) {
  /**
   * expecting something like the following:
   *
   * GET https://myservice.example.com/auth? \
   *   client_id=GOOGLE_CLIENT_ID - The Google client ID you registered with Google.
   *   &redirect_uri=REDIRECT_URI - The URL to which to send the response to this request
   *   &state=STATE_STRING - A bookkeeping value that is passed back to Google unchanged in the result
   *   &response_type=code - The string code
   */

  // get token.
  app.use('/login', async function (req, res) {
    console.log('/login ', req.body);
    const code = req.query.code;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `code=${code}&client_id=${config.smartHomeProviderGoogleClientId}&` +
      `client_secret=${config.smartHomeProvideGoogleClientSecret}&` +
      `redirect_uri=${decodeURIComponent(config.smartHomeProviderCloudEndpoint + '/login')}&` +
      `grant_type=authorization_code`
    };
    console.info("POST GET TOKEN", 'https://accounts.google.com/o/oauth2/token');
    console.info(`POST payload: ${JSON.stringify(options)}`);
    const _res = await fetch('https://accounts.google.com/o/oauth2/token', options);
    if (_res.status == 200) {
      const json = await _res.json();
      const token = json.access_token;
      const username = await Auth.getUsername(token);
      const user = {
        name: username,
        tokens: [token]
      };
      req.session.user = user;
    } else {
      const text = await _res.text();
      console.info(text);
    }
    return res.redirect('/frontend');
  });
};

function genRandomString() {
  return Math.floor(Math.random() * 10000000000000000000000000000000000000000).toString(36);
}

exports.registerAuth = Auth.registerAuth;
exports.genRandomString = genRandomString;
exports.getAccessToken = Auth.getAccessToken;
exports.getUid = Auth.getUid;
