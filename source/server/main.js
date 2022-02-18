"use strict";
const g_constants = require("../constants")

const customHandlers = {
    custom: require("../server/p2p/custom"),
    SSL_options: g_constants.SSL_options
}

require("./database").Init();
require("p2plib").StartServer(customHandlers);    

