'use strict';

exports.SSL_options = typeof window === 'undefined' ? {
    key: require("fs").readFileSync(__dirname+"/server/ssl_cert/privkey.pem"),
    cert: require("fs").readFileSync(__dirname+"/server/ssl_cert/fullchain.pem")    
} : {}

exports.clientDHkeys = {
    pub: '16895966b80e97b23ee286076e1029bea10628ff', 
    sec: '478b23f2685c4e3693752614a90b51cdd98e2354',
    server_pub: '9c3bb3b99924a6207a1c5495e474da487226eb1d',
    G: "a;ljg@$BFB"
}