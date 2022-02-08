"use strict";

const bitcoin = require("bitcoinjs-lib");
const bip39 = require("bip39");
const bip32 = require('bip32')
const customP2P = require("../../server/p2p/custom")
//import ElectrumCli from 'electrum-client';

expports.GetAddressBalance = function(address)
{
    return new Promise(ok => {
        ok(1.0);
    })
}

exports.GetBalance = async function(mnemonic, callback)
{
    const address = exports.GetAddress(mnemonic);

    customP2P.SendMessage({command: "getbalance", address: address, coin: "tbtc"}, callback);
    //const message = {request: "custom", params: {command: "getbalance", address: address, coin: "tbtc"}}
    //const uid = p2p.broadcastMessage(message);

    /*const ecl = new ElectrumCli(60002, 'electrum.blockstream.info', 'tls') // tcp or tls

    await ecl.connect() // connect(promise)
    //ecl.subscribe.on('blockchain.headers.subscribe', (v) => console.log(v)) // subscribe message(EventEmitter)
    try{
        callback( await ecl.blockchainAddress_getBalance(address)); // json-rpc(promise)
        //console.log(ver)
    }catch(e){
        console.error(e)
    }
    await ecl.close() // disconnect(promise)*/
}

exports.GetAddress = function(mnemonic)
{
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, bitcoin.networks.testnet);

    return getAddress(root.derivePath("m/0'/0/0"));    
}

function getAddress(node) {
    return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network: bitcoin.networks.testnet }).address;
}
