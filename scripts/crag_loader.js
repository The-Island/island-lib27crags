#!/usr/bin/env node

var lib27crags = require('../lib/27crags');
var fs = require('fs');
var request = require('request');
var _ = require('underscore');
var _s = require('underscore.string');
var Step = require('Step');

var file = process.argv[2];
if (!file) {
  console.log('Needs a file argument');
  process.exit();
}

var cragObj = JSON.parse(fs.readFileSync(file));
cragObj = _.filter(cragObj, function(obj) {
  return obj.lat && obj.lon;
});
cragObj = _.map(cragObj, function(obj) {
  // format out dashes, commas, paranthesis and only take first 2 words
  var format = function(str) {
    return str.split('-')[0].split(',')[0].split('(')[0].trim()
        .split(' ').slice(0, 2).join(' ');
  }
  obj.name = format(obj.name);
  if (obj.altName) {
    obj.altName = format(obj.altName);
  }
  return obj;
});

var doNext = function(idx) {
  Step (
    function findCrag() {
      request.post({
        uri: 'http://localhost:8080/api/crags/search/' + cragObj[idx].name,
      }, this);
    },

    function findCragByAlt(err, resp, body) {
      if (err) return this(err);
      var body = JSON.parse(body);
      if (body.items.length === 0) {
        request.post({
          uri: 'http://localhost:8080/api/crags/search/' + cragObj[idx].altName,
        }, this);
      } else {
        return this(null, resp, body);
      }
    },
    function insertCragIfNecessary(err, resp, body) {
      if (err) return this(err);
      var body = typeof body === 'string' ? JSON.parse(body) : body;
      if (body.items.length === 0) {
        console.log('Adding ' + cragObj[idx].name);
        var cragPost = {
          name: cragObj[idx].name,
          location: {
            latitude: cragObj[idx].lat,
            longitude: cragObj[idx].lon
          }
        }
        request.post({
          uri: 'http://localhost:8080/api/crags',
          body: cragPost,
          json: true
        }, this);
      } else {
        console.log('Found ' + cragObj[idx].name);
        return this;
      }
    },
    function finishUp(err, resp) {
      if (err) {
        console.log(err);
      }
      if (resp && resp.body)
        console.log(resp.body);
      idx++;
      if (idx < cragObj.length) {
        doNext(idx);
      }
    }
  )
}

var idx = 0;
doNext(idx);
