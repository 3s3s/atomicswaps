"use strict";

const $ = require('jquery');
const peers = require("./server/peers.js")

document.addEventListener('DOMContentLoaded', async () => {

    require("./server/database").Init();
    ConnectP2P();

}, false);

let g_ConnectionStarted = false;
function ConnectP2P()
{
    g_ConnectionStarted = true;
    peers.Init(g_ConnectionStarted);
}

$("#network-start").on("click", e => {
    g_ConnectionStarted = !g_ConnectionStarted;
    peers.Init(g_ConnectionStarted);
})
