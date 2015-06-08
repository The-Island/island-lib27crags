// Functionality for indexing content for search.

var _ = require('underscore');
_.mixin(require('underscore.string'));
var util = require('util');
var Step = require('step');
var cheerio = require('cheerio');
var request = require('request');
var vm  = require('vm');
var moment = require('moment');

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
  var mainUrl = 'https://27crags.com/climbers/' + userId;
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

var createTickObj = function($, els) {
  return {
    date: moment($(els.get(0)), 'YYYY-MM-DD'),
    sent: true,
    style: styleMap[$(els.get(8)).text()],
    ascent: _.trim(format($(els.get(2)).find('a').text())),
    recommended: false,
    crag: _.trim(format($(els.get(1)).find('a').text())),
    cragCountry: null,
    cragCity: null,
    ascentSector: null,
    first: $(els.get(7)).text().indexOf('FA') !== -1,
    feel: null,
    secondGo: null,
    note: $(els.get(9)).text(),
    rating: $(els.get(6)).find('.full').length,  
    type: $(els.get(3)).text().indexOf('Boulder') !== -1 ? 'b' : 'r',
    grade: $(els.get(4)).text()
  }
}

// Searches for a username, and if exists, returns the username with geo
exports.searchUser= function(name, cb) {

  // Get Htmls
  request.get({
    uri: 'https://www.27crags.com/site/search',
    headers: headers,
    encoding: 'binary',
    qs: { 'qs': name }
  }, function(err, resp) {
    if (err) return cb(err);
    if (resp.statusCode !== 200) return cb();
    
    var $ = cheerio.load(resp.body);

    var searchResults = [];

    // 27crags will redirect to the climber's page if there is only
    // one search result. We check this by looking at the Title page
    if ($('title').text() !== 'Search') {
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
        encoding: 'binary',
      }, this.parallel());

      // 27crags hides additional data behind an AJAX request to this
      // URL
      request.get({
        uri: urls.moreUrl,
        headers: _.extend(headers, {'X-Requested-With': 'XMLHttpRequest'}),
        encoding: 'binary',
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
    }
  );
};
