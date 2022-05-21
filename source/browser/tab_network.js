// @ts-nocheck
"use strict";

const $ = require('jquery');
const tab_wallet = require("./tab_wallets")


exports.Init = function()
{
    p2p.StartPeer();
    
    UpdatePeers();
    
    setInterval(UpdatePeers, 10000)
}


$("#network-start").on("click", e => 
{
    p2p.IsStarted() ? p2p.StopPeer() : p2p.StartPeer()

    UpdatePeers();
})

async function UpdatePeers()
{
    $("#network-start").text(p2p.IsStarted() ? "Stop" : "Start")

    const connected = p2p.GetConnectedPeers();
    const saved = await p2p.GetLastSavedPeers(); //await utils.GetPeersFromDB();

    $("#network-status").empty();
    if (!p2p.IsStarted())
        $("#network-status").append($("<span class='text-danger'>Offline</span>"))
    else 
    {
        if (!connected.length)
            $("#network-status").append($("<span class='text-warning'>Connecting...</span>"))
        else
        {
            $("#network-status").append($("<span class='text-success'>Online</span>"))
            tab_wallet.ShowBalances(false);
        }
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