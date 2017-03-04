#!/usr/bin/env node

var lib27crags = require('../lib/27crags');
var fs = require('fs');
var request = require('request');
var _ = require('underscore');
var _s = require('underscore.string');
var Step = require('Step');
var json2csv = require('json2csv');

var file = process.argv[2];
if (!file) {
  console.log('Needs a file argument');
  process.exit();
}

var cragObj = JSON.parse(fs.readFileSync(file));

/*
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
*/

var format = function(str) {
  return str.split('-')[0].split(',')[0].split('(')[0].trim()
      .split(' ').slice(0, 2).join(' ');
}

var doNext = function(idx) {
  Step (
    function findCrag() {
      request.post({
        uri: 'http://localhost:8080/api/crags/search/'
            + format(cragObj[idx].name),
      }, this);
    },

    function findCragByAlt(err, resp, body) {
      if (err) return this(err);
      var body = JSON.parse(body);
      if (body.items.length === 0 && cragObj[idx].altName) {
        request.post({
          uri: 'http://localhost:8080/api/crags/search/'
              + format(cragObj[idx].altName),
        }, this);
      } else {
        return this(null, resp, body);
      }
    },

    function done(err, resp, body) {
      if (err) {
        console.log(err);
      } else {
        var body = typeof body === 'string' ? JSON.parse(body) : body;
        if (body.items.length === 0) {
          cragObj[idx].action = 'add';
          cragObj[idx].islandCrag = cragObj.name;
          cragObj[idx].islandCragId = '';
        } else {
          cragObj[idx].action = 'map';
          cragObj[idx].islandCrag = body.items[0].name;
          cragObj[idx].islandCragId = body.items[0].id;
        }
        console.log(cragObj[idx]);
      }

      idx++;
      if (idx < cragObj.length) {
        doNext(idx);
      } else {
        json2csv({ data: cragObj, fields: _.keys(cragObj[0]) },
            function(err, res) {
          if (err) { console.log(err); return; }
          fs.writeFile(file.split('.')[0] + '_mod.csv', res);
          fs.writeFile(file.split('.')[0] + '_mod.json', cragObj);
        });
      }
    }
  )
}

var idx = 0;
doNext(idx);
