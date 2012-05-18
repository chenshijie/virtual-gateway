

#Virtual Gateway
A server for proxying and authenticating client request 
##Installation
###clone code from github  
    $git clone git://github.com/chenshijie/virtual-gateway.git

###Install dependencies
    $cd virtual-gateway
    $npm install -d
###Modify configuration file
    $cd etc
    $cp settings.original.json settings.json
###Settings reference
    {
      "service_port":8888,              //gateway service port
      "redis": {                        //redis settings
        "host": "127.0.0.1",
        "port": 6379,
        "db" : 3,
        "msisdn_range_db" : 4
      },
      "mysql": {                       //mysql settings
        "host": "127.0.0.1",
        "port": 3306,
        "username": "root",
        "password": "",
        "database": "wlan"
      },
      "log" : {                       //log settings
            "file" : "log/server.log"
      },
      "n4": {                         //n4 server info
        "host": "172.16.33.202",
        "port": "8444"
      },
      "n6": {                        //n6 server info
        "host": "127.0.0.1",
        "port": "8098"
      },
      "debug": true                  //debug toggle
    }


##Start the gateway server
    $node spider_server