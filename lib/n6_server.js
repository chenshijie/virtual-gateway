var http = require('http');

var _ = require('underscore');
//TODO read from config file
//var auth_server_host = '211.136.109.36';
//var auth_server_port =  8081;
var N6Server = function(host, port) {
    this.host = host;
    this.port = port;
  };

N6Server.prototype.getSubscribe = function(areaCode, msg, callback) {
  //http://172.16.33.202:8868/N6/subscribe?AreaCode=ggg&Msg=ggg
  var sendMsg = encodeURI(msg);
  var path = '/N6/subscribe?AreaCode='+areaCode+'&Msg='+sendMsg;
  console.log(path);
  var options = {
    host: this.host,
    port: this.port,
    path: path,
    method: 'GET'
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
  request.end('', 'binary');
};


exports.getN6Server = function(host, port) {
  return new N6Server(host, port);
};
