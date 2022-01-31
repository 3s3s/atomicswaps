"use strict";

const utils = require("./utils.js");
const $ = require('jquery');
const peers = require("./server/peers")

let g_ConnectionStarted = false;
exports.Init = function()
{
    ConnectP2P();
    
    UpdatePeers();
    
    setInterval(() => {
        UpdatePeers();
    }, 30000)
}

function ConnectP2P()
{
    const P2P_protocol = {
        getPeers: require("./server/protocol/getPeers"),
        getPort: require("./server/protocol/getPort"),
        listPeers: require("./server/protocol/listPeers"),
    }

    g_ConnectionStarted = true;
    peers.Init(g_ConnectionStarted, P2P_protocol);
}

$("#network-start").on("click", e => 
{
    g_ConnectionStarted = !g_ConnectionStarted;
    peers.Init(g_ConnectionStarted);

    UpdatePeers();
})

async function UpdatePeers()
{
    g_ConnectionStarted ? $("#network-start").text("Stop") : $("#network-start").text("Start")

    const connected = peers.GetConnectedPeers();
    const saved = await utils.GetPeersFromDB();

    $("#network-status").empty();
    if (!g_ConnectionStarted)
        $("#network-status").append($("<span class='text-danger'>Offline</span>"))
    else 
    {
        if (!connected.length)
            $("#network-status").append($("<span class='text-warning'>Connecting...</span>"))
        else
            $("#network-status").append($("<span class='text-success'>Online</span>"))
    }

    const FUTURE = Date.now()+1000;
    for (let i=0; i<saved.length; i++)
    {
        for (let j=0; j<connected.length; j++)
        {
            if (saved[i].address == connected[j])
                saved[i].time = FUTURE;
        }        
    }

    saved.sort((a, b) => {return b.time - a.time});

    $("#table_peers_body").empty();
    for (let i=0; i<saved.length; i++)
    {
        let tr = $("<tr></tr>");
        const td1 = $("<td>"+saved[i].address+"</td>");
        const td2 = saved[i].time == FUTURE ? $("<td class='text-success'><b>connected</b></td>") : $("<td>saved  "+(new Date(saved[i].time)).toLocaleDateString()+"</td>");

        tr.append(td1).append(td2);
        $("#table_peers_body").append(tr);
    }
}

//$("#table_peers_body")