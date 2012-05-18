var logger = require('./lib/logger').logger;
var utils = require('./lib/utils');
var configs = require('./etc/settings.json');
var _logger = logger(__dirname + '/' + configs.log.file);
var http = require('http');
var fs = require('fs');
// Redis对象
var redis = require("redis");
var express = require('express');
var app = express.createServer();

var _ = require('underscore');
//var _.str = require('underscore.string');
_.mixin(require('underscore.string'));

var guidServer = require('./lib/guidservice');
var guidService = guidServer.getGUIDService('127.0.0.1', 8081);

var authority = require('./lib/auth_json');
var auth = authority.getAuthority('218.204.252.231', 8081);

var N6Server = require('./lib/n6_server');
var n6Service = N6Server.getN6Server(configs.n6.host, configs.n6.port);

var wapIPList = require('./etc/wap_gateway_ip.json');
app.use(express.static(__dirname + '/public'));
fs.writeFileSync(__dirname + '/run/server.lock', process.pid.toString(), 'ascii');

// Redis对象,用户保存用户首次登陆
var client1 = redis.createClient(configs.redis.port, configs.redis.host);
client1.on('ready', function() {
  client1.select(configs.redis.db);
});

var redis_client_msisdn_range = redis.createClient(configs.redis.port, configs.redis.host);
redis_client_msisdn_range.select(configs.redis.msisdn_range_db);
redis_client_msisdn_range.on('ready', function() {
  redis_client_msisdn_range.select(configs.redis.msisdn_range_db);
});

