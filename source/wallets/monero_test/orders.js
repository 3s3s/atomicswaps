// @ts-nocheck
"use strict";

const utils = require("../../utils")
const txmr = require("../monero_test/utils")
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

        const balance = await txmr.GetBalance(order.addressMonero);

        if (balance.confirmed/1000000000000 < order.sell_amount/100000000) 
            return {
                result: false, 
                message: `Not enough funds (${balance.confirmed/1000000000000} < ${order.sell_amount/100000000})`}


        const balanceInOrders = await GetBalanceInOrders(order.seller_pubkey);

        if (order.sell_amount + balanceInOrders > balance.confirmed)
            return {
                result: false, 
                message: "All orders ("+((order.sell_amount + balanceInOrders)/1000000000000).toFixed(8)*1+") > Balance ("+(balance.confirmed/1000000000000).toFixed(8)*1+")"
            };

        return await utils.SaveOrderToDB(order, params["uid"]);
    }
    catch(e) {
        console.log(e);
        return null;
    }
}

async function GetBalanceInOrders(pubkey)
{
    const rows = await g_constants.dbTables["orders"].Select("SUM(sell_amount) AS balanceInOrders", "seller_pubkey='"+escape(pubkey)+"' AND sell_coin='txmr'")

    if (rows && rows.length)    
        return rows[0].balanceInOrders*1;

    return 0;
}


