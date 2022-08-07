// @ts-nocheck
"use strict";

const tbtc = require("../wallets/bitcoin_test/utils")
const btc = require("../wallets/bitcoin_main/utils")
const txmr = require("../wallets/monero_test/utils")
const xmr = require("../wallets/monero_main/utils")
const usdx = require("../wallets/usdx/utils")
const p2p_orders = require("../server/p2p/orders")
const utils = require("../utils")
const common = require("./common")
const $ = require('jquery');

exports.Init = function()
{
    exports.UpdateOrdersTable();
    
    setInterval(exports.UpdateOrdersTable, 30*1000)

    setInterval(RefreshMyOrders, 60*1000)
}

exports.UpdateOrdersTable = function()
{
    if ($("#id_sell_coin").text() == "")
        $("#id_sell_coin").text("tbtc")

    const sell_coin = $("#id_sell_coin").text();

    utils.getOrdersFromP2P(sell_coin, async result => {
        if (!result || result.result != true || result.sell_coin != sell_coin)
            return;

        /*const timer = ShowProgressDialog(() => {
            common.AlertFail("Something wrong: timeout");
        });*/
   
        const currentSavedOrders = await exports.UpdateOrders(result.orders, result.sell_coin)

        /*clearInterval(timer);
        $("#id_orders_progress_static").hide();*/
 
        UpdateTable(currentSavedOrders);
    });

}

async function UpdateTable(currentSavedOrders)
{
    const mnemonic = utils.getMnemonic();

    $("#table_orders_body").empty()
    for (let key in currentSavedOrders)
    {
        if (currentSavedOrders[key].active == 0)
            continue;

        const orderUID = currentSavedOrders[key].uid;
        
        const myOrder = p2p_orders.getMyOrder(orderUID);
        if (!!myOrder && !!myOrder.order && !myOrder.order.active)
            continue;

        const sell_coin = currentSavedOrders[key].sell_coin;
        const buy_coin = currentSavedOrders[key].buy_coin;

        const buy_amount = currentSavedOrders[key].buy_amount;
        const sell_amount = currentSavedOrders[key].sell_amount

        const seller_pubkey = currentSavedOrders[key].seller_pubkey;

        const c_buy_fixed = (buy_coin == "txmr" || buy_coin == "xmr") ? 8 : 2;

        const td1 = $(`<td>${seller_pubkey}</td>`)
        const td2 = $(`<td>${(sell_amount / 100000000).toFixed(8)} ${sell_coin}</td>`)
        const td3 = $(`<td>${(buy_amount / sell_amount).toFixed(c_buy_fixed)} ${buy_coin}</td>`)
        
        const buttonBuy = $(`<button type="button" class="btn btn-primary btn-sm">Buy</button>`).on("click", async e => {
            common.ShowProgressDialog(() => {
                common.AlertFail("Something wrong: timeout");
            });
      
            if (! await HaveBalance(mnemonic, buy_coin, buy_amount)) 
            {
                common.HideProgressDialog();
                return common.AlertFail("Insufficient funds. Required: " + (buy_amount / 100000000).toFixed(c_buy_fixed) + " " + buy_coin)
            }

            if (sell_coin == "txmr" || sell_coin == "xmr" || sell_coin == "usdx")
            {
                const ret = await CreateSellOrder(mnemonic, buy_amount, sell_amount, buy_coin, sell_coin);

                if (ret.result && ret.uid)
                    await p2p_orders.InviteBuyer(ret.uid, orderUID)

                common.HideProgressDialog();

                return;
            }

            const ret = await p2p_orders.InitBuyOrder(mnemonic, orderUID, sell_coin, seller_pubkey, sell_amount, buy_amount, buy_coin)  
            
            common.HideProgressDialog();

            if (!ret.result) return common.AlertFail(ret.message)
            
            return common.AlertSuccess("Start processing the order")

        })

        const buttonDelete = $(`<button type="button" class="btn btn-primary btn-sm">Delete</button>`).on("click", e => {
            p2p_orders.DeleteOrder(orderUID, sell_coin)

            exports.UpdateOrdersTable();
        })

        const td4 = $("<td></td>").append(buttonBuy)

        //if (tbtc_utils.IsMyPublicKey(mnemonic, seller_pubkey))
        if (!!myOrder && !!myOrder.order && !!myOrder.order.active)
            td4.append(buttonDelete)

        const row = $("<tr></tr>").append(td1).append(td2).append(td3).append(td4)

        $("#table_orders_body").append(row)
    }

}

