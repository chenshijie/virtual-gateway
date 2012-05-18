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
  var temp_ua = encodeURI(ua);
  var path = '/AuthJson.php?c=01&v=204&sc=0001&ac=' + ac + '&mc=' + mc + '&mt=' + mt + '&MSISDN=' + msisdn + '&ua=' + temp_ua + '&ip=' + ip + '&uid=2012&AK=' + ak + '&functionID=' + functionID;
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
    response.on('error', function(e) {
      console.log('认证请求遇到错误:');
      console.log(utils.getLocaleISOString() + ' ' + JSON.stringify(e));
      console.log(body);
      var result = {};
      result['result'] = 200;
      result['message'] = '认证请求遇到错误';
      callback(result);
    });
    response.on('end', function() {
      console.log(body);
      var temp = JSON.parse(body);
      var result = {};
      if (temp.code == '000') {
        result['result'] = 200;
        result['message'] = temp.msg;
      } else if (temp.code == '001') {
        result['result'] = 211; //未订购，提示订购
        result['message'] = temp.msg;
      } else {
        result['result'] = 219; //其他错误
        result['message'] = 'Auth Error';
      }
      callback(result);
    });
  });
  request.end('', 'binary');
};

Authority.prototype.doOrder = function(msisdn, c, ac, mc, mt, ua, ak, ip, callback) {
  console.log('订购请求');
  //Auth2/action?c=02&v=200&sc=0001&ac=00000000&mc=00000&mt=00000000000000000000&MSISDN=15884122092&ua=j2me&ip=10.10.10.10&uid=2010&AK=
  var path = '/OrderJson.php?c=' + c + '&v=200&sc=0001&ac=' + ac + '&mc=' + mc + '&mt=' + mt + '&MSISDN=' + msisdn + '&ua=' + ua + '&ip=' + ip + '&uid=2012&AK=' + ak;
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
      console.log('订购处理结果:');
      console.log(body);
      var temp = JSON.parse(body);
      var result = {};
      if (temp.code == '000') {
        result['result'] = 200; //订购成功
        result['message'] = temp.msg;
      } else {
        result['result'] = 221;
        result['message'] = "Order Error";
      }
      callback(result);
    });
  });
  request.end('', 'binary');
};

Authority.prototype.doCancelOrder = function(msisdn, ac, mc, mt, ua, ak, ip, callback) {
  ///Auth2/action?c=03&v=200&sc=0001&ac=00000000&mc=00000&mt=00000000000000000000&MSISDN=13545689982&ua=UNTRUSTED%2F1.0+j2me%2FMIDP-2.0%2FISO8859_1&ip=10.151.132.246&uid=2008&AK=038FI11 
  var path = '/OrderJson.php?c=03&v=200&sc=0001&ac=' + ac + '&mc=' + mc + '&mt=' + mt + '&MSISDN=' + msisdn + '&ua=' + ua + '&ip=' + ip + '&uid=2012&AK=' + ak;
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
      var temp = JSON.parse(body);
      var result = {};
      if (temp.code == '000') {
        result['result'] = 200; //退订成功
        result['message'] = temp.msg;
      } else {
        result['result'] = 219; //退订失败
        result['message'] = "Cancel Error";
      }
      callback(result);
    });
  });
  request.end('', 'binary');
};

///Auth2/action?c=04&v=200&sc=0001&ac=00000000&mc=00000&mt=00000000000000000000&MSISDN=15885438327&ua=Android1.6&ip=10.235.181.167&uid=2008&AK=038ME08
Authority.prototype.listOrders = function(msisdn, ac, mc, mt, ua, ak, ip, callback) {
  console.log('订购关系查询');
  ///Auth2/action?c=04&v=200&sc=0001&ac=00000000&mc=00000&mt=00000000000000000000&MSISDN=15885438327&ua=Android1.6&ip=10.235.181.167&uid=2008&AK=038ME08
  var path = '/OrderJson.php?c=04&v=200&sc=0001&ac=' + ac + '&mc=' + mc + '&mt=' + mt + '&MSISDN=' + msisdn + '&ua=' + ua + '&ip=' + ip + '&uid=2012&AK=' + ak;
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
      console.log('订购关系查询结果:');
      var temp = JSON.parse(body);
      console.log(temp);
      var result = {};
      if (temp.code == '00000000000') {
        result['code'] = 200;
        result['message'] = temp.msg;
      } else if (temp.code == '201') {
        result['code'] = 201;
        result['msg'] = '订购请求已受理，处理中。';
      } else if (temp.code == '202') {
        result['code'] = 202;
        result['msg'] = '退订请求已受理，处理中。';
      } else if (temp.code == '203') {
        result['code'] = 203;
        result['msg'] = '没有订购任何服务。';
      } else if (temp.code == '010') {
        console.log(temp);
        result['code'] = 210; //渠道免费,不显示订购按钮
        result['msg'] = '手机证券竭诚为投资者服务，免费提供海量投资指导信息，【市场热点解读】把握形势、【潜力金股排行】轻松选股、【资金流向数据】紧跟主力，让您与高手同行，与机构同步！';
      } else {
        result['code'] = 209;
        result['msg'] = 'List Order Error';
      }
      callback(result);
    });
  });
  request.end('', 'binary');
};

exports.getAuthority = function(host, port) {
  return new Authority(host, port);
};
