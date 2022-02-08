'use strict';

const p2p = require("p2plib");
const WebSocket = require('isomorphic-ws');

let g_Callbacks = {};

exports.HandleMessage = async function(ws, message)
{
    if (!message.params["command"])
        return;

    if (message.params["command"] == "getbalance")
    {
        
    }
    /*const responce = {request: "listPeers", params: {uid: message.params.uid, TTL: 3-(message.params.TTL+1), list: await peers.GetLastPeers(ws["remote_address"]) } };

    if (ws.readyState === WebSocket.OPEN && responce.params.list.length > 0) 
    {
        ws.send(JSON.stringify(responce));  

        if (ws["connectedToMe"] && ws["connectedToMe"] > g_constants.MAX_CONNECTIONS)
            ws.close();
    }  */
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