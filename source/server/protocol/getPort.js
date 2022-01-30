'use strict';

const WebSocket = require('isomorphic-ws');
const g_constants = require("../../constants")

exports.HandleMessage = function(ws, client)
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

        const responce = {request: "listPeers", params: {uid: client.params.uid, TTL: 0, list: [address+":"+g_constants.my_portSSL] } };
        
        //console.log('getPort from '+ws["remote_address"]+"  answer: "+address+":"+g_constants.my_portSSL)

        if (ws.readyState === WebSocket.OPEN && responce.params.list.length > 0) 
            return ws.send(JSON.stringify(responce));    

    }
    return;     
}