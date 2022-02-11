'use strict';

exports.SSL_options = {
    key: require("fs").readFileSync(__dirname+"/server/ssl_cert/privkey.pem"),
    cert: require("fs").readFileSync(__dirname+"/server/ssl_cert/fullchain.pem")    
}

const PRIVATE = require("./private");
exports.SERVER_PRIVATE_KEY = PRIVATE ? PRIVATE.SERVER_PRIVATE_KEY || "fljaksgyr7r3894F#E$#@$":"fljaksgyr7r3894F#E$#@$";