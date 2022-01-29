'use strict';

const WebSocket = require('ws');
const g_constants = require("../constants")
const reqHandler = require('./reqHandler.js');
const utils = require("../utils")

let g_sentUIDS = {};
let g_ConnectedPeers = [];

exports.IsOwnUID = function(uid)
{
    if (g_sentUIDS[uid])
        return true;
    return false;
}

exports.Init = async function()
{
    ConnectNewPeers();

    setInterval(() => {
        let alivePeers = [];
        for (let i=0; i<g_ConnectedPeers.length; i++)
        {
            if (g_ConnectedPeers[i].isAlive === false)
            {
                console.log("Terminate dead connection: "+g_ConnectedPeers[i]["remote_address"])
                g_ConnectedPeers[i].terminate();
                continue;
            }
            g_ConnectedPeers[i].isAlive = false;
            g_ConnectedPeers[i].ping();
            alivePeers.push(g_ConnectedPeers[i])
        }
        g_ConnectedPeers = alivePeers;
    
        if (g_ConnectedPeers.length < g_constants.MAX_CONNECTIONS)
            ConnectNewPeers();

        const list = exports.GetConnectedPeers("-");
        console.log("Connected peers: "+JSON.stringify(list))
    }, 30000);    
}

async function ConnectNewPeers()
{
    const peers = await g_constants.dbTables["peers"].Select("*", "time > "+(Date.now()-60*1000), "ORDER BY time DESC LIMIT 20");

    QueryNewPeers();

    for (let i=0; i<peers.length; i++)
        Connect(unescape(peers[i].address))

    Connect("82.118.22.155:10443")
    Connect("144.76.71.116:10443")
    //Connect("localhost:10443")
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
        Connect(unescape(list[i]));

    if (list.length == 1 && reqHandler.IsConnected(list[0]))
        g_constants.dbTables["peers"].Insert(list[0], Date.now(), err => {})
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
        client.isAlive = false;

        client.on('error', (err) => 
        {
            client.isAlive = false;
            delete g_TryConnect[peer];
        });

        client.on('open', () => 
        {
            delete g_TryConnect[peer];

            g_ConnectedPeers.push(client);
            reqHandler.handleConnection(client);

            g_constants.dbTables["peers"].Insert(peer, Date.now(), err => {})

        })
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

exports.GetConnectedPeers = function(ip)
{
    let list = [];
    for (let i=0; i<g_ConnectedPeers.length; i++)
    {
        if (g_ConnectedPeers[i].readyState === WebSocket.OPEN && g_ConnectedPeers[i]["remote_address"] != ip)
            list.push(g_ConnectedPeers[i]["remote_address"]);
    }
    
    return list;
}

let g_LastPeers = {peers: [], time: 0}
exports.GetLastPeers = async function(ip)
{
    if (g_LastPeers.time > Date.now() - 60*1000)
        return g_LastPeers.peers;

    g_LastPeers = {peers: [], time: Date.now()};

    const peers = await g_constants.dbTables["peers"].Select("address", "address<>'"+escape(ip)+"'", "ORDER BY time DESC LIMIT 9");

    for (let i=0; i<peers.length; i++)
        g_LastPeers.peers.push(unescape(peers[i].address))
    
    return g_LastPeers.peers;
}