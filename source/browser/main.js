"use strict";
const P2P = require("p2plib"); 

// @ts-ignore
global.p2p = new p2plib()

document.addEventListener('DOMContentLoaded', async () => {

    require("./tab_network.js").Init();
    require("./tab_orders.js").Init();
    require("./tab_wallets.js").Init();

}, false);

exports.BLOCKCHAIN = "testnet"

$("#wallet_usdx").hide()

$('#blockchain').on('change', function () {
    exports.BLOCKCHAIN = $("#blockchain option:selected").val();
    if (exports.BLOCKCHAIN != "mainnet")
        $("#wallet_usdx").hide()
    else
        $("#wallet_usdx").show()

});