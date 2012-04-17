var http = require('http');

var _ = require('underscore');
//TODO read from config file
//var auth_server_host = '211.136.109.36';
//var auth_server_port =  8081;
var Authority = function(host, port) {
    this.host = host;
    this.port = port;
  };

Authority.prototype.doAuth = function(msisdn, ac, mc, mt, ua, ak, ip, functionID, callback) {
  var path = '/Auth2/action?c=01&v=204&sc=0001&ac=' + ac + '&mc=' + mc + '&mt=' + mt + '&MSISDN=' + msisdn + '&ua=' + ua + '&ip=' + ip + '&uid=2012&AK=' + ak + '&functionID=' + functionID;
  console.log(path);
  var options = {
    host: this.host,
    port: this.port,
    path: path,
    method: 'GET'
  };
  var request = http.request(options, function(response) {
    response.setEncoding('utf8');
    var body = '';
    response.on('data', function(chunk) {
      body += chunk;
    });
    response.on('end', function() {
      var temp = body.substr(0, 3);
      var result = {};
      if (temp == '000') {
        result['result'] = 200;
      } else if(temp == '001') {
        result['result'] = 211; //未订购，提示订购
      } else {
        result['result'] = 219; //其他错误
      }
      result['message'] = body;
      callback(result);
    });
  });
  request.end('', 'binary');
};

Authority.prototype.doOrder = function(msisdn, c, ac, mc, mt, ua, ak, ip, callback) {
  //Auth2/action?c=02&v=200&sc=0001&ac=00000000&mc=00000&mt=00000000000000000000&MSISDN=15884122092&ua=j2me&ip=10.10.10.10&uid=2010&AK=
  var path = '/Auth2/action?c='+ c +'&v=200&sc=0001&ac=' + ac + '&mc=' + mc + '&mt=' + mt + '&MSISDN=' + msisdn + '&ua=' + ua + '&ip=' + ip + '&uid=2012&AK=' + ak;
  console.log(path);
  var options = {
    host: this.host,
    port: this.port,
    path: path,
    method: 'GET'
  };
  var request = http.request(options, function(response) {
    response.setEncoding('utf8');
    var body = '';
    response.on('data', function(chunk) {
      body += chunk;
    });
    response.on('end', function() {
      var temp = body.substr(0, 3);
      var result = {};
      if (temp == '000') {
        result['result'] = 200; //订购成功
      } else {
        result['result'] = 221;
      }
      result['message'] = body;
      callback(result);
    });
  });
  request.end('', 'binary');
};

Authority.prototype.doCancelOrder = function(msisdn, ac, mc, mt, ua, ak, ip, callback) {
  ///Auth2/action?c=03&v=200&sc=0001&ac=00000000&mc=00000&mt=00000000000000000000&MSISDN=13545689982&ua=UNTRUSTED%2F1.0+j2me%2FMIDP-2.0%2FISO8859_1&ip=10.151.132.246&uid=2008&AK=038FI11 
  var path = '/Auth2/action?c=03&v=200&sc=0001&ac=' + ac + '&mc=' + mc + '&mt=' + mt + '&MSISDN=' + msisdn + '&ua=' + ua + '&ip=' + ip + '&uid=2012&AK=' + ak;
  console.log(path);
  console.log(path);
  var options = {
    host: this.host,
    port: this.port,
    path: path,
    method: 'GET'
  };
  var request = http.request(options, function(response) {
    response.setEncoding('utf8');
    var body = '';
    response.on('data', function(chunk) {
      body += chunk;
    });
    response.on('end', function() {
      var temp = body.substr(0, 3);
      var result = {};
      if (temp == '000') {
        result['result'] = 200; //退订成功
      } else {
        result['result'] = 219; //退订失败
      }
      result['message'] = body;
      callback(result);
    });
  });
  request.end('', 'binary');
};

///Auth2/action?c=04&v=200&sc=0001&ac=00000000&mc=00000&mt=00000000000000000000&MSISDN=15885438327&ua=Android1.6&ip=10.235.181.167&uid=2008&AK=038ME08
Authority.prototype.listOrders = function(msisdn, ac, mc, mt, ua, ak, ip, callback) {
  ///Auth2/action?c=04&v=200&sc=0001&ac=00000000&mc=00000&mt=00000000000000000000&MSISDN=15885438327&ua=Android1.6&ip=10.235.181.167&uid=2008&AK=038ME08
  var path = '/Auth2/action?c=04&v=200&sc=0001&ac=' + ac + '&mc=' + mc + '&mt=' + mt + '&MSISDN=' + msisdn + '&ua=' + ua + '&ip=' + ip + '&uid=2012&AK=' + ak;
  console.log(path);
  var options = {
    host: this.host,
    port: this.port,
    path: path,
    method: 'GET'
  };
  var request = http.request(options, function(response) {
    response.setEncoding('utf8');
    var body = '';
    response.on('data', function(chunk) {
      body += chunk;
    });
    response.on('end', function() {
      var temp = body.substr(0, 3);
      var result = {};
      if (temp == '000') {
        result['code'] = 200;
        result['msg'] = '手机证券业务;';
      } else if(temp == '009') {
        if(body == '009订购请求已受理，处理中。') {
          result['code'] = 201;
          result['msg'] = '订购请求已受理，处理中。';
        } else if(body == '009退订请求已受理，处理中。') {
          result['code'] = 202; 
          result['msg'] = '退订请求已受理，处理中。';
        } else if(body == '009没有订购任何服务.') {
          result['code'] = 203;
          result['msg'] = '没有订购任何服务。';
        } else {
          result['code'] = 204;
          result['msg'] = body;
        }
      } else if(temp = '010') {
        result['code'] = 210; //渠道免费,不显示订购按钮
        result['msg'] = '手机证券竭诚为投资者服务，免费提供海量投资指导信息，【市场热点解读】把握形势、【潜力金股排行】轻松选股、【资金流向数据】紧跟主力，让您与高手同行，与机构同步！';
      } else {
        result['code'] = 209;
        result['msg'] = body;
      }
      callback(result);
    });
  });
  request.end('', 'binary');
};

exports.getAuthority = function(host, port) {
  return new Authority(host, port);
};
