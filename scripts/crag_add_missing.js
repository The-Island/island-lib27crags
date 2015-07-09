#!/usr/bin/env node

var lib27crags = require('../lib/27crags');
var fs = require('fs');
var request = require('request');
var _ = require('underscore');
_.mixin(require('underscore.string'));
var Step = require('Step');
var csvParse = require('csv-parse');
var json2csv = require('json2csv');
var async = require('async');

// Load file
var file = process.argv[2];
if (!file) {
  console.log('Needs a file argument');
  process.exit();
}

startIdx = Number(process.argv[3] || 0)
endIdx = Number(process.argv[4] || 1000000);

var headers;
var counter;

Step(
  // Read file
  function() {
    fs.readFile(file, this);
  },
  // Parse CSV
  function (err, csv) { 
    if (err) return this(err);
    csvParse(csv, this);
  },
  // Get interesting values
  function (err, data) {
    if (err) return this(err);
    var nameCol = data[0].indexOf('name');
    var islandCragId = data[0].indexOf('islandCragId');
    var islandCrag = data[0].indexOf('islandCrag');
    var actionCol = data[0].indexOf('action');
    var latCol = data[0].indexOf('lat');
    var lonCol = data[0].indexOf('lon');
    var lastCol = data[0].length;
    headers = data[0];

    var newData = [];
    counter = 0;

    var format = function(str) {
      return str.split('-')[0].split(',')[0].split('(')[0].trim()
          .split(' ').slice(0, 3).join(' ').trim();
    }

    var queue = async.queue(function(task, cb) {
      if (!(task[actionCol] === 'add' && +task[latCol]
          && +task[lonCol] && task[nameCol])) {
        newData.push(task);
        return cb();
      }

      var name = format(task[nameCol]);
      if (name.length <= 3) {
        newData.push(task);
        return cb()
      }

      var cragPost = {
        name: name,
        location: {
          latitude: task[latCol],
          longitude: task[lonCol]
        }
      }

      console.log('Posting ' + name, queue.length() + ' left');
      counter++;
      request.post({
        rejectUnauthorized: false,
        //uri: 'http://localhost:8080/api/crags',
        uri: 'https://www.island.io/api/crags',
        body: cragPost,
        json: true
      }, function(err, data, body) {
        if (err) {
          console.log(err);
          return cb(err);
        }
        else {
          console.log('...ok', name);
          task[actionCol] = 'added';
          task[islandCrag] = name
          task[islandCragId] = body._id;
          newData.push(task);
          return cb();
        }
      });
    }, 20);

    queue.push(data.slice(startIdx, endIdx), function(err) {
      if (err) console.log('error:', err);
    });

    queue.drain = _.bind(function(err) {
      return this(err, newData);
    }, this);
  },
  function (err, data) {
    if (err) return this(err); 
    var newFile = file.split('.csv')[0] + '_new.csv';
    var csv = _.map(data, function(d) {
      d = _.map(d, function(el) {
        if (el && el.indexOf(',') !== -1)  {
          el = '\"' + el + '\"';
        } 
        return el;
      });
      return d.toString();
    });
    csv = csv.join('\n'); 
    console.log('Added ' + counter + ' crags to Island');
    console.log('Writing to ' + newFile);
    fs.writeFile(newFile, csv, this);
  },
  function (err) {
    console.log(err ? err : 'done');
  }
)


/*
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
*/
