"use strict";

const customP2P = require("../../server/p2p/custom")
const tbtc_utils = require("./utils")
const utils = require("../../utils")
const g_constants = require("../../constants")

exports.HandleListOrders = async function(params)
{
    try {
        return {result: true, orders: await utils.GetOrdersFromDB(params.coin), sell_coin: params.coin};
    }
    catch(e) {
        console.log(e);
        return null;
    }

}

exports.HandleCreateOrder = async function(params)
{
    if (typeof window !== 'undefined')  return null;

    try {
        const check = utils.VerifySignature(params.request, params.sign)
        if (!check)
            return {result: false, message: "Signature error"};

        const order = JSON.parse(params.request);

        if (order.sell_amount*1 <= 100)
            return {
                result: false, 
                message: "Too small sell amount: "+(order.sell_amount/100000000).toFixed(8)*1
            };

        if (order.buy_amount*1 <= 100)
            return {
                result: false, 
                message: "Too small buy amount: "+(order.buy_amount/100000000).toFixed(8)*1
            };

        const request = JSON.stringify({
            request: "blockchain.scripthash.get_balance",
            params: [utils.Hash256("76a914"+order.seller_pubkey + "88ac", "hex", true)]});

        const strBalanceFull = await tbtc_utils.Electrum({request: request, coin: "tbtc"})

        if (strBalanceFull == null)
            return null; //{result: false, message: "Check bakance error"};

        const balanceFull = JSON.parse(strBalanceFull).confirmed;

        if (order.sell_amount > balanceFull)
            return {
                result: false, 
                message: "Sell order ("+(order.sell_amount/100000000).toFixed(8)*1+") > Balance ("+(balanceFull/100000000).toFixed(8)*1+")"
            };

        const balanceInOrders = await GetBalanceInOrders(order.p2pkh);

        if (order.sell_amount + balanceInOrders > balanceFull)
            return {
                result: false, 
                message: "All orders ("+((order.sell_amount + balanceInOrders)/100000000).toFixed(8)*1+") > Balance ("+(balanceFull/100000000).toFixed(8)*1+")"
            };

        return await utils.SaveOrderToDB(order, params["uid"]);
    }
    catch(e) {
        console.log(e);
        return null;
    }
 }

 /*exports.dbTables = [
    {
       'name' : 'orders',
       'cols' : [
           ['uid', 'TEXT UNIQUE PRIMARY KEY'],
           ['time', 'INTEGER'],
           ['sell_amount', 'TEXT'],
           ['buy_amount', 'TEXT'],
           ['sell_coin', 'TEXT'],
           ['seller_pubkey', 'TEXT'],
           ['buy_coin', 'TEXT'],
           ['json', 'TEXT']
         ]
    },
]; */

 async function GetBalanceInOrders(pubkey)
 {
    const rows = await g_constants.dbTables["orders"].Select("SUM(sell_amount) AS balanceInOrders", "seller_pubkey='"+escape(pubkey)+"' AND sell_coin='tbtc'")

    if (rows && rows.length)    
        return rows[0].balanceInOrders*1;

    return 0;
}

exports.CreateOrder = function(mnemonic, sell_amount, buy_amount, buy_coin = "txmr")
{
    const address = tbtc_utils.GetAddress(mnemonic);

    const order = {
        sell_amount: sell_amount, 
        buy_amount: buy_amount, 
        sell_coin: "tbtc", 
        seller_pubkey: address.p2pkh.hash.toString("hex"),
        buy_coin: buy_coin}

    const sign = utils.SignObject(order, address.privateKey)

    return new Promise(ok => {
        return customP2P.SendMessage({
            command: "new_order", 
            request: sign.message,
            sign: sign.signature,
            coin: "tbtc"}, result => 
        {
            try { 
                return ok( result )
            }
            catch(e) { ok({result: false, message: e.message}) }
        });

    })
}
