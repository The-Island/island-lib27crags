// Functionality for indexing content for search.

var _ = require('underscore');
_.mixin(require('underscore.string'));
var util = require('util');
var Step = require('step');
var cheerio = require('cheerio');
var request = require('request');
var vm  = require('vm');
var moment = require('moment');
var json2csv = require('json2csv');
var csvParse = require('csv-parse');
var fs =  require('fs');

// A csv file with column 'name' and column 'islandCrag'
var resource = __dirname + '/../resources/27crags_to_island_map.csv';

cragMap = {};

fs.readFile(resource, function(err, csv) {
  csvParse(csv, function(err, data) {
    var nameCol = data[0].indexOf('name');
    var islandCragCol = data[0].indexOf('islandCrag');
    console.log(nameCol, islandCragCol);
    console.log(data[0]);
    _.each(data, function(d, idx) {
      if (idx === 0) return;
      cragMap[d[nameCol]] = d[islandCragCol] || null;
    });
  });
});



var headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) '
                + 'AppleWebKit/537.17 (KHTML, like Gecko) '
                + 'Chrome/24.0.1312.57 Safari/537.17',
};

function format(str) {
  str = str.replace(/\\/g, '').trim();
  if (str.length > 3) str = str.toLowerCase();
  return _.map(str.split(' '), function (w) {
    return _.capitalize(w);
  }).join(' ');
}

function createUrls(userId) {
  var mainUrl = 'http://27crags.com/climbers/' + userId;
  return {
    mainUrl: mainUrl,
    ascentUrl: mainUrl + '/ascents',
    moreUrl: mainUrl + '/ascents/all/descending/by/date/more'
  };
}

// mapping of 27crag names to standard names
var styleMap = {
  'Red point': 'Redpoint',
  'Flash': 'Flash',
  'On-sight': 'Onsight',
  'Top rope': 'Redpoint',
};

var routeMap = [
  { french: '3'   , yds: '5.6'   , brit: '4b' , aus: '13'} ,
  { french: '4'   , yds: '5.7'   , brit: '4c' , aus: '14'} ,
  { french: '5a'  , yds: '5.8'   , brit: '4c' , aus: '15'} ,
  { french: '5b'  , yds: '5.9'   , brit: '5a' , aus: '17'} ,
  { french: '5c'  , yds: '5.10a' , brit: '5a' , aus: '18'} ,
  { french: '6a'  , yds: '5.10b' , brit: '5b' , aus: '19'} ,
  { french: '6a+' , yds: '5.10c' , brit: '5b' , aus: '20'} ,
  { french: '6b'  , yds: '5.10d' , brit: '5c' , aus: '20'} ,
  { french: '6b+' , yds: '5.11a' , brit: '5c' , aus: '21'} ,
  { french: '6c'  , yds: '5.11b' , brit: '5c' , aus: '22'} ,
  { french: '6c+' , yds: '5.11c' , brit: '6a' , aus: '23'} ,
  { french: '7a'  , yds: '5.11d' , brit: '6a' , aus: '24'} ,
  { french: '7a+' , yds: '5.12a' , brit: '6a' , aus: '25'} ,
  { french: '7b'  , yds: '5.12b' , brit: '6a' , aus: '26'} ,
  { french: '7b+' , yds: '5.12c' , brit: '6b' , aus: '27'} ,
  { french: '7c'  , yds: '5.12d' , brit: '6b' , aus: '28'} ,
  { french: '7c+' , yds: '5.13a' , brit: '6b' , aus: '29'} ,
  { french: '8a'  , yds: '5.13b' , brit: '6c' , aus: '29'} ,
  { french: '8a+' , yds: '5.13c' , brit: '6c' , aus: '30'} ,
  { french: '8b'  , yds: '5.13d' , brit: '6c' , aus: '31'} ,
  { french: '8b+' , yds: '5.14a' , brit: '7a' , aus: '32'} ,
  { french: '8c'  , yds: '5.14b' , brit: '7a' , aus: '33'} ,
  { french: '8c+' , yds: '5.14c' , brit: '7b' , aus: '34'} ,
  { french: '9a'  , yds: '5.14d' , brit: '7b' , aus: '35'} ,
  { french: '9a+' , yds: '5.15a' , brit: '7b' , aus: '36'} ,
  { french: '9b'  , yds: '5.15b' , brit: '7b' , aus: '37'} ,
  { french: '9b+' , yds: '5.15c' , brit: '7b' , aus: '38'} ,
  { french: '9c'  , yds: '5.15d' , brit: '7b' , aus: '39'} ,
  { french: '9c+' , yds: '5.16a' , brit: '7b' , aus: '40'}
];

