'use strict';

const WebSocket = require('isomorphic-ws');
const g_constants = require("../constants")
const reqHandler = require('./reqHandler.js');
const utils = require("../utils")

let g_sentUIDS = {};
let g_ConnectedPeers = [];

let g_ConnectionsInterval = 0;

exports.IsOwnUID = function(uid)
{
    if (g_sentUIDS[uid])
        return true;
    return false;
}


let g_P2P_protocol = null;
exports.Init = async function(start = true, P2P_protocol = null)
{
    g_P2P_protocol = P2P_protocol;

    if (!start)
        return StopConnections();

    ConnectNewPeers();

    g_ConnectionsInterval = setInterval(() => {
        let alivePeers = [];
        for (let i=0; i<g_ConnectedPeers.length; i++)
        {
            if (g_ConnectedPeers[i]["isAlive"] === false)
            {
                console.log("Terminate dead connection: "+g_ConnectedPeers[i]["remote_address"])
                g_ConnectedPeers[i].close();
                continue;
            }
            g_ConnectedPeers[i]["isAlive"] = false;
            alivePeers.push(g_ConnectedPeers[i])
        }
        g_ConnectedPeers = alivePeers;
    
        if (g_ConnectedPeers.length < g_constants.MAX_CONNECTIONS)
            ConnectNewPeers();

        const list = exports.GetConnectedPeers("-");
        console.log("Connected peers: "+JSON.stringify(list))
    }, 30000);   
    
    function StopConnections()
    {
        clearInterval(g_ConnectionsInterval);

        g_ConnectionsInterval = 0;

        for (let i=0; i<g_ConnectedPeers.length; i++)
            g_ConnectedPeers[i].close();
    }
}

exports.HandleMessage = function(ws, client)
{
    if (g_P2P_protocol)
        return g_P2P_protocol[client.request].HandleMessage(ws, client)

    return require("./protocol/"+client.request).HandleMessage(ws, client)
}

async function ConnectNewPeers()
{
    const peers = await utils.GetPeersFromDB("time > "+(Date.now()-60*1000));

    QueryNewPeers();

    for (let i=0; i<peers.length; i++)
        Connect(unescape(peers[i].address))

    for (let i=0; i<g_constants.seeders.length; i++)
        Connect(g_constants.seeders[i]);
}

function QueryNewPeers()
{
    const uid = utils.createUID();
    g_sentUIDS[uid] = {time: Date.now()};

    reqHandler.broadcastMessage("", {request: "getPeers", params: {uid: uid, TTL: 3} })

    ClearMemory()
}

exports.GetPort = function(ws)
{
    const uid = utils.createUID();
    g_sentUIDS[uid] = {time: Date.now()};

    const responce = {request: "getPort", params: {uid: uid, TTL: 0, address: ws["remote_address"]} };

    if (ws.readyState === WebSocket.OPEN) 
        return ws.send(JSON.stringify(responce));    

    ClearMemory()
}

exports.broadcastMessage = function(ip, client)
{
    for (let i=0; i<g_ConnectedPeers.length; i++)
    {
        if (g_ConnectedPeers[i].readyState === WebSocket.OPEN && g_ConnectedPeers[i]["remote_address"] != ip)
             g_ConnectedPeers[i].send(JSON.stringify(client));
    }
}

exports.SavePeers = function(uid, list)
{
    if (!exports.IsOwnUID(uid))
        return;
    
    delete g_sentUIDS[uid];

    for (let i=0; i<Math.min(10, list.length); i++)
    {
        Connect(unescape(list[i]));

        if (typeof window !== 'undefined')
            utils.SavePeer(list[i], false);
    }

    if (list.length == 1 && reqHandler.IsConnected(list[0]))
        utils.SavePeer(list[0]); 
}

exports.IsConnected = function(peer)
{
    for (let i=0; i<g_ConnectedPeers.length; i++)
    {
        if (peer == g_ConnectedPeers[i]["remote_address"])
            return true;
    }
    return false;
}


let g_TryConnect = {}
function Connect(peer)
{
    if (g_ConnectionsInterval == 0)
        return;

    if (utils.IsBockedAddress(peer))
        return;
        
    try {
        for (let key in g_TryConnect)
        {
            if (g_TryConnect[key].peer == peer)
                return;
        }

        if (reqHandler.IsConnected(peer))
            return;

        if (g_ConnectedPeers.length > g_constants.MAX_CONNECTIONS)
            return;

        g_TryConnect[peer] = {peer: peer, time: Date.now()}

        const protocol = peer.indexOf("://") == -1 ? "wss://" : "";

        const client = new WebSocket(protocol + peer);

        client["remote_address"] = peer;
        client["isAlive"] = false;

        client.onerror = function(ev) 
        {
            client["isAlive"] = false;
            delete g_TryConnect[peer];
        };
        client.onclose = function(ev) 
        {
            client["isAlive"] = false;
            delete g_TryConnect[peer];

            utils.SavePeer(peer);
        };

        client.onopen = function(ev)  
        {
            delete g_TryConnect[peer];

            g_ConnectedPeers.push(client);
            reqHandler.handleConnection(client);

            utils.SavePeer(peer);
        }
    }
    catch(e) {
        console.log("Connect to " + peer + "catch error: " + e.message)
    }
}

function ClearMemory()
{
    let freshUIDS = {}
    for (let uid in g_sentUIDS)
    {
        if (Date.now() - g_sentUIDS[uid].time < 60*1000)
            freshUIDS[uid] = g_sentUIDS[uid];
    }
    g_sentUIDS = freshUIDS;

    let freshPeers = {}
    for (let peer in g_TryConnect)
    {
        if (Date.now() - g_TryConnect[peer].time < 60*1000)
            freshPeers[peer] = g_TryConnect[peer];   
    }
    g_TryConnect = freshPeers;
}

exports.GetConnectedPeers = function(ip = null)
{
    if (!ip) ip = require("ip").address();

    let list = [];
    for (let i=0; i<g_ConnectedPeers.length; i++)
    {
        if (g_ConnectedPeers[i].readyState === WebSocket.OPEN && g_ConnectedPeers[i]["remote_address"] != ip)
            list.push(g_ConnectedPeers[i]["remote_address"]);
    }
    
    return list;
}

let g_LastPeers = {peers: [], time: 0}
exports.GetLastPeers = async function(ip = null)
{
    if (!ip) ip = require("ip").address();

    if (g_LastPeers.time > Date.now() - 60*1000)
        return g_LastPeers.peers;

    g_LastPeers = {peers: [], time: Date.now()};

    const peers = await utils.GetPeersFromDB("address<>'"+escape(ip)+"'");

    for (let i=0; i<peers.length; i++)
        g_LastPeers.peers.push(unescape(peers[i].address))
    
    return g_LastPeers.peers;
}