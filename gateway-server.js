var logger = require('./lib/logger').logger;
var utils = require('./lib/utils');
var configs = require('./etc/settings.json');
var _logger = logger(__dirname + '/' + configs.log.file);

var fs = require('fs');

var _logger = logger(__dirname + '/' + configs.log.file);

var express = require('express');

var app = express.createServer();
app.use(express.static(__dirname + '/public'));

fs.writeFileSync(__dirname + '/run/server.lock', process.pid.toString(), 'ascii');
var http = require('http');
// Redis对象
var redis = require("redis");
// Redis对象,用户保存用户首次登陆
var client1 = redis.createClient(configs.redis.port, configs.redis.host);
client1.on('ready', function() {
  client1.select(configs.redis.db);
});

var nn = function(request, res, proxy_option) {
  var body = '';
  var headers = request.headers;

  var options = {
    host : proxy_option.host,
    port : proxy_option.port,
    path : request.url,
    method : request.method,
    headers : headers
  };

  var req = http.request(options, function(response) {
    response.setEncoding('binary');
    response.on('data', function(chunk) {
      body += chunk;
    });
    response.on('end', function() {
      if (response.headers['transfer-encoding'] != undefined) {
        delete response.headers['transfer-encoding'];
      }
      if (response.headers['content-length'] != undefined) {
        delete response.headers['content-length'];
      }
      response.headers['Content-Length'] = body.length;
      res.writeHead(response.statusCode, response.headers);
      res.end(body, 'binary');
    });
  });
  if (proxy_option.data != undefined) {
    req.end(proxy_option.data, 'binary');
  } else {
    req.end('', 'binary');
  }
};

var nx_proxy = function(request, res, data, need_emit) {
  _logger.info([ 'PROXY', request.url, request.headers['x-guid'], request.headers['x-sess'] || '-' ].join("\t"));
  var guid = utils.getGUIDFromXGUID(request.headers['x-guid']);
  if (true || '-' === guid) {
    _logger.debug([ 'GUIDERROR', request.headers['x-guid'], request.headers['x-ak'] || '-' ].join("\t"));
    res.send('no guid');
  } else {
    // 设置目标地址和端口
    var proxy_option = {
      host : configs.n5.host,
      port : configs.n5.port
    };
    if (!_.isNull(/\/N4\//.exec(request.url))) {
      proxy_option.port = configs.n4.port;
      proxy_option.host = configs.n4.host;
    }
    if (data) {
      proxy_option.data = data;
    }
    // console.log(proxy_option);
    if (request.headers['x-sess']) {
      var session = request.headers['x-sess'];
      client.get('sess:' + session, function(err, replies) {
        if (null === replies) {
          getMobile(guid, function(mobile) {
            delete request.headers['x-sess'];
            request.headers['x-up-calling-line-id'] = String(mobile);
            nn(request, res, proxy_option);
          });
        } else {
          client.expire('sess:' + session, 1800);
          user.find(replies, function(result) {
            // console.log("MOBILE FROM DB: " + result[0].mobile);
            if (result.length == 0 || undefined == result[0].mobile || null === result[0].mobile || result[0].mobile == '') {
              getMobile(guid, function(mobile) {
                // console.log("MOBILE FROM REDIS: " + mobile);
                request.headers['x-up-calling-line-id'] = String(mobile);
                nn(request, res, proxy_option);
              });
            } else {
              request.headers['x-up-calling-line-id'] = String(result[0].mobile);
              nn(request, res, proxy_option);
            }
          });
        }
      });
    } else {
      getMobile(guid, function(mobile) {
        request.headers['x-up-calling-line-id'] = String(mobile);
        nn(request, res, proxy_option);
      });
    }
  }
};

var n4_proxy = function(request, res, data, need_emit) {
  _logger.info([ 'PROXY', request.url, request.headers['x-guid'], request.headers['x-sess'] || '-' ].join("\t"));
  // 设置目标地址和端口
  var proxy_option = {
    host : configs.n4.host,
    port : configs.n4.port
  };
  if (data) {
    proxy_option.data = data;
  }
  nn(request, res, proxy_option);
};

var isFirstVisit = function(guid, callback) {
  var daytime = utils.getDateString();
  var key = daytime + ':' + guid;
  client1.select(1);
  client1.get(key, function(err, replies) {
    if (null === replies) {
      var date = new Date();
      var timeleft = (24 - date.getHours()) * 3600 - date.getMinutes() * 60;
      client1.setex(key, timeleft, 1);
      callback(true);
    } else {
      callback(false);
    }
  });
};

// 处理N6请求
app.get('/N6/:uri', function(req, res) {
  var guid = utils.getGUIDFromXGUID(req.headers['x-guid']);
  isFirstVisit(guid, function(firstVisit) {
    if (firstVisit) {
      req.headers['x-firstvisit'] = 'true';
    } else {
      req.headers['x-firstvisit'] = 'false';
    }
    nx_proxy(req, res, '');
  });
});

app.post('/N6/:uri', function(req, res) {
  var body = '';
  req.on('data', function(chunk) {
    body += chunk;
  });
  req.on('end', function() {
    var guid = utils.getGUIDFromXGUID(req.headers['x-guid']);
    isFirstVisit(guid, function(firstVisit) {
      if (firstVisit) {
        req.headers['x-firstvisit'] = 'true';
      } else {
        req.headers['x-firstvisit'] = 'false';
      }
      nx_proxy(req, res, body);
    });
  });
});

// 处理N4请求
app.post('/N4/:uri', function(req, res) {
  var body = '';
  req.on('data', function(chunk) {
    body += chunk;
  });
  req.on('end', function() {
    n4_proxy(req, res, body);
  });
});

app.get('/N4/:uri', function(req, res) {
  console.log(req.url);
  n4_proxy(req, res, '');
});

app.post('/getGUID', function(req, res) {
  var body = '';
  req.on('data', function(chunk) {
    body += chunk;
  });
  req.on('end', function() {
    var headers = req.headers;
    var options = {
      host : '127.0.0.1',
      port : 8081,
      path : req.url,
      method : req.method,
      headers : headers
    };
    var request = http.request(options, function(response) {
      response.setEncoding('binary');
      response.on('data', function(chunk) {
        body += chunk;
      });
      response.on('end', function() {
        if (response.headers['transfer-encoding'] != undefined) {
          delete response.headers['transfer-encoding'];
        }
        if (response.headers['content-length'] != undefined) {
          delete response.headers['content-length'];
        }
        response.headers['Content-Length'] = body.length;
        res.writeHead(response.statusCode, response.headers);
        res.end(body, 'binary');
      });
    });
    request.end(body, 'binary');
  });
});
app.listen(configs.service_port);
console.log('Service Started ' + utils.getLocaleISOString());
