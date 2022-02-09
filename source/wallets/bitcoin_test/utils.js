"use strict";

const bitcoin = require("bitcoinjs-lib");
const mn = require('electrum-mnemonic')
const bip32 = require('bip32')
const customP2P = require("../../server/p2p/custom")
const utils = require("../../utils")

exports.GetAddressBalance = function(hash)
{
    if (typeof window !== 'undefined')  return;

    const ElectrumCli = require('electrum-client')

    return new Promise(async ok => {
        //ok(1.0);
    
        const ecl = new ElectrumCli(60002, 'electrum.blockstream.info', 'tls') // tcp or tls

        await ecl.connect() // connect(promise)
        //ecl.subscribe.on('blockchain.headers.subscribe', (v) => console.log(v)) // subscribe message(EventEmitter)
        try{
            const ret = await ecl.request('blockchain.scripthash.get_balance', [utils.Hash256("76a914"+hash + "88ac", true)]);
            ok( ret ); // json-rpc(promise)
            //console.log(ver)
        }catch(e){
            console.error(e)
        }
        await ecl.close() // disconnect(promise)*/
    })
}

exports.GetBalance = async function(mnemonic, callback)
{
    const p2pkh = exports.GetAddress(mnemonic);

    customP2P.SendMessage({command: "getbalance", hash: p2pkh.hash.toString("hex"), coin: "tbtc"}, callback);
}

exports.GetAddress = function(mnemonic)
{
    const seed = mn.mnemonicToSeedSync(mnemonic, { prefix: mn.PREFIXES.standard });
    const root = bip32.fromSeed(seed, bitcoin.networks.testnet);

    return bitcoin.payments.p2pkh({ pubkey: root.derivePath("m/0/0").publicKey, network: bitcoin.networks.testnet });    
}
