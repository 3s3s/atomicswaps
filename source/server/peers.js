'use strict';

const WebSocket = require('ws');
const g_constants = require("../constants")
const reqHandler = require('./reqHandler.js');
const utils = require("../utils")

let g_sentUIDS = {};
let g_ConnectedPeers = [];

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
    
        if (g_ConnectedPeers.length < 3)
            ConnectNewPeers();
    }, 30000);    
}

async function ConnectNewPeers()
{
    const peers = await g_constants.dbTables["peers"].Select("*", "", "ORDER BY time DESC LIMIT 20");

    if (peers.length < 3)
        QueryNewPeers();

    for (let i=0; i<peers.length; i++)
        Connect(unescape(peers[i].address))

    Connect("195.154.113.90:10443")
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
    if (!g_sentUIDS[uid])
        return;
    
    delete g_sentUIDS[uid];

    for (let i=0; i<Math.min(10, list.length); i++)
        Connect(list[i]);
}

let g_TryConnect = {}
function Connect(peer)
{
    try {
        for (let key in g_TryConnect)
        {
            if (g_TryConnect[key].peer == peer)
                return;
        }

        for (let i=0; i<g_ConnectedPeers.length; i++)
        {
            if (peer == g_ConnectedPeers[i]["remote_address"])
                return;
        }

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

            client.ping();

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
