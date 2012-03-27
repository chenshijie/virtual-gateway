var logger = require('./lib/logger').logger;
var utils = require('./lib/utils');
var configs = require('./etc/settings.json');
var _logger = logger(__dirname + '/' + configs.log.file);
var http = require('http');
var fs = require('fs');
// Redis对象
var redis = require("redis");
var _logger = logger(__dirname + '/' + configs.log.file);
var express = require('express');
var app = express.createServer();

var _ = require('underscore');
//var _.str = require('underscore.string');
_.mixin(require('underscore.string'));

var guidServer = require('./lib/guidservice');
var guidService = guidServer.getGUIDService('127.0.0.1', 8081);

var authority = require('./lib/auth');
var auth = authority.getAuthority('211.136.109.36', 8081);

var wapIPList = [];
app.use(express.static(__dirname + '/public'));
fs.writeFileSync(__dirname + '/run/server.lock', process.pid.toString(), 'ascii');

// Redis对象,用户保存用户首次登陆
var client1 = redis.createClient(configs.redis.port, configs.redis.host);
client1.on('ready', function() {
  client1.select(configs.redis.db);
});

var proxy2Nx = function(request, res, proxy_option) {
    var body = '';
    var headers = request.headers;

    var options = {
      host: proxy_option.host,
      port: proxy_option.port,
      path: request.url,
      method: request.method,
      headers: headers
    };

    var req = http.request(options, function(response) {
      //TODO 处理来源IP,参考http-proxy
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

var n4_proxy = function(request, res, data) {
    _logger.info(['PROXY', request.url, request.headers['x-guid'], request.headers['x-sess'] || '-'].join("\t"));
    // 设置目标地址和端口
    var proxy_option = {
      host: configs.n4.host,
      port: configs.n4.port
    };
    if (data) {
      proxy_option.data = data;
    }
    proxy2Nx(request, res, proxy_option);
  };

var n6_proxy = function(request, res, data) {
    _logger.info(['PROXY', request.url, request.headers['x-guid'], request.headers['x-sess'] || '-'].join("\t"));
    var guid = utils.getGUIDFromXGUID(request.headers['x-guid']);
    if (false && '-' == guid) {
      res.end(utils.getErrorMessage(-1, 'NO_GUID'));
    } else {
      // 设置目标地址和端口
      var proxy_option = {
        host: configs.n6.host,
        port: configs.n6.port
      };
      if (data) {
        proxy_option.data = data;
      }
      guidService.getIDCodeByGUID(guid, function(result) {
        console.log(guid);
        if (!result.error) {
          request.headers['x-up-calling-line-id'] = String(result.idcode);
        } else {
          request.headers['x-up-calling-line-id'] = '';
        }
        console.log(result);
        console.log(request.headers['x-up-calling-line-id']);
        proxy2Nx(request, res, proxy_option);
      })
    }
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

/**
 * 获取请求来源IP
 */
var getRealIP = function(request) {
    if (undefined !== request.META && undefined !== request.META['HTTP_X_FORWARDED_FOR']) {
      return request.META['HTTP_X_FORWARDED_FOR'];
    } else {
      return request.connection.remoteAddress;
    }
  };

/**
 * 判断来源IP是否来自WAP网关
 * @param  String  ip 来源IP
 * @return Boolean
 */
var isComeFromWAPNet = function(ip) {
    return _.include(wapIPList, ip);
  };

/**
 * 处理客户端到N6的GET方式请求
 * @param  http.ClientRequest req 请求对象
 * @param  http.ClientResponse res 响应对象
 * @return void
 */
app.get('/N6/:uri', function(req, res) {
  console.log('N6-GET');
  console.log(req.url);
  console.log(req.headers['x-guid']);
  var guid = utils.getGUIDFromXGUID(req.headers['x-guid']);
  isFirstVisit(guid, function(firstVisit) {
    if (firstVisit) {
      req.headers['x-firstvisit'] = 'true';
    } else {
      req.headers['x-firstvisit'] = 'false';
    }
    n6_proxy(req, res, '');
  });
});

/**
 * 处理客户端到N6的POST方式请求
 * @param  http.ClientRequest req 请求对象
 * @param  http.ClientResponse res 响应对象
 * @return void
 */
app.post('/N6/:uri', function(req, res) {
  console.log('N6-POST');
  console.log(req.url);
  console.log(req.headers['x-guid']);
  var realIP = getRealIP(req);
  if (isComeFromWAPNet(realIP)) {
    //TODO::处理来自WAP网关的情况
    //TODO::需要判断手机号是否绑定，如果未绑定应自动绑定
  } else {
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
        n6_proxy(req, res, body);
      });
    });
  }
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
  var msisdn = '';
  if (undefined != req.headers['x-up-calling-line-id']) {
    msisdn = req.headers['x-up-calling-line-id'].substr(-11);
  }
  console.log(msisdn);
  var options = {
    host: '127.0.0.1',
    port: 8081,
    path: '/getIDCodeByMSISDN?msisdn=' + msisdn,
    method: req.method,
    headers: req.headers
  };
  var request = http.request(options, function(response) {
    var body = '';
    response.setEncoding('binary');
    response.on('data', function(chunk) {
      body += chunk;
    });
    response.on('end', function() {
      var idcode = body;
      console.log(idcode);
      req.headers['x-up-calling-line-id'] = idcode;
      n4_proxy(req, res, '');
    });
  });
  request.end('');
});
/**
 * 生成GUID
 */
