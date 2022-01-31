"use strict";

const peers = require("./peers")

exports.Handle = function(line)
{
    try 
    {
        const commands = line.split(" ");
        if (commands[0] == "peers")
            return ShowLastPeers();
    }
    catch(e)
    {
        console.log(e.message)
    }
}

async function ShowLastPeers()
{
    const list = await peers.GetLastPeers();
    for (let i=0; i<list.length; i++)
        console.log(list[i]);
}