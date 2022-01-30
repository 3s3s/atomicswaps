'use strict';

const g_constants = require('../constants');

const WebSocketServer = require('isomorphic-ws').Server;

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', function(line){
    console.log(line);
})

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
        if (ws["isAlive"] === false) 
            return ws.terminate();
    
        ws["isAlive"] = false;
        ws.ping();
        });
    }, 30000);

    g_constants.WEB_SOCKETS.on('connection', (ws, req) => {
        if (g_constants.WEB_SOCKETS.clients.length > 100)
            return ws.terminate();

        ws["isAlive"] = true;
        g_constants.WEB_SOCKETS.clients.forEach(wsOld => {
            if (wsOld["remote_address"] == req.socket.remoteAddress)
                ws["isAlive"] = false;
        });

        if (!ws["isAlive"])
            return ws.terminate();

        console.log("Connected remote address: " + req.socket.remoteAddress)
        
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


