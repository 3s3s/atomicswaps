"use strict";

const customHandlers = {
    custom: require("../server/p2p/custom")
}

require("p2plib").StartServer(customHandlers);    

