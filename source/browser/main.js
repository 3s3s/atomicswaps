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

$("#wallet_usdx").hide();
$("#wallet_txmr").hide();
$("#wallet_tbtc").hide();
$("#wallet_xmr").hide();
$("#wallet_btc").hide();

OnNetworkChange();

$('#blockchain').on('change', () => {
    OnNetworkChange()
});

function OnNetworkChange()
{
    exports.BLOCKCHAIN = $("#blockchain option:selected").val();
    if (exports.BLOCKCHAIN != "mainnet")
    {
        $("#wallet_usdx").hide();
        $("#wallet_xmr").hide();
        $("#wallet_btc").hide();
        
        $("#wallet_txmr").show()
        $("#wallet_tbtc").show()

        $("#coin_to_buy").text("txmr")
        $("#coin_to_buy2").hide()
    }
    else
    {
        $("#wallet_txmr").hide()
        $("#wallet_tbtc").hide()

        $("#wallet_usdx").show()
        $("#wallet_xmr").show()
        $("#wallet_tbtc").show()
        
        $("#coin_to_buy").text("usdx")
        $("#coin_to_buy").text("xmr")
        $("#coin_to_buy2").hide(); //.show()
    }
    require("./tab_wallets").ShowBalances(true)
}