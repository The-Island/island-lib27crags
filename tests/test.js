#!/usr/bin/env node

var lib27crags = require('../lib/27crags');

lib27crags.searchUser('bill', function(err, res) {
  console.log(err, res);
});

lib27crags.getTicks('wmmurray', function(err, res) {
  //console.log(err, res.length);
  console.log(res[0]);
});

