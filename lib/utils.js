var url = require('url');
var _ = require('underscore');
_.mixin(require('underscore.string'));
var crypto = require('crypto');

exports.md5 = function(str, encoding) {
  return crypto.createHash('md5').update(str).digest(encoding || 'hex');
};

exports.getTimestamp = function() {
  return Math.floor(Date.now() / 1000);
};

exports.getDateString = function() {
  var date = new Date();
  var pad = function(i) {
    if (i < 10) {
      return '0' + i;
    }
    return i;
  };
  return [ date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate()) ].join('');
};

exports.getLocaleISOString = function() {
  var date = new Date();
  var pad = function(i) {
    if (i < 10) {
      return '0' + i;
    }
    return i;
  };
  var pad3 = function(i) {
    if (i < 100) {
      return '0' + i;
    } else if (i < 10) {
      return '00' + i;
    }
    return i;
  };
  return [ date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate()) ].join('-') + ' ' + [ pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds()) ].join(':') + '.' + pad3(date.getMilliseconds());
};