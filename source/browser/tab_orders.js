"use strict";

const tbtc_orders = require("../wallets/bitcoin_test/orders")
const tbtc_utils = require("../wallets/bitcoin_test/utils")
const utils = require("../utils")
const $ = require('jquery');

exports.Init = function()
{
    UpdateOrdersTable();
    
    setInterval(UpdateOrdersTable, 30*1000)

    setInterval(RefreshMyOrders, 60*1000)
}

async function UpdateOrdersTable()
{
    if ($("#id_sell_coin").text() == "")
        $("#id_sell_coin").text("tbtc")

    const sell_coin = $("#id_sell_coin").text();

    const result = await utils.getOrdersFromP2P(sell_coin);

    if (!result || result.result != true || result.sell_coin != sell_coin)
        return;

    const currentSavedOrders = await exports.UpdateOrders(result.orders, result.sell_coin)

    UpdateTable(currentSavedOrders, result.sell_coin);
}

function UpdateTable(currentSavedOrders, sell_coin)
{
    const mnemonic = $("#wallet_seed").val();

    $("#table_orders_body").empty()
    for (let key in currentSavedOrders)
    {
        const orderUID = currentSavedOrders[key].uid;

        const td1 = $(`<td>${currentSavedOrders[key].seller_pubkey}</td>`)
        const td2 = $(`<td>${(currentSavedOrders[key].sell_amount / 100000000).toFixed(8)} ${sell_coin}</td>`)
        const td3 = $(`<td>${(currentSavedOrders[key].buy_amount / (currentSavedOrders[key].sell_amount)).toFixed(8)} ${currentSavedOrders[key].buy_coin}</td>`)
        
        const buttonDelete = $(`<button type="button" class="btn btn-primary btn-sm">Delete</button>`).on("click", e => {
            if (sell_coin == "tbtc")
                tbtc_orders.DeleteOrder(mnemonic, orderUID)

            UpdateOrdersTable();
        })

        const td4 = $("<td></td>")

        if (tbtc_utils.IsMyPublicKey(mnemonic, currentSavedOrders[key].seller_pubkey))
            td4.append(buttonDelete)

        const row = $("<tr></tr>").append(td1).append(td2).append(td3).append(td4)

        $("#table_orders_body").append(row)
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

exports.UpdateOrders = async function(orders, sell_coin, updatetable = false)
{
    if (!orders || !orders.length)
        return {};

    let savedOrders = await utils.GetOrdersFromDB(sell_coin);

    for (let i=0; i<orders.length; i++)
    {
        const order = orders[i];
        if (!order["uid"])
            continue;

        if (!savedOrders[order.uid])
        {
            savedOrders[order.uid] = order;
            continue;
        }
    }

    utils.SaveOrdersToDB(savedOrders, sell_coin);

    if (updatetable)
        UpdateTable(savedOrders, sell_coin);

    return savedOrders;
}

async function RefreshMyOrders()
{
    if ($("#id_sell_coin").text() == "")
        $("#id_sell_coin").text("tbtc")

    const sell_coin = $("#id_sell_coin").text();
    const mnemonic = $("#wallet_seed").val();

    const savedOrders = await utils.GetOrdersFromDB(sell_coin);

    for (let key in savedOrders)
    {
        if (sell_coin == "tbtc")
            tbtc_orders.RefreshOrder(mnemonic, savedOrders[key].uid, savedOrders[key].seller_pubkey)
    }
}