var boulderMap = [
  { font: '3'   , hueco: 'VB' }  ,
  { font: '4'   , hueco: 'V0' }  ,
  { font: '5a'  , hueco: 'V1' }  ,
  { font: '5b'  , hueco: 'V2' }  ,
  { font: '5c'  , hueco: 'V2' }  ,
  { font: '6a'  , hueco: 'V3' }  ,
  { font: '6a+' , hueco: 'V3' }  ,
  { font: '6b'  , hueco: 'V3' }  ,
  { font: '6b+' , hueco: 'V4' }  ,
  { font: '6c'  , hueco: 'V5' }  ,
  { font: '6c+' , hueco: 'V5' }  ,
  { font: '7a'  , hueco: 'V6' }  ,
  { font: '7a+' , hueco: 'V7' }  ,
  { font: '7b'  , hueco: 'V8' }  ,
  { font: '7b+' , hueco: 'V8' }  ,
  { font: '7c'  , hueco: 'V9' }  ,
  { font: '7c+' , hueco: 'V10' } ,
  { font: '8a'  , hueco: 'V11' } ,
  { font: '8a+' , hueco: 'V12' } ,
  { font: '8b'  , hueco: 'V13' } ,
  { font: '8b+' , hueco: 'V14' } ,
  { font: '8c'  , hueco: 'V15' } ,
  { font: '8c+' , hueco: 'V16' } ,
  { font: '9a'  , hueco: 'V16' } ,
  { font: '9a+' , hueco: 'V16' } ,
  { font: '9b'  , hueco: 'V16' } ,
  { font: '9b+' , hueco: 'V16' } ,
  { font: '9c'  , hueco: 'V16' } ,
  { font: '9c+' , hueco: 'V16' }
];

var createTickObj = function($, els) {
  var obj = {
    date: moment($(els.get(0)), 'YYYY-MM-DD'),
    sent: true,
    style: styleMap[$(els.get(8)).text()],
    ascent: _.trim(format($(els.get(1)).find('a').text())),
    recommended: false,
    crag: _.trim(format($(els.get(2)).find('a').text())),
    cragCountry: null,
    cragCity: null,
    ascentSector: null,
    first: $(els.get(7)).text().indexOf('FA') !== -1,
    feel: null,
    secondGo: null,
    note: $(els.get(9)).text(),
    rating: $(els.get(6)).find('.full').length,
    type: $(els.get(3)).text().indexOf('Boulder') !== -1 ? 'b' : 'r',
    // Remove + and - from the V grades
    grade: $(els.get(4)).text().replace(/[+-]/g, '')
  }

  // Try to map to Island's crag names
  var islandCrag = cragMap[obj.crag];
  if (islandCrag) obj.crag = islandCrag;

  if (obj.grade === '?')
    return obj;

  // change grades to french system
  if (obj.type === 'b') {
    obj.grade = (_.find(boulderMap, function(item) {
      return item.hueco === obj.grade;
    })).font;
  }
  else if (obj.type === 'r') {
    obj.grade = (_.find(routeMap, function(item) {
      return item.yds === obj.grade;
    })).french;
  }

  return obj;

}

// Searches for a username, and if exists, returns the username with geo
exports.searchUser= function(name, cb) {

  var searchResults = [];

  // Get Htmls
  request.get({
    uri: 'http://www.27crags.com/site/search',
    headers: headers,
    encoding: 'utf8',
    qs: { 'qs': name }
  }, function(err, resp) {
    if (err) return cb(err);
    if (resp.statusCode !== 200) return cb();

    var $ = cheerio.load(resp.body);

    try {
      // 27crags will redirect to the climber's page if there is only
      // one search result. We check this by looking at the Title page
      if ($('title').text() !== 'Search') {
        console.log(resp.body);
        searchResults.push({
          name: $('title').text(),
          userId: $('a.p2').attr('href').split('/')[2]
        });
      }
      // Multiple search results
      else {
        $('.m5').each(function(idx, el) {
          var $el = $(el);
          if ($el.text().indexOf("Climber") !== -1) {
            var $a = $el.find('a');
            searchResults.push({
              name: $a.text(),
              userId: $a.attr('href').split('/climbers/')[1]
            });
          }
        });
      }
      return cb(null, searchResults);
    } catch (err) {
      return cb('Failed search, try again!');
    }
  });
}


