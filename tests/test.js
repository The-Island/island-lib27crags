#!/usr/bin/env node

var lib27crags = require('../lib/27crags');

console.log('Searching for Dan Michels');

lib27crags.searchUser('dan michels', function(err, res) {
  console.log(err, res);
});

console.log('Getting ticks for Dan Michels');

/*
lib27crags.getTicks('danmichels', function(err, res) {
  //console.log(err, res.length);
  console.log(err, res);
});
*/

