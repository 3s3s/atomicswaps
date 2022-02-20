"use strict";

const multicoin = require("multicoinjs-lib");
const bitcoin = require("bitcoinjs-lib")
const mn = require('electrum-mnemonic')
const bip32 = require('bip32')
const customP2P = require("../../server/p2p/custom")
const utils = require("../../utils")
const g_constants = require("../../constants")

exports.Electrum = function(params)
{
    if (typeof window !== 'undefined')  return null;

    let dhKey = null;
    try{
        dhKey = require("../../private").serverDHkeys;
    }
    catch(e) {
    }

    if (!dhKey && (params.publicKey || params.serverKey))
        return null;

    if (params.publicKey && params.publicKey != dhKey.client_pub) return null;
    if (params.serverKey && params.serverKey != dhKey.pub) return null;

    const ElectrumCli = require('electrum-client')

    return new Promise(async ok => {
        const ecl = new ElectrumCli(60002, 'electrum.blockstream.info', 'tls') // tcp or tls

        await ecl.connect()
        try{
            const request = params.publicKey && params.serverKey ? utils.ServerDH_Decrypt(params.request) : params.request;
            const reqObject = JSON.parse(request);
            const ret = await ecl.request(reqObject.request, reqObject.params);

            if (params.publicKey && params.serverKey)
                ok( utils.ServerDH_Encrypt(JSON.stringify(ret)) );
            else
                ok( JSON.stringify(ret) ); 
        }catch(e){
            console.error(e)
            ok(null)
        }
        await ecl.close() // disconnect(promise)*/
    })
}

exports.GetBalance = async function(mnemonic, callback = null)
{
    return new Promise(ok => {
        const p2pkh = exports.GetAddress(mnemonic).p2pkh;

        const request = utils.ClientDH_Encrypt(JSON.stringify({
                        request: "blockchain.scripthash.get_balance",
                        params: [utils.Hash256("76a914"+p2pkh.hash.toString("hex") + "88ac", "hex", true)]}));
        
        return customP2P.SendMessage({
                                    command: "electrum", 
                                    publicKey: g_constants.clientDHkeys.pub,
                                    serverKey: g_constants.clientDHkeys.server_pub, 
                                    request: request,
                                    coin: "tbtc"}, balance => 
        {
            try {
                const ret = JSON.parse(balance)
                if (callback) return callback(ret);
                ok(ret)
            }
            catch(e) {
                console.log(e)
            }
        });
    })
}

let g_MyKeys = {}
exports.IsMyPublicKey = function(mnemonic, seller_pubkey)
{
    if (g_MyKeys[seller_pubkey] == true)
        return true;

    const address = exports.GetAddress(mnemonic);

    g_MyKeys[seller_pubkey] = seller_pubkey == address.p2pkh.hash.toString("hex");
    return g_MyKeys[seller_pubkey];
}

exports.GetAddress = function(mnemonic)
{
    const seed = mn.mnemonicToSeedSync(mnemonic, { prefix: mn.PREFIXES.standard });
    const root = bip32.fromSeed(seed, bitcoin.networks.testnet);

    let p2pkh = bitcoin.payments.p2pkh({ pubkey: root.derivePath("m/0/0").publicKey, network: bitcoin.networks.testnet });
    
    return {p2pkh: p2pkh, privateKey: root.derivePath("m/0/0").privateKey};    
}

function listunspent(address)
{
    return new Promise(ok => {       
        const request = utils.ClientDH_Encrypt(JSON.stringify({
            request: "blockchain.scripthash.listunspent", 
            params: [utils.Hash256("76a914"+address.p2pkh.hash.toString("hex") + "88ac", "hex", true)]}));
    
        customP2P.SendMessage({
            command: "electrum", 
            publicKey: g_constants.clientDHkeys.pub,
            serverKey: g_constants.clientDHkeys.server_pub,
            request: request,
            coin: "tbtc"}, listStr => {
                try {
                    ok( JSON.parse(listStr) );
                }
                catch(e) {console.log(e); ok(null);}
            })
    })
}

exports.withdraw = function(mnemonic, address_to, amount)
{
    const fee = 0.00001*100000000;
    
    return new Promise(async ok => {
        const address = exports.GetAddress(mnemonic);        
        const ecPair = multicoin.ECPair.fromPrivateKey(address.privateKey, { network: bitcoin.networks.testnet })

        if (!ecPair)
            return ok(-3);

        const list = await listunspent(address);

        if (!list) return ok(-1);

        try {
            const txb = new multicoin.TransactionBuilder(bitcoin.networks.testnet) 
            txb.setVersion(1)
            
            let sum = 0;
            let needToSign = 0;
            for (let i=0; i<list.length; i++)
            {
                txb.addInput(Buffer.from(list[i].tx_hash, "hex").reverse(), list[i].tx_pos);
                sum += list[i].value;

                needToSign++;

                if (sum > amount*100000000)
                    break;
            }
            
            const change = sum - amount*100000000 - fee;

            if (change < 0) return ok(-2);

            txb.addOutput(address_to, (amount*100000000).toFixed(0)*1);
            txb.addOutput(address.p2pkh.address, change.toFixed(0)*1);

            for (let i=0; i<needToSign; i++)
                txb.sign(i, ecPair)

            const ret = txb.build().toHex();

            ok({
                raw: ret, 
                amount: (amount*100000000).toFixed(0)*1, 
                address_to: address_to, 
                change: change.toFixed(0)*1,
                change_address: address.p2pkh.address,
                fee: fee.toFixed(0)*1
            })
        }
        catch(e) {console.log(e)}

    })
}

exports.broadcast = function(rawTX)
{
    const request = JSON.stringify({
        request: "blockchain.transaction.broadcast", 
        params: [rawTX]
    });

    return new Promise(ok => {
            customP2P.SendMessage({
                command: "electrum", 
                request: request,
                coin: "tbtc"}, ret => 
        {  
            ok(ret);
        })
    })
}
