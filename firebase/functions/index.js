const functions = require('firebase-functions');
const cloud = require('./app/cloud/smart-home-provider-cloud.js');
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

exports.smarthome = functions.https.onRequest((req, res) => {

    // https://some-firebase-app-id.cloudfunctions.net/route
    // without trailing "/" will have req.path = null, req.url = null
    // which won't match to your app.get('/', ...) route 
    if (!req.path) {
        // prepending "/" keeps query params, path params intact
        req.url = `/${req.url}`
    }

    return cloud.app(req, res);
});

exports.create = functions.firestore.document('{userId}/{deviceId}')
    .onCreate(event => {
        return cloud.app.requestSync(null, event.params.userId);
    });

exports.update = functions.firestore.document('{userId}/{deviceId}')
    .onUpdate(event => {
        return cloud.app.requestSync(null, event.params.userId);
    });