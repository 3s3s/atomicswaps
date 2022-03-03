'use strict';

const p2p = require("p2plib");
const utils = require("../../utils")

let g_Callbacks = {};

exports.HandleMessage = async function(message)
{
    if (!message["params"] || !message.params["command"] || !message.params["uid"])
        return;

    let answer = null;

    if (message.params["command"] == "electrum")
    { 
        if (message.params["coin"] == "tbtc")
            answer = await require("../../wallets/bitcoin_test/utils").Electrum(message.params)
    }
    if (message.params["command"] == "monerod")
    { 
        if (message.params["coin"] == "txmr")
            answer = await require("../../wallets/monero_test/utils").Wallet(message.params)
    }
    if (message.params["command"] == "new_order")
    {
        if (message.params["coin"] == "tbtc")
            answer = await require("../../wallets/bitcoin_test/orders").HandleCreateOrder(message.params)
    }

    if (message.params["command"] == "listOrders")
    {
        if (message.params["coin"] == "tbtc")
            answer = await require("../../wallets/bitcoin_test/orders").HandleListOrders(message.params)
    }

    if (message.params["command"] == "deleteOrder" && message.params.request && message.params.sign)
         answer = await utils.DeleteOrderFromDB(message.params)

    if (message.params["command"] == "refreshOrder" && message.params.request && message.params.sign)
        answer = await utils.RefreshOrderInDB(message.params)

        
    if (answer != null)
        p2p.broadcastMessage({
            request: "custom", 
            params: {
                destination: message.params["uid"], 
                command: "answer", 
                serverKey: message.params.serverKey || false, 
                values: answer
            }
        });

    if (message.params["command"] == "answer" && g_Callbacks[message.params.destination] !== undefined && message.params.values)
    {
        const values = message.params.serverKey && message.params.serverKey == require("../../constants").clientDHkeys.server_pub ? 
            require("../../utils").ClientDH_Decrypt(message.params.values) : message.params.values;

        g_Callbacks[message.params.destination].callback(values);
    }

    return FreeMemory();     
}

exports.SendMessage = function(params, callback)
{
    const connected = p2p.GetConnectedPeers();

    if (!connected.length)
        return setTimeout(exports.SendMessage, 50000, params, callback)

    const message = {request: "custom", params: params}
    const uid = p2p.broadcastMessage(message);

    if (uid) g_Callbacks[uid] = {callback: callback, time: Date.now()};

    FreeMemory();
}

function FreeMemory()
{
    const date = Date.now();

    let tmp = {}
    for (let key in g_Callbacks)
    {
        if (g_Callbacks[key].time < date - 3*60*1000)
            continue;
        tmp[key] = g_Callbacks[key];
    }
    g_Callbacks = tmp;
}