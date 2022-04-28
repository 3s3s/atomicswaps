"use strict";

const tbtc_utils = require("../wallets/bitcoin_test/utils")
const txmr = require("../wallets/monero_test/utils")
const p2p_orders = require("../server/p2p/orders")
const utils = require("../utils")
const common = require("./common")
const $ = require('jquery');


exports.Init = function()
{
    UpdateOrdersTable();
    
    setInterval(UpdateOrdersTable, 30*1000)

    setInterval(RefreshMyOrders, 60*1000)
}

function ShowProgressDialog(callback = null)
{
    $("#id_orders_progress_static").attr("aria-valuenow", 180);
    $("#id_orders_progress_static").css("width", "100%");
    $("#id_orders_progress_static").text("180");
    $("#id_orders_progress_static").show();

    const now = Date.now();

    const nIntervalID = setInterval(() => {

        const currPos = (180 - (Date.now() - now)/1000);

        if (currPos < 0)
        {
            clearInterval(nIntervalID);
            $("#id_orders_progress_static").hide();

            if (callback) callback();
            return;
        }

        const showPos = ((100*currPos)/180).toFixed(0)*1

        $("#id_orders_progress_static").attr("aria-valuenow", currPos);
        $("#id_orders_progress_static").css("width", showPos+"%");
        $("#id_orders_progress_static").text(currPos.toFixed(0))
    
    }, 1000)

    return nIntervalID;
}


function UpdateOrdersTable()
{
    if ($("#id_sell_coin").text() == "")
        $("#id_sell_coin").text("tbtc")

    const sell_coin = $("#id_sell_coin").text();

    utils.getOrdersFromP2P(sell_coin, async result => {
        if (!result || result.result != true || result.sell_coin != sell_coin)
            return;

        const timer = ShowProgressDialog(() => {
            common.AlertFail("Something wrong: timeout");
        });
   
        const currentSavedOrders = await exports.UpdateOrders(result.orders, result.sell_coin)

        clearInterval(timer);
        $("#id_orders_progress_static").hide();
 
        UpdateTable(currentSavedOrders, result.sell_coin);
    });

}

async function UpdateTable(currentSavedOrders, sell_coin)
{
    const mnemonic = $("#wallet_seed").val();

    $("#table_orders_body").empty()
    for (let key in currentSavedOrders)
    {
        if (currentSavedOrders[key].active == 0)
            continue;

        const orderUID = currentSavedOrders[key].uid;

        const buy_coin = currentSavedOrders[key].buy_coin;

        const buy_amount = currentSavedOrders[key].buy_amount;
        const sell_amount = currentSavedOrders[key].sell_amount

        const seller_pubkey = currentSavedOrders[key].seller_pubkey;

        const td1 = $(`<td>${seller_pubkey}</td>`)
        const td2 = $(`<td>${(sell_amount / 100000000).toFixed(8)} ${sell_coin}</td>`)
        const td3 = $(`<td>${(buy_amount / sell_amount).toFixed(8)} ${buy_coin}</td>`)
        
        const buttonBuy = $(`<button type="button" class="btn btn-primary btn-sm">Buy</button>`).on("click", async e => {
            if (! await HaveBalance(mnemonic, buy_coin, buy_amount)) return common.AlertFail("Insufficient funds. Reguired:" + (buy_amount / 100000000).toFixed(8) + " " + buy_coin)

            const ret = await p2p_orders.InitBuyOrder(mnemonic, orderUID, sell_coin, seller_pubkey, sell_amount, buy_amount, buy_coin)          

            if (!ret.result) return common.AlertFail(ret.message)
            //return {result: true, txFirst: tx, txSecond: txNew}

            if (sell_coin == "tbtc")
            {
                //const txid1 = await tbtc_utils.broadcast(ret.txFirst.toHex());
                //const txid2 = await tbtc_utils.broadcast(ret.txSecond.toHex());
                alert(ret.txFirst.toHex())
                alert(ret.txSecond.toHex())
                
                alert("ok")

            }

            
        })

        const buttonDelete = $(`<button type="button" class="btn btn-primary btn-sm">Delete</button>`).on("click", e => {
            p2p_orders.DeleteOrder(orderUID, sell_coin)

            UpdateOrdersTable();
        })

        const td4 = $("<td></td>").append(buttonBuy)

        //if (tbtc_utils.IsMyPublicKey(mnemonic, seller_pubkey))
        if (p2p_orders.getMyOrder(orderUID) != null)
            td4.append(buttonDelete)

        const row = $("<tr></tr>").append(td1).append(td2).append(td3).append(td4)

        $("#table_orders_body").append(row)
    }

}

function HaveBalance(mnemonic, buy_coin, buy_amount)
{
    return new Promise(async ok => {
        if (buy_coin == "txmr")
        {
            const addressTXMR = await txmr.GetAddress(mnemonic)
            txmr.GetBalance(addressTXMR, balance => {
                if (buy_amount / 100000000 >= (balance.confirmed / 1000000000000).toFixed(8)*1.0 || 0) return ok(false)
                return ok (true)
            })
            
        }
    })
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
    let savedOrders = await utils.GetOrdersFromDB(sell_coin);

    if (!orders || !orders.length)
        return savedOrders;

    for (let i=0; i<orders.length; i++)
    {
        const order = orders[i];
        if (!order["uid"] || !order["json"] || order["uid"] == "undefined")
            continue;

        if (savedOrders[order.uid])
        {
            if (savedOrders[order.uid].active == 1)
            {
                savedOrders[order.uid].time = Date.now();
                continue;
            }

            if (savedOrders[order.uid].active == 0)
                p2p_orders.DeleteOrder(order.uid, sell_coin)

            continue;
        }

        try {
            const checker = JSON.parse(unescape(order.json));
            if (!checker["request"] || !checker["sign"])
                continue;

            if (!utils.VerifySignature(checker["request"], checker["sign"]))
                continue;

            const _order = JSON.parse(checker["request"])
            if (_order.time != order.time || _order.active != order.active)
                continue;

            savedOrders[order.uid] = _order
            savedOrders[order.uid]["uid"] = order.uid
            savedOrders[order.uid].time = Date.now();
        }
        catch(e) {
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

    const savedOrders = await utils.GetOrdersFromDB(sell_coin);

    for (let key in savedOrders)
        p2p_orders.RefreshOrder(savedOrders[key].uid);
 }

exports.SwapLog = function(text, level)
{
    let color = "text-primary";
    if (level == "s")
        color = "text-success"
    if (level == "e")
        color = "text-danger"
    if (level == "i")
        color = ".text-info"
    
    const logTD = $(`<td><span class="${color}">${text}</span></td>`)

    $("#table_swaps_log_body").append($("<tr></tr>").append(logTD))
}

