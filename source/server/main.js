"use strict";

const customHandlers = {
    custom: require("../server/p2p/custom"),
    SSL_options: {
        key: require("fs").readFileSync(__dirname+"/ssl_cert/privkey.pem"),
        cert: require("fs").readFileSync(__dirname+"/ssl_cert/fullchain.pem")    
    },
    MAX_CONNECTIONS: 10,
    my_portSSL: 10443
}

require("p2plib").StartServer(customHandlers);    

