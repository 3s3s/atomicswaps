"use strict";
const P2P = require("p2plib"); 

// @ts-ignore
global.p2p = new p2plib()

document.addEventListener('DOMContentLoaded', async () => {

    require("./tab_network.js").Init();
    require("./tab_orders.js").Init();
    require("./tab_wallets.js").Init();

}, false);

