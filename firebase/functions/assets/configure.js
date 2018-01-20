#! /usr/bin/env node

var executable = process.argv[0];
var firebase = process.argv[2];
var config = process.argv[3];
var fs = require("fs");
var path = require("path");
if (executable && firebase && config) {
    firebase = path.normalize(firebase);
    config = path.normalize(config);
    firebasePath = path.join(process.cwd(), firebase);
    configPath = path.join(process.cwd(), config);
    var firebasePack = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));
    var configPack = require(configPath);

    var url = 'https://' + firebasePack.projects.default + '.firebaseapp.com';
    configPack.smartHomeProviderCloudEndpoint = url;
    fs.writeFileSync(configPath, JSON.stringify(configPack, null, " "));
    console.log("setting " + config + " smartHomeProviderCloudEndpoint:" + url)
} else {
    console.warn("nothing setting")
}