#!/usr/bin/env node

var lib27crags = require('../lib/27crags');
var fs = require('fs');

var start = process.argv[2] ? Number(process.argv[2]) : null;
var end = process.argv[3] ? Number(process.argv[3]) : null;

console.log('Scraping 27 crags starting on crags page ' + (start || 1) + ' and ending'
            + ' on page ' + (end || 'last'));

lib27crags.scrapeCrags(start, end, function(err, res) {
  if (err) console.log(err);
  fs.writeFile('crags.csv', res, function(err) {
    if (err) console.log(err);
    console.log('Saved crags.csv');
  });
});

