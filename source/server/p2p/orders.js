'use strict';
const tbtc_utils = require("../../wallets/bitcoin_test/utils")
const utils = require("../../utils")
const customP2P = require("./custom")

exports.CreateOrder = function(mnemonic, sell_amount, buy_amount, sell_coin = "tbtc", buy_coin = "txmr")
{
    const address = tbtc_utils.GetAddress(mnemonic);

    const order = {
        sell_amount: sell_amount, 
        buy_amount: buy_amount, 
        sell_coin: sell_coin, 
        seller_pubkey: address.p2pkh.hash.toString("hex"),
        time: Date.now(),
        buy_coin: buy_coin,
        active: 1
    }

    const sign = utils.SignObject(order, address.privateKey)

    return new Promise(ok => {
        return customP2P.SendMessage({
            command: "new_order", 
            request: sign.message,
            sign: sign.signature,
            coin: sell_coin}, result => 
        {
            try { 
                result["seller_pubkey"] = order.seller_pubkey;
                return ok( result )
            }
            catch(e) { ok({result: false, message: e.message}) }
        });

    })
}

exports.DeleteOrder = function(mnemonic, uid, coin = "tbtc")
{
    const address = tbtc_utils.GetAddress(mnemonic);

    const order = {
        seller_pubkey: address.p2pkh.hash.toString("hex"),
        uid: uid,
        active: 0
    }

    const sign = utils.SignObject(order, address.privateKey)

    return new Promise(ok => {
        return customP2P.SendMessage({
            command: "deleteOrder", 
            request: sign.message,
            sign: sign.signature,
            coin: coin}, result => 
        {
            try { 
                if (result.result == true)
                {
                    utils.DeleteOrderFromDB({uid: uid, sell_coin: coin})
                }
                return ok( result )
            }
            catch(e) { ok({result: false, message: e.message}) }
        });

    })
}

exports.RefreshOrder = function(mnemonic, orderOld)
{
    const address = tbtc_utils.GetAddress(mnemonic);

    if (orderOld.seller_pubkey != address.p2pkh.hash.toString("hex"))
        return;

    const order = {
        sell_amount: orderOld.sell_amount, 
        buy_amount: orderOld.buy_amount, 
        sell_coin: orderOld.sell_coin, 
        seller_pubkey: orderOld.seller_pubkey,
        time: Date.now(),
        uid: orderOld.uid,
        buy_coin: orderOld.buy_coin,
        active: 1
    }
    
    const sign = utils.SignObject(order, address.privateKey)

    return new Promise(ok => {
        return customP2P.SendMessage({
            command: "refreshOrder", 
            request: sign.message,
            sign: sign.signature,
            coin: orderOld.sell_coin}, result => 
        {
            try { 
                return ok( result )
            }
            catch(e) { ok({result: false, message: e.message}) }
        });

    })
}
