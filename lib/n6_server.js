var http = require('http');

var _ = require('underscore');
//TODO read from config file
//var auth_server_host = '211.136.109.36';
//var auth_server_port =  8081;
var N6Server = function(host, port) {
    this.host = host;
    this.port = port;
  };

N6Server.prototype.getSubscribe = function(areaCode, msg, srcpath, reqHeaders, data,callback) {
  //http://172.16.33.202:8868/N6/subscribe?AreaCode=ggg&Msg=ggg
  var sendMsg = encodeURI(msg);
  var area = encodeURI(areaCode);
  var path = encodeURI(srcpath);
  var path = '/N6/subscribe?AreaCode='+area+'&Msg='+sendMsg+'&srcpath='+path;
  var options = {
    host: this.host,
    port: this.port,
    path: path,
    headers: reqHeaders,
    method: 'POST'
  };
  var request = http.request(options, function(response) {
    response.setEncoding('binary');
    var body = '';
    response.on('data', function(chunk) {
      body += chunk;
    });
    response.on('end', function() {
      callback(body);
    });
  });
  console.log('----------------------------------------------------');
  console.log(srcpath);
  console.log(reqHeaders);
  console.log(data);
  console.log('----------------------------------------------------');
  request.end(data, 'binary');
};


exports.getN6Server = function(host, port) {
  return new N6Server(host, port);
};
