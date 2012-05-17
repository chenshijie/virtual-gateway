var utils = require('../lib/utils');
var configs = require('../etc/settings.json');

//初始化REDIS CLIENT
var redis = require("redis");
var redis_client_msisdn_range = redis.createClient(configs.redis.port, configs.redis.host);

redis_client_msisdn_range.select(configs.redis.msisdn_range_db);
redis_client_msisdn_range.on('ready', function() {
  redis_client_msisdn_range.select(configs.redis.msisdn_range_db);
});

var fs = require('fs');

var file_name = '18x.dat';
var mark = 'B';


var data = fs.readFileSync(file_name, 'utf8');
var data_array = data.split("\r\n");

for(var i = 0, len = data_array.length; i < len; i++) {
  var row = data_array[i];
  var temp = row.split("\t");
  if(temp.length < 4) {
    console.log(temp);
  } else {
    var key = temp[3];
    var province = temp[0];
    var city = temp[1];
    var areacode = temp[2];
    if(key.length > 7) {
      key = key.substr(0,7);
    }
    var value = {
      province : province,
      city : city,
      areacode : areacode,
      mark : mark
    };

    redis_client_msisdn_range.hmset(key,value);
  }
  
}

/*
redis_client_msisdn_range.hgetall('1358162',function(error,obj){
  if(null == error) {
    if(obj.province != undefined) {
      console.log(obj.province);
    } else {
      console.log('其它');
    }
  } else {
    console.log('其它');
  }
});
*/
redis_client_msisdn_range.quit();
