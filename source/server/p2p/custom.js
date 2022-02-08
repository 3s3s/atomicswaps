'use strict';

const p2p = require("p2plib");

let g_Callbacks = {};

exports.HandleMessage = async function(message)
{
    if (!message["params"] || !message.params["command"] || !message.params["uid"])
        return;

    if (message.params["command"] == "getbalance")
    {
        //{command: "getbalance", address: address, coin: "tbtc"}

        let balance = 0;

        if (message.params["coin"] == "tbtc")
            balance = await require("../../wallets/bitcoin_test/utils").GetAddressBalance(message.params["address"])
        if (message.params["coin"] == "txmr")
            balance = await require("../../wallets/monero_test/utils").GetAddressBalance(message.params["address"])

        p2p.broadcastMessage({request: "custom", params: {uid: message.params["uid"], command: "answer", value: balance}});
        
        return FreeMemory();                
    }

    if (message.params["command"] == "answer" && g_Callbacks[message.params.uid])
    {
        g_Callbacks[message.params.uid].callback(message.params);
        delete g_Callbacks[message.params.uid];
        return;
    }

    return;     
}

exports.SendMessage = function(params, callback)
{
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
        if (g_Callbacks[key].time < date - 60*1000)
            continue;
        tmp[key] = g_Callbacks[key];
    }
    g_Callbacks = tmp;
}