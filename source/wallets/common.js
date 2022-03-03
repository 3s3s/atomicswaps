"use strict";
const utils = require("../utils")

exports.parseParams = function(params)
{
    if (typeof window !== 'undefined')  return null;

    let dhKey = null;
    try{
        dhKey = require("../private").serverDHkeys;
    }
    catch(e) {
    }

    if (!dhKey && (params.publicKey || params.serverKey))
        return null;

    if (params.publicKey && params.publicKey != dhKey.client_pub) return null;
    if (params.serverKey && params.serverKey != dhKey.pub) return null;

    try {
        const request = params.publicKey && params.serverKey ? utils.ServerDH_Decrypt(params.request) : params.request;
        return JSON.parse(request);
    }
    catch(e) {
        console.log(e)
        return null;
    }
}