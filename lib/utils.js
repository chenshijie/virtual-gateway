var url = require('url');
var querystring = require('querystring');
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
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('');
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
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-') + ' ' + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join(':') + '.' + pad3(date.getMilliseconds());
};

exports.getGUIDFromXGUID = function(xguid) {
  var guid = xguid || '-';
  if (xguid == undefined) {
    return '-';
  }
  guid = xguid.substr(0, 34);
  if (guid.length < 34) {
    return '-';
  } else {
    var v = guid.split('');
    var xor_value = 0;
    var xor_sum = parseInt(v[32] + v[33], 16);
    for (var i = 0; i < 32; i += 2) {
      xor_value = xor_value ^ parseInt(v[i] + v[i + 1], 16);
    }
    if (xor_sum == xor_value) {
      return guid;
    } else {
      return '-';
    }
  }
};

exports.genCheckSum = function(short_guid) {
  var xor_value = 0;
  var v = short_guid.split('');
  for (var i = 0; i < 32; i += 2) {
    xor_value = xor_value ^ parseInt(v[i] + v[i + 1], 16);
  }
  return xor_value.toString(16);
};

exports.getFunctionIDFromURL = function(requestURL) {
  var temp = url.parse(requestURL, true);
  if (undefined != temp.query['FunctionID']) {
    return temp.query['FunctionID'];
  } else {
    return null;
  }
};

exports.getFunctionIDFromBody = function(requestBody) {
  var temp = querystring.parse(requestBody);
  if (undefined != temp['FunctionID']) {
    return temp['FunctionID'];
  } else {
    return null;
  }
};

exports.getErrorMessage = function(errorCode, errorMsg) {
  var result = '<response><code>' + errorCode + '</code><error>' + errorMsg + '</erro></response>';
  return result;
};
