'use strict';

const peers = require("../peers")

exports.HandleMessage = function(ws, client)
{
    if (client.params.list && client.params.list.length)
        return peers.SavePeers(client.params.uid, client.params.list);

    return;
}