var debug_info = function(info) {
  if(configs.debug) {
    console.log(info);
  }
}
var proxy2Nx = function(request, res, proxy_option) {
  var body = '';
  var headers = request.headers;
  console.log(headers);
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
  debug_info(guid);
  if ('-' == guid || undefined == guid) {
    debug_info('n6_proxy: can not get guid from header');
    debug_info(utils.getErrorMessage( - 1, 'NO_GUID'));
    debug_info(request.headers);
    res.end(utils.getErrorMessage( - 1, 'NO_GUID'));
  } else {
    // 设置目标地址和端口
    var proxy_option = {
      host: configs.n6.host,
      port: configs.n6.port
    };
    if (data) {
      proxy_option.data = data;
    }
    debug_info(guid);
    guidService.getIDCodeByGUID(guid, function(result) {
      debug_info('n6_proxy: ' + guid);
      debug_info(result);
      if (!result.error) {
        request.headers['x-up-calling-line-id'] = String(result.idcode);
      } else {
        request.headers['x-up-calling-line-id'] = '';
      }
      var currentTimeStamp = utils.getTimestamp();
      var mo_bind_step = 14 * 24 * 60 * 60;
      mo_bind_step = 60 * 60; //开发阶段测试用1个小时需要上行短信
      if (currentTimeStamp - result.bindtime > mo_bind_step) {
        request.headers['x-need-mo'] = true;
      } else {
        request.headers['x-need-mo'] = false;
      }
      ////xxxx
      var functionID = request.headers['x-fidbid'];
      debug_info(request.headers);
      debug_info('FUNCTIONID : ' + functionID);
      //判断是否需要过认证
      if ('24000000' == functionID || '27000001' == functionID || (functionID != undefined && functionID.substr(0,3) == '270')) {
        debug_info('zzzzzzzzzzzzzzzzzzzzzzzzzzzz');
        //Auth2/action?c=02&v=200&sc=0001&ac=00000000&mc=00000&mt=00000000000000000000&MSISDN=15884122092&ua=j2me&ip=10.10.10.10&uid=2010&AK=
        //auth.doAuth = function(msisdn, ac, mc, mt, ua, ak, ip, functionID, callback)
        var ac = '01000000';
        var mc = '00000';
        var mt = '00000000000000000000';
        var ua = request.headers['user-agent'] != undefined ? request.headers['user-agent'] : '';
        var ak = request.headers['x-ak']
        var ip = getRealIP(request);
        var guid = utils.getGUIDFromXGUID(request.headers['x-guid']);
        debug_info('222222222222222222222222222222222222');
        guidService.getMSISDNByGUID(guid, function(result) {
          debug_info(result);
          debug_info('3333333333333333');
          //手机号不为空并且functionID为收费功能ID
          if (result.msisdn != '' && ('24000000' == functionID || '27000001' == functionID || '10005000' == functionID) ) {
            request.headers['x-get-msisdn'] = true;
            debug_info('ready to do auth');
            auth.doAuth(result.msisdn, ac, mc, mt, ua, ak, ip, functionID, function(authResult) {
              debug_info('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
              debug_info(authResult);
              debug_info(result.msisdn);
              if (authResult.result != 200) {
                request.headers['x-auth-result'] = false;
              } else {
                request.headers['x-auth-result'] = true;
              }
              if (('24000000' == functionID || '27000001' == functionID || '10005000' == functionID) && authResult.result != 200) {
                getAreaCode(result.msisdn, function(province) {
                  debug_info('REQ_URL : '+request.url);
                  n6Service.getSubscribe(province, authResult.message, request.url, request.headers, data, function(subscribePage) {
                    var tempHeaders = {};
                    tempHeaders['Content-Length'] = subscribePage.length;
                    res.writeHead(200, tempHeaders);
                    res.end(subscribePage, 'binary');
                  });
                });
              } else {
                proxy2Nx(request, res, proxy_option);
              }
            });
          } else if( result.msisdn != '' && functionID.substr(0,3) == '270' ) { //手机号不为空,并且functionID要求判断地区
            console.log('需要地区信息给N6');
            getAreaCode(result.msisdn, function(areaCode) {
              request.headers['x-area'] = areaCode;
              console.log('地区:  '+ areaCode);
              console.log('FUNCTION_ID in getProvince :' + functionID);
              proxy2Nx(request, res, proxy_option);
            });
          } else { //不能取得手机号
            request.headers['x-get-msisdn'] = false;
            proxy2Nx(request, res, proxy_option);
          }
        });
      } else {
        console.log('不需要地区信息');
        proxy2Nx(request, res, proxy_option);
      }

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

var getProvince = function(msisdn, callback) {
  var key = msisdn.substr(0, 7);
  redis_client_msisdn_range.hgetall(key, function(error, obj) {
    if (null == error) {
      if (obj.province != undefined) {
        callback(obj.province);
      } else {
        callback('其它');
      }
    } else {
      callback('其它');
    }
  });
};

var getAreaCode = function(msisdn, callback) {
  var key = msisdn.substr(0, 7);
  redis_client_msisdn_range.hgetall(key, function(error, obj) {
    if (null == error) {
      if (obj.areacode != undefined) {
        callback(obj.areacode);
      } else {
        callback('000');
      }
    } else {
      callback('000');
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
  debug_info('GET N6');
  debug_info('FUNCDION_ID:'+req.headers['x-fidbid']);
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
  debug_info('POST N6');
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
  var msisdn = '';
  if (undefined != req.headers['x-up-calling-line-id']) {
    msisdn = req.headers['x-up-calling-line-id'].substr( - 11);
  }
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
      req.headers['x-up-calling-line-id'] = idcode;
      n4_proxy(req, res, '');
    });
  });
  request.end('');
});

var genGuidMsg = function(errorCode, guid, vCode) {
  var msg = '<?xml version="1.0" encoding="utf-8" ?><gg version="1.0"><result>' + errorCode + '</result><guid>' + guid + '</guid><vcode>' + vCode + '</vcode></gg>';
  return msg;
};

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
        //var headers = response.headers;
        var headers = {};
        headers['Content-type'] = 'text/xml';
        //res.writeHead(response.statusCode);
        var result = JSON.parse(guid);
        if (!result.error) {
          var guid_content = genGuidMsg(0, result.guid, result.vcode);
          headers['Content-Length'] = guid_content.length;
          res.writeHead(response.statusCode, headers);
          res.end(guid_content);
        } else {
          var guid_content = genGuidMsg(1, '', '');
          headers['Content-Length'] = guid_content.length;
          res.writeHead(response.statusCode, headers);
          res.end(guid_content);
        }
      });
    });
    request.end(body, 'binary');
  });
});

