'use strict';

const WebSocket = require('ws');
const utils = require("../utils")
const g_constants = require("../constants")
const peers = require("./peers")

/* WebSocket message JSON format: {request: "getPeers", params: {uid: "qwert", TTL: 3, ...} } 

Supported commands:
getPeers - requesting peers from P2P network. Example: {request: "getPeers", params: {uid: "qwert", TTL: 3} } 
listPeers - returned list of peers. Example: {request: "listPeers", params: {uid: "qwert", TTL: 3, list: [1.1.1.1:10443, 1.2.3.4:10443, ...] } } 

*/

function SendError(ws, uid, message)
{
   if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'error', params: {uid: uid, TTL: 0, message: message} }));
}

exports.handleConnection = function(ws)
{
    if (utils.IsBockedAddress(ws["remote_address"]))
    {
        console.log("blocked request")
        return;       
    }
    ws.isAlive = true;
 
    peers.GetPort(ws);
 
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    ws.on('error', (err) => {
        ws.isAlive = false;
    });
    ws.on('close', (err) => {
        ws.isAlive = false;
    });

    ws.on('message', data => 
    {          
        if (!data || !data.length)
            return SendError(ws, 'Error: empty message');

        let client = {};
        try {
            client = JSON.parse(data);
        } catch(e) {
            return SendError(ws, 'Error: '+e.message);    
        }
        
        if (!client.params)
            return SendError(ws, utils.createUID(), 'Error: "params" not found. Syntax should be: {request: "getPeers", params: {uid: "qwert", TTL: 3, ...} }');
        if (!client.params.uid)
            return SendError(ws, utils.createUID(), 'Error: "uid" not found. Syntax should be: {request: "getPeers", params: {uid: "qwert", TTL: 3, ...} }');
        if (client.params.TTL*1 > 4)
            return SendError(ws, client.params.uid, 'Error: TTL is too big. Should be less than 4');
        if (!client.request)
            return SendError(ws, client.params.uid, 'Error: "request" not found. Syntax should be: {request: "getPeers", params: {uid: "qwert", TTL: 3, ...} }');

        client.params.TTL = client.params.TTL*1 - 1;
        if (client.params.TTL*1 >= 0)
            exports.broadcastMessage(ws["remote_address"], client)

        SendResponce(ws, client);
    });   
}

exports.broadcastMessage = function(ip, client)
{
    g_constants.WEB_SOCKETS.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN && ws["remote_address"] != ip)
            ws.send(JSON.stringify(client));        
    })

    peers.broadcastMessage(ip, client);
}

exports.IsConnected = function(peer)
{
    let ret = false;
    g_constants.WEB_SOCKETS.clients.forEach(ws => {
        if (peer.indexOf(ws["remote_address"]) >= 0 && ws.readyState === WebSocket.OPEN)
            ret = true;
    })
    return ret;
}

async function SendResponce(ws, client)
{
    if (client.request == 'getPeers')
    {
        const responce = {request: "listPeers", params: {uid: client.params.uid, TTL: 3, list: await peers.GetLastPeers(ws["remote_address"]) } };

        if (ws.readyState === WebSocket.OPEN && responce.params.list.length > 0) 
            return ws.send(JSON.stringify(responce));    

        return;     
    }
 
    if (client.request == 'getPort')
    {
        if (client.params.address)
        {
            const parts = client.params.address.split(":");
            let address = "";
            for (let i=0; i<parts.length; i++)
            {
                if (parts[i].length > 5 && parts[i].indexOf(".") > 0)
                {
                    address = parts[i];
                    break;
                }
            }

            const responce = {request: "listPeers", params: {uid: client.params.uid, TTL: 0, list: [address+":"+g_constants.my_portSSL] } };
            
            //console.log('getPort from '+ws["remote_address"]+"  answer: "+address+":"+g_constants.my_portSSL)

            if (ws.readyState === WebSocket.OPEN && responce.params.list.length > 0) 
                return ws.send(JSON.stringify(responce));    

        }
        return;     
    }

    if (client.request == 'listPeers')
    {
        if (client.params.list && client.params.list.length)
            return peers.SavePeers(client.params.uid, client.params.list);

        return;
    }
   
    SendError(ws, 'Error: invalid request. Now supported only getPeers, listPeers');
}
