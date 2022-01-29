'use strict';

const WebSocket = require('isomorphic-ws');
const utils = require("../utils")
const g_constants = require("../constants")
const peers = require("./peers")

/* WebSocket message JSON format: {request: "getPeers", params: {uid: "qwert", TTL: 3, ...} } 

Supported commands:
getPeers - requesting peers from P2P network. Example: {request: "getPeers", params: {uid: "qwert", TTL: 3} } 
listPeers - returned list of peers. Example: {request: "listPeers", params: {uid: "qwert", TTL: 3, list: [1.1.1.1:10443, 1.2.3.4:10443, ...] } } 
getPort - request a listen port for remote connected client (with known IP address). Example: {request: "getPort", params: {uid: "qwert", TTL: 0, address: 1.2.3.4} } 
*/

function SendError(ws, uid, message)
{
   if (ws.readyState === WebSocket.OPEN) 
        ws.send(JSON.stringify({request: 'error', params: {uid: uid, TTL: 0, message: message} }));
}

let g_knownUIDS = {};
function IsKnownUID(uid)
{
    let newest = {}
    for (let key in g_knownUIDS)
    {
        if (g_knownUIDS[key] > Date.now() - 60*1000)
            newest[key] = g_knownUIDS[key];
    }
    g_knownUIDS = newest;

    if (g_knownUIDS[uid])
        return true;

    g_knownUIDS[uid] = Date.now();    
}

exports.handleConnection = function(ws)
{
    if (utils.IsBockedAddress(ws["remote_address"]))
    {
        ws["isAlive"] = false;
        console.log("blocked request")
        return;       
    }
    ws["isAlive"] = true;
 
    peers.GetPort(ws);
 
    if (typeof window === 'undefined')
    {
        ws.on('pong', () => {
            ws["isAlive"] = true;
        });
    }

    ws.onerror = function(err) {
        ws["isAlive"] = false;
    };
    ws.onclose = function (err) {
        ws["isAlive"] = false;
    };

    ws.onmessage = function(data)  
    {
        ws["isAlive"] = true;

        utils.UpdateSpeed(ws["remote_address"]);
        
        if (utils.GetSpeed(ws["remote_address"]) > 10)
        {
            console.log("Blocked too big message speed from host: "+ws["remote_address"])
            return;
        }

        if (!data || !data.length)
            return;

        let client = {};
        try {
            client = JSON.parse(data);
        } catch(e) {
            return;    
        }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //Check request syntax
        if (!client.request) return;
        if (client.request == 'error') return;
        if (!client.params) return;
        if (!client.params.uid) return;
        if (client.params.TTL*1 > 4)
            return SendError(ws, client.params.uid, 'Error: TTL is too big. Should be less than 4');
        if (client.params.TTL*1 < 0)
            return SendError(ws, client.params.uid, 'Error: TTL is too small. Should be more than 0');
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        //Do not responce more than one time for one "uid" if it is not our own.
        if (IsKnownUID(client.params.uid) && !peers.IsOwnUID(client.params.uid)) return;     

        client.params.TTL = client.params.TTL*1 - 1;
        if (client.params.TTL*1 >= 0 && !peers.IsOwnUID(client.params.uid))
            exports.broadcastMessage(ws["remote_address"], client)

        SendResponce(ws, client);
    };   
}

exports.broadcastMessage = function(ip, client)
{
    peers.broadcastMessage(ip, client);

    if (!g_constants.WEB_SOCKETS.clients) return;

    g_constants.WEB_SOCKETS.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN && ws["remote_address"] != ip)
            ws.send(JSON.stringify(client));        
    })
}

exports.IsConnected = function(peer)
{
    if (peers.IsConnected(peer))
        return true;

    if (!g_constants.WEB_SOCKETS.clients) return false;

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
        const responce = {request: "listPeers", params: {uid: client.params.uid, TTL: 3-(client.params.TTL+1), list: await peers.GetLastPeers(ws["remote_address"]) } };

        if (ws.readyState === WebSocket.OPEN && responce.params.list.length > 0) 
            return ws.send(JSON.stringify(responce));    

        return;     
    }
 
    if (client.request == 'getPort')
    {
        if (typeof window !== 'undefined') return;

        if (client.params.address)
        {
            const parts = client.params.address.split(":");
            let address = "";
            for (let i=0; i<Math.min(10, parts.length); i++)
            {
                if (parts[i].length > 5 && parts[i].indexOf(".") > 0)
                {
                    address = parts[i];
                    break;
                }
            }

            const responce = {request: "listPeers", params: {uid: client.params.uid, TTL: 0, list: [address+":"+g_constants.my_port] } };
            
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
   
    SendError(ws, utils.createUID(), 'Error: invalid request. Now supported only getPeers, listPeers, getPort');
}
