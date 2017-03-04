var lib27crags = require('../lib/27crags');
var assert = require('assert');

describe('island-27crags', function() {
  this.timeout(10000);
  var userId;
  describe('#searchUser()', function() {
    it('should find the user', function(done) {
      lib27crags.searchUser('Paul Robinson', function(err, res) {
        if (err) done(err);
        assert.ok(res.length > 0)
        assert.equal(res[0].name, 'Paul Robinson')
        userId = res[0].userId
        done()
      });
    });
  });

  describe('#getTicks()', function() {
    it('should get the user\'s ticks', function(done) {
      lib27crags.getTicks(userId, function(err, res) {
        if (err) done(err);
        assert.ok(res.length > 0)
        done()
      });
    });
  });
});
