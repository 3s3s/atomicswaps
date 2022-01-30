'use strict';

const WebSocket = require('isomorphic-ws');
const peers = require("../peers")
const g_constants = require("../../constants")

exports.HandleMessage = async function(ws, client)
{
    const responce = {request: "listPeers", params: {uid: client.params.uid, TTL: 3-(client.params.TTL+1), list: await peers.GetLastPeers(ws["remote_address"]) } };

    if (ws.readyState === WebSocket.OPEN && responce.params.list.length > 0) 
    {
        ws.send(JSON.stringify(responce));  

        if (ws["connectedToMe"] && ws["connectedToMe"] > g_constants.MAX_CONNECTIONS)
            ws.close();
    }  

    return;     
}