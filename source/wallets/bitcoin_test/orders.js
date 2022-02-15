"use strict";

const bitcoin = require("bitcoinjs-lib")
const customP2P = require("../../server/p2p/custom")
const tbtc_utils = require("./utils")

exports.CreateOrder = function(mnemonic, sell_amount, buy_amount, buy_coin = "txmr")
{
    const address = tbtc_utils.GetAddress(mnemonic);

    return new Promise(ok => {
        return customP2P.SendMessage({
            command: "new_order", 
            //request: {sell_amount: sell_amount, buy_amount,},
            coin: "tbtc"}, () => 
        {
            try { ok({status: true}) }
            catch(e) { ok({status: false, message: e.message}) }
        });

    })
}