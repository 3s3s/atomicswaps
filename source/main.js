"use strict";

const $ = require('jquery');
const popup = require("./popup.js")
const utils = require("./utils.js")
const peers = require("./server/peers.js")

//server.StartServer();

//let g_LastHash = "";
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

/*$('#file_form').submit(e => {
    e.preventDefault();
    
    if (!$('#the-file-input')[0].files.length)
        return alert('Please select a file!');
    
    $("html, body").animate({ scrollTop: 0 }, "slow");
    try {
        OnRPCChange()
        
        //popup.saveFile($('#the-file-input')[0].files[0])
    }
    catch(e) {
        alert(e.message);
    }
})*/