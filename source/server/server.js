'use strict';

const g_constants = require('../constants');

const WebSocketServer = require('ws').Server;

exports.StartServer = function()
{
    require("./database").Init();
    require("./peers").Init();

    console.log("This Machine IP address: " + require("ip").address())

    const httpsServer = 
        require('https').createServer(g_constants.SSL_options)
        .listen(g_constants.my_portSSL, () => {
        console.log("SSL Proxy listening on port "+g_constants.my_portSSL);
    });

    g_constants.WEB_SOCKETS = new WebSocketServer({ server: httpsServer, clientTracking: true, perMessageDeflate: true });

    const interval = setInterval(() => {
        g_constants.WEB_SOCKETS.clients.forEach(ws => {
        if (ws.isAlive === false) 
            return ws.terminate();
    
        ws.isAlive = false;
        ws.ping();
        });
    }, 30000);

    g_constants.WEB_SOCKETS.on('connection', (ws, req) => {
        if (g_constants.WEB_SOCKETS.clients.length > 100)
            return ws.terminate();

        if (req.socket.remoteAddress.indexOf("127.0.0.1") > 0 || req.socket.remoteAddress.indexOf(require("ip").address()) > 0)
        {
            console.log("terminate connection from localhost")
            return ws.terminate();
        }
        console.log("Connected remote address: " + req.socket.remoteAddress)

        ws.isAlive = true;
        g_constants.WEB_SOCKETS.clients.forEach(wsOld => {
            if (wsOld["remote_address"] == req.socket.remoteAddress)
            {
                ws.isAlive = false;
                return;
            }
        });

        if (!ws.isAlive)
            return ws.terminate();

        ws["remote_address"] = req.socket.remoteAddress;

        require('./reqHandler.js').handleConnection(ws);

    }).on('close', () => {
        clearInterval(interval);
    });
}

process.on('uncaughtException', err => {
  console.error('uncaughtException:' + err.message + "\n" + err.stack);

  process.exit(0);
});


