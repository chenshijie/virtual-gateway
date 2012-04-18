var http = require('http');

var getMSISDNByGUID = function(host, port, guid, cb) {
  var options = {
    host: host,
    port: port,
    path: '/GetMSISDNByGUID?guid=' + guid,
    method: 'GET'
  };
  var request = http.request(options, function(response) {
    response.setEncoding('binary');
    var body = '';
    response.on('data', function(chunk) {
      body += chunk;
    });
    response.on('end', function() {
      cb(body);
    });
  });
  request.end('', 'binary');
};

var getMSISDNByIDCode = function(host, port, idcode, cb) {
  var options = {
    host: host,
    port: port,
    path: '/GetMSISDNByIDCode?idcode=' + idcode,
    method: 'GET'
  };
  var request = http.request(options, function(response) {
    response.setEncoding('binary');
    var body = '';
    response.on('data', function(chunk) {
      body += chunk;
    });
    response.on('end', function() {
      cb(body);
    });
  });
  request.end('', 'binary');
};


var GUIDService = function(host, port) {
  this.host = host;
  this.port = port;
};

var getIDCodeByGUID = function(host, port, guid, cb) {
  var options = {
    host: host,
    port: port,
    path: '/getIDCodeByGUID?guid=' + guid,
    method: 'GET'
  };
  var request = http.request(options, function(response) {
    response.setEncoding('binary');
    var body = '';
    response.on('data', function(chunk) {
      body += chunk;
    });
    response.on('end', function() {
      cb(body);
    });
  });
  request.end('', 'binary');
};

GUIDService.prototype.getMSISDNByGUID = function(guid, callback) {
  getMSISDNByGUID(this.host, this.port, guid, function(data) {
    var result = {};
    try {
      var result = JSON.parse(data);
    } catch(e) {
      var result = {
        error: 'PARSE_ERROR',
        msisdn: ''
      };
    }
    callback(result);
  });
};

GUIDService.prototype.getIDCodeByGUID = function(guid, callback) {
  getIDCodeByGUID(this.host, this.port, guid, function(data) {
    var result = {};
    try {
      result = JSON.parse(data);
    } catch(e) {
      result = {
        error: 'PARSE_ERROR',
        idcode: ''
      };
    }
    callback(result);
  });
};

GUIDService.prototype.getMSISDNByIDCode = function(idcode,callback) {
  getMSISDNByIDCode(this.host,this.port,idcode,function(data){
    try {
      var result = JSON.parse(data);      
    } catch(e) {
      var result = {
        error: 'PARSE_ERROR',
        msisdn: ''
      };
    }
    callback(result);
  });
};

exports.getGUIDService = function(host, port) {
  return new GUIDService(host, port);
};

