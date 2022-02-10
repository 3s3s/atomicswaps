"use strict";

const bitcoin = require("bitcoinjs-lib");
const mn = require('electrum-mnemonic')
const bip32 = require('bip32')
const customP2P = require("../../server/p2p/custom")
const utils = require("../../utils")

//"76a914"+command + "88ac"
exports.Electrum = function(request, params)
{
    if (typeof window !== 'undefined')  return;

    const ElectrumCli = require('electrum-client')

    return new Promise(async ok => {
        const ecl = new ElectrumCli(60002, 'electrum.blockstream.info', 'tls') // tcp or tls

        await ecl.connect()
        try{
            const ret = await ecl.request(request, params);
            ok( ret ); // json-rpc(promise)
        }catch(e){
            console.error(e)
        }
        await ecl.close() // disconnect(promise)*/
    })
}

exports.GetBalance = async function(mnemonic, callback = null)
{
    return new Promise(ok => {
        const p2pkh = exports.GetAddress(mnemonic);
        
        return customP2P.SendMessage({
                                    command: "electrum", 
                                    request: "blockchain.scripthash.get_balance", 
                                    params: [utils.Hash256("76a914"+p2pkh.hash.toString("hex") + "88ac", true)], 
                                    coin: "tbtc"}, balance => {
            if (callback) return callback(balance);
            ok(balance)
        });
    })
}

exports.GetAddress = function(mnemonic)
{
    const seed = mn.mnemonicToSeedSync(mnemonic, { prefix: mn.PREFIXES.standard });
    const root = bip32.fromSeed(seed, bitcoin.networks.testnet);

    return bitcoin.payments.p2pkh({ pubkey: root.derivePath("m/0/0").publicKey, network: bitcoin.networks.testnet });    
}

exports.withdraw = function(mnemonic, address_to, amount)
{
    return new Promise(async ok => {
        const p2pkh = exports.GetAddress(mnemonic);

        customP2P.SendMessage({command: "blockchain.scripthash.listunspent", hash: p2pkh.hash.toString("hex"), coin: "tbtc"}, list => {
            ok(list)
        })
    })
}
