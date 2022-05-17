// @ts-nocheck
"use strict";

const tbtc_utils = require("./utils")
const utils = require("../../utils")
const g_constants = require("../../constants")

exports.HandleCreateOrder = async function(params)
{
    if (typeof window !== 'undefined')  return null;

    try {
        const check = utils.VerifySignature(params.request, params.sign)
        if (!check)
            return {result: false, message: "Signature error"};

        let _order = JSON.parse(params.request);
        _order["request"] = params.request;
        _order["sign"] = params.sign;

        const order = _order;

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

        const balanceInOrders = await GetBalanceInOrders(order.seller_pubkey);

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