async function CreateSellOrder(mnemonic, sell_amount, buy_amount, sell_coin, buy_coin)
{
    common.ShowProgressDialog(() => {
        common.AlertFail("Something wrong: timeout");
    });

    const result = await p2p_orders.CreateOrder(mnemonic, sell_amount.toFixed(0)*1, buy_amount.toFixed(0)*1, sell_coin, buy_coin);

    common.HideProgressDialog();
    
    if (result && result.result == false)
        return common.AlertFail(result.message);

    if (result.sell_coin != sell_coin)
    {
        common.AlertFail("Sell coin mismatch "+result.sell_coin);
        return result;
    }

    if (result && result.result == true)
    {
        exports.UpdateOrders(result.orders, result.sell_coin, true);

        if (result.orders.length)
            common.AlertSuccess("Orders updated!"); 
        else
            common.AlertFail("Orders NOT updated!");          
    }  

    return result;
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
        if (buy_coin == "xmr")
        {
            const addressXMR = await xmr.GetAddress(mnemonic)
            xmr.GetBalance(addressXMR, balance => {
                if (buy_amount / 100000000 >= (balance.confirmed / 1000000000000).toFixed(8)*1.0 || 0) return ok(false)
                return ok (true)
            })
            
        }
        if (buy_coin == "usdx")
        {
            const addressUSDX = await usdx.GetAddress(mnemonic)
            usdx.GetBalance(addressUSDX, balance => {
                if (buy_amount / 100000000 >= (balance.confirmed / 100).toFixed(2)*1.0 || 0) return ok(false)
                return ok (true)
            })
            
        }
        if (buy_coin == "tbtc")
        {
            tbtc.GetBalance(mnemonic, balance => {
                if (buy_amount / 100000000 >= (balance.confirmed / 100000000).toFixed(8)*1.0 || 0) return ok(false)
                return ok (true)
            })
        }
        if (buy_coin == "btc")
        {
            btc.GetBalance(mnemonic, balance => {
                if (buy_amount / 100000000 >= (balance.confirmed / 100000000).toFixed(8)*1.0 || 0) return ok(false)
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
    let savedOrders = await utils.GetOrdersFromDB();

    if (!orders || !orders.length)
        return savedOrders;

    for (let i=0; i<orders.length; i++)
    {
        const order = orders[i];
        if (!order["uid"] || !order["json"] || order["uid"] == "undefined")
            continue;

        const myOrder = p2p_orders.getMyOrder(order.uid);
        if (!!myOrder && !!myOrder.order && !myOrder.order.active)
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
        UpdateTable(savedOrders);

    return savedOrders;
}

async function RefreshMyOrders()
{
    if ($("#id_sell_coin").text() == "")
        $("#id_sell_coin").text("tbtc")

    const savedOrders = await utils.GetOrdersFromDB();

    for (let key in savedOrders)
        p2p_orders.RefreshOrder(savedOrders[key].uid);
 }

 let g_Logs = {}
exports.SwapLog = function(text, level, id, ctx)
{
    let color = "text-primary";
    if (level == "s")
        color = "text-success"
    if (level == "e")
        color = "text-danger"
    if (level == "i")
        color = ".text-info"

    if (!!g_DeletedLogs[id+level])
        return;

    if (!g_Logs[id+level] && (level == "b" || level == "s"))
        InitNewLog(level, id, ctx)

    if (!!g_Logs[id+level])
    {
        g_Logs[id+level].push({level: level, text: text})

        utils.SaveObjectToDB(g_Logs, "swap_logs")
    }   

    if (level == "b" || level == "s")
    {
        const logTD = $(`<td><span class="${color}">${text}</span></td>`)
        $(`#table_swaps_log_${level}_${id}_body`).append($("<tr></tr>").append(logTD))

        if (!ctx)
            ctx = level == "b" ? utils.GetObjectFromDB(`swap_buy_${id}`) : utils.GetObjectFromDB(`swap_sell_${id}`);

        const status = ctx && ctx.status ? ctx.status : "100"
        $(`#processed_${level}_${id}`).text(status)
    }
    else
    {
        const logTD = $(`<td><span class="${color}">${text}</span></td>`)
        $(`#table_swaps_log_common_body`).append($("<tr></tr>").append(logTD))
    }
}

let g_DeletedLogs = {}
function InitNewLog(level, id, ctx)
{
    g_Logs[id+level] = [];

    const objName = level == "s" ? `swap_sell_${id}` : `swap_buy_${id}`

    let info = utils.GetObjectFromDB(objName)
    if (!info)  
        info = ctx;

    const header = info ? 
        level == "s" ? 
            `Sell ${info.sell_amount/100000000} ${info.sell_coin}, buy ${info.buy_amount/100000000} ${info.buy_coin}.`: 
            `Buy ${info.sell_amount/100000000} ${info.sell_coin}, sell ${info.buy_amount/100000000} ${info.buy_coin}.` : 
        'Completed swap.' 

    const html = `
        <div class="accordion-item" id="item__${level}_${id}">
            <div class="d-md-flex" id="heading_${level}_${id}">
                 <button class="accordion-button pt-0 pb-0 ${!info ? "collapsed" : ""}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_${level}_${id}" aria-expanded="${info ? true : false}" aria-controls="collapse_${level}_${id}">
                    <span class="${level == "b" ? "text-primary" : "text-success"}">${header} Swap id: ${id}. Processed: <span id="processed_${level}_${id}">${info ? info.status : 100}</span> %</span>
                </button>
               <button type="button" id="close_${level}_${id}" class="btn-close p-1 m-1" aria-label="Close"></button>
            </div>
            <div id="collapse_${level}_${id}" class="accordion-collapse collapse ${info ? "show" : ""}" aria-labelledby="heading_${level}_${id}" data-bs-parent="#accordion_logs_${level}">
                <div class="accordion-body">
                    <table class="table table-bordered table-sm">
                        <thead>
                            <tr>
                                <th scope="col">Swap Log</th>
                            </tr>
                        </thead>
                        <tbody id="table_swaps_log_${level}_${id}_body">
      
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `
    $(`#accordion_logs_${level}`).prepend(html)

    $(`#close_${level}_${id}`).on("click", e => {
        if (g_Logs[id+level])
            delete g_Logs[id+level];
        
        $(`#item__${level}_${id}`).remove()
        utils.SaveObjectToDB(g_Logs, "swap_logs")

        if (level == "s")
            utils.DeleteObjectFromDB(`swap_sell_${id}`)
        if (level == "b")
            utils.DeleteObjectFromDB(`swap_buy_${id}`)

        g_DeletedLogs[id+level] = true;
    })
}

exports.InitSavedOrders = async function()
{
    $(`#accordion_logs_b`).empty();
    $(`#accordion_logs_s`).empty();

    const seller = require("../swap/sellerBTC")
    const buyer = require("../swap/buyerBTC")

    const Logs = utils.GetObjectFromDB("swap_logs")
    if (!Logs) return;

    for (let logkey in Logs)
    {
        const logs = Logs[logkey]
        const swapID = logkey.substring(0, logkey.length-1);

        if (logs.length > 100)
            continue;
        
        await RestoreLogs(logs, swapID);
        await utils.sleep(100);
    }


    for(let key in localStorage) 
    {
        if (key.indexOf("swap_sell_") == 0)
        {
            const swapID = key.substring(10);

            seller.WaitTransactions(swapID, 1);
            continue;
        }

        if (key.indexOf("swap_buy_") == 0)
        {
            const swapID = key.substring(9)
            
            buyer.WaitConfirmation(swapID);
            continue;
        }
    }  
    
    function RestoreLogs(logs, swapID)
    {
        return new Promise(async ok => {
            for (let i=0; i<logs.length; i++)
            {
                exports.SwapLog(logs[i].text, logs[i].level, swapID)
                await utils.sleep(1);
            }
            return ok();    
        })
    }
}