app.get('/getGUID', function(req, res) {
  //req.on('end', function() {
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
        //var headers = response.headers;
        var headers = {};
        headers['Content-type'] = 'text/xml';
        //res.writeHead(response.statusCode);
        var result = JSON.parse(guid);
        if (!result.error) {
          var guid_content = genGuidMsg(0, result.guid, result.vcode);
          headers['Content-Length'] = guid_content.length;
          res.writeHead(response.statusCode, headers);
          res.end(guid_content);
        } else {
          var guid_content = genGuidMsg(1, '', '');
          headers['Content-Length'] = guid_content.length;
          res.writeHead(response.statusCode, headers);
          res.end(guid_content);
        }
      });
    });
    request.end('', 'binary');
  //});
});

var isEmpty = function(value) {
  var temp = _.trim(value);
  return (temp == undefined || temp == '');
};

app.get('/Auth/:idcode/Order', function(req, res) {
  debug_info('########################################');
  debug_info('########################################');
  debug_info(req.query.action);
  debug_info('########################################');
  debug_info('########################################');
  var action = req.query.action;
  var idcode = req.params.idcode;
  var ac = req.query.ac;
  var mc = req.query.mc;
  var mt = req.query.mt;
  var ua = req.query.ua;
  var ak = req.query.ak;
  var ip = req.query.ip;
  var c = '02';
  var responseData = {};
  if (action == undefined || ! _.include(['list', 'order', 'cancel'], action)) {
    responseData['status_code'] = 404;
    responseData['status_txt'] = 'action error';
    res.end(JSON.stringify(responseData));
  } else if (isEmpty(ac) || isEmpty(mc) || isEmpty(mt) || isEmpty(ua) || isEmpty(ak) || isEmpty(ip)) {
    responseData['status_code'] = 404;
    responseData['status_txt'] = 'lost one or more essential parameters';
    res.end(JSON.stringify(responseData));
  } else {
    guidService.getMSISDNByIDCode(idcode, function(result) {
      if (!result.error && ! isEmpty(result.msisdn)) {
        if (action == 'list') {
          auth.listOrders(result.msisdn, ac, mc, mt, ua, ak, ip, function(authResult) {
            responseData['status_code'] = 200;
            responseData['status_txt'] = 'OK';
            responseData['result'] = authResult;
            res.end(JSON.stringify(responseData));
          });
        }
        if (action == 'order') {
          c = req.query.c;
          if (isEmpty(c) || ! _.include(['02', '11', '12', '13'], c)) {
            responseData['status_code'] = 404;
            responseData['status_txt'] = 'lost param c';
            res.end(JSON.stringify(responseData));
          } else {
            responseData['status_code'] = 200;
            responseData['status_txt'] = 'OK';
            res.end(JSON.stringify(responseData));
            auth.doOrder(result.msisdn, c, ac, mc, mt, ua, ak, ip, function(authResult) {
              debug_info(authResult);
            });
          }
        }
        if (action == 'cancel') {
          responseData['status_code'] = 200;
          responseData['status_txt'] = 'OK';
          res.end(JSON.stringify(responseData));
          auth.doCancelOrder(result.msisdn, ac, mc, mt, ua, ak, ip, function(authResult) {
            debug_info(authResult);
          });
        }
      } else {
        responseData['status_code'] = 404;
        responseData['status_txt'] = 'client not bind msisdn';
        res.end(JSON.stringify(responseData));
      }
    });
  }
});
console.log(configs.service_port);
app.listen(configs.service_port);
console.log('Service Started ' + utils.getLocaleISOString());