app.post('/getGUID', function(req, res) {
  var body = '';
  req.on('data', function(chunk) {
    body += chunk;
  });
  req.on('end', function() {
    var headers = req.headers;
    var options = {
      host: '127.0.0.1',
      port: 8081,
      path: req.url,
      method: req.method,
      headers: headers
    };
    var request = http.request(options, function(response) {
      var guid = '';
      response.setEncoding('binary');
      response.on('data', function(chunk) {
        guid += chunk;
      });
      response.on('end', function() {
        if (response.headers['transfer-encoding'] != undefined) {
          delete response.headers['transfer-encoding'];
        }
        if (response.headers['content-length'] != undefined) {
          delete response.headers['content-length'];
        }
        response.headers['Content-Length'] = guid.length;
        var headers = response.headers;
        headers['connection'] = 'close';
        res.writeHead(response.statusCode);
        var result = JSON.parse(guid);
        console.log(result);
        if (!result.error) {
          console.log('res.end');
          console.log(result.guid);
          res.end(result.guid);
        } else {
          res.end('gen guid error');
        }
      });
    });
    request.end(body, 'binary');
  });
});


var isEmpty = function(value) {
    var temp = _.trim(value);
    return (temp == undefined || temp == '');
  };

app.get('/Auth/:idcode/Order', function(req, res) {
  var action = req.query.action;
  var idcode = req.params.idcode;
  var ac = req.query.ac;
  var mc = req.query.mc;
  var mt = req.query.mt;
  var ua = req.query.ua;
  var ak = req.query.ak;
  var ip = req.query.ip;
  if (!_.include(['list', 'order', 'cancel'], action)) {
    res.end('action error!')
  } else if (isEmpty(ac) || isEmpty(mc) || isEmpty(mt) || isEmpty(ua) || isEmpty(ak) || isEmpty(ip)) {
    res.end('参数错误');
  } else {
    guidService.getMSISDNByIDCode(idcode, function(result) {
      if (!result.error && !isEmpty(result.msisdn)) {
        if (action == 'list') {
          auth.getOrders(result.msisdn, ac, mc, mt, ua, ak, ip, function(authResult){
            res.end(JSON.stringify(authResult));
          });
        }
        if (action == 'order') {
          auth.doOrder(result.msisdn, ac, mc, mt, ua, ak, ip, function(authResult){
            res.end(JSON.stringify(authResult));
          });
        }
        if (action == 'cancel') {
          auth.doCancelOrder(result.msisdn, ac, mc, mt, ua, ak, ip, function(authResult){
            res.end(JSON.stringify(authResult));
          });
        }
      } else {
        res.end('用户未绑定手机号');
      }
    });
  }
});
console.log(configs.service_port);
app.listen(configs.service_port);
console.log('Service Started ' + utils.getLocaleISOString());