// Get ticks for an 8a userId
exports.getTicks = function(userId, cb) {
  Step(
    function getHtmls() {

      var urls = createUrls(userId);

      // Get Htmls
      request.get({
        uri: urls.ascentUrl,
        headers: headers,
        encoding: 'utf8'
      }, this.parallel());

      // 27crags hides additional data behind an AJAX request to this
      // URL
      request.get({
        uri: urls.moreUrl,
        headers: _.extend(headers, {'X-Requested-With': 'XMLHttpRequest'}),
        encoding: 'utf8'
      }, this.parallel());

    },
    function parseHtmls(err, mainHtml, moreHtml) {
      if (err) return cb(err);
      var ticks = [];

      var $ = cheerio.load(mainHtml.body);
      $('table').last().find('tr:not(:has(th), #more_ascents)').each(function(index, rowEl) {
        var cols = $(rowEl).children();
        ticks.push(createTickObj($, cols));
      });

      var $ = cheerio.load(moreHtml.body);
      $('tr').each(function(index, rowEl) {
        var cols = $(rowEl).children();
        ticks.push(createTickObj($, cols));
      });

      return cb(null, ticks);
    }
  );
};

exports.scrapeCrags = function(start, end, cb) {

  var getCragPage = function(number, cb) {
    Step(
      function getHtmls() {
        // Get Htmls
        request.get({
          uri: 'http://www.27crags.com/crags/all/descending/by/favourite_count/page/' + number,
          headers: headers,
          encoding: 'utf8'
        }, this);
      },
      function requestEachCrag(err, resp, body) {
        if (err) return this(err);

        var group = this.group();

        var $ = cheerio.load(body);

        // I had to serialize all the crag requests to not overwhelm 27crags, 
        // so this is quick and dirty way to do that
        var rows = $('table').find('tr:not(:has(th))');
        var len = rows.length;
        var cbs = rows.map(function() {
          return group();
        });

        var idx = 0;
        var requestNextCrag = function(idx) {
          var $a = $(rows[idx]).find('td:nth-child(2)>a');
          request.get({
            uri: 'http://www.27crags.com/' + $a.attr('href'),
            headers: headers,
            encoding: 'utf8',
          }, function(err, res) {
            console.log(idx);
            cbs[idx](err, res);
            idx++;
            if (idx < len) requestNextCrag(idx);
          });
        }

        requestNextCrag(idx);

/*
        Note: doing 20 simultaneous requests to 27crags brings it to its knees
        $('table').find('tr:not(:has(th))').each(function(index, row) {
          var $a = $(row).find('td:nth-child(2)>a');

          request.get({
            uri: 'http://www.27crags.com/' + $a.attr('href'),
            headers: headers,
            encoding: 'utf8',
          }, group());
        });
*/

      },
      function parseCrags(err, resps) {
        if (err) return cb(err);

        var crags = _.map(resps, function(resp) {
          var body = resp.body;
          //  I would never parse HTML with a regex...
          var h1_rx = new RegExp(/<h1>(.*?)<\/h1>/);
          var name = h1_rx.exec(body)[1];
          var h2_rx = new RegExp(/<h2><a href.*?in the area of (.*?), (.*?)<\/a><\/h2>/);
          var h2_rx_exec = h2_rx.exec(body);
          var latlon_rx = new RegExp(/maps.google.com.maps.api.staticmap.center=([-0-9.]*?),([-0-9.]*)/);
          var latlon = latlon_rx.exec(body);

          return {
            name: name,
            altName: h2_rx_exec ? h2_rx_exec[1] : null,
            country: h2_rx_exec ? h2_rx_exec[2] : null,
            lat: latlon ? latlon[1] : null,
            lon: latlon ? latlon[2] : null
          };
        });
        return cb(null, crags);
      }
    )
  }

  var crags = [];
  var page = start || 1;
  var lastPage = end || 346;
  var fields = ['name', 'altName', 'country', 'lat', 'lon'];

  var nextPage = function(err, res) {
    if (err) return cb(err);
    crags = crags.concat(res);
    if (page === lastPage) {
      json2csv({ data: crags, fields: fields }, function(err, res) {
        return cb(null, {asCsv: res, asJSON: JSON.stringify(crags)});
      });
    }
    else {
      page++;
      console.log('On page ' + page);
      getCragPage(page, nextPage);
    }
  };

  console.log('On page ' + page);
  getCragPage(page, nextPage);

}
